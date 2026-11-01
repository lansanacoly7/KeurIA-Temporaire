"""Gestion du catalogue dynamique et versionné (modules et leçons du parcours 7-9).

Règles architecturales (T21) :
  - Le socle de référence reste `apps.curriculum.data.tracks_data.TRACKS_CATALOG` ;
  - Une version publiée du catalogue (`CatalogVersion` / `ContentVersion(kind='catalog79')`)
    surcharge le socle en base ;
  - Une leçon ayant de l'XP ou des progressions d'élèves ne peut JAMAIS être supprimée
    (HTTP 409 Conflict) : elle doit être masquée (`hidden=True`) ;
  - Les identifiants (`pX-Y`, `pX`) ne sont jamais réutilisés ;
  - Même cycle de vie que les leçons : brouillon -> publication différée (délai de sécurité) -> en ligne -> historique.
"""
from datetime import timedelta
from pathlib import Path
import json
import re

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework import status

from apps.curriculum.data.tracks_data import TRACKS_CATALOG
from apps.curriculum.models import AgeTrack, ContentVersion, Lesson, Module
from apps.curriculum.versions import committed, draft_version, live_version, next_number, pending_version
from apps.progress.models import Progress, QuizAttempt
from apps.scolaire.errors import ApiError, NotFound

KIND_CATALOG = ContentVersion.KIND_CATALOG79
MODULE_ID_RE = re.compile(r'^p\d{1,2}$')
LESSON_ID_RE = re.compile(r'^p\d{1,2}-\d{1,2}$')


def _delay() -> int:
    return max(0, int(getattr(settings, 'STUDIO_PUBLISH_DELAY_MINUTES', 15)))


def _iso(value):
    return value.isoformat() if value else None


def base_catalog(track_key='7-9') -> dict:
    """Catalogue socle par défaut extrait de tracks_data.py."""
    for track in TRACKS_CATALOG:
        if track.get('key') != track_key:
            continue
        modules = []
        lessons = []
        for mod_idx, world in enumerate(track.get('worlds', []), 1):
            modules.append({
                'id': world['id'],
                'title': world['title'],
                'description': world.get('description', ''),
                'color': world.get('color', 'sun'),
                'icon': world.get('icon', '🤖'),
                'order': world.get('order', mod_idx),
                'hidden': False,
            })
            for les_idx, title in enumerate(world.get('lessons', []), 1):
                lessons.append({
                    'id': f"{world['id']}-{les_idx}",
                    'moduleId': world['id'],
                    'title': title,
                    'order': les_idx,
                    'hidden': False,
                })
        return {'modules': modules, 'lessons': lessons}
    # Découverte dynamique si des fichiers existent dans le dossier du parcours
    try:
        from apps.curriculum.parcours79 import TRACK_CONFIGS
        if track_key in TRACK_CONFIGS:
            cfg = TRACK_CONFIGS[track_key]
            cdir = Path(cfg['content_dir'])
            if cdir.exists():
                modules, lessons = [], []
                for p_file in sorted(cdir.glob(cfg['file_glob'])):
                    try:
                        d = json.loads(p_file.read_text(encoding='utf-8'))
                        m = d.get('module', {})
                        mid = m.get('id')
                        if mid:
                            modules.append({
                                'id': mid,
                                'title': m.get('title', ''),
                                'description': m.get('intro', ''),
                                'color': 'sun',
                                'icon': m.get('emoji', '🤖'),
                                'order': m.get('chapter', len(modules) + 1),
                                'hidden': False,
                            })
                            for les_idx, les in enumerate(d.get('lessons', []), 1):
                                lessons.append({
                                    'id': les.get('id', f"{mid}-{les_idx}"),
                                    'moduleId': mid,
                                    'title': les.get('title', ''),
                                    'order': les_idx,
                                    'hidden': False,
                                })
                    except Exception:
                        pass
                if modules:
                    return {'modules': modules, 'lessons': lessons}
    except Exception:
        pass
    return {'modules': [], 'lessons': []}


