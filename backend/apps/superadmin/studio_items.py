"""Studio de gestion des énigmes, défis du jour, devoirs et jeux (T22).

Généralisation du cycle ContentVersion :
  - Brouillon (draft) -> Publication programmée (pending, délai de 15 min ou immédiate) -> En ligne (live) -> Historique (archived).
  - Validation de structure stricte côté serveur (une seule bonne réponse, champs obligatoires, etc.).
  - Restauration immédiate (rollback) et annulation (cancel).
  - Application directe sur la base de données (modèles Riddle, DailyChallenge, Mission, Activity)
    dès qu'une version passe en ligne.
"""
import contextlib
from datetime import timedelta
import json

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import status

from apps.curriculum.models import Activity, ContentVersion, DailyChallenge, Riddle
from apps.curriculum.versions import committed, draft_version, live_version, next_number, pending_version
from apps.scolaire.errors import ApiError, NotFound
from apps.scolaire.models import Mission

from .services import audit

SUPPORTED_KINDS = (
    ContentVersion.KIND_RIDDLE,
    ContentVersion.KIND_DAILY_CHALLENGE,
    ContentVersion.KIND_MISSION,
    ContentVersion.KIND_ACTIVITY,
)

MAX_CONTENT_BYTES = 2 * 1024 * 1024


def _delay() -> int:
    return max(0, int(getattr(settings, 'STUDIO_PUBLISH_DELAY_MINUTES', 15)))


def _iso(value):
    return value.isoformat() if value else None


def _check_kind(kind: str):
    if kind not in SUPPORTED_KINDS:
        raise NotFound(f"Type de contenu inconnu : {kind}.")


# ─── Synchronisation automatique des versions arrivées à échéance ────────────

def sync_due_pending_versions():
    """Applique en base toute publication programmée dont l'heure de mise en ligne est passée."""
    now = timezone.now()
    due_versions = (
        ContentVersion.objects.filter(
            kind__in=SUPPORTED_KINDS,
            publish_at__lte=now,
            discarded_at__isnull=True,
        )
        .order_by('kind', 'key', '-publish_at', '-number')
    )
    processed = set()
    for v in due_versions:
        item_ref = (v.kind, v.key)
        if item_ref in processed:
            continue
        processed.add(item_ref)
        with contextlib.suppress(Exception):
            _apply_live_to_db(v.kind, v.key, v.content)


# ─── Conversion Modèle DB <-> Contenu JSON ───────────────────────────────────

def _base_content(kind: str, key: str) -> dict | None:
    """Extrait le contenu JSON depuis l'enregistrement en base de données."""
    if kind == ContentVersion.KIND_RIDDLE:
        pk = int(key) if str(key).isdigit() else None
        r = Riddle.objects.filter(pk=pk).first() if pk else None
        if not r:
            return None
        return {
            'id': str(r.id),
            'lessonId': r.lesson_id,
            'question': r.question,
            'options': list(r.options),
            'correctIndex': r.correct_index,
            'explanation': r.explanation,
            'isActive': r.is_active,
        }

    if kind == ContentVersion.KIND_DAILY_CHALLENGE:
        pk = int(key) if str(key).isdigit() else None
        dc = DailyChallenge.objects.filter(pk=pk).first() if pk else None
        if not dc:
            return None
        return {
            'id': str(dc.id),
            'theme': dc.theme,
            'question': dc.question,
            'options': list(dc.options),
            'correctIndex': dc.correct_index,
            'explanation': dc.explanation,
            'isActive': dc.is_active,
            'order': dc.order,
        }

    if kind == ContentVersion.KIND_MISSION:
        m = Mission.objects.filter(pk=str(key)).first()
        if not m:
            return None
        from apps.scolaire.mission_quizzes import quiz_for
        quiz_steps = []
        with contextlib.suppress(Exception):
            quiz_steps = quiz_for(m)
        return {
            'id': str(m.id),
            'title': m.title,
            'description': m.description,
            'category': m.category,
            'difficulty': m.difficulty,
            'durationMinutes': m.duration_minutes,
            'xp': m.xp,
            'active': m.active,
            'track': m.track or '7-9',
            'kind': m.kind,
            'questions': quiz_steps,
        }

    if kind == ContentVersion.KIND_ACTIVITY:
        act = Activity.objects.filter(activity_id=str(key)).first()
        if not act:
            return None
        return {
            'activityId': act.activity_id,
            'kind': act.kind,
            'title': act.title,
            'xp': act.xp,
            'isActive': act.is_active,
        }

    return None


