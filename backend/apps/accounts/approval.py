"""Validation de l'inscription d'un parent par l'équipe kEur IA.

Un parent qui s'inscrit (page publique) prouve d'abord son adresse e-mail, puis attend qu'un administrateur accepte sa
demande : tant qu'elle est « en attente » ou « refusée », ni lui ni ses enfants ne peuvent se connecter. Les comptes
créés par l'équipe ou par une école ne passent pas par cette file (statut « accepté » par défaut).
"""
import logging
from html import escape

from django.conf import settings
from django.core.mail import EmailMultiAlternatives

from .models import User

logger = logging.getLogger(__name__)

PENDING_MESSAGE = ("Votre demande d'inscription est en cours d'examen par l'équipe kEur IA. "
                   "Vous recevrez un e-mail dès qu'elle sera acceptée : vous pourrez alors vous connecter.")
CHILD_PENDING_MESSAGE = "Le compte de ton parent doit d'abord être validé par l'équipe kEur IA. Reviens très bientôt !"
CHILD_REJECTED_MESSAGE = "Le compte de ton parent n'a pas été validé. Demande-lui de contacter l'équipe kEur IA."


def requires_approval() -> bool:
    """Vrai si une nouvelle inscription de parent doit être acceptée avant l'accès à l'espace."""
    return bool(getattr(settings, 'PARENT_REGISTRATION_REQUIRES_APPROVAL', True))


def rejected_message(note: str = '') -> str:
    text = "Votre demande d'inscription n'a pas été acceptée."
    if note:
        text += f" Motif : {note}"
    return text + " Pour toute question, contactez l'équipe kEur IA."


def blocked_reason(user) -> dict | None:
    """Pourquoi ce compte ne peut pas ouvrir de session pour l'instant, ou None s'il le peut.

    Renvoie {'code': 'pending' | 'rejected', 'who': 'parent' | 'child', 'message': str}.
    L'enfant d'un foyer (compte créé par le parent, sans école) suit le sort de son parent ; un élève d'école n'est jamais
    bloqué ici, même si un parent lui est relié : son accès dépend de son école.
    """
    if user.role == User.ROLE_PARENT:
        who, status, note = 'parent', user.approval_status, user.approval_note
    elif user.role == User.ROLE_STUDENT and user.parent_id and not user.school_id:
        parent = user.parent
        who, status, note = 'child', parent.approval_status, parent.approval_note
    else:
        return None

    if status == User.APPROVAL_PENDING:
        return {'code': 'pending', 'who': who, 'message': PENDING_MESSAGE if who == 'parent' else CHILD_PENDING_MESSAGE}
    if status == User.APPROVAL_REJECTED:
        return {'code': 'rejected', 'who': who, 'message': rejected_message(note) if who == 'parent' else CHILD_REJECTED_MESSAGE}
    return None


def send_decision_email(user, approved: bool, note: str = '') -> bool:
    """Prévient le parent de la décision. Un échec d'envoi est journalisé sans bloquer la décision."""
    name = escape(user.display_name)
    if approved:
        subject = "[kEur IA] Votre inscription est acceptée"
        title = "Bienvenue dans la famille kEur IA !"
        body = "Bonne nouvelle : l'équipe kEur IA a accepté votre inscription. Vous pouvez dès maintenant vous connecter avec votre adresse e-mail et votre mot de passe, et retrouver votre espace parent."
    else:
        subject = "[kEur IA] À propos de votre demande d'inscription"
        title = "Votre demande d'inscription"
        body = rejected_message(note)
    text_body = f"Bonjour {user.display_name},\n\n{body}\n\nCordialement,\nL'équipe kEur IA"
    html_body = f"""
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background:#f4f4f4; margin:0; padding:20px;">
  <div style="max-width:480px; margin:0 auto; background:white; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#0d846e; padding:24px 32px;">
      <h1 style="color:white; margin:0; font-size:22px;">kEur IA</h1>
      <p style="color:rgba(255,255,255,0.85); margin:4px 0 0; font-size:14px;">{escape(title)}</p>
    </div>
    <div style="padding:32px;">
      <p style="color:#333; font-size:16px;">Bonjour <strong>{name}</strong>,</p>
      <p style="color:#555; font-size:15px; line-height:1.5;">{escape(body)}</p>
    </div>
    <div style="background:#f8f8f8; padding:16px 32px; border-top:1px solid #eee;">
      <p style="color:#aaa; font-size:12px; margin:0;">© kEur IA — Apprendre, Jouer, Créer</p>
    </div>
  </div>
</body></html>
"""
    try:
        msg = EmailMultiAlternatives(subject, text_body, settings.DEFAULT_FROM_EMAIL, [user.email])
        msg.attach_alternative(html_body, 'text/html')
        msg.send(fail_silently=False)
    except Exception:
        logger.exception("Échec d'envoi de l'e-mail de décision d'inscription (user_id=%s)", user.pk)
        return False
    return True
