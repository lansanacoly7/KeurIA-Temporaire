from django.db import models
from django.utils import timezone

AGE_TRACKS = ('7-9', '10-12', '13-15')

class LearnerProfile(models.Model):
    # Compte élève décrit par ce profil. Le parent propriétaire se lit via
    # `learner.parent` (relation officielle) ; owner_email/learner_email ne
    # sont plus utilisés pour l'ownership et restent pour la compatibilité.
    learner = models.OneToOneField('accounts.User', on_delete=models.CASCADE, null=True, blank=True,
                                   related_name='learner_profile', verbose_name='Compte élève')
    owner_email = models.EmailField('E-mail du parent/enseignant')
    learner_email = models.EmailField('E-mail de l\'apprenant', null=True, blank=True, unique=True)
    nickname = models.CharField('Surnom', max_length=100, default='Explorateur')
    age_track = models.CharField('Tranche d\'âge', max_length=20, default='10-12')
    avatar = models.CharField('Avatar', max_length=20, default='🧒🏾')
    gender = models.CharField('Sexe', max_length=10, blank=True, default='garcon')
    created_at = models.DateTimeField('Date de création', default=timezone.now)

    class Meta:
        db_table = 'learners_learnerprofile'
        verbose_name = 'Profil Apprenant'
        verbose_name_plural = 'Profils Apprenants'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.nickname} ({self.age_track})"
