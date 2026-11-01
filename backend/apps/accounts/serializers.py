import re

from django.contrib.auth import password_validation
from django.db import IntegrityError, transaction
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from rest_framework import serializers

from .approval import requires_approval
from .models import User


def check_password_policy(password, user=None):
    """Applique AUTH_PASSWORD_VALIDATORS + la règle maison « lettres et chiffres ».

    Retourne la liste des messages d'erreur (vide si le mot de passe est valide).
    `user` (même non sauvegardé) permet de refuser un mot de passe trop proche
    de l'e-mail ou du nom affiché.
    """
    errors = []
    try:
        password_validation.validate_password(password, user=user)
    except DjangoValidationError as exc:
        errors.extend(exc.messages)
    if not any(c.isalpha() for c in password):
        errors.append("Le mot de passe doit contenir au moins une lettre.")
    if not any(c.isdigit() for c in password):
        errors.append("Le mot de passe doit contenir au moins un chiffre.")
    return errors


PHONE_RE = re.compile(r'^\+?[\d\s.-]+$')


def phone_problem(phone: str):
    """Message d'erreur si le téléphone est absent ou mal formé (sinon None)."""
    if not phone:
        return 'Le téléphone est obligatoire.'
    digits = len(re.sub(r'\D', '', phone))
    if not PHONE_RE.match(phone) or digits < 9 or digits > 15:
        return "Le numéro de téléphone n'est pas valide (ex. 77 123 45 67)."
    return None


def first_error(errors, default="Données invalides."):
    """Premier message lisible d'un dict/list d'erreurs DRF (format attendu par le frontend)."""
    if isinstance(errors, dict):
        for value in errors.values():
            return first_error(value, default)
    if isinstance(errors, list | tuple) and errors:
        return first_error(errors[0], default)
    return str(errors) if errors else default