def _apply_live_to_db(kind: str, key: str, content: dict):
    """Applique une version mise en ligne sur le modèle de base de données correspondant."""
    if not isinstance(content, dict):
        return

    if kind == ContentVersion.KIND_RIDDLE:
        pk = int(key) if str(key).isdigit() else None
        fields = {
            'lesson_id': content.get('lessonId') or content.get('lesson_id', 'p1-1'),
            'question': content.get('question', ''),
            'options': list(content.get('options', [])),
            'correct_index': int(content.get('correctIndex', content.get('correct_index', 0))),
            'explanation': content.get('explanation', ''),
            'is_active': bool(content.get('isActive', content.get('is_active', True))),
        }
        if pk and Riddle.objects.filter(pk=pk).exists():
            Riddle.objects.filter(pk=pk).update(**fields)
        else:
            r = Riddle.objects.create(**fields)
            if str(key) != str(r.pk):
                ContentVersion.objects.filter(kind=kind, key=key).update(key=str(r.pk))

    elif kind == ContentVersion.KIND_DAILY_CHALLENGE:
        pk = int(key) if str(key).isdigit() else None
        fields = {
            'theme': content.get('theme', 'Général'),
            'question': content.get('question', ''),
            'options': list(content.get('options', [])),
            'correct_index': int(content.get('correctIndex', content.get('correct_index', 0))),
            'explanation': content.get('explanation', ''),
            'is_active': bool(content.get('isActive', content.get('is_active', True))),
            'order': int(content.get('order', 1)),
        }
        if pk and DailyChallenge.objects.filter(pk=pk).exists():
            DailyChallenge.objects.filter(pk=pk).update(**fields)
        else:
            dc = DailyChallenge.objects.create(**fields)
            if str(key) != str(dc.pk):
                ContentVersion.objects.filter(kind=kind, key=key).update(key=str(dc.pk))

    elif kind == ContentVersion.KIND_MISSION:
        m_id = str(key)
        fields = {
            'title': content.get('title', ''),
            'description': content.get('description', ''),
            'category': content.get('category', 'Général'),
            'difficulty': content.get('difficulty', 'Facile'),
            'duration_minutes': int(content.get('durationMinutes', content.get('duration_minutes', 10))),
            'xp': int(content.get('xp', 20)),
            'active': bool(content.get('active', True)),
            'track': content.get('track', '7-9'),
        }
        if Mission.objects.filter(pk=m_id).exists():
            Mission.objects.filter(pk=m_id).update(**fields)
        else:
            Mission.objects.create(id=m_id, **fields)

    elif kind == ContentVersion.KIND_ACTIVITY:
        act_id = str(key)
        fields = {
            'kind': content.get('kind', Activity.KIND_ARCADE_GAME),
            'title': content.get('title', ''),
            'xp': int(content.get('xp', 25)),
            'is_active': bool(content.get('isActive', content.get('is_active', True))),
        }
        if Activity.objects.filter(activity_id=act_id).exists():
            Activity.objects.filter(activity_id=act_id).update(**fields)
        else:
            Activity.objects.create(activity_id=act_id, **fields)


def _ensure_seeded(kind: str, key: str) -> None:
    """Si aucune version n'existe dans ContentVersion, crée la v1 en ligne depuis la table existante."""
    if ContentVersion.objects.filter(kind=kind, key=key).exists():
        return
    base = _base_content(kind, key)
    if base is None:
        return
    try:
        with transaction.atomic():
            ContentVersion.objects.create(
                kind=kind,
                key=key,
                number=1,
                content=base,
                source=ContentVersion.SOURCE_IMPORT,
                note="Contenu d'origine",
                publish_at=timezone.now() - timedelta(seconds=1),
            )
    except IntegrityError:
        pass


# ─── Validation ──────────────────────────────────────────────────────────────

