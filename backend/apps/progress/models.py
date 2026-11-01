from django.db import models
from django.utils import timezone

DAILY_CHALLENGE_PREFIX = 'dc:'  # lesson_id des XP du défi du jour : "dc:2026-09-29"
RIDDLE_PREFIX = 'rd:'  # lesson_id des XP de l'énigme du jour (parcours 7-9) : "rd:2026-10-03"


def lesson_progress(queryset):
    """Progression réelle sur les leçons/jeux : exclut les XP du défi du jour et de l'énigme du jour.

    À utiliser pour tout compteur de « leçons » ou d'« activités » (bilans, classements, tableaux de bord)."""
    return queryset.exclude(lesson_id__startswith=DAILY_CHALLENGE_PREFIX).exclude(lesson_id__startswith=RIDDLE_PREFIX)


class Progress(models.Model):
    # Propriétaire réel (source de vérité). `owner_email` est conservé pour la
    # compatibilité le temps de la migration, mais n'est plus utilisé pour
    # l'ownership : un e-mail peut être réattribué, un id ne l'est jamais.
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, null=True, blank=True,
                             related_name='progress_entries', verbose_name='Utilisateur')
    owner_email = models.EmailField('E-mail du propriétaire')
    lesson_id = models.CharField('ID Leçon', max_length=100)
    age_track = models.CharField('Tranche d\'âge', max_length=20)
    xp = models.PositiveIntegerField('XP Garni', default=0)
    score = models.PositiveIntegerField('Score', default=100)
    stars = models.PositiveSmallIntegerField('Étoiles', default=0)
    completed_at = models.DateTimeField('Terminé le', default=timezone.now)

    class Meta:
        db_table = 'progress_progress'
        verbose_name = 'Progression'
        verbose_name_plural = 'Progressions'
        constraints = [
            models.UniqueConstraint(fields=['owner_email', 'lesson_id'], name='unique_progress'),
            models.UniqueConstraint(fields=['user', 'lesson_id'], name='unique_progress_user'),
        ]
        # Classements (7 jours, 30 jours) et suivi parent : filtrer par date de réalisation, puis regrouper par élève.
        indexes = [
            models.Index(fields=['completed_at'], name='progress_completed_idx'),
            models.Index(fields=['user', 'completed_at'], name='progress_user_completed_idx'),
        ]

    def __str__(self):
        return f"{self.owner_email} - {self.lesson_id}"


class QuizAttempt(models.Model):
    # Propriétaire réel (source de vérité). `owner_email` est conservé pour la
    # compatibilité le temps de la migration, mais n'est plus utilisé pour
    # l'ownership : un e-mail peut être réattribué, un id ne l'est jamais.
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, null=True, blank=True,
                             related_name='quiz_attempts', verbose_name='Utilisateur')
    owner_email = models.EmailField('E-mail du propriétaire')
    quiz_id = models.CharField('ID Quiz', max_length=100)
    score = models.PositiveIntegerField('Score')
    answers = models.JSONField('Réponses', default=list)
    created_at = models.DateTimeField('Date', default=timezone.now)

    class Meta:
        db_table = 'progress_quizattempt'
        verbose_name = 'Tentative Quiz'
        verbose_name_plural = 'Tentatives Quiz'

    def __str__(self):
        return f"{self.owner_email} - {self.quiz_id} - {self.score}"


