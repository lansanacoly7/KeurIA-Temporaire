"""Studio des leçons du parcours 7-9 : brouillon, contrôle, publication différée, annulation, retour en arrière.

Règles :
  - l'auteur travaille sur UN brouillon par leçon ; rien n'est visible des enfants avant « Publier » ;
  - « Publier » programme la mise en ligne après un délai de sécurité (STUDIO_PUBLISH_DELAY_MINUTES, 15 par défaut) :
    pendant ce temps on peut encore annuler ; une nouvelle publication remplace celle qui attend ;
  - une erreur de STRUCTURE (que le lecteur de l'enfant ne saurait pas jouer) bloque la publication ; une règle de STYLE de la
    bible narrative (phrases longues, nombre d'écrans…) n'est qu'un avertissement que l'auteur peut confirmer ;
  - le retour à une ancienne version est immédiat (c'est le secours si une publication s'avère mauvaise) ;
  - chaque action est inscrite au journal.
"""
import json
import re
from datetime import timedelta

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import status

from apps.curriculum import parcours79
from apps.curriculum.models import ContentVersion, MediaAsset
from apps.curriculum.versions import committed, draft_version, live_version, next_number, pending_version
from apps.scolaire.errors import ApiError, NotFound

from .services import audit

KIND = ContentVersion.KIND_LESSON79
MAX_CONTENT_BYTES = 2 * 1024 * 1024
SCREEN_RE = re.compile(r'écran (\d+)')


# ─── Catalogue ───────────────────────────────────────────────────────────────

def _catalog(use_working=True, use_base=False) -> list[dict]:
    """Les leçons du parcours 7-9 dans l'ordre du catalogue actif, de travail ou du socle."""
    from apps.curriculum.catalog import base_catalog, get_active_catalog, get_working_catalog
    if use_base:
        catalog_content = base_catalog('7-9')
    elif use_working:
        catalog_content = get_working_catalog('7-9')[0]
    else:
        catalog_content = get_active_catalog('7-9')
    lessons = []
    sorted_modules = sorted(catalog_content.get('modules', []), key=lambda m: m.get('order', 0))
    for module_number, mod in enumerate(sorted_modules, 1):
        mod_lessons = [les for les in catalog_content.get('lessons', []) if les.get('moduleId') == mod['id']]
        mod_lessons.sort(key=lambda les: les.get('order', 0))
        for index, les in enumerate(mod_lessons):
            lessons.append({
                'id': les['id'],
                'title': les['title'],
                'index': index,
                'moduleId': mod['id'],
                'moduleTitle': mod['title'],
                'moduleNumber': module_number,
                'hidden': les.get('hidden', False),
            })
    return lessons


def _meta(key: str) -> dict:
    for lesson in _catalog():
        if lesson['id'] == key:
            return lesson
    raise NotFound('Cette leçon n\'existe pas dans le parcours 7-9.')


def _base_content(key: str, content_dir=None) -> dict | None:
    """Contenu d'origine (fichiers frontend/content/parcours79), s'ils sont présents sur cette machine.

    `content_dir` : autre dossier que celui du site (voir `manage.py import_content79 --from`).
    """
    try:
        for _name, chapter in parcours79.load_chapters(content_dir):
            for lesson in chapter.get('lessons', []):
                if lesson.get('id') == key:
                    return lesson
    except (OSError, ValueError):
        pass
    return None


def _ensure_seeded(key: str, content_dir=None) -> None:
    """Au premier accès, enregistre le contenu d'origine comme version 1 (en ligne) pour pouvoir y revenir."""
    if ContentVersion.objects.filter(kind=KIND, key=key).exists():
        return
    base = _base_content(key, content_dir)
    if base is None:
        raise ApiError("Le contenu d'origine de cette leçon est introuvable sur ce serveur (frontend/content/parcours79).",
                       status.HTTP_404_NOT_FOUND)
    try:
        with transaction.atomic():
            ContentVersion.objects.create(kind=KIND, key=key, number=1, content=base, source=ContentVersion.SOURCE_IMPORT,
                                          note="Contenu d'origine", publish_at=timezone.now() - timedelta(seconds=1))
    except IntegrityError:        # deux ouvertures simultanées : l'autre a déjà créé la version 1
        pass


# ─── Contrôle ────────────────────────────────────────────────────────────────

