"""Devoirs du programme : la bibliothèque de devoirs suit ce que les élèves apprennent.

Chaque leçon du programme donne un devoir (ses questions de fin de leçon), et chaque module un « bilan » qui reprend
ses leçons. Ils sont liés au parcours d'âge du module (7-9, 10-12 ou 13-15 ans) : un enseignant ne peut donner à une classe
que des devoirs de son âge.

Rien n'est recopié : les questions sont lues en direct dans le contenu des leçons (`LessonContent.questions`), donc une
correction faite dans le Studio de contenu se retrouve aussitôt dans les devoirs. La table `Mission` ne garde que la fiche
(titre, durée, XP…) que l'enseignant voit dans la bibliothèque ; `sync_programme_missions` la tient à jour.
"""
from math import ceil

from django.db import IntegrityError, transaction

from apps.curriculum.models import LessonContent, Module

from ..models import Mission

# Missions d'origine (m1 à m6) : génériques, sans lien avec les cours. Elles quittent la bibliothèque dès que les devoirs
# du programme existent ; l'équipe kEur IA peut les y remettre.
LEGACY_MISSION_IDS = ('m1', 'm2', 'm3', 'm4', 'm5', 'm6')
REVIEW_QUESTIONS_PER_LESSON = 2
REVIEW_XP = 60
LESSON_XP_DEFAULT = 20
MAX_ID_LENGTH = 20


def _text(value) -> str:
    return value.strip() if isinstance(value, str) else ''


def convert_question(raw) -> dict | None:
    """Question du contenu de leçon {question, options[], correct, explain} -> étape de devoir (None si mal formée)."""
    if not isinstance(raw, dict):
        return None
    question, options, correct = _text(raw.get('question')), raw.get('options'), raw.get('correct')
    if not question or not isinstance(options, list) or len(options) < 2:
        return None
    labels = [_text(o) for o in options]
    if not all(labels) or not isinstance(correct, int) or isinstance(correct, bool) or not 0 <= correct < len(labels):
        return None
    explain = _text(raw.get('explain'))
    return {
        'question': question,
        'options': [
            {
                'label': label,
                'correct': index == correct,
                'explanation': (f'Bravo ! {explain}' if index == correct else f'Ce n\'est pas la bonne réponse. {explain}').strip(),
            }
            for index, label in enumerate(labels)
        ],
    }


def _lesson_steps(content: LessonContent | None, limit: int | None = None) -> list[dict]:
    steps = [step for step in (convert_question(q) for q in (content.questions if content else []) or []) if step]
    return steps[:limit] if limit else steps


def programme_quiz(mission: Mission) -> list[dict]:
    """Questions d'un devoir du programme, lues dans le contenu des leçons (ordre stable : les réponses des élèves s'y réfèrent)."""
    if mission.kind == Mission.KIND_LESSON and mission.lesson_id:
        return _lesson_steps(LessonContent.objects.filter(lesson_id=mission.lesson_id).first())
    if mission.kind == Mission.KIND_REVIEW and mission.module_id:
        steps = []
        contents = LessonContent.objects.filter(lesson__module_id=mission.module_id).select_related('lesson').order_by('lesson__order', 'lesson_id')
        for content in contents:
            steps.extend(_lesson_steps(content, REVIEW_QUESTIONS_PER_LESSON))
        return steps
    return []


def _difficulty(position: int, total: int) -> str:
    """Selon la place du module dans le parcours : on commence simple, on finit plus exigeant."""
    ratio = position / max(total, 1)
    return 'Débutant' if ratio < 1 / 3 else 'Intermédiaire' if ratio < 2 / 3 else 'Avancé'


def _duration(question_count: int) -> int:
    return max(3, ceil(question_count * 1.5))