class DailyUsage(models.Model):
    # Propriétaire réel (source de vérité). `owner_email` est conservé pour la
    # compatibilité le temps de la migration, mais n'est plus utilisé pour
    # l'ownership : un e-mail peut être réattribué, un id ne l'est jamais.
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, null=True, blank=True,
                             related_name='daily_usages', verbose_name='Utilisateur')
    owner_email = models.EmailField('E-mail du propriétaire')
    usage_date = models.DateField('Date d\'utilisation')
    age_track = models.CharField('Tranche d\'âge', max_length=20)
    minutes = models.PositiveIntegerField('Minutes', default=0)
    # Temps réellement passé dans l'application (1 par minute de présence) ; `minutes` y ajoute des forfaits par activité
    # et sert aux limites d'écran, il ne mesure donc pas la présence.
    presence_minutes = models.PositiveIntegerField('Minutes de présence', default=0)
    lessons = models.PositiveIntegerField('Leçons terminées', default=0)
    quizzes = models.PositiveIntegerField('Quiz terminés', default=0)
    games = models.PositiveIntegerField('Jeux joués', default=0)
    updated_at = models.DateTimeField('Mise à jour', auto_now=True)

    class Meta:
        db_table = 'progress_dailyusage'
        verbose_name = 'Usage Quotidien'
        verbose_name_plural = 'Usages Quotidiens'
        constraints = [
            models.UniqueConstraint(fields=['owner_email', 'usage_date', 'age_track'], name='unique_daily_usage'),
            models.UniqueConstraint(fields=['user', 'usage_date', 'age_track'], name='unique_daily_usage_user'),
        ]

    def __str__(self):
        return f"{self.owner_email} - {self.usage_date}"


class ParentNotification(models.Model):
    NOTIF_TYPES = [
        ('badge', 'Badge débloqué'),
        ('level_up', 'Montée de niveau'),
        ('module_done', 'Module terminé'),
        ('lesson_done', 'Leçon terminée'),
        ('new_title', 'Nouveau titre'),
        ('streak', 'Série de connexion'),
        ('leaderboard', 'Classement'),
        ('vocab_word', 'Mot de vocabulaire'),
        ('inactivity', 'Alerte inactivité'),
        ('screen_time_request', 'Demande de temps'),
    ]
    parent = models.ForeignKey(
        'accounts.User', on_delete=models.CASCADE,
        related_name='notifications_received', verbose_name='Parent'
    )
    child = models.ForeignKey(
        'accounts.User', on_delete=models.CASCADE,
        related_name='notifications_generated', verbose_name='Enfant'
    )
    notif_type = models.CharField('Type', max_length=20, choices=NOTIF_TYPES)
    payload = models.JSONField('Données', default=dict)
    is_read = models.BooleanField('Lu', default=False)
    created_at = models.DateTimeField('Créé le', auto_now_add=True)

    class Meta:
        db_table = 'progress_parent_notification'
        verbose_name = 'Notification Parent'
        ordering = ['-created_at']
        indexes = [models.Index(fields=['parent', 'is_read', '-created_at'], name='notif_parent_read_idx')]

    def __str__(self):
        return f"[{self.notif_type}] {self.child.display_name} → {self.parent.display_name}"


class DailyChallengeAttempt(models.Model):
    """Mauvaises réponses données par un élève au défi d'un jour : le nombre d'essais est limité côté serveur."""
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE,
                             related_name='daily_challenge_attempts', verbose_name='Utilisateur')
    day = models.DateField('Jour du défi')
    wrong_answers = models.JSONField('Réponses fausses (indices)', default=list)

    class Meta:
        db_table = 'progress_daily_challenge_attempt'
        verbose_name = 'Essais du défi du jour'
        verbose_name_plural = 'Essais du défi du jour'
        constraints = [
            models.UniqueConstraint(fields=['user', 'day'], name='unique_daily_challenge_attempt'),
        ]


class CharterCheck(models.Model):
    """Règle de la charte de l'apprenant cochée par un utilisateur."""
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE,
                             related_name='charter_checks', verbose_name='Utilisateur')
    rule_id = models.PositiveSmallIntegerField('Règle')
    checked_at = models.DateTimeField('Cochée le', default=timezone.now)

    class Meta:
        db_table = 'progress_charter_check'
        verbose_name = 'Règle de charte cochée'
        verbose_name_plural = 'Règles de charte cochées'
        constraints = [
            models.UniqueConstraint(fields=['user', 'rule_id'], name='unique_charter_check'),
        ]

    def __str__(self):
        return f"{self.user_id} - règle {self.rule_id}"