def get_active_catalog(track_key='7-9', now=None) -> dict:
    """Version du catalogue actuellement en ligne pour les élèves et les contrôles."""
    now = now or timezone.now()
    try:
        live = live_version(KIND_CATALOG, track_key, now)
        if live and isinstance(live.content, dict) and 'modules' in live.content and 'lessons' in live.content:
            return live.content
    except (RuntimeError, Exception):
        pass
    return base_catalog(track_key)


def get_working_catalog(track_key='7-9', now=None) -> tuple[dict, str]:
    """Catalogue de travail dans le Studio : brouillon d'abord, puis en attente, puis en ligne, sinon socle."""
    now = now or timezone.now()
    try:
        draft = draft_version(KIND_CATALOG, track_key)
        if draft and isinstance(draft.content, dict):
            return draft.content, 'draft'
        pending = pending_version(KIND_CATALOG, track_key, now)
        if pending and isinstance(pending.content, dict):
            return pending.content, 'pending'
        live = live_version(KIND_CATALOG, track_key, now)
        if live and isinstance(live.content, dict):
            return live.content, 'live'
    except (RuntimeError, Exception):
        pass
    return base_catalog(track_key), 'base'


def _version_payload(version, *, now=None, live_number=None) -> dict | None:
    if version is None:
        return None
    now = now or timezone.now()
    return {
        'id': version.pk,
        'number': version.number,
        'source': version.source,
        'note': version.note,
        'author': version.author_email or None,
        'createdAt': _iso(version.created_at),
        'updatedAt': _iso(version.updated_at),
        'publishAt': _iso(version.publish_at),
        'state': ('draft' if version.publish_at is None else 'pending' if version.publish_at > now
                  else 'live' if version.number == live_number else 'past'),
    }


def get_catalog_overview(track_key='7-9') -> dict:
    """Vue d'ensemble complète du catalogue pour l'administration."""
    now = timezone.now()
    working_content, origin = get_working_catalog(track_key, now)
    live = live_version(KIND_CATALOG, track_key, now)
    pending = pending_version(KIND_CATALOG, track_key, now)
    draft = draft_version(KIND_CATALOG, track_key)
    live_num = live.number if live else None

    history = committed(KIND_CATALOG, track_key).defer('content').order_by('-number')[:20]

    return {
        'trackKey': track_key,
        'working': {
            'origin': origin,
            'content': working_content,
        },
        'hasDraft': draft is not None,
        'draft': _version_payload(draft, now=now, live_number=live_num),
        'pending': _version_payload(pending, now=now, live_number=live_num),
        'live': _version_payload(live, now=now, live_number=live_num),
        'history': [_version_payload(v, now=now, live_number=live_num) for v in history],
        'delayMinutes': _delay(),
    }


def _validate_catalog_shape(content: dict) -> None:
    if not isinstance(content, dict):
        raise ApiError('Le catalogue doit être un objet JSON valide.', status.HTTP_400_BAD_REQUEST)
    modules = content.get('modules')
    lessons = content.get('lessons')
    if not isinstance(modules, list) or not isinstance(lessons, list):
        raise ApiError('Le catalogue doit contenir des listes de « modules » et de « lessons ».', status.HTTP_400_BAD_REQUEST)
    if not modules:
        raise ApiError('Le catalogue doit comporter au moins un module.', status.HTTP_400_BAD_REQUEST)

    mod_ids = set()
    for m in modules:
        if not isinstance(m, dict) or not m.get('id') or not m.get('title'):
            raise ApiError('Chaque module doit posséder un « id » et un « title ».', status.HTTP_400_BAD_REQUEST)
        mid = str(m['id']).strip()
        if mid in mod_ids:
            raise ApiError(f'Identifiant de module dupliqué : {mid}', status.HTTP_400_BAD_REQUEST)
        mod_ids.add(mid)

    les_ids = set()
    for les in lessons:
        if not isinstance(les, dict) or not les.get('id') or not les.get('title') or not les.get('moduleId'):
            raise ApiError('Chaque leçon doit posséder un « id », « title » et « moduleId ».', status.HTTP_400_BAD_REQUEST)
        lid = str(les['id']).strip()
        if lid in les_ids:
            raise ApiError(f'Identifiant de leçon dupliqué : {lid}', status.HTTP_400_BAD_REQUEST)
        if les['moduleId'] not in mod_ids:
            raise ApiError(f"Le module « {les['moduleId']} » de la leçon {lid} n'existe pas.", status.HTTP_400_BAD_REQUEST)
        les_ids.add(lid)