class UserSerializer(serializers.ModelSerializer):
    displayName = serializers.CharField(source='display_name')
    loginCount = serializers.IntegerField(source='login_count', read_only=True)
    lastSeenAt = serializers.DateTimeField(source='last_seen_at', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    emailVerified = serializers.BooleanField(source='email_verified', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'displayName', 'role', 'loginCount', 'lastSeenAt', 'createdAt', 'emailVerified']
        read_only_fields = ['id', 'loginCount', 'lastSeenAt', 'createdAt', 'emailVerified']


class NewAccountSerializer(serializers.Serializer):
    """Champs communs à toute création de compte (inscription, enfant, admin)."""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    displayName = serializers.CharField(required=False, default="Explorateur", min_length=2, max_length=150)

    def validate_email(self, value):
        norm = value.lower().strip()
        if User.objects.filter(email=norm).exists():
            raise serializers.ValidationError("Cette adresse e-mail est déjà utilisée.")
        return norm

    def validate(self, attrs):
        candidate = User(email=attrs['email'], display_name=attrs.get('displayName', ''))
        errors = check_password_policy(attrs['password'], user=candidate)
        if errors:
            raise serializers.ValidationError({'password': errors})
        return attrs


class RegisterSerializer(NewAccountSerializer):
    # L'inscription publique crée des comptes parent avec statut/rôle parental
    # (Père, Mère, Tuteur, Tutrice) et configure le premier explorateur (Garçon, Fille).
    role = serializers.ChoiceField(choices=[User.ROLE_PARENT], required=False, default=User.ROLE_PARENT,
                                   error_messages={'invalid_choice': "Ce rôle ne peut pas être choisi à l'inscription."})
    parentRole = serializers.ChoiceField(
        choices=['pere', 'mere', 'tuteur', 'tutrice'],
        required=False,
        default='pere',
        error_messages={'invalid_choice': "Choisissez le statut du parent : Père, Mère, Tuteur ou Tutrice."}
    )
    # Prénom, nom et téléphone vont dans la fiche parent
    firstName = serializers.CharField(max_length=100, error_messages={'required': 'Le prénom est obligatoire.', 'blank': 'Le prénom est obligatoire.'})
    lastName = serializers.CharField(max_length=100, error_messages={'required': 'Le nom est obligatoire.', 'blank': 'Le nom est obligatoire.'})
    phone = serializers.CharField(max_length=30, error_messages={'required': 'Le téléphone est obligatoire.', 'blank': 'Le téléphone est obligatoire.'})

    # Premier explorateur / enfant du foyer
    childFirstName = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    childLastName = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    childGender = serializers.ChoiceField(
        choices=['garcon', 'fille', 'M', 'F'],
        required=False,
        default='garcon',
        error_messages={'invalid_choice': "Choisissez le sexe de l'enfant : Garçon ou Fille."}
    )
    childAge = serializers.IntegerField(
        required=False,
        allow_null=True,
        error_messages={'invalid': "L'âge de l'enfant doit être un nombre."}
    )
    childPassword = serializers.CharField(required=False, allow_blank=True, default='', write_only=True)

    # Le parent consent pour lui-même ET pour son enfant (mineur) : refus = pas de compte.
    acceptTerms = serializers.BooleanField(
        required=True, error_messages={'required': "Vous devez accepter les conditions d'utilisation et la politique de confidentialité."},
    )

    def validate_acceptTerms(self, value):
        if value is not True:
            raise serializers.ValidationError("Vous devez accepter les conditions d'utilisation et la politique de confidentialité.")
        return value

    def validate_phone(self, value):
        value = value.strip()
        problem = phone_problem(value)
        if problem:
            raise serializers.ValidationError(problem)
        return value

    def to_internal_value(self, data):
        if isinstance(data, dict):
            data = data.copy()
            if 'childAge' in data and (data['childAge'] == '' or data['childAge'] is None):
                data.pop('childAge', None)
        return super().to_internal_value(data)

    def validate(self, attrs):
        attrs['displayName'] = f"{attrs['firstName'].strip()} {attrs['lastName'].strip()}"[:150]
        return super().validate(attrs)

    @transaction.atomic
    def create(self, validated_data):
        from apps.scolaire.models import ParentProfile
        from apps.learners.models import LearnerProfile

        parent_role = validated_data.get('parentRole', 'pere')
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            display_name=validated_data['displayName'],
            role=User.ROLE_PARENT,
            email_verified=False,  # activé par VerifyEmailView (T15)
            terms_accepted_at=timezone.now(),
            gender=parent_role,
            # Inscription publique : l'équipe kEur IA doit accepter la demande avant tout accès (voir approval.py).
            approval_status=User.APPROVAL_PENDING if requires_approval() else User.APPROVAL_APPROVED,
        )
        ParentProfile.objects.create(
            user=user,
            first_name=validated_data['firstName'].strip(),
            last_name=validated_data['lastName'].strip(),
            phone=validated_data['phone'],
            parent_role=parent_role,
        )

        child_first = (validated_data.get('childFirstName') or '').strip()
        if child_first:
            child_last = (validated_data.get('childLastName') or '').strip() or validated_data['lastName'].strip()
            child_display = f"{child_first} {child_last}".strip()[:150]
            raw_gender = validated_data.get('childGender', 'garcon')
            norm_gender = 'fille' if raw_gender in ('fille', 'F') else 'garcon'
            child_pwd = (validated_data.get('childPassword') or '').strip() or validated_data['password']

            child_age = validated_data.get('childAge')
            if child_age and AUTO_TRACK_MIN_AGE <= child_age <= AUTO_TRACK_MAX_AGE:
                age_group = age_group_for(child_age)
            elif child_age:
                age_group = '7-9' if child_age < 10 else ('10-12' if child_age <= 12 else '13-15')
            else:
                age_group = '10-12'

            child_login = generate_family_child_login(child_display)
            child_user = User.objects.create_user(
                email=child_login,
                password=child_pwd,
                display_name=child_display,
                role=User.ROLE_STUDENT,
                parent=user,
                age_group=age_group,
                gender=norm_gender,
                email_verified=True,
            )
            avatar = 'exploratrice-awa' if norm_gender == 'fille' else 'explorateur-moussa'
            LearnerProfile.objects.create(
                learner=child_user,
                owner_email=user.email,
                learner_email=child_login,
                nickname=child_display,
                age_track=age_group,
                avatar=avatar,
                gender=norm_gender,
            )

        return user


