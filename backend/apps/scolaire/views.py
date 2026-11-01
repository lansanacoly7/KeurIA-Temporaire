"""
Routes des espaces école (/api/ecole/…), enseignant (/api/enseignant/…) et de la
liaison parent (/api/parent/link-code). Les vues vérifient l'accès puis délèguent
aux services ; l'école est toujours celle de l'utilisateur connecté.
"""
from rest_framework import status
from rest_framework.response import Response

from apps.accounts.permissions import IsParent

from .errors import ApiError, ScolaireView
from .permissions import IsSchoolAdmin, IsSchoolTeacher, LinkCodeRateThrottle
from .services import annee, classement, ecole, eleve, enseignant, imports, liens, programme_enseignant, regles, classe_vivante
from .services.common import get_student


class EcoleView(ScolaireView):
    permission_classes = [IsSchoolAdmin]

    @property
    def school(self):
        return self.request.user.school


class EnseignantView(ScolaireView):
    permission_classes = [IsSchoolTeacher]

    @property
    def teacher(self):
        return self.request.user


def ok(data=None, code=status.HTTP_200_OK):
    return Response(data, status=code)


# ─── École ───────────────────────────────────────────────────────────────────

class SchoolView(EcoleView):
    def get(self, request):
        return ok(ecole.get_school(self.school))

    def patch(self, request):
        return ok(ecole.update_school(self.school, request.data, request.FILES))


class DashboardView(EcoleView):
    def get(self, request):
        return ok(ecole.get_dashboard(self.school))


class LeaderboardView(EcoleView):
    def get(self, request):
        return ok(ecole.get_leaderboard(self.school, request.query_params))


class ClassroomsView(EcoleView):
    def get(self, request):
        return ok(ecole.list_classrooms(self.school, include_archived=request.query_params.get('includeArchived') == '1'))

    def post(self, request):
        return ok(ecole.create_classroom(self.school, request.data), status.HTTP_201_CREATED)


class ClassroomView(EcoleView):
    def get(self, request, pk):
        return ok(ecole.get_classroom_detail(self.school, pk))

    def patch(self, request, pk):
        return ok(ecole.update_classroom(self.school, pk, request.data))

    def delete(self, request, pk):
        ecole.delete_classroom(self.school, pk)
        return ok({'deleted': True})


class ClassroomArchiveView(EcoleView):
    def post(self, request, pk):
        return ok(ecole.archive_classroom(self.school, pk))


class TeachersView(EcoleView):
    def get(self, request):
        return ok(ecole.list_teachers(self.school))

    def post(self, request):
        return ok(ecole.create_teacher(self.school, request.data), status.HTTP_201_CREATED)


class TeachersBulkView(EcoleView):
    def post(self, request):
        return ok(ecole.create_teachers(self.school, request.data.get('teachers')), status.HTTP_201_CREATED)


class TeacherView(EcoleView):
    def get(self, request, pk):
        return ok(ecole.get_teacher_row(self.school, pk))

    def patch(self, request, pk):
        return ok(ecole.update_teacher(self.school, pk, request.data))


class TeacherStatusView(EcoleView):
    def post(self, request, pk):
        return ok(ecole.set_teacher_status(self.school, pk, request.data.get('status')))


class TeacherPasswordView(EcoleView):
    def post(self, request, pk):
        return ok(ecole.reset_teacher_password(self.school, pk))


class StudentsView(EcoleView):
    def get(self, request):
        return ok(ecole.list_students(self.school, request.query_params))

    def post(self, request):
        return ok(ecole.create_student(self.school, request.data), status.HTTP_201_CREATED)


class StudentsBulkView(EcoleView):
    def post(self, request):
        return ok(ecole.create_students(self.school, request.data.get('students')), status.HTTP_201_CREATED)


class NextMatriculeView(EcoleView):
    def get(self, request):
        return ok({'matricule': ecole.suggest_matricule(self.school)})


class MatriculeCheckView(EcoleView):
    """GET ecole/students/matricule-check?matricule=…&ignore=<id> — le matricule est-il libre ? (vérification en direct du formulaire)"""

    def get(self, request):
        ignore = request.query_params.get('ignore')
        return ok(ecole.check_matricule(self.school, request.query_params.get('matricule'), int(ignore) if ignore and ignore.isdigit() else None))


class StudentView(EcoleView):
    def get(self, request, pk):
        return ok(ecole.get_student_detail(self.school, pk))

    def patch(self, request, pk):
        return ok(ecole.update_student(self.school, pk, request.data))


class StudentMovePreviewView(EcoleView):
    def get(self, request, pk):
        return ok(ecole.preview_move(self.school, pk, request.query_params.get('classId') or None))


class StudentMoveView(EcoleView):
    def post(self, request, pk):
        return ok(ecole.move_student(self.school, pk, request.data.get('classId') or None, request.data.get('reason', '')))


