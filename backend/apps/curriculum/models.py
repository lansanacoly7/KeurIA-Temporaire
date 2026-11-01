from django.db import models
from django.utils import timezone


class AgeTrack(models.Model):
    """
    Parcours par tranche d'âge (ex: 7-9, 10-12, 13-15).
    """
    key = models.CharField('Identifiant tranche', max_length=20, unique=True)  # '7-9', '10-12', '13-15'
    label = models.CharField('Libellé affiché', max_length=50)                 # '7–9 ans'
    name = models.CharField('Nom du parcours', max_length=100)                # 'Petits Explorateurs'
    tagline = models.TextField('Description courte / Slogan', blank=True)
    accent = models.CharField('Couleur d\'accentuation', max_length=30, default='#f4b942')
    video_ouverture = models.CharField('Vidéo d\'ouverture', max_length=255, blank=True, default='')
    order = models.PositiveIntegerField('Ordre d\'affichage', default=1)
    created_at = models.DateTimeField('Créé le', default=timezone.now)
    updated_at = models.DateTimeField('Mis à jour le', auto_now=True)

    class Meta:
        db_table = 'curriculum_agetrack'
        verbose_name = 'Parcours par âge'
        verbose_name_plural = 'Parcours par âge'
        ordering = ['order', 'key']

    def __str__(self):
        return f"{self.label} — {self.name}"


class Module(models.Model):
    """
    Monde / Module pédagogique (ex: p1, p2, a1, c1).
    """
    track = models.ForeignKey(AgeTrack, on_delete=models.CASCADE, related_name='modules', verbose_name='Parcours')
    world_id = models.CharField('Identifiant monde', max_length=50, unique=True)  # 'p1', 'p2', 'a1', etc.
    title = models.CharField('Titre du monde', max_length=200)
    icon = models.CharField('Icône emoji / symbole', max_length=50, default='🤖')
    description = models.TextField('Description pédagogique')
    color = models.CharField('Thème de couleur', max_length=50, default='sun')    # 'sun', 'mint', 'coral', 'blue', etc.
    lieu = models.CharField('Lieu à Dakar', max_length=200, blank=True, default='')
    video_arrivee = models.CharField('Vidéo d\'arrivée', max_length=255, blank=True, default='')
    video_depart = models.CharField('Vidéo de départ', max_length=255, blank=True, default='')
    order = models.PositiveIntegerField('Ordre dans le parcours', default=1)
    created_at = models.DateTimeField('Créé le', default=timezone.now)
    updated_at = models.DateTimeField('Mis à jour le', auto_now=True)

    class Meta:
        db_table = 'curriculum_module'
        verbose_name = 'Module (Monde)'
        verbose_name_plural = 'Modules (Mondes)'
        ordering = ['track__order', 'order']

    def __str__(self):
        return f"[{self.world_id}] {self.title} ({self.track.key})"


class Lesson(models.Model):
    """
    Cours / Leçon individuelle rattachée à un module.
    """
    TYPE_CHOICES = [
        ('histoire', 'Histoire interactive'),
        ('jeu', 'Mini-jeu & Défi'),
        ('quiz', 'Quiz d\'évaluation'),
        ('atelier', 'Atelier pratique'),
        ('projet', 'Projet guidé'),
    ]

    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name='lessons', verbose_name='Module')
    lesson_id = models.CharField('Identifiant leçon', max_length=100, unique=True)  # 'p1-1', 'p1-2', etc.
    title = models.CharField('Titre de la leçon', max_length=200)
    lesson_type = models.CharField('Type de leçon', max_length=50, choices=TYPE_CHOICES, default='histoire')
    minutes = models.PositiveIntegerField('Durée estimée (minutes)', default=5)
    xp = models.PositiveIntegerField('Points d\'expérience (XP)', default=20)
    stars = models.PositiveIntegerField('Étoiles récompensées', default=3)
    order = models.PositiveIntegerField('Ordre dans le module', default=1)
    created_at = models.DateTimeField('Créé le', default=timezone.now)
    updated_at = models.DateTimeField('Mis à jour le', auto_now=True)

    class Meta:
        db_table = 'curriculum_lesson'
        verbose_name = 'Leçon'
        verbose_name_plural = 'Leçons'
        ordering = ['module__order', 'order']

    def __str__(self):
        return f"[{self.lesson_id}] {self.title}"


