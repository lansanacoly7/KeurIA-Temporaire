"""
Modèles des espaces école et enseignant.

Les comptes (admin d'école, enseignants, élèves, parents) restent des
`accounts.User` ; ces modèles portent ce qui est propre à l'école. Toute
donnée est rattachée à une école : les vues filtrent systématiquement dessus.
"""
from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone

from .levels import LEVEL_CHOICES


class StaffProfile(models.Model):
    """Fiche d'un membre du personnel : admin d'école ou enseignant."""

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='staff_profile')
    school = models.ForeignKey('schools.School', on_delete=models.CASCADE, related_name='staff')
    first_name = models.CharField('Prénom', max_length=100)
    last_name = models.CharField('Nom', max_length=100)
    phone = models.CharField('Téléphone', max_length=30, blank=True, default='')
    # « Directrice », « Référent numérique »… (admin d'école uniquement).
    title = models.CharField('Fonction', max_length=80, blank=True, default='')

    class Meta:
        verbose_name = 'Fiche personnel'
        verbose_name_plural = 'Fiches personnel'

    def __str__(self):
        return f'{self.first_name} {self.last_name}'


class ParentProfile(models.Model):
    """Prénom, nom et téléphone d'un parent (renseignés lors de la liaison ou de l'inscription)."""

    ROLE_PERE = 'pere'
    ROLE_MERE = 'mere'
    ROLE_TUTEUR = 'tuteur'
    ROLE_TUTRICE = 'tutrice'
    ROLE_CHOICES = [
        (ROLE_PERE, 'Père'),
        (ROLE_MERE, 'Mère'),
        (ROLE_TUTEUR, 'Tuteur'),
        (ROLE_TUTRICE, 'Tutrice'),
    ]

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='parent_profile')
    first_name = models.CharField('Prénom', max_length=100)
    last_name = models.CharField('Nom', max_length=100)
    phone = models.CharField('Téléphone', max_length=30, blank=True, default='')
    parent_role = models.CharField('Rôle / Sexe du parent', max_length=20, choices=ROLE_CHOICES, default=ROLE_PERE, blank=True)

    class Meta:
        verbose_name = 'Fiche parent'
        verbose_name_plural = 'Fiches parents'


class AcademicYear(models.Model):
    STATUS_CURRENT = 'en_cours'
    STATUS_CLOSED = 'cloturee'

    school = models.ForeignKey('schools.School', on_delete=models.CASCADE, related_name='academic_years')
    label = models.CharField('Année', max_length=9)  # « 2026-2027 »
    start_date = models.DateField('Rentrée')
    end_date = models.DateField("Fin d'année")
    status = models.CharField(max_length=10, choices=[(STATUS_CURRENT, 'En cours'), (STATUS_CLOSED, 'Clôturée')])
    closed_at = models.DateTimeField(null=True, blank=True)
    summary = models.JSONField(null=True, blank=True)
    # Bilan de l'année téléchargé par l'école : exigé (côté serveur) avant la clôture.
    archive_downloaded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Année scolaire'
        verbose_name_plural = 'Années scolaires'
        constraints = [
            models.UniqueConstraint(fields=['school', 'label'], name='unique_year_per_school'),
            models.UniqueConstraint(fields=['school'], condition=Q(status='en_cours'), name='one_current_year_per_school'),
        ]

    def __str__(self):
        return f'{self.school} {self.label}'


class Classroom(models.Model):
    school = models.ForeignKey('schools.School', on_delete=models.CASCADE, related_name='classrooms')
    level = models.CharField('Niveau', max_length=3, choices=LEVEL_CHOICES)
    # Lettre qui distingue plusieurs classes d'un même niveau (« CE1 A »). Vide si l'école n'a qu'une classe de ce niveau (« CI »).
    section = models.CharField('Lettre', max_length=3, blank=True, default='')
    teacher = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
                                related_name='taught_classrooms')
    academic_year = models.CharField('Année', max_length=9)
    archived = models.BooleanField(default=False)
    # Élèves présents au moment de l'archivage (consultation des années passées).
    archived_student_ids = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = 'Classe'
        verbose_name_plural = 'Classes'
        constraints = [
            models.UniqueConstraint(fields=['school', 'level', 'section'], condition=Q(archived=False),
                                    name='unique_active_classroom'),
        ]

    def __str__(self):
        return f'{self.level} {self.section}'.strip() + f' ({self.academic_year})'