class StudentStatusView(EcoleView):
    def post(self, request, pk):
        return ok(ecole.set_student_status(self.school, pk, request.data.get('status')))


class StudentPasswordView(EcoleView):
    def post(self, request, pk):
        return ok(ecole.reset_student_password(self.school, pk))


class StudentParentLinkView(EcoleView):
    def get(self, request, pk):
        return ok(liens.link_info(get_student(self.school, pk)))

    def post(self, request, pk):
        return ok(liens.generate_code(get_student(self.school, pk)))

    def delete(self, request, pk):
        return ok(liens.unlink(get_student(self.school, pk)))


class CredentialsView(EcoleView):
    def post(self, request):
        return ok(ecole.issue_student_credentials(self.school, request.data.get('studentIds')))


class ImportReadView(EcoleView):
    def post(self, request):
        upload = request.FILES.get('file')
        if upload is None:
            raise ApiError('Aucun fichier reçu.')
        return ok({'table': imports.read_file(upload)})


class ImportPreviewView(EcoleView):
    def post(self, request):
        kind, records = request.data.get('kind'), request.data.get('records')
        if kind == 'eleves':
            return ok(imports.preview_students(self.school, records, request.data.get('defaultClassId') or None))
        if kind == 'enseignants':
            return ok(imports.preview_teachers(self.school, records))
        raise ApiError("Type d'import inconnu.")


class ParentsView(EcoleView):
    def get(self, request):
        return ok(ecole.list_parents(self.school))


# ─── Années scolaires ────────────────────────────────────────────────────────

class YearsView(EcoleView):
    def get(self, request):
        return ok(annee.overview(self.school))


class CurrentYearView(EcoleView):
    def patch(self, request):
        return ok(annee.update_dates(self.school, request.data))


class ClosureCheckView(EcoleView):
    def get(self, request):
        return ok(annee.closure_check(self.school, demo_ignore_date=request.query_params.get('demo') == '1'))


class YearArchiveView(EcoleView):
    def post(self, request):
        return ok(annee.year_archive(self.school))


class PromotionPlanView(EcoleView):
    def get(self, request):
        return ok(annee.promotion_plan(self.school))


class CloseYearView(EcoleView):
    def post(self, request):
        return ok(annee.close_year(self.school, request.data))


class UndoClosureView(EcoleView):
    def post(self, request):
        annee.undo_closure(self.school)
        return ok({'ok': True})


class PastYearView(EcoleView):
    def get(self, request, label):
        return ok(annee.past_year(self.school, label))


# ─── Enseignant ──────────────────────────────────────────────────────────────

class TeacherMeView(EnseignantView):
    def get(self, request):
        return ok(enseignant.me(self.teacher))


class TeacherSchoolView(EnseignantView):
    def get(self, request):
        return ok(enseignant.school(self.teacher))


class TeacherOverviewView(EnseignantView):
    def get(self, request):
        return ok(enseignant.overview(self.teacher))


class TeacherLeaderboardView(EnseignantView):
    def get(self, request):
        return ok(enseignant.get_leaderboard(self.teacher, request.query_params))


class TeacherClassesView(EnseignantView):
    def get(self, request):
        return ok(enseignant.list_classes(self.teacher))


class TeacherClassView(EnseignantView):
    def get(self, request, pk):
        return ok(enseignant.get_class(self.teacher, pk))


class TeacherClassAnalyticsView(EnseignantView):
    def get(self, request, pk):
        return ok(enseignant.class_analytics(self.teacher, pk))


class TeacherClassBlockingsView(EnseignantView):
    """Tableau « Élèves bloqués » (T4) : difficulté et arrêt par leçon."""

    def get(self, request, pk):
        return ok(enseignant.class_blockings(self.teacher, pk))


class TeacherClassCredentialsView(EnseignantView):
    def post(self, request, pk):
        return ok(enseignant.issue_credentials(self.teacher, pk, request.data.get('studentIds')))


class TeacherStudentView(EnseignantView):
    def get(self, request, pk):
        return ok(enseignant.get_student(self.teacher, pk))


class TeacherStudentPasswordView(EnseignantView):
    def post(self, request, pk):
        return ok(enseignant.reset_student_password(self.teacher, pk))


class TeacherStudentParentLinkView(EnseignantView):
    def get(self, request, pk):
        return ok(enseignant.parent_link(self.teacher, pk))

    def post(self, request, pk):
        return ok(enseignant.generate_parent_code(self.teacher, pk))


class MissionsView(EnseignantView):
    def get(self, request):
        return ok(enseignant.list_missions())


class AssignmentsView(EnseignantView):
    def get(self, request):
        return ok(enseignant.list_assignments(self.teacher))

    def post(self, request):
        return ok(enseignant.assign(self.teacher, request.data), status.HTTP_201_CREATED)