class DailyChallenge(models.Model):
    """
    Énigme du jour : le serveur en choisit une par date parmi les défis actifs et
    corrige les réponses (la bonne réponse n'est jamais envoyée au navigateur).
    """
    theme = models.CharField('Thème', max_length=100)
    question = models.TextField('Question')
    options = models.JSONField('Choix de réponse', default=list)
    correct_index = models.PositiveSmallIntegerField('Index de la bonne réponse')
    explanation = models.TextField('Explication affichée après réussite')
    is_active = models.BooleanField('Actif', default=True)
    order = models.PositiveIntegerField('Ordre de rotation', default=1)

    class Meta:
        db_table = 'curriculum_dailychallenge'
        verbose_name = 'Défi du jour'
        verbose_name_plural = 'Défis du jour'
        ordering = ['order', 'id']

    def __str__(self):
        return f"[{self.theme}] {self.question[:50]}"


class GlossaryTerm(models.Model):
    """Mot du dictionnaire de l'apprenant."""
    word = models.CharField('Mot', max_length=100, unique=True)
    definition = models.TextField('Définition')
    example = models.TextField('Exemple', blank=True, default='')
    icon = models.CharField('Icône', max_length=20, default='📘')
    color = models.CharField('Couleur', max_length=20, default='#a1c4fd')
    background = models.CharField('Arrière-plan CSS', max_length=200, blank=True, default='')
    is_active = models.BooleanField('Actif', default=True)
    # Un élève découvre le mot en terminant l'une de ces leçons (identifiants de leçon). Liste vide : mot réservé aux adultes.
    unlock_lessons = models.JSONField('Leçons qui débloquent le mot', default=list, blank=True)

    class Meta:
        db_table = 'curriculum_glossaryterm'
        verbose_name = 'Mot du dictionnaire'
        verbose_name_plural = 'Mots du dictionnaire'
        ordering = ['word']

    def __str__(self):
        return self.word


class LessonContent(models.Model):
    """
    Contenu pédagogique riche associé à une leçon (scénario, quiz, activité, vocabulaire, etc.).
    """
    lesson = models.OneToOneField(Lesson, on_delete=models.CASCADE, related_name='content', verbose_name='Leçon associée')
    mission = models.TextField('Mission d\'introduction', blank=True, default='')
    objectives = models.JSONField('Objectifs d\'apprentissage', default=list, blank=True)
    discover = models.TextField('Texte de découverte', blank=True, default='')
    example = models.TextField('Exemple concret du quotidien', blank=True, default='')
    activity = models.JSONField('Activité interactive (prompt, options, correct, success)', default=dict, blank=True)
    remember = models.JSONField('Points clés à retenir', default=list, blank=True)
    vocabulary = models.JSONField('Vocabulaire clé (terme / définition)', default=list, blank=True)
    challenge = models.TextField('Défi / Production d\'action', blank=True, default='')
    skill = models.CharField('Compétence validée', max_length=255, blank=True, default='')
    questions = models.JSONField('Questions du quiz (QCM)', default=list, blank=True)
    steps = models.JSONField('Étapes personnalisées additionnelles', default=list, blank=True)
    created_at = models.DateTimeField('Créé le', default=timezone.now)
    updated_at = models.DateTimeField('Mis à jour le', auto_now=True)

    class Meta:
        db_table = 'curriculum_lessoncontent'
        verbose_name = 'Contenu de Leçon'
        verbose_name_plural = 'Contenus de Leçons'

    def __str__(self):
        return f"Contenu de {self.lesson.lesson_id} — {self.lesson.title}"