class StudentProfile(models.Model):
    """Élève inscrit par l'école. Le compte de connexion est `user` (identifiant = user.email)."""

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='student_profile')
    school = models.ForeignKey('schools.School', on_delete=models.CASCADE, related_name='students')
    matricule = models.CharField(max_length=30)
    first_name = models.CharField('Prénom', max_length=100)
    last_name = models.CharField('Nom', max_length=100)
    sexe = models.CharField(max_length=1, choices=[('F', 'Fille'), ('M', 'Garçon')])
    birth_date = models.DateField('Date de naissance')
    classroom = models.ForeignKey(Classroom, on_delete=models.SET_NULL, null=True, blank=True, related_name='students')
    parent_phone = models.CharField('Téléphone parent', max_length=30, blank=True, default='')
    left_in_year = models.CharField(max_length=9, blank=True, default='')
    parent_linked_at = models.DateTimeField(null=True, blank=True)
    # Parcours choisi par l'enseignant pour cet élève (vide : celui du niveau de la classe).
    track_override = models.CharField('Parcours imposé', max_length=5, blank=True, default='', choices=[('7-9', '7-9 ans'), ('10-12', '10-12 ans'), ('13-15', '13-15 ans')])
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = 'Élève'
        verbose_name_plural = 'Élèves'
        constraints = [models.UniqueConstraint(fields=['school', 'matricule'], name='unique_matricule_per_school')]

    def __str__(self):
        return f'{self.first_name} {self.last_name} ({self.matricule})'


class ParentLinkCode(models.Model):
    """
    Code de liaison parent : usage unique, durée limitée, un seul actif par élève.
    Conservé lisible (décision validée) pour pouvoir être réaffiché sur la fiche
    élève ; protégé par l'usage unique, l'expiration et la limitation des essais.
    """

    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='link_codes')
    code = models.CharField(max_length=6, db_index=True)
    created_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Code parent'
        verbose_name_plural = 'Codes parents'

    def is_active(self, now=None) -> bool:
        now = now or timezone.now()
        return self.used_at is None and self.revoked_at is None and self.expires_at > now


class Mission(models.Model):
    """Bibliothèque commune à toutes les écoles (identifiants stables : m1, m2…)."""

    id = models.CharField(primary_key=True, max_length=20)
    title = models.CharField(max_length=150)
    description = models.TextField()
    category = models.CharField(max_length=30)
    difficulty = models.CharField(max_length=20)
    duration_minutes = models.PositiveSmallIntegerField()
    xp = models.PositiveSmallIntegerField()
    # Retirée de la bibliothèque par l'équipe kEur IA (les devoirs déjà donnés restent).
    active = models.BooleanField(default=True)
    # Devoirs du programme : générés à partir des leçons (voir services/programme.py). Une mission « libre » (créée à la
    # main par l'équipe kEur IA) n'a ni parcours, ni module, ni leçon : elle convient à tous les âges.
    KIND_LIBRE, KIND_LESSON, KIND_REVIEW = 'libre', 'lecon', 'bilan'
    kind = models.CharField(max_length=10, default=KIND_LIBRE)
    track = models.CharField('Parcours d\'âge', max_length=20, blank=True, default='',
                             help_text="« 7-9 », « 10-12 » ou « 13-15 » ; vide = tous les âges.")
    module = models.ForeignKey('curriculum.Module', null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    lesson = models.ForeignKey('curriculum.Lesson', null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    question_count = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return self.title


class Assignment(models.Model):
    school = models.ForeignKey('schools.School', on_delete=models.CASCADE, related_name='assignments')
    mission = models.ForeignKey(Mission, on_delete=models.PROTECT, related_name='assignments')
    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name='assignments')
    teacher = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='given_assignments')
    due_date = models.DateField(null=True, blank=True)
    instructions = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = 'Devoir'
        verbose_name_plural = 'Devoirs'


class AssignmentCompletion(models.Model):
    assignment = models.ForeignKey(Assignment, on_delete=models.CASCADE, related_name='completions')
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='completions')
    completed_at = models.DateTimeField(default=timezone.now)
    score = models.PositiveSmallIntegerField()

    class Meta:
        constraints = [models.UniqueConstraint(fields=['assignment', 'student'], name='unique_completion')]