def validate_item(kind: str, key: str, content: dict) -> list[dict]:
    """Validation de structure stricte côté serveur."""
    _check_kind(kind)
    issues = []

    if not isinstance(content, dict):
        return [{'severity': 'error', 'field': None, 'message': 'Le contenu doit être un objet JSON valide.'}]

    if kind == ContentVersion.KIND_RIDDLE:
        question = str(content.get('question') or '').strip()
        if not question:
            issues.append({'severity': 'error', 'field': 'question', 'message': 'La question est obligatoire.'})
        elif len(question) < 5:
            issues.append({'severity': 'error', 'field': 'question', 'message': 'La question est trop courte.'})
        elif not question.endswith('?'):
            issues.append({'severity': 'warning', 'field': 'question', 'message': 'Une énigme se termine généralement par un point d\'interrogation.'})

        options = content.get('options')
        if not isinstance(options, list) or len(options) < 2:
            issues.append({'severity': 'error', 'field': 'options', 'message': 'Au moins 2 options de réponse sont requises (3 recommandées).'})
        elif len(options) > 4:
            issues.append({'severity': 'error', 'field': 'options', 'message': 'Au plus 4 options de réponse sont acceptées.'})
        else:
            cleaned = [str(o).strip() for o in options]
            if any(not o for o in cleaned):
                issues.append({'severity': 'error', 'field': 'options', 'message': 'Toutes les options doivent contenir du texte.'})
            if len(set(cleaned)) < len(cleaned):
                issues.append({'severity': 'error', 'field': 'options', 'message': 'Les options doivent être distinctes.'})

        idx = content.get('correctIndex', content.get('correct_index'))
        if idx is None or not isinstance(idx, int) or isinstance(idx, bool):
            issues.append({'severity': 'error', 'field': 'correctIndex', 'message': 'Une bonne réponse doit être sélectionnée.'})
        elif isinstance(options, list) and (idx < 0 or idx >= len(options)):
            issues.append({'severity': 'error', 'field': 'correctIndex', 'message': f'L\'index de bonne réponse ({idx}) est hors limites.'})

        explanation = str(content.get('explanation') or '').strip()
        if not explanation:
            issues.append({'severity': 'error', 'field': 'explanation', 'message': 'L\'explication pédagogique est obligatoire.'})

        lesson_id = str(content.get('lessonId') or content.get('lesson_id') or '').strip()
        if not lesson_id:
            issues.append({'severity': 'error', 'field': 'lessonId', 'message': 'L\'énigme doit être rattachée à une leçon.'})

    elif kind == ContentVersion.KIND_DAILY_CHALLENGE:
        theme = str(content.get('theme') or '').strip()
        if not theme:
            issues.append({'severity': 'error', 'field': 'theme', 'message': 'Le thème est obligatoire.'})

        question = str(content.get('question') or '').strip()
        if not question:
            issues.append({'severity': 'error', 'field': 'question', 'message': 'La question du défi est obligatoire.'})

        options = content.get('options')
        if not isinstance(options, list) or len(options) < 2:
            issues.append({'severity': 'error', 'field': 'options', 'message': 'Au moins 2 options de réponse sont requises.'})
        else:
            cleaned = [str(o).strip() for o in options]
            if any(not o for o in cleaned):
                issues.append({'severity': 'error', 'field': 'options', 'message': 'Toutes les options doivent contenir du texte.'})

        idx = content.get('correctIndex', content.get('correct_index'))
        if idx is None or not isinstance(idx, int) or isinstance(idx, bool):
            issues.append({'severity': 'error', 'field': 'correctIndex', 'message': 'Une bonne réponse doit être sélectionnée.'})
        elif isinstance(options, list) and (idx < 0 or idx >= len(options)):
            issues.append({'severity': 'error', 'field': 'correctIndex', 'message': f'L\'index de bonne réponse ({idx}) est hors limites.'})

        explanation = str(content.get('explanation') or '').strip()
        if not explanation:
            issues.append({'severity': 'error', 'field': 'explanation', 'message': 'L\'explication est obligatoire.'})

    elif kind == ContentVersion.KIND_MISSION:
        title = str(content.get('title') or '').strip()
        if not title:
            issues.append({'severity': 'error', 'field': 'title', 'message': 'Le titre de la mission est obligatoire.'})

        description = str(content.get('description') or '').strip()
        if not description:
            issues.append({'severity': 'error', 'field': 'description', 'message': 'La description est obligatoire.'})

        duration = content.get('durationMinutes', content.get('duration_minutes'))
        if duration is None or not isinstance(duration, int | float) or duration <= 0:
            issues.append({'severity': 'error', 'field': 'durationMinutes', 'message': 'La durée estimée doit être un nombre de minutes positif.'})

        xp = content.get('xp')
        if xp is None or not isinstance(xp, int | float) or xp < 0:
            issues.append({'severity': 'error', 'field': 'xp', 'message': 'L\'XP doit être un entier positif ou nul.'})

        questions = content.get('questions')
        if questions and isinstance(questions, list):
            for q_idx, q in enumerate(questions, 1):
                if not isinstance(q, dict):
                    issues.append({'severity': 'error', 'field': f'question_{q_idx}', 'message': f'Question {q_idx} mal formée.'})
                    continue
                q_text = str(q.get('question') or q.get('prompt') or '').strip()
                if not q_text:
                    issues.append({'severity': 'error', 'field': f'question_{q_idx}', 'message': f'Le libellé de la question {q_idx} est vide.'})
                q_opts = q.get('options')
                if not isinstance(q_opts, list) or len(q_opts) < 2:
                    issues.append({'severity': 'error', 'field': f'question_{q_idx}', 'message': f'La question {q_idx} doit avoir au moins 2 options.'})

    elif kind == ContentVersion.KIND_ACTIVITY:
        title = str(content.get('title') or '').strip()
        if not title:
            issues.append({'severity': 'error', 'field': 'title', 'message': 'Le titre de l\'activité est obligatoire.'})

        xp = content.get('xp')
        if xp is None or not isinstance(xp, int | float) or xp < 0:
            issues.append({'severity': 'error', 'field': 'xp', 'message': 'L\'XP doit être positive ou nulle.'})

    return issues