class AssignmentView(EnseignantView):
    def get(self, request, pk):
        return ok(enseignant.assignment_detail(self.teacher, pk))

    def delete(self, request, pk):
        enseignant.delete_assignment(self.teacher, pk)
        return ok({'ok': True})


class TeacherProgrammeView(EnseignantView):
    def get(self, request):
        return ok(programme_enseignant.teacher_programme(self.teacher))


class TeacherLessonView(EnseignantView):
    def get(self, request, lesson_id):
        return ok(programme_enseignant.lesson_sheet(self.teacher, lesson_id))


class TeacherSettingsView(EnseignantView):
    def get(self, request):
        return ok(enseignant.teacher_settings(self.teacher))


# ─── Parent ──────────────────────────────────────────────────────────────────

class RedeemLinkCodeView(ScolaireView):
    permission_classes = [IsParent]
    throttle_classes = [LinkCodeRateThrottle]

    def post(self, request):
        return ok(liens.redeem(request.user, request.data))


# ─── Élève Scolaire ──────────────────────────────────────────────────────────

class StudentAssignmentsView(ScolaireView):
    def get(self, request):
        return ok(eleve.list_assignments(request.user))


class StudentAssignmentQuizView(ScolaireView):
    def get(self, request, pk):
        return ok(eleve.quiz_state(request.user, pk))


class StudentAssignmentAnswerView(ScolaireView):
    def post(self, request, pk):
        return ok(eleve.answer_step(request.user, pk, request.data))


class StudentAssignmentRestartView(ScolaireView):
    def post(self, request, pk):
        return ok(eleve.restart_practice(request.user, pk))


class StudentAssignmentCompleteView(ScolaireView):
    """Le corps de la requête est ignoré : la note est calculée par le serveur (voir eleve.complete_assignment)."""

    def post(self, request, pk):
        return ok(eleve.complete_assignment(request.user, pk))


class SchoolRulesView(EcoleView):
    """Règles de toute l'école (direction)."""

    def get(self, request):
        return ok(regles.get_school_rules(self.school))

    def put(self, request):
        return ok(regles.set_school_rules(self.school, request.user, request.data))


class TeacherClassRulesView(EnseignantView):
    """Règles d'une classe (enseignant de la classe) : jamais plus souples que celles de l'école."""

    def get(self, request, pk):
        return ok(regles.get_class_rules(self.teacher, pk))

    def put(self, request, pk):
        return ok(regles.set_class_rules(self.teacher, pk, request.data))


class StudentRulesView(ScolaireView):
    """Ce que l'élève d'école peut faire maintenant, avec qui a posé chaque restriction."""

    def get(self, request):
        if eleve.get_school_student_profile(request.user) is None:
            raise ApiError("Ce compte n'est pas rattaché à une école.", status.HTTP_403_FORBIDDEN)
        return ok(regles.student_rules(request.user))


class TeacherClassSessionView(EnseignantView):
    """Séance de classe : voir, ouvrir, terminer."""

    def get(self, request, pk):
        return ok(classe_vivante.current_session(self.teacher, pk))

    def post(self, request, pk):
        return ok(classe_vivante.open_session(self.teacher, pk, request.data), status.HTTP_201_CREATED)

    def delete(self, request, pk):
        return ok(classe_vivante.end_session(self.teacher, pk))


class TeacherClassAnnouncementsView(EnseignantView):
    def get(self, request, pk):
        return ok(classe_vivante.list_announcements(self.teacher, pk))

    def post(self, request, pk):
        return ok(classe_vivante.create_announcement(self.teacher, pk, request.data), status.HTTP_201_CREATED)


class TeacherAnnouncementView(EnseignantView):
    """Résultats d'une annonce (GET) ou fermeture (DELETE)."""

    def get(self, request, pk):
        return ok(classe_vivante.announcement_results(self.teacher, pk))

    def delete(self, request, pk):
        return ok(classe_vivante.close_announcement(self.teacher, pk))


class TeacherStudentTrackView(EnseignantView):
    def put(self, request, pk):
        return ok(classe_vivante.set_student_track(self.teacher, pk, request.data))


class StudentTodayView(ScolaireView):
    def get(self, request):
        return ok(classe_vivante.student_today(request.user))


class StudentClassLeaderboardView(ScolaireView):
    """Classement de la semaine de SA classe (prénom et initiale) ; 403 si l'école ou la classe l'a fermé. Débit : celui des
    autres routes élève (limite par utilisateur par défaut de DRF)."""

    def get(self, request):
        return ok(classement.student_class_leaderboard(request.user))


class StudentAnnouncementAnswerView(ScolaireView):
    def post(self, request, pk):
        return ok(classe_vivante.answer_poll(request.user, pk, request.data))