class ParentalLimits(models.Model):
    parent = models.ForeignKey(
        'accounts.User', on_delete=models.CASCADE,
        related_name='parental_limits', verbose_name='Parent'
    )
    child = models.ForeignKey(
        'accounts.User', on_delete=models.CASCADE, null=True, blank=True,
        related_name='active_limits', verbose_name='Enfant (optionnel)'
    )
    strict_time_limit = models.BooleanField('Temps limite strict', default=False)
    daily_limit_minutes = models.PositiveIntegerField('Temps quotidien autorisé (minutes)', default=45)
    bedtime_enabled = models.BooleanField('Activer heure du coucher', default=False)
    bedtime_start = models.CharField('Heure du coucher (début)', max_length=5, default='20:00')
    bedtime_end = models.CharField('Heure du coucher (fin)', max_length=5, default='07:00')
    email_notifications = models.BooleanField('Notifications par e-mail', default=True)
    push_notifications = models.BooleanField('Alertes push', default=True)
    weekly_report = models.BooleanField('Rapport hebdomadaire', default=True)
    two_factor = models.BooleanField('Double authentification (2FA)', default=False)
    # Palou, l'assistant IA, envoie les messages de l'enfant à un service tiers : il reste ÉTEINT tant que le parent ne l'a pas autorisé.
    palou_enabled = models.BooleanField('Assistant Palou autorisé', default=False)
    updated_at = models.DateTimeField('Dernière mise à jour', auto_now=True)

    class Meta:
        db_table = 'progress_parentallimits'
        verbose_name = 'Limites parentales'
        verbose_name_plural = 'Limites parentales'
        constraints = [
            models.UniqueConstraint(fields=['parent', 'child'], name='unique_parent_child_limits'),
            # Le SQL traite les NULL comme distincts : sans cette contrainte partielle, un parent pourrait
            # avoir plusieurs règles « tous les enfants ».
            models.UniqueConstraint(fields=['parent'], condition=models.Q(child__isnull=True),
                                    name='unique_parent_global_limits'),
        ]

    def __str__(self):
        target = self.child.display_name if self.child else "Tous les enfants"
        return f"Limites ({target}) - {self.daily_limit_minutes}min/j, coucher {self.bedtime_start}-{self.bedtime_end}"


class ScreenTimeCredit(models.Model):
    """
    Dérogation de temps d'écran accordée par un parent : tant qu'elle n'a pas expiré, ni la limite
    quotidienne ni l'heure du coucher ne verrouillent l'enfant. Stockée en base (et non en cache
    mémoire) pour être vue par tous les processus ; elle ne modifie jamais le temps réellement joué.
    """
    child = models.ForeignKey('accounts.User', on_delete=models.CASCADE,
                              related_name='screen_time_credits', verbose_name='Enfant')
    granted_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name='granted_screen_time', verbose_name='Accordé par')
    minutes = models.PositiveSmallIntegerField('Minutes accordées')
    granted_at = models.DateTimeField('Accordé le', default=timezone.now)
    expires_at = models.DateTimeField('Expire le')

    class Meta:
        db_table = 'progress_screen_time_credit'
        verbose_name = 'Dérogation de temps d\'écran'
        verbose_name_plural = 'Dérogations de temps d\'écran'
        indexes = [models.Index(fields=['child', 'expires_at'])]

    def __str__(self):
        return f"{self.child_id} +{self.minutes} min jusqu'à {self.expires_at:%H:%M}"


class PushSubscription(models.Model):
    """Appareil d'un parent abonné aux alertes push (un navigateur = un endpoint unique)."""
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='push_subscriptions')
    endpoint = models.CharField(max_length=500, unique=True)
    p256dh = models.CharField(max_length=200)
    auth = models.CharField(max_length=100)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'progress_push_subscription'

    def __str__(self):
        return f"push {self.user_id} {self.endpoint[:40]}"