# Un foyer compte quelques enfants, pas des dizaines : sans plafond, un parent peut fabriquer autant de comptes qu'il veut
# (par exemple pour refaire indéfiniment le défi du jour ou gonfler un classement).
MAX_CHILDREN_PER_PARENT = 8
TOO_MANY_CHILDREN = f"Un foyer peut compter {MAX_CHILDREN_PER_PARENT} enfants au plus. Pour davantage, contactez l'équipe kEur IA."


def generate_family_child_login(display_name: str) -> str:
    """Génère un identifiant unique @keuria.sn pour un enfant créé par un parent :
    « Fatou » → « fatou@keuria.sn » ; « Fatou Diallo » → « fatou.diallo@keuria.sn » ;
    homonymes : « fatou.diallo2@keuria.sn », etc.
    """
    from apps.scolaire.identifiers import slugify_name, LOGIN_DOMAIN
    from apps.learners.models import LearnerProfile
    words = [slugify_name(w) for w in display_name.strip().split() if slugify_name(w)]
    if len(words) >= 2:
        base_slug = f"{words[0]}.{'-'.join(words[1:])}"
    elif words:
        base_slug = words[0]
    else:
        base_slug = 'enfant'
    domain = f'@{LOGIN_DOMAIN}'
    candidate = f'{base_slug}{domain}'
    n = 2
    while User.objects.filter(email=candidate).exists() or LearnerProfile.objects.filter(learner_email=candidate).exists():
        candidate = f'{base_slug}{n}{domain}'
        n += 1
    return candidate


# Parcours automatique pour les 7-15 ans : l'élève n'a accès qu'à celui de son âge. Hors de cette tranche
# (plus jeune ou plus âgé), l'âge est accepté mais le parent choisit lui-même le parcours.
AUTO_TRACK_MIN_AGE, AUTO_TRACK_MAX_AGE = 7, 15
CHILD_MIN_AGE, CHILD_MAX_AGE = 3, 25
CHILD_TRACKS = ('7-9', '10-12', '13-15')


def age_group_for(age: int) -> str:
    if age <= 9:
        return '7-9'
    if age <= 12:
        return '10-12'
    return '13-15'