class Activity(models.Model):
    """
    Activité qui rapporte de l'XP sans être une leçon du parcours (jeux de la carte,
    arcade, bonus). Le serveur est seul juge de l'XP attribuée : jamais le navigateur.
    Les leçons du parcours (`Lesson`) portent déjà leur propre XP.
    """
    KIND_GAME_LEVEL = 'game_level'
    KIND_ARCADE_GAME = 'arcade_game'
    KIND_ARCADE_QUIZ = 'arcade_quiz'
    KIND_BONUS = 'bonus'
    KIND_CHOICES = [
        (KIND_GAME_LEVEL, 'Niveau de la carte des jeux'),
        (KIND_ARCADE_GAME, "Jeu d'arcade"),
        (KIND_ARCADE_QUIZ, "Quiz d'arcade"),
        (KIND_BONUS, 'Bonus'),
    ]

    activity_id = models.CharField('Identifiant', max_length=100, unique=True)
    kind = models.CharField('Type', max_length=20, choices=KIND_CHOICES)
    title = models.CharField('Titre', max_length=200)
    xp = models.PositiveIntegerField('XP attribuée (une seule fois)')
    is_active = models.BooleanField('Actif', default=True)

    class Meta:
        db_table = 'curriculum_activity'
        verbose_name = 'Activité (XP)'
        verbose_name_plural = 'Activités (XP)'
        ordering = ['kind', 'activity_id']

    def __str__(self):
        return f"[{self.activity_id}] {self.title} — {self.xp} XP"


class Riddle(models.Model):
    """
    Énigme du jour du parcours 7-9. Chaque énigme est rattachée à UNE leçon et ne porte que sur ce que cette
    leçon enseigne : le serveur ne la propose qu'à un enfant qui a terminé la leçon. La bonne réponse n'est
    jamais envoyée au navigateur avant la réponse de l'enfant.
    """
    lesson_id = models.CharField('Leçon concernée', max_length=100, db_index=True)  # 'p3-2'
    question = models.TextField('Question')
    options = models.JSONField('Choix de réponse', default=list)
    correct_index = models.PositiveSmallIntegerField('Index de la bonne réponse')
    explanation = models.TextField('Explication montrée après la réponse (juste ou fausse)')
    is_active = models.BooleanField('Actif', default=True)

    class Meta:
        db_table = 'curriculum_riddle'
        verbose_name = 'Énigme du jour'
        verbose_name_plural = 'Énigmes du jour'
        ordering = ['lesson_id', 'id']

    def __str__(self):
        return f"[{self.lesson_id}] {self.question[:60]}"


class TeacherGuide(models.Model):
    """Guide rédigé pour l'enseignant, optionnel : sans lui, la fiche de leçon en déduit un du contenu."""
    lesson = models.OneToOneField(Lesson, on_delete=models.CASCADE, related_name='teacher_guide', verbose_name='Leçon associée')
    essential = models.JSONField("L'essentiel à retenir (3 phrases)", default=list, blank=True)
    explain = models.TextField("Comment l'expliquer simplement", blank=True, default='')
    unplugged = models.JSONField('Activité sans ordinateur {title, minutes, materials[], steps[]}', default=dict, blank=True)
    ask_them = models.JSONField('Questions à poser aux élèves', default=list, blank=True)
    common_mistakes = models.JSONField('Erreurs fréquentes', default=list, blank=True)
    updated_at = models.DateTimeField('Mis à jour le', auto_now=True)

    class Meta:
        verbose_name = 'Guide enseignant'
        verbose_name_plural = 'Guides enseignants'

    def __str__(self):
        return f'Guide — {self.lesson.lesson_id}'


class ContentVersion(models.Model):
    """
    Version d'un contenu éditable dans le studio.
    """
    KIND_LESSON79 = 'lesson79'
    KIND_LESSON79ECOLE = 'lesson79ecole'
    KIND_LESSON1012 = 'lesson1012'
    KIND_LESSON1012ECOLE = 'lesson1012ecole'
    KIND_LESSON1315 = 'lesson1315'
    KIND_LESSON1315ECOLE = 'lesson1315ecole'
    KIND_CATALOG79 = 'catalog79'
    KIND_RIDDLE = 'riddle'
    KIND_DAILY_CHALLENGE = 'daily_challenge'
    KIND_MISSION = 'mission'
    KIND_ACTIVITY = 'activity'
    SOURCE_IMPORT = 'import'
    SOURCE_STUDIO = 'studio'
    SOURCE_ROLLBACK = 'rollback'

    kind = models.CharField('Type de contenu', max_length=20, default=KIND_LESSON79)
    key = models.CharField('Identifiant', max_length=100)
    number = models.PositiveIntegerField('Numéro de version')
    content = models.JSONField('Contenu')
    source = models.CharField('Origine', max_length=10, default=SOURCE_STUDIO)
    note = models.CharField('Note de modification', max_length=200, blank=True, default='')
    author = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    author_email = models.EmailField('Auteur', blank=True, default='')
    created_at = models.DateTimeField('Créée le', default=timezone.now)
    updated_at = models.DateTimeField('Modifiée le', auto_now=True)
    publish_at = models.DateTimeField('En ligne à partir de', null=True, blank=True)
    discarded_at = models.DateTimeField('Écartée le', null=True, blank=True)

    class Meta:
        db_table = 'curriculum_contentversion'
        verbose_name = 'Version de contenu'
        verbose_name_plural = 'Versions de contenu'
        ordering = ['kind', 'key', '-number']
        constraints = [
            models.UniqueConstraint(fields=['kind', 'key', 'number'], name='uniq_contentversion_number'),
            models.UniqueConstraint(fields=['kind', 'key'], condition=models.Q(publish_at__isnull=True, discarded_at__isnull=True),
                                    name='uniq_contentversion_draft'),
        ]
        indexes = [models.Index(fields=['kind', 'key', 'publish_at'], name='contentversion_lookup')]

    def __str__(self):
        return f'{self.kind} {self.key} v{self.number}'


