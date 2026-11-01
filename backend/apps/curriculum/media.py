"""Médias du studio : contrôle et optimisation à l'envoi, diffusion avec cache.

Tout est gardé dans la base de données (modèle `MediaAsset`), sans hébergement à part. Pour que la base reste légère :
  - une image est redimensionnée (1 600 px au plus) et convertie en WebP (souvent 3 à 5 fois plus légère) ;
  - une vidéo est un petit fichier (20 Mo par défaut) ; au-delà, on colle un lien YouTube ou Vimeo dans le contenu.
Le type d'un fichier est lu dans son contenu (pas dans son nom ni dans l'en-tête envoyé par le navigateur).
"""
import collections
import hashlib
import io
import json
import re

from django.conf import settings
from django.db import models
from django.http import Http404, HttpResponse, HttpResponseNotModified
from django.utils import timezone
from PIL import Image, ImageOps, UnidentifiedImageError
from rest_framework import status

from apps.scolaire.errors import ApiError

from .models import MediaAsset

MAX_SIDE = 1600
MAX_PIXELS = 40_000_000          # protège contre les images « bombes » (petit fichier, milliards de pixels)
WEBP_QUALITY = 82
IMAGE_FORMATS = {'JPEG', 'PNG', 'WEBP', 'GIF'}
RANGE_RE = re.compile(r'^bytes=(\d*)-(\d*)$')
MEDIA_REF_PATTERN = re.compile(r'media:(\d+)\.([0-9a-f]{8})')


def _mb(value: int) -> str:
    return f'{value} Mo'


def _optimize_image(raw: bytes) -> tuple[bytes, int, int]:
    try:
        image = Image.open(io.BytesIO(raw))
        image_format = image.format
        if image_format not in IMAGE_FORMATS:
            raise ApiError('Format d\'image non pris en charge : utilisez une image JPEG, PNG ou WebP.')
        if image.width * image.height > MAX_PIXELS:
            raise ApiError('Cette image est beaucoup trop grande (plus de 40 millions de pixels). Réduisez-la avant de l\'envoyer.')
        if getattr(image, 'is_animated', False):
            raise ApiError('Les images animées ne sont pas prises en charge : envoyez une vidéo à la place.')
        image.load()
    except ApiError:
        raise
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise ApiError('Ce fichier n\'est pas une image valide.') from exc

    image = ImageOps.exif_transpose(image)            # respecte l'orientation des photos de téléphone
    image.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
    has_alpha = image.mode in ('RGBA', 'LA') or (image.mode == 'P' and 'transparency' in image.info)
    image = image.convert('RGBA' if has_alpha else 'RGB')
    out = io.BytesIO()
    image.save(out, 'WEBP', quality=WEBP_QUALITY, method=4)
    return out.getvalue(), image.width, image.height


def _video_type(head: bytes) -> str | None:
    if head[4:8] == b'ftyp':
        return 'video/mp4'
    if head[:4] == b'\x1a\x45\xdf\xa3':
        return 'video/webm'
    return None


def create_asset(uploaded, user, alt: str = '') -> MediaAsset:
    """Contrôle un fichier envoyé (image ou petite vidéo), l'optimise et l'enregistre."""
    if uploaded is None:
        raise ApiError('Aucun fichier reçu.')
    image_limit = settings.STUDIO_IMAGE_MAX_MB * 1024 * 1024
    video_limit = settings.STUDIO_VIDEO_MAX_MB * 1024 * 1024
    if uploaded.size > max(image_limit, video_limit):
        raise ApiError(f'Fichier trop lourd. Images : {_mb(settings.STUDIO_IMAGE_MAX_MB)} au plus. '
                       f'Vidéos : {_mb(settings.STUDIO_VIDEO_MAX_MB)} au plus (pour une vidéo plus longue, collez un lien YouTube).')
    raw = uploaded.read()
    name = (getattr(uploaded, 'name', '') or '')[:200]
    cleaned_alt = (alt or '').strip()[:300]

    video_type = _video_type(raw[:12])
    if video_type:
        if len(raw) > video_limit:
            raise ApiError(f'Cette vidéo pèse plus de {_mb(settings.STUDIO_VIDEO_MAX_MB)}. Réduisez-la, ou collez plutôt un lien YouTube.')
        data, kind, content_type, width, height = raw, MediaAsset.KIND_VIDEO, video_type, None, None
    else:
        if len(raw) > image_limit:
            raise ApiError(f'Cette image pèse plus de {_mb(settings.STUDIO_IMAGE_MAX_MB)}. Réduisez-la avant de l\'envoyer.')
        data, width, height = _optimize_image(raw)
        kind, content_type = MediaAsset.KIND_IMAGE, 'image/webp'

    return MediaAsset.objects.create(
        kind=kind, content_type=content_type, data=data, size=len(data), width=width, height=height,
        sha256=hashlib.sha256(data).hexdigest(), name=name, alt=cleaned_alt, created_by=user,
    )


