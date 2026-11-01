import secrets
from datetime import timedelta

from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models, transaction
from django.db.models import F
from django.utils import timezone


class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, display_name="Explorateur", role="parent", **extra_fields):
        if not email:
            raise ValueError("L'adresse e-mail est obligatoire.")
        email = self.normalize_email(email).lower()
        # Seule l'inscription publique (RegisterSerializer) crée des comptes
        # non vérifiés ; comptes enfants, admin et superuser sont de confiance.
        extra_fields.setdefault('email_verified', True)
        user = self.model(email=email, display_name=display_name, role=role, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, display_name="Administrateur", **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Le superutilisateur doit avoir is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Le superutilisateur doit avoir is_superuser=True.')

        return self.create_user(email, password, display_name=display_name, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_ADMIN = 'admin'
    ROLE_SCHOOL_ADMIN = 'admin_ecole'
    ROLE_PARENT = 'parent'
    ROLE_TEACHER = 'enseignant'
    ROLE_STUDENT = 'eleve'
    ROLE_CHOICES = [
        (ROLE_ADMIN, 'Administrateur'),
        (ROLE_SCHOOL_ADMIN, "Administrateur d'école"),
        (ROLE_PARENT, 'Parent'),
        (ROLE_TEACHER, 'Enseignant'),
        (ROLE_STUDENT, 'Élève'),
    ]

    email = models.EmailField('Adresse e-mail', unique=True, db_index=True)
    display_name = models.CharField('Nom affiché', max_length=150, default='Explorateur')
    role = models.CharField('Rôle', max_length=50, choices=ROLE_CHOICES, default='parent')
    login_count = models.PositiveIntegerField('Nombre de connexions', default=0)
    last_seen_at = models.DateTimeField('Dernière connexion', null=True, blank=True)
    # Conservation limitée (voir retention.py) : date de l'e-mail d'avertissement et de la désactivation d'un foyer inactif.
    retention_notified_at = models.DateTimeField('Avertissement de conservation envoyé le', null=True, blank=True)
    retention_deactivated_at = models.DateTimeField('Désactivé pour inactivité le', null=True, blank=True)
    deleted_at = models.DateTimeField('Suppression demandée le', null=True, blank=True)
    created_at = models.DateTimeField('Date de création', default=timezone.now)

    is_active = models.BooleanField('Actif', default=True)
    is_staff = models.BooleanField('Accès administration', default=False)
    email_verified = models.BooleanField('E-mail vérifié', default=False)
    # Preuve du consentement (conditions d'utilisation et politique de confidentialité) donné à l'inscription.
    terms_accepted_at = models.DateTimeField("Conditions acceptées le", null=True, blank=True)
    age_group = models.CharField('Tranche d\'âge', max_length=20, null=True, blank=True)
    gender = models.CharField('Genre / Sexe / Statut', max_length=20, blank=True, default='')
    tutorial_completed = models.BooleanField('Tutoriel terminé', default=False)

    # Validation de l'inscription d'un parent par l'équipe kEur IA (voir approval.py). Tous les comptes existants et tous
    # ceux créés par l'équipe ou par une école sont « acceptés » d'office : seule l'inscription publique d'un parent attend.
    APPROVAL_APPROVED = 'approved'
    APPROVAL_PENDING = 'pending'
    APPROVAL_REJECTED = 'rejected'
    APPROVAL_CHOICES = [
        (APPROVAL_APPROVED, 'Acceptée'),
        (APPROVAL_PENDING, 'En attente'),
        (APPROVAL_REJECTED, 'Refusée'),
    ]
    approval_status = models.CharField("Validation de l'inscription", max_length=10, choices=APPROVAL_CHOICES,
                                       default=APPROVAL_APPROVED, db_index=True)
    approval_decided_at = models.DateTimeField('Décision prise le', null=True, blank=True)
    approval_decided_by = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='+',
                                            verbose_name='Décision prise par')
    approval_note = models.CharField('Motif communiqué au parent', max_length=300, blank=True, default='')

    # Source de vérité unique du lien parent → enfant.
    # PROTECT : supprimer un parent qui a encore des enfants est refusé, pour
    # éviter d'effacer silencieusement les comptes (et la progression) des enfants.
    parent = models.ForeignKey('self', on_delete=models.PROTECT, null=True, blank=True, related_name='children', verbose_name='Parent')
    # École de rattachement (admin d'école, enseignant, élève). Toutes les
    # requêtes des espaces école et enseignant sont filtrées sur ce champ.
    school = models.ForeignKey('schools.School', on_delete=models.PROTECT, null=True, blank=True,
                               related_name='members', verbose_name='École')

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['display_name']

    class Meta:
        db_table = 'accounts_user'
        verbose_name = 'Utilisateur'
        verbose_name_plural = 'Utilisateurs'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.display_name} ({self.email}) [{self.role}]"

    def save(self, *args, **kwargs):
        if self.role == 'admin':
            self.is_staff = True
        super().save(*args, **kwargs)

    GRACE_PERIOD_DAYS = 3

    @property
    def is_pending_deletion(self) -> bool:
        return self.deleted_at is not None

    @property
    def days_until_permanent_deletion(self) -> int:
        if not self.deleted_at:
            return 0
        from datetime import timedelta
        deadline = self.deleted_at + timedelta(days=self.GRACE_PERIOD_DAYS)
        remaining = deadline - timezone.now()
        total_seconds = remaining.total_seconds()
        if total_seconds <= 0:
            return 0
        days = int(total_seconds // 86400)
        return days + (1 if total_seconds % 86400 > 0 else 0)


    def record_connection_and_get_streak(self):
        """Enregistre la connexion d'aujourd'hui et calcule la série consécutive (flamme)."""
        today = timezone.localdate()
        UserConnectionDay.objects.get_or_create(user=self, connection_date=today)
        self.last_seen_at = timezone.now()
        self.save(update_fields=['last_seen_at'])
        streak = self.get_streak()

        # Notifier le parent si un jalon marquant de série est atteint
        if getattr(self, 'parent_id', None) and streak in [3, 5, 7, 10, 14, 21, 30]:
            try:
                from apps.progress.models import ParentNotification
                ParentNotification.objects.get_or_create(
                    parent_id=self.parent_id,
                    child=self,
                    notif_type='streak',
                    defaults={'payload': {'type': 'streak', 'streakDays': streak, 'date': today.isoformat()}}
                )
            except Exception:
                pass

        return streak

    def get_streak(self):
        """Calcule le nombre de jours consécutifs de connexion de l'utilisateur."""
        today = timezone.localdate()
        dates = list(
            UserConnectionDay.objects.filter(user=self)
            .order_by('-connection_date')
            .values_list('connection_date', flat=True)
        )
        if not dates:
            return 1

        # Si aucune connexion aujourd'hui ni hier, la série est rompue
        if dates[0] < today - timedelta(days=1):
            return 1

        streak = 0
        expected_date = dates[0]
        for d in dates:
            if d == expected_date:
                streak += 1
                expected_date -= timedelta(days=1)
            elif d > expected_date:
                continue
            else:
                break
        return max(1, streak)


class UserConnectionDay(models.Model):
    """Enregistre chaque jour distinct où l'utilisateur s'est connecté pour calculer la flamme (streak)."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='connection_days', verbose_name='Utilisateur')
    connection_date = models.DateField('Date de connexion', default=timezone.localdate, db_index=True)
    created_at = models.DateTimeField('Horodatage', auto_now_add=True)

    class Meta:
        db_table = 'accounts_connection_day'
        verbose_name = 'Jour de connexion'
        verbose_name_plural = 'Jours de connexion'
        unique_together = ('user', 'connection_date')
        ordering = ['-connection_date']

    def __str__(self):
        return f"{self.user.email} - {self.connection_date}"

class AccountStatsSnapshot(models.Model):
    """Chiffres d'un mois, figés avant toute suppression de comptes : l'historique reste exact sans données personnelles."""

    month = models.DateField('Mois (1er jour)', unique=True)
    taken_at = models.DateTimeField('Figé le')
    family_parents = models.PositiveIntegerField(default=0)
    family_children = models.PositiveIntegerField(default=0)
    school_students = models.PositiveIntegerField(default=0)
    teachers = models.PositiveIntegerField(default=0)
    school_admins = models.PositiveIntegerField(default=0)
    active_30_days = models.PositiveIntegerField('Comptes connectés dans les 30 jours', default=0)
    total_xp = models.BigIntegerField(default=0)
    # Ce qui s'est passé pendant le mois (mis à jour à chaque passage de la conservation).
    warned = models.PositiveIntegerField('Foyers avertis', default=0)
    deactivated = models.PositiveIntegerField('Foyers désactivés', default=0)
    deleted = models.PositiveIntegerField('Comptes supprimés', default=0)

    class Meta:
        db_table = 'accounts_stats_snapshot'
        ordering = ['-month']
        verbose_name = 'Chiffres mensuels'
        verbose_name_plural = 'Chiffres mensuels'


class OneTimeCode(models.Model):
    """Code à 6 chiffres envoyé par e-mail : haché en base, expirant, essais limités."""

    MAX_ATTEMPTS = 5
    VALIDITY_MINUTES = 15

    # Empreinte du code (jamais le code en clair), vérifiée avec check_password.
    code = models.CharField(max_length=128)
    attempts = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        abstract = True

    @classmethod
    def issue(cls, user):
        """Remplace les codes précédents de l'utilisateur et renvoie le nouveau code en clair."""
        code = f"{secrets.randbelow(1_000_000):06d}"
        with transaction.atomic():
            cls.objects.filter(user=user).delete()
            cls.objects.create(user=user, code=make_password(code))
        return code

    @classmethod
    def consume(cls, user, code):
        """Vrai si `code` est le code valide de `user` ; il est alors supprimé (usage unique)."""
        current = cls.objects.filter(user=user).order_by('-created_at').first()
        if current is None:
            return False
        if timezone.now() > current.created_at + timedelta(minutes=cls.VALIDITY_MINUTES):
            current.delete()
            return False
        # Un essai est réservé de façon ATOMIQUE avant de comparer : des requêtes envoyées en parallèle ne peuvent pas dépasser
        # MAX_ATTEMPTS (avec un simple « lire puis écrire », chacune verrait un compteur encore bas).
        reserved = cls.objects.filter(pk=current.pk, attempts__lt=cls.MAX_ATTEMPTS).update(attempts=F('attempts') + 1)
        if not reserved:
            current.delete()
            return False
        if not check_password(code, current.code):
            return False
        cls.objects.filter(user=user).delete()
        return True


class PasswordResetCode(OneTimeCode):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reset_codes')

    class Meta:
        db_table = 'accounts_password_reset'
        verbose_name = 'Code de réinitialisation'


class LoginCode(OneTimeCode):
    """Second facteur de connexion (réglage « double authentification » du parent) : code envoyé par e-mail."""
    VALIDITY_MINUTES = 10

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='login_codes')

    class Meta:
        db_table = 'accounts_login_code'
        verbose_name = 'Code de connexion (double authentification)'


class EmailVerificationCode(OneTimeCode):
    VALIDITY_MINUTES = 30

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='email_verification_codes')

    class Meta:
        db_table = 'accounts_email_verification'
        verbose_name = "Code de vérification d'e-mail"