class AssignmentAnswer(models.Model):
    """Réponse d'un élève à une question d'un devoir : la première réponse à chaque question est définitive.

    Le score d'un devoir est calculé par le serveur à partir de ces lignes, jamais envoyé par le navigateur."""
    assignment = models.ForeignKey(Assignment, on_delete=models.CASCADE, related_name='answers')
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='answers')
    step = models.PositiveSmallIntegerField()
    option = models.PositiveSmallIntegerField()
    correct = models.BooleanField()
    answered_at = models.DateTimeField(default=timezone.now)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['assignment', 'student', 'step'], name='unique_assignment_answer')]


class SchoolActivity(models.Model):
    school = models.ForeignKey('schools.School', on_delete=models.CASCADE, related_name='activity')
    kind = models.CharField(max_length=30)
    label = models.CharField(max_length=255)
    at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ['-at', '-id']


class YearClosure(models.Model):
    """
    Journal d'une clôture d'année, pour pouvoir l'annuler pendant UNDO_DAYS jours.
    `changes` : ce qu'il faut inverser (élèves, classes archivées et créées).
    """

    UNDO_DAYS = 7

    school = models.ForeignKey('schools.School', on_delete=models.CASCADE, related_name='year_closures')
    from_year = models.CharField(max_length=9)
    to_year = models.CharField(max_length=9)
    closed_at = models.DateTimeField(default=timezone.now)
    undo_until = models.DateTimeField()
    undone_at = models.DateTimeField(null=True, blank=True)
    changes = models.JSONField(default=dict)

    class Meta:
        ordering = ['-closed_at']


class RestrictionPolicy(models.Model):
    """Règles posées par la direction (classroom vide : toute l'école) ou par un enseignant (une classe).
    Le calcul du réglage effectif et le contrôle « on n'assouplit pas » sont dans `restrictions.py` (voir docs/ECOLE_ELEVE_CONCEPTION.md)."""

    school = models.ForeignKey('schools.School', on_delete=models.CASCADE, related_name='restriction_policies')
    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, null=True, blank=True, related_name='restriction_policies')
    rules = models.JSONField('Réglages', default=dict, blank=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Règles'
        verbose_name_plural = 'Règles'
        constraints = [
            models.UniqueConstraint(fields=['school'], condition=Q(classroom__isnull=True), name='unique_school_policy'),
            models.UniqueConstraint(fields=['school', 'classroom'], condition=Q(classroom__isnull=False), name='unique_class_policy'),
        ]

    def __str__(self):
        return f'Règles de {self.classroom or self.school}'


class ClassSession(models.Model):
    """Séance de classe ouverte par l'enseignant : pendant sa durée, seules les règles de l'école et de la classe s'appliquent."""

    school = models.ForeignKey('schools.School', on_delete=models.CASCADE, related_name='class_sessions')
    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name='sessions')
    title = models.CharField('Titre', max_length=80)
    lesson_id = models.CharField('Leçon', max_length=30, blank=True, default='')
    started_at = models.DateTimeField(default=timezone.now)
    ends_at = models.DateTimeField()
    ended_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')

    class Meta:
        verbose_name = 'Séance de classe'
        verbose_name_plural = 'Séances de classe'
        indexes = [models.Index(fields=['classroom', 'ends_at'])]

    def __str__(self):
        return f'{self.title} ({self.classroom})'


class Announcement(models.Model):
    """Annonce de l'enseignant à sa classe : un mot (`text`) ou un sondage (`poll`). Jamais de discussion : l'élève ne tape aucun texte."""

    KIND_TEXT = 'text'
    KIND_POLL = 'poll'

    school = models.ForeignKey('schools.School', on_delete=models.CASCADE, related_name='announcements')
    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name='announcements')
    kind = models.CharField(max_length=4, choices=[(KIND_TEXT, 'Mot'), (KIND_POLL, 'Sondage')])
    title = models.CharField('Titre', max_length=80, blank=True, default='')
    text = models.CharField('Texte ou question', max_length=300)
    options = models.JSONField('Réponses du sondage', default=list, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    ends_at = models.DateTimeField()
    closed_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')

    class Meta:
        verbose_name = 'Annonce'
        verbose_name_plural = 'Annonces'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.kind} : {self.text[:40]}'


class AnnouncementAnswer(models.Model):
    """Réponse d'un élève à un sondage (une seule, modifiable tant que le sondage est ouvert)."""

    announcement = models.ForeignKey(Announcement, on_delete=models.CASCADE, related_name='answers')
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='announcement_answers')
    choice = models.PositiveSmallIntegerField()
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['announcement', 'student'], name='one_answer_per_student')]