def asset_payload(asset: MediaAsset, usages: list[dict] | None = None) -> dict:
    payload = {
        'id': asset.pk, 'kind': asset.kind, 'ref': asset.ref, 'url': asset.url, 'contentType': asset.content_type,
        'size': asset.size, 'width': asset.width, 'height': asset.height, 'name': asset.name,
        'alt': getattr(asset, 'alt', '') or '',
        'createdAt': asset.created_at.isoformat(),
    }
    if usages is not None:
        payload['usages'] = usages
        payload['usageCount'] = len(usages)
        payload['canDelete'] = len(usages) == 0
    return payload


# ─── Stockage & Quota ────────────────────────────────────────────────────────

def get_storage_stats() -> dict:
    """Calcule le poids total des médias en base et vérifie le seuil d'alerte."""
    total_bytes = MediaAsset.objects.aggregate(total=models.Sum('size'))['total'] or 0
    max_mb = getattr(settings, 'STUDIO_MEDIA_MAX_MB', 500)
    warning_percent = getattr(settings, 'STUDIO_MEDIA_WARNING_PERCENT', 80)
    max_bytes = max_mb * 1024 * 1024
    percent_used = round((total_bytes / max_bytes * 100), 1) if max_bytes > 0 else 0.0
    is_warning = percent_used >= warning_percent
    warning_message = (
        f"Attention : la médiathèque occupe {percent_used}% de l'espace alloué "
        f"({round(total_bytes / (1024 * 1024), 1)} Mo / {max_mb} Mo). "
        "Pensez à nettoyer les médias inutilisés."
    ) if is_warning else None
    return {
        'totalBytes': total_bytes,
        'maxBytes': max_bytes,
        'maxMb': max_mb,
        'percentUsed': percent_used,
        'warningThresholdPercent': warning_percent,
        'isWarning': is_warning,
        'warningMessage': warning_message,
        'assetCount': MediaAsset.objects.count(),
    }


# ─── Détection d'Utilisation (Usage Tracking) ────────────────────────────────

def _version_state(cv, now=None) -> str:
    if cv.discarded_at:
        return 'écartée'
    if cv.publish_at is None:
        return 'brouillon'
    if now is None:
        now = timezone.now()
    if cv.publish_at > now:
        return 'programmé'
    return 'en ligne'


def _describe_content_version(cv, now=None) -> str:
    """Libellé clair et lisible pour identifier un contenu utilisateur."""
    kind = cv.kind
    key = cv.key
    content = cv.content or {}
    state_lbl = _version_state(cv, now)

    if kind == 'lesson79':
        title = content.get('title') or key
        return f"Leçon {key} « {title} » ({state_lbl}, v{cv.number})"
    if kind == 'riddle':
        q = (content.get('question') or '')[:30]
        return f"Énigme #{key} « {q}… » ({state_lbl})"
    if kind == 'daily_challenge':
        theme = content.get('theme') or f"Défi #{key}"
        return f"Défi du jour « {theme} » ({state_lbl})"
    if kind == 'mission':
        title = content.get('title') or f"Mission {key}"
        return f"Devoir « {title} » ({state_lbl})"
    if kind == 'activity':
        title = content.get('title') or f"Activité {key}"
        return f"Activité « {title} » ({state_lbl})"
    if kind == 'catalog79':
        return f"Catalogue ({state_lbl})"
    return f"{kind} {key} ({state_lbl}, v{cv.number})"