# ─── Consultation ────────────────────────────────────────────────────────────

def _version_payload(version, *, now=None, live_number=None, content=False) -> dict | None:
    if version is None:
        return None
    now = now or timezone.now()
    payload = {
        'id': version.pk,
        'number': version.number,
        'source': version.source,
        'note': version.note,
        'author': version.author_email or None,
        'createdAt': _iso(version.created_at),
        'updatedAt': _iso(version.updated_at),
        'publishAt': _iso(version.publish_at),
        'state': (
            'draft' if version.publish_at is None
            else 'pending' if version.publish_at > now
            else 'live' if version.number == live_number
            else 'past'
        ),
    }
    if content:
        payload['content'] = version.content
    return payload


def list_items(kind: str) -> dict:
    """Liste tous les éléments du type demandé avec leur statut de versioning."""
    _check_kind(kind)
    sync_due_pending_versions()
    now = timezone.now()

    # Récupération de tous les identifiants existants en base
    keys = []
    meta_by_key = {}

    if kind == ContentVersion.KIND_RIDDLE:
        for r in Riddle.objects.all().order_by('id'):
            k = str(r.id)
            keys.append(k)
            meta_by_key[k] = {
                'id': k,
                'title': r.question,
                'subtitle': f"Leçon {r.lesson_id}",
                'isActive': r.is_active,
                'tag': r.lesson_id,
            }

    elif kind == ContentVersion.KIND_DAILY_CHALLENGE:
        for dc in DailyChallenge.objects.all().order_by('order', 'id'):
            k = str(dc.id)
            keys.append(k)
            meta_by_key[k] = {
                'id': k,
                'title': dc.question,
                'subtitle': f"Thème : {dc.theme}",
                'isActive': dc.is_active,
                'tag': dc.theme,
            }

    elif kind == ContentVersion.KIND_MISSION:
        for m in Mission.objects.all().order_by('id'):
            k = str(m.id)
            keys.append(k)
            meta_by_key[k] = {
                'id': k,
                'title': m.title,
                'subtitle': f"{m.category} • {m.difficulty} • {m.xp} XP",
                'isActive': m.active,
                'tag': m.track or 'Tous',
            }

    elif kind == ContentVersion.KIND_ACTIVITY:
        for act in Activity.objects.all().order_by('kind', 'activity_id'):
            k = str(act.activity_id)
            keys.append(k)
            meta_by_key[k] = {
                'id': k,
                'title': act.title,
                'subtitle': f"{act.get_kind_display()} • {act.xp} XP",
                'isActive': act.is_active,
                'tag': act.kind,
            }

    # ContentVersions existantes pour ce kind
    by_key: dict[str, list] = {}
    for version in ContentVersion.objects.filter(kind=kind, discarded_at__isnull=True).defer('content'):
        by_key.setdefault(version.key, []).append(version)
        if version.key not in meta_by_key:
            keys.append(version.key)
            meta_by_key[version.key] = {
                'id': version.key,
                'title': f"{kind} #{version.key}",
                'subtitle': 'Créé dans le studio',
                'isActive': True,
                'tag': 'Studio',
            }

    results = []
    for k in keys:
        versions = by_key.get(k, [])
        done = [v for v in versions if v.publish_at and v.publish_at <= now]
        live = max(done, key=lambda v: (v.publish_at, v.number), default=None)
        pending = max((v for v in versions if v.publish_at and v.publish_at > now), key=lambda v: v.number, default=None)
        draft = next((v for v in versions if v.publish_at is None), None)
        last = max(versions, key=lambda v: v.updated_at, default=None)

        meta = meta_by_key[k]
        results.append({
            'id': k,
            'kind': kind,
            'title': meta['title'],
            'subtitle': meta['subtitle'],
            'isActive': meta['isActive'],
            'tag': meta['tag'],
            'modified': bool(live and live.source != ContentVersion.SOURCE_IMPORT),
            'liveNumber': live.number if live else None,
            'hasDraft': draft is not None,
            'draftUpdatedAt': _iso(draft.updated_at) if draft else None,
            'pendingAt': _iso(pending.publish_at) if pending else None,
            'lastEditedAt': _iso(last.updated_at) if last and last.source != ContentVersion.SOURCE_IMPORT else None,
            'lastEditedBy': last.author_email or None if last and last.source != ContentVersion.SOURCE_IMPORT else None,
        })

    return {
        'kind': kind,
        'items': results,
        'delayMinutes': _delay(),
    }


