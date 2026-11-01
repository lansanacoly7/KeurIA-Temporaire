"""Routes /api/superadmin/… : réservées au rôle admin (équipe kEur IA), vérifié à chaque requête."""
from rest_framework import status
from rest_framework.response import Response

from apps.accounts.permissions import IsAdminRole
from apps.scolaire.errors import ScolaireView

from . import school_space
from . import services as s


class AdminView(ScolaireView):
    permission_classes = [IsAdminRole]


def ok(data=None, code=status.HTTP_200_OK):
    return Response(data, status=code)


class DashboardView(AdminView):
    def get(self, request):
        return ok(s.dashboard())


class StatsHistoryView(AdminView):
    """Chiffres mensuels figés avant chaque passage de la conservation des comptes (l'historique survit aux suppressions)."""

    def get(self, request):
        return ok(s.stats_history())


class LearnersView(AdminView):
    def get(self, request):
        return ok(s.learners())


class SchoolsView(AdminView):
    def get(self, request):
        return ok(s.list_schools(request.query_params))

    def post(self, request):
        return ok(s.create_school(request.user, request.data), status.HTTP_201_CREATED)


class SchoolView(AdminView):
    def get(self, request, pk):
        return ok(s.get_school(pk))

    def patch(self, request, pk):
        return ok(s.update_school(request.user, pk, request.data))


class SchoolSuspendView(AdminView):
    def post(self, request, pk):
        return ok(s.suspend_school(request.user, pk, request.data.get('confirmation')))


class SchoolReactivateView(AdminView):
    def post(self, request, pk):
        return ok(s.reactivate_school(request.user, pk))


class SchoolAdminsView(AdminView):
    def post(self, request, pk):
        return ok(s.add_school_admin(request.user, pk, request.data), status.HTTP_201_CREATED)


class SchoolAdminPasswordView(AdminView):
    def post(self, request, pk, admin_id):
        return ok(s.reset_school_admin_password(request.user, pk, admin_id))


class SchoolAdminStatusView(AdminView):
    def post(self, request, pk, admin_id):
        return ok(s.set_school_admin_status(request.user, pk, admin_id, request.data.get('status')))


class RegistrationsView(AdminView):
    """Demandes d'inscription des parents (en attente / acceptées / refusées)."""

    def get(self, request):
        return ok(s.list_registrations(request.query_params))


class RegistrationApproveView(AdminView):
    def post(self, request, pk):
        return ok(s.decide_registration(request.user, pk, 'approve'))


class RegistrationRejectView(AdminView):
    def post(self, request, pk):
        return ok(s.decide_registration(request.user, pk, 'reject', request.data.get('note')))


class AccountsView(AdminView):
    def get(self, request):
        return ok(s.list_accounts(request.user, request.query_params))

    def post(self, request):
        return ok(s.create_account(request.user, request.data), status.HTTP_201_CREATED)


class AccountView(AdminView):
    def patch(self, request, pk):
        return ok(s.update_account(request.user, pk, request.data))

    def delete(self, request, pk):
        s.delete_account(request.user, pk)
        return ok({'ok': True})


class AccountStatusView(AdminView):
    def post(self, request, pk):
        return ok(s.set_account_status(request.user, pk, request.data.get('status')))


class MissionsView(AdminView):
    def get(self, request):
        return ok(s.list_missions())

    def post(self, request):
        return ok(s.create_mission(request.user, request.data), status.HTTP_201_CREATED)


class MissionView(AdminView):
    def patch(self, request, mission_id):
        return ok(s.update_mission(request.user, mission_id, request.data))


class MissionStatusView(AdminView):
    def post(self, request, mission_id):
        return ok(s.set_mission_active(request.user, mission_id, request.data.get('active')))


class AuditView(AdminView):
    def get(self, request):
        return ok(s.list_audit(request.query_params))


# ─── Espace d'une école (consultation seulement) et recherche générale ─────────

class SchoolOverviewView(AdminView):
    def get(self, request, pk):
        return ok(school_space.overview(pk))


class SchoolTeachersView(AdminView):
    def get(self, request, pk):
        return ok(school_space.teachers(pk))


class SchoolClassesView(AdminView):
    def get(self, request, pk):
        return ok(school_space.classes(pk))


class SchoolClassView(AdminView):
    def get(self, request, pk, class_id):
        return ok(school_space.classroom(pk, class_id))


class SchoolStudentsView(AdminView):
    def get(self, request, pk):
        return ok(school_space.students(pk, request.query_params))


class SchoolStudentView(AdminView):
    def get(self, request, pk, student_id):
        return ok(school_space.student(pk, student_id))


class SchoolParentsView(AdminView):
    def get(self, request, pk):
        return ok(school_space.parents(pk))


class SchoolActivityView(AdminView):
    def get(self, request, pk):
        return ok(school_space.activity(pk, request.query_params))


class SearchView(AdminView):
    def get(self, request):
        return ok(school_space.search(request.query_params))