def save_catalog_draft(user, track_key='7-9', content=None, note=''):
    """Enregistre ou met à jour le brouillon du catalogue."""
    _validate_catalog_shape(content)
    with transaction.atomic():
        draft = draft_version(KIND_CATALOG, track_key)
        if draft:
            draft.content = content
            draft.note = note or draft.note
            draft.author = user
            draft.author_email = getattr(user, 'email', '')
            draft.save()
        else:
            draft = ContentVersion.objects.create(
                kind=KIND_CATALOG,
                key=track_key,
                number=next_number(KIND_CATALOG, track_key),
                content=content,
                source=ContentVersion.SOURCE_STUDIO,
                note=note or "Brouillon du catalogue",
                author=user,
                author_email=getattr(user, 'email', ''),
                publish_at=None,
            )
    return get_catalog_overview(track_key)


def discard_catalog_draft(user, track_key='7-9'):
    """Écarte le brouillon du catalogue en cours."""
    draft = draft_version(KIND_CATALOG, track_key)
    if draft:
        draft.discarded_at = timezone.now()
        draft.save()
    return {'ok': True}


def publish_catalog(user, track_key='7-9', note='', delay_minutes=None, immediate=False):
    """Programme ou applique la publication du catalogue."""
    content, origin = get_working_catalog(track_key)
    _validate_catalog_shape(content)

    now = timezone.now()
    delay = 0 if immediate else (_delay() if delay_minutes is None else max(0, int(delay_minutes)))
    publish_at = now - timedelta(seconds=1) if delay == 0 else now + timedelta(minutes=delay)

    with transaction.atomic():
        # Écarter toute publication en attente précédente
        pending = pending_version(KIND_CATALOG, track_key, now)
        if pending:
            pending.discarded_at = now
            pending.save()

        # Écarter le brouillon actif
        draft = draft_version(KIND_CATALOG, track_key)
        if draft:
            draft.discarded_at = now
            draft.save()

        version = ContentVersion.objects.create(
            kind=KIND_CATALOG,
            key=track_key,
            number=next_number(KIND_CATALOG, track_key),
            content=content,
            source=ContentVersion.SOURCE_STUDIO,
            note=note or ("Mise en ligne du catalogue" if delay == 0 else f"Publication programmée (délai {delay} min)"),
            author=user,
            author_email=getattr(user, 'email', ''),
            publish_at=publish_at,
        )

        if publish_at <= now:
            sync_db_curriculum(content, track_key)

    return {
        'ok': True,
        'state': 'live' if publish_at <= now else 'pending',
        'publishAt': _iso(publish_at),
        'versionNumber': version.number,
    }


def cancel_pending_catalog(user, track_key='7-9'):
    """Annule la publication programmée du catalogue."""
    now = timezone.now()
    pending = pending_version(KIND_CATALOG, track_key, now)
    if not pending:
        raise NotFound("Aucune publication du catalogue n'est en attente.")
    pending.discarded_at = now
    pending.save()
    return {'ok': True}


