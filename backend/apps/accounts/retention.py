"""Conservation limitée des comptes familiaux : avertissement, désactivation, puis suppression.

Règles (durées réglables dans settings : RETENTION_INACTIVE_DAYS, RETENTION_NOTICE_DAYS, RETENTION_GRACE_DAYS) :

1. Un FOYER (un parent et ses enfants) est inactif quand aucun de ses comptes ne s'est connecté depuis 2 ans.
2. Le parent reçoit alors un e-mail d'avertissement : « connectez-vous dans les 30 jours pour garder votre compte ».
3. Sans connexion après ces 30 jours, le compte parent est désactivé (réversible : le parent se réactive avec un code e-mail).
4. Après 30 jours de plus, le foyer est supprimé (parent et enfants créés par lui).

Une seule étape par passage, jamais de suppression sans avertissement préalable, et toute connexion remet le foyer à zéro
(y compris celle d'un enfant).

Jamais concernés : les comptes d'école (enseignant, direction, élève rattaché) qui relèvent de leur établissement,
l'équipe kEur IA (`admin`) et les comptes staff.

Avant toute suppression, les chiffres du mois sont figés (`AccountStatsSnapshot`) : les statistiques historiques
(nombre de comptes, XP, activité) restent exactes une fois les données personnelles effacées.
"""
import logging
from datetime import date, timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import F, Sum
from django.utils import timezone

from .models import AccountStatsSnapshot, User

logger = logging.getLogger(__name__)


# ─── Chiffres figés ─────────────────────────────────────────────────────────────

def month_start(day: date) -> date:
    return day.replace(day=1)


def take_snapshot(now=None) -> AccountStatsSnapshot:
    """Fige les chiffres du mois en cours (une seule fois : le premier passage du mois fait foi)."""
    from apps.progress.models import Progress

    now = now or timezone.now()
    users = User.objects.exclude(role=User.ROLE_ADMIN)
    family = users.filter(school__isnull=True)
    snapshot, _ = AccountStatsSnapshot.objects.get_or_create(
        month=month_start(timezone.localtime(now).date()),
        defaults={
            'taken_at': now,
            'family_parents': family.filter(role=User.ROLE_PARENT).count(),
            'family_children': family.filter(role=User.ROLE_STUDENT).count(),
            'school_students': users.filter(role=User.ROLE_STUDENT, school__isnull=False).count(),
            'teachers': users.filter(role=User.ROLE_TEACHER).count(),
            'school_admins': users.filter(role=User.ROLE_SCHOOL_ADMIN).count(),
            'active_30_days': users.filter(last_seen_at__gte=now - timedelta(days=30)).count(),
            'total_xp': Progress.objects.aggregate(total=Sum('xp'))['total'] or 0,
        },
    )
    return snapshot


def _count(snapshot, field: str, amount: int = 1) -> None:
    AccountStatsSnapshot.objects.filter(pk=snapshot.pk).update(**{field: F(field) + amount})


# ─── Foyers ─────────────────────────────────────────────────────────────────────

def last_activity(user):
    return user.last_seen_at or user.created_at


def household_activity(parent, children):
    """Dernière connexion de n'importe quel compte du foyer."""
    return max(last_activity(account) for account in [parent, *children])


def delete_household(parent) -> None:
    """Supprime un compte parent et les enfants créés par lui.

    Un enfant relié par le code de son école (`school` renseigné) n'appartient PAS au parent : il est détaché, jamais effacé."""
    with transaction.atomic():
        parent.children.filter(school__isnull=True).delete()
        parent.children.filter(school__isnull=False).update(parent=None)
        parent.delete()


def _warning_email(parent, delete_on: date) -> bool:
    body = (
        f"Bonjour {parent.display_name},\n\n"
        "Votre compte kEur IA et ceux de vos enfants ne se sont pas connectés depuis plus de deux ans.\n"
        "Pour protéger la vie privée des enfants, nous ne conservons pas indéfiniment des comptes inutilisés.\n\n"
        f"Si personne ne se connecte d'ici le {delete_on:%d/%m/%Y}, votre compte sera désactivé, puis supprimé "
        "définitivement avec la progression de vos enfants un mois plus tard.\n\n"
        "Pour tout conserver, il suffit de vous connecter (ou qu'un de vos enfants se connecte).\n"
        "Vous pouvez aussi télécharger vos données depuis votre espace : Paramètres → Mes données.\n\n"
        "L'équipe kEur IA"
    )
    try:
        send_mail("[kEur IA] Votre compte sera bientôt désactivé", body, settings.DEFAULT_FROM_EMAIL, [parent.email],
                  fail_silently=False)
        return True
    except Exception:
        logger.exception("Échec de l'e-mail d'avertissement de conservation (parent_id=%s)", parent.pk)
        return False