def get_item(kind: str, key: str) -> dict:
    """Retourne l'état complet d'un élément (contenu de travail, en ligne, en attente, historique)."""
    _check_kind(kind)
    sync_due_pending_versions()
    _ensure_seeded(kind, key)
    now = timezone.now()

    live = live_version(kind, key, now)
    pending = pending_version(kind, key, now)
    draft = draft_version(kind, key)

    if not live and not pending and not draft:
        base = _base_content(kind, key)
        if base is None:
            raise NotFound(f"Cet élément ({kind} {key}) n'existe pas.")
        _ensure_seeded(kind, key)
        live = live_version(kind, key, now)

    working, origin = (draft, 'draft') if draft else (pending, 'pending') if pending else (live, 'live')
    live_number = live.number if live else None
    history = committed(kind, key).defer('content').order_by('-number')[:20]

    return {
        'id': key,
        'kind': kind,
        'live': _version_payload(live, now=now, live_number=live_number, content=True),
        'pending': _version_payload(pending, now=now, live_number=live_number),
        'draft': _version_payload(draft, now=now, live_number=live_number),
        'working': {'from': origin, 'content': working.content if working else {}},
        'history': [_version_payload(v, now=now, live_number=live_number) for v in history],
        'delayMinutes': _delay(),
        'issues': validate_item(kind, key, working.content if working else {}),
    }


# ─── Actions de modification et publication ──────────────────────────────────

def save_draft(actor, kind: str, key: str, content: dict, note: str = '') -> dict:
    """Enregistre le brouillon d'un élément."""
    _check_kind(kind)
    if not isinstance(content, dict):
        raise ApiError('Le contenu doit être un dictionnaire JSON.')
    if len(json.dumps(content, ensure_ascii=False).encode('utf-8')) > MAX_CONTENT_BYTES:
        raise ApiError('Contenu trop volumineux (dépasse 2 Mo).', status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)

    _ensure_seeded(kind, key)
    note = str(note or '').strip()[:200]

    with transaction.atomic():
        draft = draft_version(kind, key)
        if draft is None:
            draft = ContentVersion(
                kind=kind,
                key=key,
                number=next_number(kind, key),
                source=ContentVersion.SOURCE_STUDIO,
            )
        draft.content = content
        draft.note = note
        draft.author = actor
        draft.author_email = actor.email
        draft.save()

    return {
        'draft': _version_payload(draft),
        'issues': validate_item(kind, key, content),
    }


def discard_draft(actor, kind: str, key: str) -> dict:
    """Écarte le brouillon en cours."""
    _check_kind(kind)
    draft = draft_version(kind, key)
    if draft is None:
        raise ApiError("Il n'y a pas de brouillon à écarter.")
    draft.discarded_at = timezone.now()
    draft.save(update_fields=['discarded_at', 'updated_at'])
    audit(actor, 'studio_brouillon_ecarte', f"Brouillon de {kind} #{key} écarté")
    return {'ok': True}


