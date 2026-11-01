"""Lecture des versions de contenu du studio (voir `ContentVersion` pour le cycle de vie)."""
from django.db.models import Max
from django.utils import timezone

from .models import ContentVersion


def _versions(kind: str, key: str):
    return ContentVersion.objects.filter(kind=kind, key=key, discarded_at__isnull=True)


def committed(kind: str, key: str):
    """Versions publiées ou programmées (tout sauf le brouillon)."""
    return _versions(kind, key).filter(publish_at__isnull=False)


def live_version(kind: str, key: str, now=None):
    """Version que voient les enfants : la plus récente dont l'heure de mise en ligne est passée (None : contenu d'origine du site)."""
    return committed(kind, key).filter(publish_at__lte=now or timezone.now()).order_by('-publish_at', '-number').first()


def pending_version(kind: str, key: str, now=None):
    """Publication programmée, pas encore en ligne (délai de sécurité en cours)."""
    return committed(kind, key).filter(publish_at__gt=now or timezone.now()).order_by('-number').first()


def draft_version(kind: str, key: str):
    return _versions(kind, key).filter(publish_at__isnull=True).first()


def next_number(kind: str, key: str) -> int:
    return (ContentVersion.objects.filter(kind=kind, key=key).aggregate(top=Max('number'))['top'] or 0) + 1
