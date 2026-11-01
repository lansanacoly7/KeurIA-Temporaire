"""
Services du Studio de Contenus pédagogiques (Super Admin).
Permet la gestion No-Code des parcours, modules, leçons et contenus interactifs.
"""
import json
import re

from django.db import transaction
from django.shortcuts import get_object_or_404

from apps.curriculum.models import AgeTrack, Lesson, LessonContent, Module
from apps.curriculum.serializers import AgeTrackSerializer, LessonDetailSerializer

from .services import audit

# Même format que celui accepté par l'API de progression : sinon une leçon créée ici
# ne pourrait jamais être validée par un élève.
ID_RE = re.compile(r'^[A-Za-z0-9_.:-]{1,100}$')
LESSON_TYPES = {key for key, _ in Lesson.TYPE_CHOICES}
MAX_CONTENT_BYTES = 200_000
CONTENT_TEXT_FIELDS = ('mission', 'discover', 'example', 'challenge', 'skill')
CONTENT_LIST_FIELDS = ('objectives', 'remember', 'vocabulary', 'questions', 'steps')


def _number(data, key, default, low, high, label):
    """Entier compris entre low et high ; message clair (jamais d'erreur Python brute) sinon."""
    value = data.get(key, default)
    if isinstance(value, bool) or not isinstance(value, int | str):
        raise ValueError(f"{label} : nombre entier attendu.")
    try:
        number = int(value)
    except ValueError:
        raise ValueError(f"{label} : nombre entier attendu.") from None
    if not low <= number <= high:
        raise ValueError(f"{label} doit être compris entre {low} et {high}.")
    return number


def _text(data, key, default='', max_len=200, label=''):
    value = data.get(key, default)
    if value is None:
        value = default
    if not isinstance(value, str):
        raise ValueError(f"{label or key} : texte attendu.")
    value = value.strip()
    if len(value) > max_len:
        raise ValueError(f"{label or key} : {max_len} caractères maximum.")
    return value


def _clean_content(raw):
    """Contenu riche : formes vérifiées (textes, listes, activité) et taille bornée."""
    if raw is None:
        raw = {}
    if not isinstance(raw, dict):
        raise ValueError("Le contenu de la leçon est invalide.")
    clean = {}
    for field in CONTENT_TEXT_FIELDS:
        value = raw.get(field) or ''
        if not isinstance(value, str):
            raise ValueError(f"Contenu « {field} » : texte attendu.")
        clean[field] = value
    for field in CONTENT_LIST_FIELDS:
        value = raw.get(field) or []
        if not isinstance(value, list):
            raise ValueError(f"Contenu « {field} » : liste attendue.")
        clean[field] = value
    activity = raw.get('activity') or {}
    if not isinstance(activity, dict):
        raise ValueError("Contenu « activity » : objet attendu.")
    clean['activity'] = activity
    if len(json.dumps(clean, ensure_ascii=False)) > MAX_CONTENT_BYTES:
        raise ValueError("Contenu de la leçon trop volumineux.")
    return clean


def list_curriculum_studio():
    """Renvoie l'ensemble des parcours avec modules et leçons pour le Studio."""
    tracks = AgeTrack.objects.prefetch_related(
        'modules__lessons__content'
    ).order_by('order', 'key')
    return AgeTrackSerializer(tracks, many=True).data


def get_lesson_detail(lesson_id: str):
    """Renvoie le détail complet d'une leçon et son contenu pédagogique."""
    lesson = get_object_or_404(
        Lesson.objects.select_related('module__track', 'content'),
        lesson_id=lesson_id
    )
    return LessonDetailSerializer(lesson).data


@transaction.atomic
def save_lesson(user, data: dict):
    """
    Crée ou met à jour une leçon et son contenu LessonContent associé.
    """
    lesson_id = _text(data, 'id', '', 100, 'Identifiant') or _text(data, 'lesson_id', '', 100, 'Identifiant')
    module_id = _text(data, 'module_id', '', 100, 'Module')
    title = _text(data, 'title', '', 200, 'Le titre')
    lesson_type = _text(data, 'type', 'histoire', 50, 'Type')
    minutes = _number(data, 'minutes', 5, 1, 240, 'La durée')
    xp = _number(data, 'xp', 20, 0, 500, "L'XP")
    stars = _number(data, 'stars', 3, 0, 5, 'Les étoiles')
    order = _number(data, 'order', 1, 1, 1000, "L'ordre")
    if lesson_id and not ID_RE.match(lesson_id):
        raise ValueError("Identifiant de leçon invalide (lettres, chiffres, - _ . : uniquement).")
    if lesson_type not in LESSON_TYPES:
        raise ValueError("Type de leçon inconnu.")
    content_data = _clean_content(data.get('content'))

    if not title:
        raise ValueError("Le titre de la leçon est obligatoire.")

    if not module_id:
        raise ValueError("Le module de rattachement est obligatoire.")

    module = get_object_or_404(Module, world_id=module_id)

    # Création d'un nouvel identifiant automatique si non fourni
    if not lesson_id:
        existing_count = module.lessons.count()
        lesson_id = f"{module.world_id}-{existing_count + 1}"
        # S'assurer de l'unicité
        suffix = 1
        base_id = lesson_id
        while Lesson.objects.filter(lesson_id=lesson_id).exists():
            lesson_id = f"{base_id}-{suffix}"
            suffix += 1

    lesson, created = Lesson.objects.get_or_create(
        lesson_id=lesson_id,
        defaults={
            'module': module,
            'title': title,
            'lesson_type': lesson_type,
            'minutes': minutes,
            'xp': xp,
            'stars': stars,
            'order': order,
        }
    )

    if not created:
        lesson.title = title
        lesson.lesson_type = lesson_type
        lesson.minutes = minutes
        lesson.xp = xp
        lesson.stars = stars
        lesson.order = order
        lesson.module = module
        lesson.save()

    # Gestion du contenu pédagogique riche
    content, _ = LessonContent.objects.get_or_create(lesson=lesson)

    for field in CONTENT_TEXT_FIELDS + CONTENT_LIST_FIELDS + ('activity',):
        setattr(content, field, content_data[field])
    content.save()

    audit(user, 'lecon_creee' if created else 'lecon_modifiee',
          f"Leçon « {lesson.title} » ({lesson.lesson_id}) {'créée' if created else 'modifiée'}")

    return LessonDetailSerializer(lesson).data