def desired_missions() -> list[dict]:
    """Les fiches de devoirs que le programme actuel doit produire (une par leçon avec questions, une par module)."""
    modules = list(Module.objects.select_related('track').prefetch_related('lessons__content').order_by('track__order', 'order'))
    per_track: dict[int, int] = {}
    for module in modules:
        per_track[module.track_id] = per_track.get(module.track_id, 0) + 1
    seen: dict[int, int] = {}
    specs = []
    for module in modules:
        position = seen.get(module.track_id, 0)
        seen[module.track_id] = position + 1
        difficulty = _difficulty(position, per_track[module.track_id])
        base = {'track': module.track.key, 'module_id': module.id, 'category': module.title[:30], 'difficulty': difficulty}
        lessons = sorted(module.lessons.all(), key=lambda lesson: (lesson.order, lesson.id))
        review_count = 0
        for lesson in lessons:
            content = getattr(lesson, 'content', None)
            steps = _lesson_steps(content)
            if not steps:
                continue
            review_count += len(steps[:REVIEW_QUESTIONS_PER_LESSON])
            mission_id = f'l-{lesson.lesson_id}'
            if len(mission_id) > MAX_ID_LENGTH:
                continue
            skill = _text(content.skill) if content else ''
            # Une phrase : l'enseignant lit déjà le titre du module et de la leçon, le nombre de questions et la durée.
            description = f'Compétence visée : {skill}' if skill else f'Questions de fin de leçon sur « {lesson.title} ».'
            specs.append({**base, 'id': mission_id, 'kind': Mission.KIND_LESSON, 'lesson_id': lesson.id,
                          'title': f'{module.title} · {lesson.title}'[:150], 'description': description,
                          'duration_minutes': _duration(len(steps)), 'xp': lesson.xp or LESSON_XP_DEFAULT,
                          'question_count': len(steps)})
        review_id = f'b-{module.world_id}'
        if review_count and len(review_id) <= MAX_ID_LENGTH:
            specs.append({**base, 'id': review_id, 'kind': Mission.KIND_REVIEW, 'lesson_id': None,
                          'title': f'{module.title} · Bilan du module'[:150],
                          'description': f'Bilan du module « {module.title} » : {review_count} questions qui reprennent ses leçons.',
                          'duration_minutes': _duration(review_count), 'xp': REVIEW_XP, 'question_count': review_count})
    return specs


# Champs tenus à jour à partir du programme. `active` n'en fait pas partie : retirer un devoir de la bibliothèque est un
# choix de l'équipe kEur IA, que la synchronisation ne défait pas.
_SYNCED = ('kind', 'track', 'module_id', 'lesson_id', 'category', 'difficulty', 'title', 'description', 'duration_minutes', 'xp',
           'question_count')


def sync_programme_missions() -> dict:
    """Crée, met à jour et retire les devoirs du programme (sans doublon, sans défaire un retrait manuel). Idempotent."""
    specs = desired_missions()
    existing = {m.id: m for m in Mission.objects.filter(kind__in=(Mission.KIND_LESSON, Mission.KIND_REVIEW))}
    first_run = not existing
    to_create, to_update = [], []
    for spec in specs:
        current = existing.get(spec['id'])
        if current is None:
            to_create.append(Mission(**spec))
            continue
        changed = [field for field in _SYNCED if getattr(current, field) != spec[field]]
        for field in changed:
            setattr(current, field, spec[field])
        if changed:
            to_update.append(current)
    wanted = {spec['id'] for spec in specs}
    gone = [m for m in existing.values() if m.id not in wanted and m.active]
    for mission in gone:
        mission.active = False  # leçon supprimée ou sans question : retirée de la bibliothèque, ses devoirs déjà donnés restent
    try:
        with transaction.atomic():
            Mission.objects.bulk_create(to_create)
            if to_update:
                Mission.objects.bulk_update(to_update, list(_SYNCED))
            if gone:
                Mission.objects.bulk_update(gone, ['active'])
            retired = 0
            if first_run and to_create:
                retired = Mission.objects.filter(id__in=LEGACY_MISSION_IDS, active=True).update(active=False)
    except IntegrityError:
        # Deux requêtes ont synchronisé en même temps : l'autre a déjà créé ces fiches.
        return {'created': 0, 'updated': 0, 'retired': 0, 'legacyRetired': 0}
    return {'created': len(to_create), 'updated': len(to_update), 'retired': len(gone), 'legacyRetired': retired}