def publish(actor, kind: str, key: str, note: str = '', delay_minutes: int = None, immediate: bool = False, acknowledge: bool = False) -> dict:
    """Programme ou applique la mise en ligne d'un élément."""
    _check_kind(kind)
    now = timezone.now()

    with transaction.atomic():
        draft = draft_version(kind, key)
        if draft is None:
            raise ApiError("Il n'y a pas de brouillon à publier : enregistrez d'abord des modifications.")

        issues = validate_item(kind, key, draft.content)
        errors = [i for i in issues if i['severity'] == 'error']
        warnings = [i for i in issues if i['severity'] == 'warning']

        if errors:
            raise ApiError(
                f"Publication bloquée : {len(errors)} erreur(s) à corriger.",
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                {'issues': issues, 'blocking': True},
            )

        if warnings and not acknowledge:
            raise ApiError(
                f"{len(warnings)} règle(s) de style demandent confirmation.",
                status.HTTP_409_CONFLICT,
                {'issues': issues, 'needsAcknowledge': True},
            )

        live = live_version(kind, key, now)
        pending = pending_version(kind, key, now)

        if pending is None and live is not None and live.content == draft.content:
            raise ApiError("Ce brouillon est identique à la version en ligne : rien à publier.")

        if pending is not None:
            pending.discarded_at = now
            pending.save(update_fields=['discarded_at', 'updated_at'])

        if immediate:
            draft.publish_at = now - timedelta(seconds=1)
        else:
            delay = _delay() if delay_minutes is None else max(0, int(delay_minutes))
            draft.publish_at = now + timedelta(minutes=delay)

        draft.author = actor
        draft.author_email = actor.email
        if note:
            draft.note = str(note).strip()[:200]
        draft.save()

        # Si mise en ligne immédiate, synchroniser directement le modèle DB
        if draft.publish_at <= now:
            _apply_live_to_db(kind, key, draft.content)

    verb = "mise en ligne immédiate" if draft.publish_at <= now else f"programmée pour {draft.publish_at:%d/%m %H:%M}"
    audit(actor, 'studio_publication', f"{kind} #{key} v{draft.number} : {verb}")

    return {
        'version': _version_payload(draft, now=now),
        'issues': issues,
    }


def cancel_pending(actor, kind: str, key: str) -> dict:
    """Annule la publication en attente (elle redevient brouillon)."""
    _check_kind(kind)
    now = timezone.now()

    with transaction.atomic():
        pending = pending_version(kind, key, now)
        if pending is None:
            raise ApiError("Aucune publication en attente : elle est peut-être déjà en ligne.")

        if draft_version(kind, key) is None:
            pending.publish_at = None
            pending.save(update_fields=['publish_at', 'updated_at'])
            outcome = 'revenue en brouillon'
        else:
            pending.discarded_at = now
            pending.save(update_fields=['discarded_at', 'updated_at'])
            outcome = 'écartée (un autre brouillon existe déjà)'

    audit(actor, 'studio_publication_annulee', f"{kind} #{key} : publication annulée, {outcome}")
    return {'outcome': outcome}


def rollback(actor, kind: str, key: str, number: int) -> dict:
    """Restaure immédiatement une ancienne version."""
    _check_kind(kind)
    now = timezone.now()

    with transaction.atomic():
        target = committed(kind, key).filter(number=number, publish_at__lte=now).first()
        if target is None:
            raise ApiError("Cette version n'existe pas ou n'est pas encore en ligne.", status.HTTP_404_NOT_FOUND)

        live = live_version(kind, key, now)
        if live is not None and live.number == target.number:
            raise ApiError("Cette version est déjà celle qui est en ligne.")

        pending = pending_version(kind, key, now)
        if pending is not None:
            pending.discarded_at = now
            pending.save(update_fields=['discarded_at', 'updated_at'])

        restored = ContentVersion.objects.create(
            kind=kind,
            key=key,
            number=next_number(kind, key),
            content=target.content,
            source=ContentVersion.SOURCE_ROLLBACK,
            note=f"Retour à la version {target.number}",
            author=actor,
            author_email=actor.email,
            publish_at=now,
        )
        _apply_live_to_db(kind, key, restored.content)

    audit(actor, 'studio_retour_arriere', f"{kind} #{key} : retour à la version {target.number}")
    return {'version': _version_payload(restored, now=now, live_number=restored.number)}


