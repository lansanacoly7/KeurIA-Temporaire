from rest_framework.permissions import BasePermission
from rest_framework.throttling import UserRateThrottle

from apps.accounts.models import User


class _SchoolRole(BasePermission):
    role = ''

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role == self.role and user.school_id)


class IsSchoolAdmin(_SchoolRole):
    role = User.ROLE_SCHOOL_ADMIN
    message = "Accès réservé à la direction de l'école."


class IsSchoolTeacher(_SchoolRole):
    role = User.ROLE_TEACHER
    message = "Accès réservé aux enseignants de l'école."


class LinkCodeRateThrottle(UserRateThrottle):
    """Saisie du code parent : limite les essais (anti-devinette)."""

    scope = 'parent_link'
    rate = '10/hour'
