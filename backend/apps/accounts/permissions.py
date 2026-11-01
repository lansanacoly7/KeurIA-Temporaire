from rest_framework.permissions import BasePermission

from .models import User


class HasRole(BasePermission):
    """Autorise uniquement les utilisateurs connectés ayant l'un des rôles listés."""

    allowed_roles: tuple = ()
    message = "Accès non autorisé pour ce profil."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role in self.allowed_roles)


class IsParent(HasRole):
    allowed_roles = (User.ROLE_PARENT,)
    message = "Accès réservé aux parents."


class IsParentOrTeacher(HasRole):
    allowed_roles = (User.ROLE_PARENT, User.ROLE_TEACHER)
    message = "Accès réservé aux parents et enseignants."


class IsAdminRole(HasRole):
    allowed_roles = (User.ROLE_ADMIN,)
    message = "Accès réservé aux administrateurs."