def create_item(actor, kind: str, initial_data: dict = None) -> dict:
    """Crée un nouvel élément avec brouillon initial et garantit un identifiant unique."""
    _check_kind(kind)
    initial_data = initial_data or {}

    with transaction.atomic():
        if kind == ContentVersion.KIND_RIDDLE:
            max_id = (Riddle.objects.all().order_by('-id').values_list('id', flat=True).first() or 0)
            custom_id = max_id + 1
            key = str(custom_id)
            content = {
                'id': key,
                'lessonId': initial_data.get('lessonId', 'p1-1'),
                'question': initial_data.get('question', 'Nouvelle énigme ?'),
                'options': list(initial_data.get('options', ['Bonne réponse', 'Mauvaise réponse A', 'Mauvaise réponse B'])),
                'correctIndex': int(initial_data.get('correctIndex', 0)),
                'explanation': initial_data.get('explanation', 'Explication pédagogique de l\'énigme.'),
                'isActive': True,
            }

        elif kind == ContentVersion.KIND_DAILY_CHALLENGE:
            max_id = (DailyChallenge.objects.all().order_by('-id').values_list('id', flat=True).first() or 0)
            custom_id = max_id + 1
            key = str(custom_id)
            content = {
                'id': key,
                'theme': initial_data.get('theme', 'Découverte'),
                'question': initial_data.get('question', 'Nouveau défi du jour ?'),
                'options': list(initial_data.get('options', ['Choix A', 'Choix B', 'Choix C'])),
                'correctIndex': int(initial_data.get('correctIndex', 0)),
                'explanation': initial_data.get('explanation', 'Explication du défi.'),
                'isActive': True,
                'order': int(initial_data.get('order', max_id + 1)),
            }

        elif kind == ContentVersion.KIND_MISSION:
            custom_id = f"m{Mission.objects.count() + 1}"
            while Mission.objects.filter(pk=custom_id).exists():
                custom_id = f"m{int(custom_id[1:]) + 1}"
            key = custom_id
            content = {
                'id': key,
                'title': initial_data.get('title', 'Nouveau devoir'),
                'description': initial_data.get('description', 'Consigne du devoir.'),
                'category': initial_data.get('category', 'Général'),
                'difficulty': initial_data.get('difficulty', 'Facile'),
                'durationMinutes': int(initial_data.get('durationMinutes', 10)),
                'xp': int(initial_data.get('xp', 20)),
                'track': initial_data.get('track', '7-9'),
                'active': True,
                'questions': initial_data.get('questions', []),
            }

        elif kind == ContentVersion.KIND_ACTIVITY:
            key = initial_data.get('activityId') or f"arcade-game-{Activity.objects.count() + 1:02d}"
            content = {
                'activityId': key,
                'kind': initial_data.get('kind', Activity.KIND_ARCADE_GAME),
                'title': initial_data.get('title', 'Nouvelle activité'),
                'xp': int(initial_data.get('xp', 25)),
                'isActive': True,
            }

        # Enregistrement du brouillon initial
        draft = ContentVersion.objects.create(
            kind=kind,
            key=key,
            number=1,
            content=content,
            source=ContentVersion.SOURCE_STUDIO,
            note="Création dans le studio",
            author=actor,
            author_email=actor.email,
        )

    audit(actor, 'studio_item_cree', f"Nouvel élément créé : {kind} #{key}")
    return {
        'id': key,
        'kind': kind,
        'draft': _version_payload(draft),
        'issues': validate_item(kind, key, content),
    }


def toggle_active(actor, kind: str, key: str) -> dict:
    """Bascule l'état actif/inactif d'un élément (sauvegarde un brouillon avec l'état inversé)."""
    _check_kind(kind)
    item = get_item(kind, key)
    content = dict(item['working']['content'])

    if 'isActive' in content:
        content['isActive'] = not content['isActive']
        state = content['isActive']
    elif 'active' in content:
        content['active'] = not content['active']
        state = content['active']
    else:
        content['isActive'] = False
        state = False

    res = save_draft(actor, kind, key, content, note=f"Bascule statut ({'actif' if state else 'inactif'})")
    return {'isActive': state, **res}