def rollback_catalog(user, track_key='7-9', number=None):
    """Restaure immédiatement une version antérieure du catalogue."""
    if number is None:
        raise ApiError('Le numéro de version est obligatoire.', status.HTTP_400_BAD_REQUEST)
    target = committed(KIND_CATALOG, track_key).filter(number=number).first()
    if not target:
        raise NotFound(f"La version #{number} du catalogue est introuvable.")

    now = timezone.now()
    with transaction.atomic():
        # Écarter brouillon et attente
        draft = draft_version(KIND_CATALOG, track_key)
        if draft:
            draft.discarded_at = now
            draft.save()
        pending = pending_version(KIND_CATALOG, track_key, now)
        if pending:
            pending.discarded_at = now
            pending.save()

        restored = ContentVersion.objects.create(
            kind=KIND_CATALOG,
            key=track_key,
            number=next_number(KIND_CATALOG, track_key),
            content=target.content,
            source=ContentVersion.SOURCE_ROLLBACK,
            note=f"Restauration de la version #{number}",
            author=user,
            author_email=getattr(user, 'email', ''),
            publish_at=now - timedelta(seconds=1),
        )
        sync_db_curriculum(target.content, track_key)

    return {'ok': True, 'restoredNumber': restored.number}


def create_lesson(user, module_id: str, title: str = 'Nouvelle leçon') -> dict:
    """Crée une nouvelle leçon dans un module avec identifiant garanti unique et contenu vierge valide."""
    content, _ = get_working_catalog('7-9')
    target_module = next((m for m in content.get('modules', []) if m['id'] == module_id), None)
    if not target_module:
        raise NotFound(f"Le module « {module_id} » n'existe pas dans le catalogue.")

    # Trouver le numéro de suffixe le plus élevé jamais utilisé dans ce module
    module_lessons = [les for les in content.get('lessons', []) if les.get('moduleId') == module_id]
    used_numbers = set()
    for les in module_lessons:
        match = re.search(r'-(\d+)$', les['id'])
        if match:
            used_numbers.add(int(match.group(1)))

    # Vérifier aussi dans l'historique de ContentVersion pour ne jamais réutiliser un ID
    for key in ContentVersion.objects.filter(kind=ContentVersion.KIND_LESSON79, key__startswith=f"{module_id}-").values_list('key', flat=True):
        match = re.search(r'-(\d+)$', key)
        if match:
            used_numbers.add(int(match.group(1)))

    # Vérifier aussi dans le socle
    for les in base_catalog('7-9').get('lessons', []):
        if les.get('moduleId') == module_id:
            match = re.search(r'-(\d+)$', les['id'])
            if match:
                used_numbers.add(int(match.group(1)))

    next_num = (max(used_numbers) if used_numbers else 0) + 1
    new_lesson_id = f"{module_id}-{next_num}"
    clean_title = (title or 'Nouvelle leçon').strip()
    next_order = len(module_lessons) + 1

    new_lesson_entry = {
        'id': new_lesson_id,
        'moduleId': module_id,
        'title': clean_title,
        'order': next_order,
        'hidden': False,
    }

    # Contenu initial 100% conforme aux règles de validation
    initial_content = {
        'id': new_lesson_id,
        'title': clean_title,
        'screens': [
            {
                'kind': 'story',
                'pose': 'Content',
                'text': 'Découvrons ensemble cette nouvelle aventure avec Palou !',
            },
            {
                'kind': 'why',
                'pose': 'Intelligent',
                'question': 'À ton avis, comment fonctionne cette nouvelle notion ?',
                'answer': 'Regardons de plus près avec des exemples simples.',
            },
            {
                'kind': 'play',
                'pose': 'Content',
                'text': 'À toi de jouer pour t’entraîner !',
                'rounds': [
                    {
                        'type': 'choice',
                        'question': 'Quelle est la bonne attitude avec l’IA ?',
                        'options': [
                            {'label': 'Apprendre et comprendre avec curiosité', 'correct': True},
                            {'label': 'Croire tout sans vérifier', 'correct': False},
                        ],
                    }
                ],
            },
            {
                'kind': 'bravo',
                'pose': 'Victoire',
                'text': 'Bravo ! Tu as franchi cette étape avec brio.',
            },
        ],
    }

    # Créer le brouillon initial de la leçon
    with transaction.atomic():
        ContentVersion.objects.create(
            kind=ContentVersion.KIND_LESSON79,
            key=new_lesson_id,
            number=1,
            content=initial_content,
            source=ContentVersion.SOURCE_STUDIO,
            note="Création de la leçon",
            author=user,
            author_email=getattr(user, 'email', ''),
            publish_at=None,
        )
        new_content = dict(content)
        new_content['lessons'] = list(new_content.get('lessons', [])) + [new_lesson_entry]
        save_catalog_draft(user, '7-9', new_content, note=f"Ajout de la leçon {new_lesson_id}")

    return {
        'ok': True,
        'lesson': new_lesson_entry,
        'content': initial_content,
    }