class ChildAccountSerializer(serializers.Serializer):
    displayName = serializers.CharField(
        required=True, min_length=2, max_length=150,
        error_messages={'required': "Le nom ou prénom de l'enfant est obligatoire."}
    )
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    gender = serializers.ChoiceField(
        choices=['garcon', 'fille', 'M', 'F'],
        required=False,
        default='garcon',
        error_messages={'invalid_choice': "Le sexe de l'enfant doit être Garçon ou Fille."}
    )
    ageGroup = serializers.CharField(required=False, allow_blank=True, default='')
    age = serializers.IntegerField(
        required=False,
        error_messages={'invalid': "L'âge de l'enfant doit être un nombre."},
    )

    def to_internal_value(self, data):
        if isinstance(data, dict):
            data = data.copy()
            if 'age' in data and (data['age'] == '' or data['age'] is None):
                data.pop('age', None)
        return super().to_internal_value(data)

    def validate_age(self, value):
        if not CHILD_MIN_AGE <= value <= CHILD_MAX_AGE:
            raise serializers.ValidationError(
                f"L'âge de l'enfant doit être compris entre {CHILD_MIN_AGE} et {CHILD_MAX_AGE} ans.")
        return value

    def validate_password(self, value):
        errors = check_password_policy(value)
        if errors:
            raise serializers.ValidationError(errors)
        return value

    def validate(self, attrs):
        if self.context['parent'].children.count() >= MAX_CHILDREN_PER_PARENT:
            raise serializers.ValidationError(TOO_MANY_CHILDREN)
        age = attrs.get('age')
        if age is not None and not AUTO_TRACK_MIN_AGE <= age <= AUTO_TRACK_MAX_AGE and attrs.get('ageGroup') not in CHILD_TRACKS:
            raise serializers.ValidationError(
                f"À {age} ans, choisissez vous-même le parcours de votre enfant (7-9, 10-12 ou 13-15 ans).")
        return attrs

    def create(self, validated_data):
        from apps.learners.models import LearnerProfile

        display_name = validated_data['displayName'].strip()
        # Dans la tranche 7-15 ans, l'âge fait foi : le parcours est déduit côté serveur, jamais choisi par le client.
        if 'age' in validated_data and AUTO_TRACK_MIN_AGE <= validated_data['age'] <= AUTO_TRACK_MAX_AGE:
            age_group = age_group_for(validated_data['age'])
        else:
            age_group = validated_data.get('ageGroup') or self.initial_data.get('ageGroup') or ''
        raw_gender = validated_data.get('gender') or self.initial_data.get('gender') or 'garcon'
        norm_gender = 'fille' if raw_gender in ('fille', 'F') else 'garcon'
        avatar = 'exploratrice-awa' if norm_gender == 'fille' else 'explorateur-moussa'

        # Deux créations simultanées du même prénom peuvent viser le même identifiant : le second essai en génère un autre.
        for attempt in range(5):
            try:
                with transaction.atomic():
                    child_user = User.objects.create_user(
                        email=generate_family_child_login(display_name),
                        password=validated_data['password'],
                        display_name=display_name,
                        role=User.ROLE_STUDENT,
                        parent=self.context['parent'],
                        age_group=age_group,
                        gender=norm_gender,
                    )
                    LearnerProfile.objects.update_or_create(
                        learner=child_user,
                        defaults={
                            'owner_email': self.context['parent'].email,
                            'learner_email': child_user.email,
                            'nickname': display_name,
                            'age_track': age_group or '10-12',
                            'avatar': avatar,
                            'gender': norm_gender,
                        }
                    )
                    return child_user
            except IntegrityError:
                if attempt == 4:
                    raise
        raise serializers.ValidationError("Impossible de créer le compte de l'enfant. Veuillez réessayer.")


class LoginSerializer(serializers.Serializer):
    # Identifiant ou e-mail : les élèves d'une école ont un identifiant de la
    # forme prenom.nom@ecole.keuria.sn, les adultes leur adresse personnelle.
    email = serializers.CharField(max_length=254)
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    expectedRole = serializers.CharField(required=False, allow_blank=True, default='')


# Avatars illustrés proposés à l'élève (dessinés côté frontend, app/components/ChildAvatar.tsx).
AVATAR_IDS = (
    'palou-aventurier', 'palou-chercheur', 'palou-champion', 'palou-genie',
    'palou-hero', 'palou-malin', 'palou-rire', 'palou-clin-oeil',
    'palou-question', 'palou-surpris', 'palou-calme', 'palou-determine', 'palou-lion',
    'robot-nova', 'robot-spark',
    'explorateur-moussa', 'exploratrice-awa', 'explorateur-cheikh', 'exploratrice-fatou',
    'explorateur-idrissa', 'exploratrice-mariama', 'explorateur-modou', 'exploratrice-khady',
    'explorateur-alioune', 'exploratrice-aminata',
)


class ProfileSerializer(serializers.Serializer):
    displayName = serializers.CharField(required=False, min_length=2, max_length=150)
    email = serializers.EmailField(required=False)
    avatar = serializers.ChoiceField(choices=AVATAR_IDS, required=False)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError("Veuillez renseigner au moins une information à modifier.")
        return attrs