def _shape_problem(content) -> str | None:
    if not isinstance(content, dict):
        return 'le contenu doit être un objet'
    screens = content.get('screens')
    if not isinstance(screens, list) or not all(isinstance(s, dict) for s in screens):
        return 'la leçon doit contenir une liste d\'écrans'
    for screen in screens:
        if 'rounds' in screen and (not isinstance(screen['rounds'], list) or not all(isinstance(r, dict) for r in screen['rounds'])):
            return 'les manches d\'un écran doivent former une liste'
    return None


def _walk_strings(node):
    if isinstance(node, str):
        yield node
    elif isinstance(node, dict):
        for value in node.values():
            yield from _walk_strings(value)
    elif isinstance(node, list):
        for value in node:
            yield from _walk_strings(value)


def validate(key: str, content) -> list[dict]:
    """Problèmes d'un contenu : {severity: 'error' | 'warning', screen: n° d'écran ou None, message}.

    `error` bloque la publication ; `warning` est une règle de style que l'auteur peut confirmer.
    """
    meta = _meta(key)
    problem = _shape_problem(content)
    if problem:
        return [{'severity': 'error', 'screen': None, 'message': f'Contenu mal formé : {problem}.'}]
    if content.get('id') != key:
        return [{'severity': 'error', 'screen': None, 'message': f'L\'identifiant du contenu doit rester « {key} ».'}]

    report = parcours79.Report()
    try:
        parcours79._check_lesson(report, meta['moduleId'], meta['index'], content,
                                 parcours79._catalog_worlds()[meta['moduleId']], meta['moduleId'])
    except (KeyError, TypeError, AttributeError, ValueError) as exc:
        return [{'severity': 'error', 'screen': None, 'message': f'Contenu mal formé ({type(exc).__name__}) : vérifiez les champs des écrans.'}]

    issues = []
    for text in report.errors:
        match = SCREEN_RE.search(text)
        issues.append({'severity': 'warning' if text in report.soft else 'error',
                       'screen': int(match.group(1)) if match else None, 'message': text.split(' : ', 1)[-1] if ' : ' in text else text,
                       'where': text.split(' : ', 1)[0] if ' : ' in text else ''})

    # Une image de la médiathèque citée dans le contenu doit exister.
    refs = {s for s in _walk_strings(content) if parcours79.MEDIA_REF.match(s)}
    if refs:
        ids = {int(r.split(':')[1].split('.')[0]) for r in refs}
        known = {a.pk: a.sha256[:8] for a in MediaAsset.objects.filter(pk__in=ids).only('id', 'sha256')}
        for ref in sorted(refs):
            asset_id, stamp = ref.split(':')[1].split('.')
            if known.get(int(asset_id)) != stamp:
                issues.append({'severity': 'error', 'screen': None, 'message': f'Média introuvable dans la médiathèque : {ref}.', 'where': ''})
    return issues


# ─── Présentation ────────────────────────────────────────────────────────────

def spoken_clips(content: dict) -> dict[str, str]:
    """Ce que Palou dit, par clé de fichier audio (miroir de `spokenParts` dans LessonPlayer79.tsx) : « e03 », « e04-m1-q »…"""
    clips = {}
    for number, screen in enumerate(content.get('screens', []), 1):
        key = f'e{number:02d}'
        base = screen.get('dit') or screen.get('text') or ''
        if screen.get('kind') in ('play', 'why') and screen.get('rounds'):
            clips[key] = base
            for r, rnd in enumerate(screen['rounds'], 1):
                clips[f'{key}-m{r}-q'] = rnd.get('dit') or rnd.get('prompt') or ''
        elif screen.get('kind') == 'bravo':
            clips[f'{key}-bravo'] = base
            clips[f'{key}-retiens'] = screen.get('learned') or ''
        else:
            clips[key] = base
    return clips


def _with_voice_off(key: str, content: dict) -> dict:
    """Copie du contenu avec `voiceOff` : les passages dont le texte n'est plus celui que la voix officielle a enregistré.

    Palou n'a volontairement aucune voix de secours : un passage modifié reste muet (le texte s'affiche) plutôt que de lire
    l'ancien texte. Référence : le contenu d'origine (version « import »), celui des enregistrements.
    """
    original = ContentVersion.objects.filter(kind=KIND, key=key, source=ContentVersion.SOURCE_IMPORT).order_by('number').first()
    reference = spoken_clips(original.content) if original else {}
    final = {k: v for k, v in content.items() if k != 'voiceOff'}
    muted = sorted(k for k, text in spoken_clips(final).items() if reference.get(k) != text)
    if muted:
        final['voiceOff'] = muted
    return final


def _iso(value):
    return value.isoformat() if value else None