def delete_or_hide_lesson(user, lesson_id: str) -> dict:
    """Supprime une leçon si aucun élève n'a de progression dessus, sinon lève 409 (doit être masquée)."""
    content, _ = get_working_catalog('7-9')
    lesson = next((les for les in content.get('lessons', []) if les['id'] == lesson_id), None)
    if not lesson:
        raise NotFound(f"La leçon « {lesson_id} » n'existe pas dans le catalogue.")

    # Règle d'or de protection de données
    has_progress = (Progress.objects.filter(lesson_id=lesson_id).exists()
                    or QuizAttempt.objects.filter(quiz_id=lesson_id).exists())
    if has_progress:
        raise ApiError(
            "Cette leçon possède déjà des progressions d'élèves enregistrées : elle ne peut pas être supprimée, mais peut être masquée.",
            status.HTTP_409_CONFLICT,
        )

    new_lessons = [les for les in content.get('lessons', []) if les['id'] != lesson_id]
    new_content = dict(content)
    new_content['lessons'] = new_lessons
    save_catalog_draft(user, '7-9', new_content, note=f"Suppression de la leçon {lesson_id}")

    return {'ok': True, 'deleted': True, 'id': lesson_id}


def toggle_hide_lesson(user, lesson_id: str) -> dict:
    """Bascule l'état masqué / affiché d'une leçon."""
    content, _ = get_working_catalog('7-9')
    lesson = next((les for les in content.get('lessons', []) if les['id'] == lesson_id), None)
    if not lesson:
        raise NotFound(f"La leçon « {lesson_id} » n'existe pas dans le catalogue.")

    new_hidden = not lesson.get('hidden', False)
    new_lessons = []
    for les in content.get('lessons', []):
        if les['id'] == lesson_id:
            updated = dict(les)
            updated['hidden'] = new_hidden
            new_lessons.append(updated)
        else:
            new_lessons.append(les)

    new_content = dict(content)
    new_content['lessons'] = new_lessons
    action_str = "Masquage" if new_hidden else "Affichage"
    save_catalog_draft(user, '7-9', new_content, note=f"{action_str} de la leçon {lesson_id}")

    return {'ok': True, 'id': lesson_id, 'hidden': new_hidden}


