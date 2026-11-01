from apps.accounts.models import User

from .models import MAX_MESSAGE_LENGTH, FamilyMessage

HISTORY_SIZE = 100
NO_FAMILY_MESSAGE = "La messagerie relie un parent et ses enfants : aucun lien familial n'existe pour ce compte."


def family_of(user: User):
    """Parent propriétaire du canal, ou None si le compte n'a pas de famille."""
    if user.role == User.ROLE_PARENT:
        return user if user.children.filter(is_active=True).exists() else None
    parent = user.parent
    if parent is not None and parent.is_active:
        return parent
    return None


def message_payload(message: FamilyMessage, viewer: User) -> dict:
    sender = message.sender
    return {
        'id': message.id,
        'text': message.text,
        'senderName': (sender.display_name or '').split(' ')[0] or 'Membre',
        'senderRole': 'parent' if sender.id == message.family_id else 'enfant',
        'mine': sender.id == viewer.id,
        'createdAt': message.created_at.isoformat(),
    }


def list_messages(user: User, after=None) -> dict:
    family = family_of(user)
    if family is None:
        return {'available': False, 'messages': []}
    messages = FamilyMessage.objects.filter(family=family).select_related('sender')
    if after is not None:
        messages = messages.filter(id__gt=after)[:HISTORY_SIZE]
    else:
        messages = reversed(list(messages.order_by('-created_at', '-id')[:HISTORY_SIZE]))
    return {'available': True, 'messages': [message_payload(m, user) for m in messages]}


def clean_text(raw) -> str | None:
    """Texte nettoyé, ou None si vide ou trop long."""
    text = str(raw or '').strip()
    if not text or len(text) > MAX_MESSAGE_LENGTH:
        return None
    return text


def post_message(user: User, text: str) -> dict | None:
    family = family_of(user)
    if family is None:
        return None
    message = FamilyMessage.objects.create(family=family, sender=user, text=text)
    return message_payload(message, user)
