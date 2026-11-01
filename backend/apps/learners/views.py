from django.db import transaction
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.accounts.permissions import IsParent
from apps.accounts.serializers import MAX_CHILDREN_PER_PARENT, TOO_MANY_CHILDREN, ChildAccountSerializer, first_error

from .models import AGE_TRACKS, LearnerProfile
from .serializers import EnrollSerializer

MAX_STUDENTS_PER_REQUEST = 30


class StudentRowSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(required=False, allow_blank=True, trim_whitespace=False)
    displayName = serializers.CharField(required=False, default='Explorateur', min_length=2, max_length=150)
    ageTrack = serializers.ChoiceField(choices=AGE_TRACKS, required=False, default='10-12')
    avatar = serializers.CharField(required=False, default='🧒🏾', max_length=20)


def profile_payload(child, profile):
    """Format attendu par frontend/app/profile/ProfileClient.tsx."""
    return {
        "id": child.id,
        "ownerEmail": child.parent.email if child.parent_id else None,
        "learnerEmail": child.email,
        "nickname": profile.nickname if profile else child.display_name,
        "ageTrack": profile.age_track if profile else '10-12',
        "avatar": profile.avatar if profile else '🧒🏾',
        "createdAt": child.created_at,
    }


class ProfilesView(APIView):
    """Profils des enfants du parent connecté (relation officielle : User.parent)."""

    permission_classes = [IsParent]

    def get(self, request):
        children = request.user.children.select_related('learner_profile', 'parent').order_by('-created_at')
        profiles = [profile_payload(child, getattr(child, 'learner_profile', None)) for child in children]
        return Response({"profiles": profiles})

    def post(self, request):
        serializer = EnrollSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"error": "Données d'inscription invalides."}, status=status.HTTP_400_BAD_REQUEST)

        rows = serializer.validated_data['students']
        if not rows or len(rows) > MAX_STUDENTS_PER_REQUEST:
            return Response({"error": f"Entre 1 et {MAX_STUDENTS_PER_REQUEST} élèves par inscription."},
                            status=status.HTTP_400_BAD_REQUEST)

        parent = request.user
        created = []
        # Tout ou rien : une ligne invalide annule l'inscription complète.
        with transaction.atomic():
            for raw in rows:
                row = StudentRowSerializer(data=raw)
                if not row.is_valid():
                    transaction.set_rollback(True)
                    return Response({"error": first_error(row.errors)}, status=status.HTTP_400_BAD_REQUEST)
                data = row.validated_data
                email = data['email'].lower().strip()

                child = User.objects.filter(email=email).first()
                if child is None:
                    if parent.children.count() >= MAX_CHILDREN_PER_PARENT:
                        transaction.set_rollback(True)
                        return Response({"error": TOO_MANY_CHILDREN}, status=status.HTTP_400_BAD_REQUEST)
                    account = ChildAccountSerializer(
                        data={'email': email, 'password': data.get('password', ''), 'displayName': data['displayName']},
                        context={'parent': parent},
                    )
                    if not account.is_valid():
                        transaction.set_rollback(True)
                        name = data['displayName']
                        return Response({"error": f"{name} : {first_error(account.errors)}"},
                                        status=status.HTTP_400_BAD_REQUEST)
                    child = account.save()
                elif child.parent_id != parent.id:
                    # Ne jamais rattacher (ni modifier) un compte existant qui
                    # n'appartient pas à ce parent.
                    transaction.set_rollback(True)
                    return Response({"error": f"L'adresse {email} est déjà utilisée par un autre compte."},
                                    status=status.HTTP_400_BAD_REQUEST)

                # Profil historique orphelin (compte supprimé) portant le même
                # e-mail : on le réutilise, ses champs sont tous écrasés ci-dessous.
                LearnerProfile.objects.filter(learner__isnull=True, learner_email=child.email).update(learner=child)
                profile, _ = LearnerProfile.objects.update_or_create(
                    learner=child,
                    defaults={
                        'owner_email': parent.email,
                        'learner_email': child.email,
                        'nickname': data['displayName'],
                        'age_track': data['ageTrack'],
                        'avatar': data['avatar'],
                    },
                )
                created.append(profile_payload(child, profile))

        return Response({"ok": True, "count": len(created), "profiles": created}, status=status.HTTP_201_CREATED)