def duplicate_lesson(user, lesson_id: str) -> dict:
    """Duplique une leçon existante vers un nouvel identifiant dans le même module."""
    from apps.superadmin import studio79

    content, _ = get_working_catalog('7-9')
    source_lesson = next((les for les in content.get('lessons', []) if les['id'] == lesson_id), None)
    if not source_lesson:
        raise NotFound(f"La leçon source « {lesson_id} » n'existe pas dans le catalogue.")

    mod_id = source_lesson['moduleId']
    module_lessons = [les for les in content.get('lessons', []) if les.get('moduleId') == mod_id]
    used_numbers = set()
    for les in module_lessons:
        match = re.search(r'-(\d+)$', les['id'])
        if match:
            used_numbers.add(int(match.group(1)))

    next_num = (max(used_numbers) if used_numbers else 0) + 1
    new_id = f"{mod_id}-{next_num}"
    new_title = f"{source_lesson['title']} (copie)"

    # Récupérer le contenu de la leçon d'origine
    orig_data = studio79.get_lesson(lesson_id)
    raw_content = orig_data.get('working', {}).get('content') or orig_data.get('live', {}).get('content')
    if not raw_content:
        raise ApiError(f"Impossible de lire le contenu de la leçon {lesson_id}.", status.HTTP_400_BAD_REQUEST)

    new_content_obj = json.loads(json.dumps(raw_content))
    new_content_obj['id'] = new_id
    new_content_obj['title'] = new_title

    with transaction.atomic():
        ContentVersion.objects.create(
            kind=ContentVersion.KIND_LESSON79,
            key=new_id,
            number=1,
            content=new_content_obj,
            source=ContentVersion.SOURCE_STUDIO,
            note=f"Duplication depuis {lesson_id}",
            author=user,
            author_email=getattr(user, 'email', ''),
            publish_at=None,
        )

        new_entry = {
            'id': new_id,
            'moduleId': mod_id,
            'title': new_title,
            'order': len(module_lessons) + 1,
            'hidden': False,
        }
        new_catalog = dict(content)
        new_catalog['lessons'] = list(new_catalog.get('lessons', [])) + [new_entry]
        save_catalog_draft(user, '7-9', new_catalog, note=f"Duplication de {lesson_id} vers {new_id}")

    return {'ok': True, 'lesson': new_entry}


def create_module(user, title: str = 'Nouveau module', description: str = '', color: str = 'sun', icon: str = '🌟') -> dict:
    """Crée un nouveau module avec identifiant pN incrémenté."""
    content, _ = get_working_catalog('7-9')
    modules = content.get('modules', [])

    used_numbers = set()
    for m in modules:
        match = re.search(r'^p(\d+)$', m['id'])
        if match:
            used_numbers.add(int(match.group(1)))

    next_num = (max(used_numbers) if used_numbers else 0) + 1
    new_mod_id = f"p{next_num}"
    clean_title = (title or f"Module {next_num}").strip()

    new_mod_entry = {
        'id': new_mod_id,
        'title': clean_title,
        'description': description or "Découverte et activités d’apprentissage.",
        'color': color or 'sun',
        'icon': icon or '🌟',
        'order': len(modules) + 1,
        'hidden': False,
    }

    # Créer automatiquement une première leçon pour ce module
    first_lesson_id = f"{new_mod_id}-1"
    first_lesson_title = f"Premiers pas ({clean_title})"
    first_lesson_entry = {
        'id': first_lesson_id,
        'moduleId': new_mod_id,
        'title': first_lesson_title,
        'order': 1,
        'hidden': False,
    }

    initial_content = {
        'id': first_lesson_id,
        'title': first_lesson_title,
        'screens': [
            {'kind': 'story', 'pose': 'Content', 'text': f"Bienvenue dans {clean_title} !"},
            {'kind': 'why', 'pose': 'Intelligent', 'question': 'Que découvrons-nous ici ?', 'answer': 'Un tout nouvel univers passionnant.'},
            {'kind': 'play', 'pose': 'Content', 'text': 'À toi de jouer !', 'rounds': [{'type': 'choice', 'question': 'Es-tu prêt à explorer ?', 'options': [{'label': 'Oui, en route !', 'correct': True}, {'label': 'Pas encore', 'correct': False}]}]},
            {'kind': 'bravo', 'pose': 'Victoire', 'text': 'Bravo pour cette première étape !'},
        ],
    }

    with transaction.atomic():
        ContentVersion.objects.create(
            kind=ContentVersion.KIND_LESSON79,
            key=first_lesson_id,
            number=1,
            content=initial_content,
            source=ContentVersion.SOURCE_STUDIO,
            note="Création automatique du module",
            author=user,
            author_email=getattr(user, 'email', ''),
            publish_at=None,
        )

        new_catalog = dict(content)
        new_catalog['modules'] = list(new_catalog.get('modules', [])) + [new_mod_entry]
        new_catalog['lessons'] = list(new_catalog.get('lessons', [])) + [first_lesson_entry]
        save_catalog_draft(user, '7-9', new_catalog, note=f"Création du module {new_mod_id}")

    return {
        'ok': True,
        'module': new_mod_entry,
        'firstLesson': first_lesson_entry,
    }