def _version_payload(version, *, now=None, live_number=None, content=False) -> dict:
    if version is None:
        return None
    now = now or timezone.now()
    payload = {
        'id': version.pk, 'number': version.number, 'source': version.source, 'note': version.note,
        'author': version.author_email or None, 'createdAt': _iso(version.created_at), 'updatedAt': _iso(version.updated_at),
        'publishAt': _iso(version.publish_at),
        'state': ('draft' if version.publish_at is None else 'pending' if version.publish_at > now
                  else 'live' if version.number == live_number else 'past'),
    }
    if content:
        payload['content'] = version.content
    return payload


def _delay() -> int:
    return max(0, int(settings.STUDIO_PUBLISH_DELAY_MINUTES))


def list_lessons() -> dict:
    """Les 40 leçons avec leur état : contenu d'origine ou modifié, brouillon en cours, publication en attente."""
    now = timezone.now()
    by_key: dict[str, list] = {}
    for version in ContentVersion.objects.filter(kind=KIND, discarded_at__isnull=True).defer('content'):
        by_key.setdefault(version.key, []).append(version)
    lessons, modules = [], {}
    for meta in _catalog():
        versions = by_key.get(meta['id'], [])
        done = [v for v in versions if v.publish_at and v.publish_at <= now]
        live = max(done, key=lambda v: (v.publish_at, v.number), default=None)
        pending = max((v for v in versions if v.publish_at and v.publish_at > now), key=lambda v: v.number, default=None)
        draft = next((v for v in versions if v.publish_at is None), None)
        last = max(versions, key=lambda v: v.updated_at, default=None)
        lessons.append({
            'id': meta['id'], 'title': meta['title'], 'moduleId': meta['moduleId'],
            'hidden': meta.get('hidden', False),
            'modified': bool(live and live.source != ContentVersion.SOURCE_IMPORT),
            'liveNumber': live.number if live else None,
            'hasDraft': draft is not None, 'draftUpdatedAt': _iso(draft.updated_at) if draft else None,
            'pendingAt': _iso(pending.publish_at) if pending else None,
            'lastEditedAt': _iso(last.updated_at) if last and last.source != ContentVersion.SOURCE_IMPORT else None,
            'lastEditedBy': last.author_email or None if last and last.source != ContentVersion.SOURCE_IMPORT else None,
        })
        modules.setdefault(meta['moduleId'], {'id': meta['moduleId'], 'title': meta['moduleTitle'], 'number': meta['moduleNumber']})
    return {'modules': list(modules.values()), 'lessons': lessons, 'delayMinutes': _delay()}


def get_lesson(key: str) -> dict:
    meta = _meta(key)
    _ensure_seeded(key)
    now = timezone.now()
    live, pending, draft = live_version(KIND, key, now), pending_version(KIND, key, now), draft_version(KIND, key)
    working, origin = (draft, 'draft') if draft else (pending, 'pending') if pending else (live, 'live')
    live_number = live.number if live else None
    history = committed(KIND, key).defer('content').order_by('-number')[:30]
    return {
        'id': key, 'title': meta['title'], 'moduleId': meta['moduleId'], 'moduleTitle': meta['moduleTitle'],
        'live': _version_payload(live, now=now, live_number=live_number, content=True),
        'pending': _version_payload(pending, now=now, live_number=live_number),
        'draft': _version_payload(draft, now=now, live_number=live_number),
        'working': {'from': origin, 'content': working.content},
        'history': [_version_payload(v, now=now, live_number=live_number) for v in history],
        'delayMinutes': _delay(),
        'issues': validate(key, working.content),
    }


# ─── Actions ─────────────────────────────────────────────────────────────────

def save_draft(actor, key: str, content, note: str = '') -> dict:
    _meta(key)
    problem = _shape_problem(content)
    if problem:
        raise ApiError(f'Contenu mal formé : {problem}.')
    if len(json.dumps(content, ensure_ascii=False).encode('utf-8')) > MAX_CONTENT_BYTES:
        raise ApiError('Cette leçon est trop volumineuse (plus de 2 Mo de texte) : allégez-la.', status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)
    _ensure_seeded(key)
    note = str(note or '').strip()[:200]
    with transaction.atomic():
        draft = draft_version(KIND, key)
        if draft is None:
            draft = ContentVersion(kind=KIND, key=key, number=next_number(KIND, key), source=ContentVersion.SOURCE_STUDIO)
        draft.content, draft.note, draft.author, draft.author_email = content, note, actor, actor.email
        draft.save()
    return {'draft': _version_payload(draft), 'issues': validate(key, content)}


