"""Le programme vu par l'enseignant : de quoi préparer une séance sans être spécialiste de l'IA.

Deux lectures :
  - `teacher_programme` : les modules et leçons des parcours d'âge de SES classes ;
  - `lesson_sheet` : la fiche d'une leçon (ce que l'élève voit, la correction, et un guide pour l'expliquer).

Le guide est rédigé à la main quand il existe (`TeacherGuide`) ; sinon il est déduit du contenu de la leçon, pour que chaque
leçon ait déjà une fiche utile. Le champ `guide.source` dit lequel des deux est servi.
"""
from apps.curriculum.models import AgeTrack, Lesson, LessonContent, TeacherGuide

from ..errors import NotFound
from ..levels import class_name, level_info
from ..models import Classroom, Mission


def _track_label(key: str) -> str:
    return f'{key.replace("-", "–")} ans'


def _teacher_tracks(teacher) -> dict[str, list[str]]:
    """{parcours: noms des classes} pour les classes (non archivées) confiées à l'enseignant."""
    tracks: dict[str, list[str]] = {}
    classrooms = Classroom.objects.filter(school=teacher.school, teacher=teacher, archived=False)
    for classroom in sorted(classrooms, key=lambda c: (c.level, c.section)):
        tracks.setdefault(level_info(classroom.level).track, []).append(class_name(classroom.level, classroom.section))
    return tracks


def teacher_programme(teacher) -> dict:
    """Modules et leçons des parcours d'âge des classes de l'enseignant (rien d'autre : pas de contenu d'un autre âge)."""
    classes_by_track = _teacher_tracks(teacher)
    result = []
    tracks = AgeTrack.objects.filter(key__in=classes_by_track).prefetch_related('modules__lessons__content').order_by('order', 'key')
    for track in tracks:
        modules = []
        for module in track.modules.all().order_by('order'):
            lessons = []
            for lesson in sorted(module.lessons.all(), key=lambda item: (item.order, item.id)):
                content = getattr(lesson, 'content', None)
                lessons.append({'id': lesson.lesson_id, 'order': lesson.order, 'title': lesson.title, 'type': lesson.lesson_type,
                                'minutes': lesson.minutes, 'skill': (content.skill if content else '') or ''})
            modules.append({'id': module.world_id, 'order': module.order, 'title': module.title, 'description': module.description,
                            'lessons': lessons})
        result.append({'key': track.key, 'label': _track_label(track.key), 'name': track.name, 'classes': classes_by_track[track.key],
                       'modules': modules})
    return {'tracks': result}


def _vocabulary(raw) -> list[dict]:
    """Le contenu stocke des paires [terme, définition] ; l'interface reçoit des objets nommés."""
    terms = []
    for item in raw or []:
        if isinstance(item, list | tuple) and len(item) >= 2:
            terms.append({'term': str(item[0]), 'definition': str(item[1])})
        elif isinstance(item, dict) and item.get('term'):
            terms.append({'term': str(item['term']), 'definition': str(item.get('definition', ''))})
    return terms


def _strings(raw, limit: int | None = None) -> list[str]:
    items = [str(x).strip() for x in (raw or []) if isinstance(x, str | int | float) and str(x).strip()]
    return items[:limit] if limit else items


def auto_guide(content: LessonContent | None) -> dict:
    """Guide déduit du contenu de la leçon, tant qu'aucun guide rédigé n'existe."""
    if content is None:
        return {'source': 'auto', 'essential': [], 'explain': '', 'unplugged': None, 'askThem': [], 'commonMistakes': []}
    explain = '\n\n'.join(part for part in (content.discover.strip(), content.example.strip()) if part)
    questions = [q.get('question', '') for q in (content.questions or []) if isinstance(q, dict)]
    return {
        'source': 'auto',
        'essential': _strings(content.remember, 3),
        'explain': explain,
        'unplugged': None,
        'askThem': _strings(questions, 3),
        'commonMistakes': [],
    }


def _written_guide(guide: TeacherGuide) -> dict:
    unplugged = guide.unplugged if isinstance(guide.unplugged, dict) and guide.unplugged.get('steps') else None
    if unplugged:
        unplugged = {'title': str(unplugged.get('title', 'Activité en classe')), 'minutes': int(unplugged.get('minutes') or 0),
                     'materials': _strings(unplugged.get('materials')), 'steps': _strings(unplugged.get('steps'))}
    return {'source': 'redige', 'essential': _strings(guide.essential), 'explain': guide.explain.strip(), 'unplugged': unplugged,
            'askThem': _strings(guide.ask_them), 'commonMistakes': _strings(guide.common_mistakes)}


def lesson_sheet(teacher, lesson_id) -> dict:
    """Fiche d'une leçon. Réservée aux leçons du parcours d'âge de l'une des classes de l'enseignant."""
    lesson = (Lesson.objects.select_related('module__track', 'content', 'teacher_guide')
              .filter(lesson_id=str(lesson_id)).first())
    if lesson is None or lesson.module.track.key not in _teacher_tracks(teacher):
        # Même réponse dans les deux cas : on ne révèle pas le programme d'un âge que l'enseignant n'a pas.
        raise NotFound("Cette leçon n'est pas au programme de vos classes.")
    module, content = lesson.module, getattr(lesson, 'content', None)
    siblings = sorted(module.lessons.all(), key=lambda item: (item.order, item.id))
    index = next(i for i, sibling in enumerate(siblings) if sibling.id == lesson.id)

    def link(other):
        return {'id': other.lesson_id, 'title': other.title} if other else None

    guide = getattr(lesson, 'teacher_guide', None)
    homework = {
        'lessonMissionId': Mission.objects.filter(pk=f'l-{lesson.lesson_id}', active=True).values_list('id', flat=True).first(),
        'reviewMissionId': Mission.objects.filter(pk=f'b-{module.world_id}', active=True).values_list('id', flat=True).first(),
    }
    return {
        'id': lesson.lesson_id, 'order': lesson.order, 'title': lesson.title, 'type': lesson.lesson_type, 'minutes': lesson.minutes,
        'track': {'key': module.track.key, 'label': _track_label(module.track.key)},
        'module': {'id': module.world_id, 'order': module.order, 'title': module.title, 'description': module.description},
        'previous': link(siblings[index - 1]) if index > 0 else None,
        'next': link(siblings[index + 1]) if index + 1 < len(siblings) else None,
        'sheet': {
            'mission': content.mission if content else '',
            'objectives': _strings(content.objectives if content else []),
            'discover': content.discover if content else '',
            'example': content.example if content else '',
            'remember': _strings(content.remember if content else []),
            'vocabulary': _vocabulary(content.vocabulary if content else []),
            'challenge': content.challenge if content else '',
            'skill': content.skill if content else '',
            'questions': [{'question': q.get('question', ''), 'options': _strings(q.get('options')), 'correct': q.get('correct'),
                           'explain': q.get('explain', '')}
                          for q in ((content.questions if content else []) or []) if isinstance(q, dict)],
        },
        'guide': _written_guide(guide) if guide else auto_guide(content),
        'homework': homework,
    }