def reorder_lessons(user, module_id: str, lesson_ids: list[str]) -> dict:
    """Réordonne les leçons au sein d'un module."""
    content, _ = get_working_catalog('7-9')
    target_lessons = [les for les in content.get('lessons', []) if les.get('moduleId') == module_id]
    existing_ids = {les['id'] for les in target_lessons}
    if set(lesson_ids) != existing_ids:
        raise ApiError('La liste des identifiants doit correspondre exactement aux leçons du module.', status.HTTP_400_BAD_REQUEST)

    order_map = {lid: idx + 1 for idx, lid in enumerate(lesson_ids)}
    new_lessons = []
    for les in content.get('lessons', []):
        if les['id'] in order_map:
            updated = dict(les)
            updated['order'] = order_map[les['id']]
            new_lessons.append(updated)
        else:
            new_lessons.append(les)

    new_content = dict(content)
    new_content['lessons'] = new_lessons
    save_catalog_draft(user, '7-9', new_content, note=f"Réordonnancement des leçons du module {module_id}")
    return {'ok': True, 'lessons': [les for les in new_lessons if les.get('moduleId') == module_id]}


def reorder_modules(user, module_ids: list[str]) -> dict:
    """Réordonne les modules du parcours."""
    content, _ = get_working_catalog('7-9')
    existing_ids = {m['id'] for m in content.get('modules', [])}
    if set(module_ids) != existing_ids:
        raise ApiError('La liste des identifiants doit correspondre exactement aux modules existants.', status.HTTP_400_BAD_REQUEST)

    order_map = {mid: idx + 1 for idx, mid in enumerate(module_ids)}
    new_modules = []
    for m in content.get('modules', []):
        updated = dict(m)
        updated['order'] = order_map[m['id']]
        new_modules.append(updated)
    new_modules.sort(key=lambda m: m['order'])

    new_content = dict(content)
    new_content['modules'] = new_modules
    save_catalog_draft(user, '7-9', new_content, note="Réordonnancement des modules")
    return {'ok': True, 'modules': new_modules}


def sync_db_curriculum(catalog_content: dict, track_key='7-9') -> None:
    """Synchronise les tables relationnelles Module et Lesson de Django avec le catalogue publié."""
    try:
        track, _ = AgeTrack.objects.get_or_create(
            key=track_key,
            defaults={
                'label': '7–9 ans',
                'name': 'Petits Explorateurs',
                'tagline': 'Je découvre l’IA avec des histoires, des images et des jeux.',
                'accent': '#f4b942',
                'order': 1,
            },
        )
    except Exception:
        return

    modules_by_id = {}
    for m in catalog_content.get('modules', []):
        mod_obj, _ = Module.objects.update_or_create(
            track=track,
            world_id=m['id'],
            defaults={
                'title': m['title'],
                'icon': m.get('icon', '🤖'),
                'description': m.get('description', ''),
                'color': m.get('color', 'sun'),
                'order': m.get('order', 1),
            },
        )
        modules_by_id[m['id']] = mod_obj

    for les in catalog_content.get('lessons', []):
        mod_obj = modules_by_id.get(les.get('moduleId'))
        if mod_obj:
            Lesson.objects.update_or_create(
                module=mod_obj,
                lesson_id=les['id'],
                defaults={
                    'title': les['title'],
                    'order': les.get('order', 1),
                    'lesson_type': 'histoire',
                    'minutes': 5,
                    'xp': 20,
                    'stars': 3,
                },
            )
