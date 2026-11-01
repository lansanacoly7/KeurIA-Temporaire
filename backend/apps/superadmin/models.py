from django.conf import settings
from django.db import models
from django.utils import timezone


class AuditLog(models.Model):
    """Journal des actions de l'équipe kEur IA (création d'école, suspension, comptes…)."""

    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='+')
    # Conservé même si le compte de l'auteur est supprimé plus tard.
    actor_email = models.EmailField()
    action = models.CharField(max_length=40)
    # École concernée (onglet « Activité » de son espace), vide pour les autres actions.
    school = models.ForeignKey('schools.School', on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    label = models.CharField(max_length=255)
    at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ['-at', '-id']
        verbose_name = 'Action super admin'
        verbose_name_plural = 'Journal super admin'