@transaction.atomic
def save_module(user, data: dict):
    """
    Crée ou met à jour un module (monde pédagogique).
    """
    world_id = (_text(data, 'id', '', 50, 'Identifiant') or _text(data, 'world_id', '', 50, 'Identifiant')).lower()
    track_key = _text(data, 'track_key', '', 20, 'Le parcours')
    title = _text(data, 'title', '', 200, 'Le titre')
    icon = _text(data, 'icon', '🤖', 20, "L'icône")
    description = _text(data, 'description', '', 1000, 'La description')
    color = _text(data, 'color', 'sun', 30, 'La couleur')
    order = _number(data, 'order', 1, 1, 1000, "L'ordre")
    if world_id and not ID_RE.match(world_id):
        raise ValueError("Identifiant de module invalide (lettres, chiffres, - _ . : uniquement).")

    if not title:
        raise ValueError("Le titre du module est obligatoire.")
    if not track_key:
        raise ValueError("Le parcours d'âge est obligatoire.")

    track = get_object_or_404(AgeTrack, key=track_key)

    if not world_id:
        existing_count = track.modules.count()
        prefix = 'p' if track_key == '7-9' else ('a' if track_key == '10-12' else 'c')
        world_id = f"{prefix}{existing_count + 1}"
        suffix = 1
        base_id = world_id
        while Module.objects.filter(world_id=world_id).exists():
            world_id = f"{base_id}_{suffix}"
            suffix += 1

    module, created = Module.objects.get_or_create(
        world_id=world_id,
        defaults={
            'track': track,
            'title': title,
            'icon': icon,
            'description': description,
            'color': color,
            'order': order,
        }
    )

    if not created:
        module.title = title
        module.icon = icon
        module.description = description
        module.color = color
        module.order = order
        module.track = track
        module.save()

    audit(user, 'module_cree' if created else 'module_modifie',
          f"Module « {module.title} » ({module.world_id}) {'créé' if created else 'modifié'}")
    return {
        'id': module.world_id,
        'title': module.title,
        'icon': module.icon,
        'description': module.description,
        'color': module.color,
        'order': module.order,
        'track_key': module.track.key,
        'lessons_count': module.lessons.count(),
    }


@transaction.atomic
def delete_lesson(user, lesson_id: str):
    """Supprime une leçon."""
    lesson = get_object_or_404(Lesson, lesson_id=lesson_id)
    title = lesson.title
    lesson.delete()
    audit(user, 'lecon_supprimee', f"Leçon « {title} » ({lesson_id}) supprimée")
    return {'deleted': True, 'id': lesson_id, 'title': title}


@transaction.atomic
def reorder_lesson(user, lesson_id: str, direction: str):
    """Réordonne une leçon au sein de son monde."""
    if direction not in ('up', 'down'):
        raise ValueError("Direction invalide : « up » ou « down ».")
    lesson = get_object_or_404(Lesson, lesson_id=lesson_id)
    module = lesson.module
    lessons = list(module.lessons.order_by('order', 'id'))
    try:
        idx = lessons.index(lesson)
    except ValueError:
        return {'reordered': False}

    if direction == 'up' and idx > 0:
        other = lessons[idx - 1]
        lesson.order, other.order = other.order, lesson.order
        if lesson.order == other.order:
            lesson.order = idx
            other.order = idx + 1
        lesson.save()
        other.save()
    elif direction == 'down' and idx < len(lessons) - 1:
        other = lessons[idx + 1]
        lesson.order, other.order = other.order, lesson.order
        if lesson.order == other.order:
            lesson.order = idx + 2
            other.order = idx + 1
        lesson.save()
        other.save()

    return {'reordered': True}


@transaction.atomic
def duplicate_lesson(user, lesson_id: str):
    """Duplique une leçon existante et tout son contenu pour enrichir rapidement un monde."""
    source = get_object_or_404(
        Lesson.objects.select_related('content', 'module'),
        lesson_id=lesson_id
    )
    module = source.module
    count = module.lessons.count()
    new_id = f"{source.lesson_id}-copie"
    suffix = 1
    while Lesson.objects.filter(lesson_id=new_id).exists():
        new_id = f"{source.lesson_id}-copie-{suffix}"
        suffix += 1

    clone = Lesson.objects.create(
        module=module,
        lesson_id=new_id,
        title=f"{source.title} (Copie)",
        lesson_type=source.lesson_type,
        minutes=source.minutes,
        xp=source.xp,
        stars=source.stars,
        order=count + 1,
    )

    if hasattr(source, 'content') and source.content:
        sc = source.content
        LessonContent.objects.create(
            lesson=clone,
            mission=sc.mission,
            objectives=sc.objectives,
            discover=sc.discover,
            example=sc.example,
            activity=sc.activity,
            remember=sc.remember,
            vocabulary=sc.vocabulary,
            challenge=sc.challenge,
            skill=sc.skill,
            questions=sc.questions,
            steps=sc.steps,
        )

    audit(user, 'lecon_dupliquee', f"Leçon « {source.title} » ({source.lesson_id}) dupliquée en {new_id}")
    return LessonDetailSerializer(clone).data
