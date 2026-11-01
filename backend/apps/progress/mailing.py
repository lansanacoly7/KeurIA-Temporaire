"""E-mails adressés aux parents : alertes importantes et bilan hebdomadaire.

Deux réglages parentaux pilotent réellement ces envois (voir ParentalLimits) :
  - `email_notifications` : alertes par e-mail pour les événements qui comptent (voir EMAILED_TYPES) ;
  - `weekly_report` : bilan de la semaine (commande `manage.py send_weekly_reports`).
Un échec SMTP est journalisé et n'interrompt jamais l'action de l'enfant qui l'a déclenché.
"""
import logging
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.db.models import Sum
from django.utils import timezone

from apps.accounts.models import User

from .models import ParentalLimits, Progress, lesson_progress

logger = logging.getLogger(__name__)

# Pas d'e-mail à chaque leçon terminée : seulement ce qui mérite d'interrompre un parent.
EMAILED_TYPES = {'level_up', 'badge', 'screen_time_request'}


def limits_row(parent, child):
    """Règle propre à l'enfant, sinon règle « tous les enfants » (même priorité que le contrôle parental)."""
    return (ParentalLimits.objects.filter(parent=parent, child=child).first()
            or ParentalLimits.objects.filter(parent=parent, child__isnull=True).first())


def wants_email_alerts(parent, child) -> bool:
    limits = limits_row(parent, child)
    return True if limits is None else limits.email_notifications  # défaut : activé, comme l'interface le montre


def _send(parent, subject, body):
    try:
        send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [parent.email], fail_silently=False)
        return True
    except Exception:
        logger.exception("Échec d'envoi d'un e-mail parent (parent_id=%s)", parent.pk)
        return False


def email_parent_of_event(parent, child, notif_type, payload) -> bool:
    """Envoie l'alerte par e-mail si le type le justifie et si le parent ne l'a pas désactivée."""
    if notif_type not in EMAILED_TYPES or not wants_email_alerts(parent, child):
        return False
    # Un objet d'e-mail tient sur une ligne : un saut de ligne dans un nom d'enfant ferait refuser l'envoi.
    title = ' '.join(str(payload.get('title') or 'Nouvelle alerte').split())
    message = payload.get('message') or ''
    body = (f"Bonjour {parent.display_name},\n\n{message}\n\n"
            "Vous recevez cet e-mail car les alertes par e-mail sont activées dans vos réglages parentaux kEur IA "
            "(Contrôle parental → Notifications). Vous pouvez les désactiver à tout moment.\n\nL'équipe kEur IA")
    return _send(parent, f"[kEur IA] {title}", body)


def weekly_summary(child, since):
    rows = lesson_progress(Progress.objects.filter(user=child, completed_at__gte=since))
    return {
        'xp': rows.aggregate(total=Sum('xp'))['total'] or 0,
        'activities': rows.count(),
    }


def send_weekly_reports(now=None) -> int:
    """Envoie le bilan des 7 derniers jours à chaque parent qui l'a demandé. Renvoie le nombre d'e-mails envoyés."""
    now = now or timezone.now()
    since = now - timedelta(days=7)
    sent = 0
    for parent in User.objects.filter(role=User.ROLE_PARENT, is_active=True, email_verified=True):
        limits = ParentalLimits.objects.filter(parent=parent, child__isnull=True).first()
        if limits is not None and not limits.weekly_report:
            continue
        children = list(User.objects.filter(parent=parent, is_active=True))
        if not children:
            continue
        lines = []
        for child in children:
            summary = weekly_summary(child, since)
            lines.append(f"- {child.display_name} : {summary['activities']} activité(s) terminée(s), +{summary['xp']} XP, "
                         f"série de {child.get_streak()} jour(s).")
        body = (f"Bonjour {parent.display_name},\n\nVoici le bilan de la semaine sur kEur IA :\n\n" + "\n".join(lines)
                + "\n\nVous recevez ce bilan car il est activé dans vos réglages parentaux "
                  "(Contrôle parental → Notifications).\n\nL'équipe kEur IA")
        if _send(parent, "[kEur IA] Le bilan de la semaine", body):
            sent += 1
    return sent
