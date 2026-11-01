from django.conf import settings
from django.db import models
from django.utils import timezone

MAX_MESSAGE_LENGTH = 1000


class FamilyMessage(models.Model):
    """
    Message de la messagerie familiale. Une famille = un parent et ses enfants
    (User.parent) ; `family` pointe toujours vers le compte du parent, et c'est
    le serveur qui la déduit du compte connecté (jamais le navigateur).
    """

    family = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                               related_name='family_messages', verbose_name='Famille (parent)')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                               related_name='sent_family_messages', verbose_name='Expéditeur')
    text = models.TextField('Message', max_length=MAX_MESSAGE_LENGTH)
    created_at = models.DateTimeField('Envoyé le', default=timezone.now)

    class Meta:
        ordering = ['created_at', 'id']
        indexes = [models.Index(fields=['family', 'id'])]
        verbose_name = 'Message familial'
        verbose_name_plural = 'Messages familiaux'
