from django.db import models
from django.utils import timezone


class School(models.Model):
    name = models.CharField('Nom', max_length=200)
    slug = models.SlugField('Slug', max_length=100, unique=True)
    city = models.CharField('Ville', max_length=120, blank=True, default='')
    motto = models.CharField('Devise', max_length=255, default="Apprendre, créer et comprendre l'IA")
    primary_color = models.CharField('Couleur Principale', max_length=20, default='#174e49')
    secondary_color = models.CharField('Couleur Secondaire', max_length=20, default='#c9df54')
    accent_color = models.CharField('Couleur Accent', max_length=20, default='#f3b83f')
    logo = models.ImageField('Logo de l’école', upload_to='schools/logos/', null=True, blank=True)
    website = models.URLField('Site web externe', max_length=255, blank=True, default='')
    created_by_email = models.EmailField('Créé par (E-mail)')
    created_at = models.DateTimeField('Date de création', default=timezone.now)
    # École suspendue par l'équipe kEur IA : ses comptes ne peuvent plus se connecter,
    # sa page publique disparaît, mais aucune donnée n'est effacée.
    suspended_at = models.DateTimeField('Suspendue le', null=True, blank=True)

    @property
    def is_suspended(self) -> bool:
        return self.suspended_at is not None

    class Meta:
        db_table = 'schools_school'
        verbose_name = 'École'
        verbose_name_plural = 'Écoles'
        ordering = ['name']

    def __str__(self):
        return self.name