class CatalogVersion(ContentVersion):
    """Surcharge versionnée du catalogue (modules et leçons)."""

    class Meta:
        proxy = True
        verbose_name = 'Version du catalogue'
        verbose_name_plural = 'Versions du catalogue'


class MediaAsset(models.Model):
    """
    Image ou petite vidéo envoyée depuis le studio, gardée dans la base de données.
    """
    KIND_IMAGE = 'image'
    KIND_VIDEO = 'video'
    KIND_CHOICES = [(KIND_IMAGE, 'Image'), (KIND_VIDEO, 'Vidéo')]

    kind = models.CharField('Type', max_length=10, choices=KIND_CHOICES)
    content_type = models.CharField('Format', max_length=40)
    data = models.BinaryField('Fichier', editable=False)
    size = models.PositiveIntegerField('Poids (octets)')
    width = models.PositiveIntegerField('Largeur', null=True, blank=True)
    height = models.PositiveIntegerField('Hauteur', null=True, blank=True)
    sha256 = models.CharField('Empreinte', max_length=64, db_index=True)
    name = models.CharField('Nom du fichier envoyé', max_length=200, blank=True, default='')
    alt = models.CharField('Texte alternatif', max_length=300, blank=True, default='')
    created_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    created_at = models.DateTimeField('Envoyé le', default=timezone.now)

    class Meta:
        db_table = 'curriculum_mediaasset'
        verbose_name = 'Média du studio'
        verbose_name_plural = 'Médias du studio'
        ordering = ['-created_at', '-id']

    def __str__(self):
        return f'{self.kind} #{self.pk} ({self.name})'

    @property
    def ref(self) -> str:
        return f'media:{self.pk}.{self.sha256[:8]}'

    @property
    def url(self) -> str:
        return f'/api/media/{self.pk}/{self.sha256[:8]}'


class Character(models.Model):
    """
    Personnage d'un parcours (Palou, personnages d'exemple...).
    Porte son nom, son rôle narratif, son image (avatar), sa voix de synthèse (ElevenLabs) et son module optionnel.
    """
    track = models.ForeignKey(AgeTrack, on_delete=models.CASCADE, related_name='characters', verbose_name='Parcours')
    character_id = models.CharField('Identifiant', max_length=50)
    name = models.CharField('Nom affiché', max_length=100)
    role = models.CharField('Rôle dans l\'histoire', max_length=200, blank=True, default='')
    avatar = models.CharField('Chemin ou référence de l\'avatar', max_length=255, blank=True, default='')
    voice_id = models.CharField('Identifiant de voix ElevenLabs', max_length=100, blank=True, default='')
    module = models.CharField('Module d\'apparition', max_length=50, blank=True, default='')
    order = models.PositiveIntegerField('Ordre d\'affichage', default=1)
    created_at = models.DateTimeField('Créé le', default=timezone.now)
    updated_at = models.DateTimeField('Mis à jour le', auto_now=True)

    class Meta:
        db_table = 'curriculum_character'
        verbose_name = 'Personnage'
        verbose_name_plural = 'Personnages'
        ordering = ['track__order', 'order', 'character_id']
        constraints = [
            models.UniqueConstraint(fields=['track', 'character_id'], name='uniq_track_character'),
        ]

    def __str__(self):
        return f"{self.name} ({self.track.key})"