def discard_draft(actor, key: str) -> None:
    _meta(key)
    draft = draft_version(KIND, key)
    if draft is None:
        raise ApiError('Il n\'y a pas de brouillon à écarter.')
    draft.discarded_at = timezone.now()
    draft.save(update_fields=['discarded_at', 'updated_at'])
    audit(actor, 'studio_brouillon_ecarte', f'Brouillon de la leçon {key} écarté (studio)')


def publish(actor, key: str, acknowledge: bool = False) -> dict:
    """Programme la mise en ligne du brouillon après le délai de sécurité."""
    _meta(key)
    now = timezone.now()
    with transaction.atomic():
        draft = draft_version(KIND, key)
        if draft is None:
            raise ApiError('Il n\'y a pas de brouillon à publier : modifiez d\'abord la leçon.')
        issues = validate(key, draft.content)
        errors = [i for i in issues if i['severity'] == 'error']
        warnings = [i for i in issues if i['severity'] == 'warning']
        if errors:
            raise ApiError(f'La leçon ne peut pas être publiée : {len(errors)} problème(s) à corriger.',
                           status.HTTP_422_UNPROCESSABLE_ENTITY, {'issues': issues, 'blocking': True})
        if warnings and not acknowledge:
            raise ApiError(f'{len(warnings)} règle(s) de style ne sont pas respectées. Confirmez pour publier malgré tout.',
                           status.HTTP_409_CONFLICT, {'issues': issues, 'needsAcknowledge': True})
        draft.content = _with_voice_off(key, draft.content)
        live, pending = live_version(KIND, key, now), pending_version(KIND, key, now)
        if pending is None and live is not None and live.content == draft.content:
            raise ApiError('Ce brouillon est identique à la version en ligne : il n\'y a rien à publier.')
        if pending is not None:
            pending.discarded_at = now        # la nouvelle publication remplace celle qui attendait
            pending.save(update_fields=['discarded_at', 'updated_at'])
        draft.publish_at = now + timedelta(minutes=_delay())
        draft.author, draft.author_email = actor, actor.email
        draft.save()
    audit(actor, 'studio_publication', f'Leçon {key} : version {draft.number} programmée pour {draft.publish_at:%d/%m %H:%M}')
    return {'version': _version_payload(draft, now=now), 'issues': issues}


def cancel_pending(actor, key: str) -> dict:
    """Annule la publication en attente : elle redevient le brouillon (ou est écartée si un autre brouillon existe)."""
    _meta(key)
    now = timezone.now()
    with transaction.atomic():
        pending = pending_version(KIND, key, now)
        if pending is None:
            raise ApiError('Aucune publication en attente : elle est peut-être déjà en ligne.')
        if draft_version(KIND, key) is None:
            pending.publish_at = None
            pending.save(update_fields=['publish_at', 'updated_at'])
            outcome = 'revenue en brouillon'
        else:
            pending.discarded_at = now
            pending.save(update_fields=['discarded_at', 'updated_at'])
            outcome = 'écartée (un autre brouillon existe déjà)'
    audit(actor, 'studio_publication_annulee', f'Leçon {key} : publication de la version {pending.number} annulée, {outcome}')
    return {'outcome': outcome}


def rollback(actor, key: str, number) -> dict:
    """Remet en ligne, tout de suite, le contenu d'une ancienne version (nouvelle version « restauration »)."""
    _meta(key)
    now = timezone.now()
    with transaction.atomic():
        target = committed(KIND, key).filter(number=number, publish_at__lte=now).first() if str(number).isdigit() else None
        if target is None:
            raise ApiError('Cette version n\'existe pas ou n\'est pas encore en ligne.', status.HTTP_404_NOT_FOUND)
        live = live_version(KIND, key, now)
        if live is not None and live.number == target.number:
            raise ApiError('Cette version est déjà celle qui est en ligne.')
        pending = pending_version(KIND, key, now)
        if pending is not None:
            pending.discarded_at = now
            pending.save(update_fields=['discarded_at', 'updated_at'])
        restored = ContentVersion.objects.create(
            kind=KIND, key=key, number=next_number(KIND, key), content=target.content, source=ContentVersion.SOURCE_ROLLBACK,
            note=f'Retour à la version {target.number}', author=actor, author_email=actor.email, publish_at=now)
    audit(actor, 'studio_retour_arriere', f'Leçon {key} : retour à la version {target.number} (nouvelle version {restored.number})')
    return {'version': _version_payload(restored, now=now, live_number=restored.number)}