def find_all_media_usages() -> dict[int, list[dict]]:
    """Parcourt l'ensemble des versions de contenu (leçons, devoirs, défis, énigmes, historique...)
    pour recenser où chaque média est référencé."""
    from .models import ContentVersion

    now = timezone.now()
    usages_by_id = collections.defaultdict(list)
    versions = ContentVersion.objects.filter(discarded_at__isnull=True).only(
        'id', 'key', 'kind', 'number', 'publish_at', 'discarded_at', 'content'
    )
    for cv in versions:
        if not cv.content:
            continue
        try:
            content_str = json.dumps(cv.content, ensure_ascii=False)
        except Exception:
            continue
        matches = set(MEDIA_REF_PATTERN.findall(content_str))
        if not matches:
            continue

        desc = _describe_content_version(cv, now)
        for asset_id_str, _stamp in matches:
            try:
                aid = int(asset_id_str)
                usages_by_id[aid].append({
                    'versionId': cv.pk,
                    'key': cv.key,
                    'kind': cv.kind,
                    'version': cv.number,
                    'state': _version_state(cv, now),
                    'description': desc,
                })
            except ValueError:
                pass
    return usages_by_id


def get_asset_usages(asset_id: int) -> list[dict]:
    """Retourne la liste des utilisations d'un média spécifique."""
    all_usages = find_all_media_usages()
    return all_usages.get(asset_id, [])


# ─── Mise à jour & Suppression sécurisée ─────────────────────────────────────

def update_asset_metadata(asset_id: int, name: str | None = None, alt: str | None = None) -> MediaAsset:
    """Met à jour les métadonnées (nom de fichier et/ou texte alternatif) d'un média."""
    asset = MediaAsset.objects.filter(pk=asset_id).first()
    if asset is None:
        raise Http404("Média introuvable.")
    updated = False
    if name is not None:
        cleaned_name = name.strip()[:200]
        if cleaned_name != asset.name:
            asset.name = cleaned_name
            updated = True
    if alt is not None:
        cleaned_alt = alt.strip()[:300]
        if cleaned_alt != asset.alt:
            asset.alt = cleaned_alt
            updated = True
    if updated:
        asset.save(update_fields=['name', 'alt'])
    return asset


def delete_asset_if_unused(asset_id: int, user) -> tuple[bool, str]:
    """Supprime un média s'il n'est utilisé dans aucun contenu.
    En cas d'utilisation (même dans l'historique), lève une ApiError 409 Conflict avec la liste des contenus bloquants."""
    asset = MediaAsset.objects.filter(pk=asset_id).first()
    if asset is None:
        raise Http404("Média introuvable.")

    usages = get_asset_usages(asset_id)
    if usages:
        descriptions = [u['description'] for u in usages[:5]]
        preview = ", ".join(descriptions)
        if len(usages) > 5:
            preview += f" ... et {len(usages) - 5} autre(s)"
        raise ApiError(
            f"Ce média est utilisé dans {len(usages)} version(s) de contenu ({preview}) et ne peut pas être supprimé.",
            status.HTTP_409_CONFLICT,
            extra={'usages': usages, 'usageCount': len(usages), 'blocking': True}
        )

    name = asset.name or asset.kind
    asset.delete()
    return True, f"Média #{asset_id} ({name}) supprimé avec succès."



def serve_asset(request, asset_id: int, stamp: str) -> HttpResponse:
    """Diffuse un média. L'adresse contient l'empreinte : le contenu ne change jamais, le navigateur le garde un an."""
    asset = MediaAsset.objects.filter(pk=asset_id).first()
    if asset is None or asset.sha256[:8] != stamp:
        raise Http404
    etag = f'"{asset.sha256}"'
    if request.headers.get('If-None-Match') == etag:
        response = HttpResponseNotModified()
    else:
        data = bytes(asset.data)
        total = len(data)
        status, start, end = 200, 0, total - 1
        match = RANGE_RE.match(request.headers.get('Range', ''))
        if match and asset.kind == MediaAsset.KIND_VIDEO and (match.group(1) or match.group(2)):
            # Lecture par morceaux : indispensable pour avancer dans une vidéo.
            if match.group(1):
                start = int(match.group(1))
                end = int(match.group(2)) if match.group(2) else total - 1
            else:
                start = max(0, total - int(match.group(2)))
            end = min(end, total - 1)
            if start > end or start >= total:
                response = HttpResponse(status=416)
                response['Content-Range'] = f'bytes */{total}'
                return response
            status = 206
        response = HttpResponse(data[start:end + 1], status=status, content_type=asset.content_type)
        response['Content-Length'] = str(end - start + 1)
        if status == 206:
            response['Content-Range'] = f'bytes {start}-{end}/{total}'
    response['ETag'] = etag
    response['Accept-Ranges'] = 'bytes'
    response['Cache-Control'] = 'public, max-age=31536000, immutable'
    response['X-Content-Type-Options'] = 'nosniff'
    return response