class EarnedReward(models.Model):
    """
    Récompense acquise par un apprenant (badge, diplôme de module, palier de niveau, tutoriel).
    Assure l'unicité stricte côté serveur : aucune récompense déjà acquise ne peut être
    ré-attribuée ni re-célébrée, même en cas de changement d'appareil, déconnexion ou vidage de cache.
    """
    REWARD_BADGE = 'badge'
    REWARD_LEVEL = 'level'
    REWARD_DIPLOMA = 'diploma'
    REWARD_TUTORIAL = 'tutorial'
    REWARD_EVENT = 'event'

    REWARD_TYPES = [
        (REWARD_BADGE, 'Badge'),
        (REWARD_LEVEL, 'Niveau'),
        (REWARD_DIPLOMA, 'Diplôme'),
        (REWARD_TUTORIAL, 'Tutoriel'),
        (REWARD_EVENT, 'Événement'),
    ]

    user = models.ForeignKey(
        'accounts.User', on_delete=models.CASCADE,
        related_name='earned_rewards', verbose_name='Utilisateur'
    )
    event_key = models.CharField('Clé d\'événement unique', max_length=150, db_index=True)
    reward_type = models.CharField('Type de récompense', max_length=30, choices=REWARD_TYPES, default=REWARD_BADGE)
    reward_id = models.CharField('Identifiant récompense', max_length=100)
    awarded_at = models.DateTimeField('Attribué le', default=timezone.now)
    seen_at = models.DateTimeField('Animation vue le', null=True, blank=True)

    class Meta:
        db_table = 'progress_earned_reward'
        verbose_name = 'Récompense obtenue'
        verbose_name_plural = 'Récompenses obtenues'
        constraints = [
            models.UniqueConstraint(fields=['user', 'event_key'], name='unique_user_event_key'),
        ]
        indexes = [
            models.Index(fields=['user', 'reward_type']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.event_key} (vu: {bool(self.seen_at)})"


class LearnerStats(models.Model):
    """
    Statistiques persistantes côté serveur (erreurs surmontées, sans-faute consécutifs).
    Permet de conserver la progression vers les badges 'Détective Palou' et 'Je n'abandonne pas'
    quel que soit l'appareil utilisé par l'enfant.
    """
    user = models.OneToOneField(
        'accounts.User', on_delete=models.CASCADE,
        related_name='progress_stats', verbose_name='Utilisateur'
    )
    error_count = models.PositiveIntegerField('Nombre d\'erreurs surmontées', default=0)
    perfect_streak = models.PositiveIntegerField('Série de sans-faute consécutifs', default=0)
    updated_at = models.DateTimeField('Dernière mise à jour', auto_now=True)

    class Meta:
        db_table = 'progress_learner_stats'
        verbose_name = 'Statistiques Apprenant'
        verbose_name_plural = 'Statistiques Apprenants'

    def __str__(self):
        return f"{self.user.email} - Erreurs: {self.error_count}, Streak 100%: {self.perfect_streak}"



class RiddleDay(models.Model):
    """
    L'énigme d'un enfant pour un jour : choisie une fois pour toute la journée, puis réponse unique.
    Les énigmes déjà vues ne reviennent pas tant qu'il en reste de nouvelles.
    """
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE,
                             related_name='riddle_days', verbose_name='Utilisateur')
    day = models.DateField('Jour')
    riddle = models.ForeignKey('curriculum.Riddle', on_delete=models.CASCADE,
                               related_name='days', verbose_name='Énigme')
    answer = models.PositiveSmallIntegerField('Réponse choisie', null=True, blank=True)
    correct = models.BooleanField('Réponse juste', null=True, blank=True)
    answered_at = models.DateTimeField('Répondu à', null=True, blank=True)

    class Meta:
        db_table = 'progress_riddle_day'
        verbose_name = "Énigme d'un jour"
        verbose_name_plural = "Énigmes des jours"
        constraints = [
            models.UniqueConstraint(fields=['user', 'day'], name='unique_riddle_day'),
        ]

    def __str__(self):
        return f"{self.user_id} · {self.day} · énigme {self.riddle_id}"