def apply_retention(now=None, dry_run: bool = False) -> dict:
    """Passe sur tous les foyers familiaux. Renvoie le nombre de foyers remis à zéro, avertis, désactivés et supprimés."""
    now = now or timezone.now()
    idle_limit = timedelta(days=settings.RETENTION_INACTIVE_DAYS)
    notice = timedelta(days=settings.RETENTION_NOTICE_DAYS)
    grace = timedelta(days=settings.RETENTION_GRACE_DAYS)
    result = {'reset': 0, 'warned': 0, 'deactivated': 0, 'deleted': 0, 'errors': 0}

    snapshot = None if dry_run else take_snapshot(now)  # les chiffres sont figés AVANT toute suppression

    parents = (User.objects.filter(role=User.ROLE_PARENT, school__isnull=True, is_staff=False, is_superuser=False)
               .prefetch_related('children'))
    for parent in parents:
        activity = household_activity(parent, list(parent.children.all()))

        # Une connexion depuis l'avertissement remet le foyer à zéro (et réactive le parent si c'est nous qui l'avions désactivé).
        if parent.retention_notified_at and activity > parent.retention_notified_at:
            result['reset'] += 1
            if not dry_run:
                parent.retention_notified_at = None
                fields = ['retention_notified_at']
                if parent.retention_deactivated_at:
                    parent.is_active = True
                    fields.append('is_active')
                parent.retention_deactivated_at = None
                fields.append('retention_deactivated_at')
                parent.save(update_fields=fields)
            continue

        if now - activity < idle_limit:
            continue

        if not parent.email_verified and not parent.children.exists():
            # Compte jamais activé (adresse e-mail jamais confirmée, donc jamais connecté) : rien à protéger ni à prévenir.
            result['deleted'] += 1
            if not dry_run:
                _count(snapshot, 'deleted')
                delete_household(parent)
        elif parent.retention_notified_at is None:  # 1. avertir (rien d'autre ne se passe avant ce message)
            delete_on = (now + notice).date()
            if dry_run:
                result['warned'] += 1
            elif _warning_email(parent, delete_on):
                parent.retention_notified_at = now
                parent.save(update_fields=['retention_notified_at'])
                _count(snapshot, 'warned')
                result['warned'] += 1
            else:
                result['errors'] += 1  # e-mail non envoyé : on n'avance pas, nouvel essai au prochain passage
        elif parent.retention_deactivated_at is None:  # 2. désactiver
            if now - parent.retention_notified_at >= notice:
                result['deactivated'] += 1
                if not dry_run:
                    parent.is_active = False
                    parent.retention_deactivated_at = now
                    parent.save(update_fields=['is_active', 'retention_deactivated_at'])
                    _count(snapshot, 'deactivated')
        elif now - parent.retention_deactivated_at >= grace:  # 3. supprimer
            result['deleted'] += 1
            if not dry_run:
                _count(snapshot, 'deleted', 1 + parent.children.filter(school__isnull=True).count())
                delete_household(parent)

    # 4. Purge des comptes enfants dont le délai de grâce de 3 jours est expiré
    expired_children_purged = purge_expired_child_deletions(now, dry_run=dry_run)
    result['expired_children_purged'] = expired_children_purged

    return result


CHILD_DELETION_GRACE_DAYS = 3


def purge_expired_child_deletions(now=None, dry_run=False) -> int:
    """Supprime définitivement les comptes enfants dont la mise en attente de suppression dépasse 3 jours."""
    now = now or timezone.now()
    cutoff = now - timedelta(days=CHILD_DELETION_GRACE_DAYS)
    expired_children = list(User.objects.filter(
        role=User.ROLE_STUDENT,
        deleted_at__isnull=False,
        deleted_at__lte=cutoff,
    ))
    count = len(expired_children)
    if not dry_run and count > 0:
        for child in expired_children:
            child_name = child.display_name
            child.delete()
            logger.info("Compte enfant %s supprimé définitivement après expiration du délai de 3 jours.", child_name)
    return count

