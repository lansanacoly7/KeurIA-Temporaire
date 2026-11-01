"""
Espace enseignant (miroir de frontend/app/_scolaire/lib/enseignantApi.ts).

L'enseignant est TOUJOURS celui de la session (jamais un identifiant envoyé par
le navigateur) et ne voit que ses classes, ses élèves et ses devoirs.
"""
from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework import status

from ..errors import ApiError, NotFound
from ..identifiers import generate_temporary_password
from ..levels import class_name, classroom_sort_key, level_info
from ..mission_quizzes import quiz_for
from ..models import Assignment, AssignmentCompletion, Classroom, Mission
from apps.progress.models import Progress
from ..payloads import (
    assignment_payload,
    classroom_payload,
    completion_payload,
    library_mission_payload,
    mission_payload,
    school_payload,
    sort_students,
    student_payload,
    students_qs,
    teacher_payload,
    teachers_qs,
)
from . import classement, liens
from .common import log_activity, parse_id, parse_iso_date, today
from .ecole import plural
from .programme import sync_programme_missions

INACTIVE_AFTER_DAYS = 7
MAX_INSTRUCTIONS_LENGTH = 500
MAX_DUE_DAYS_AHEAD = 365
WEAK_HELP_SCORE = 50
CATEGORY_ORDER = ('Sécurité', 'IA Générative', 'Données', 'Programmation')
PROGRESS_BUCKETS = (('Pas commencé', 0, 0), ('1 à 5 leçons', 1, 5), ('6 à 10 leçons', 6, 10), ('11 leçons et plus', 11, None))


def _forbidden(message):
    return ApiError(message, status.HTTP_403_FORBIDDEN)


# ─── Périmètre de l'enseignant ───────────────────────────────────────────────

def _classrooms(teacher):
    return sorted(Classroom.objects.filter(school=teacher.school, teacher=teacher, archived=False), key=classroom_sort_key)


def _owned_classroom(teacher, class_id) -> Classroom:
    pk = parse_id(class_id)
    classroom = Classroom.objects.filter(school=teacher.school, pk=pk, teacher=teacher, archived=False).first() if pk else None
    if classroom is None:
        raise _forbidden('Cette classe ne vous est pas confiée.')
    return classroom


def _students(teacher, classroom):
    return sort_students(students_qs(teacher.school).filter(classroom=classroom, user__is_active=True))


def _owned_student(teacher, student_id):
    pk = parse_id(student_id)
    profile = (students_qs(teacher.school).filter(pk=pk, classroom__teacher=teacher, classroom__archived=False).first()
               if pk else None)
    if profile is None:
        raise _forbidden("Cet élève n'est pas dans l'une de vos classes.")
    return profile


def _owned_assignment(teacher, assignment_id) -> Assignment:
    pk = parse_id(assignment_id)
    assignment = Assignment.objects.select_related('mission', 'classroom').filter(school=teacher.school, pk=pk).first() if pk else None
    if assignment is None:
        raise NotFound('Devoir introuvable.')
    if assignment.classroom.teacher_id != teacher.id or assignment.classroom.archived:
        raise _forbidden("Ce devoir concerne une classe qui ne vous est pas confiée.")
    return assignment


def _is_past_due(assignment, day) -> bool:
    return assignment.due_date is not None and assignment.due_date < day


def _due_sort_key(assignment):
    # Échéance croissante, sans date limite en dernier ; à échéance égale, le plus récent d'abord.
    return (assignment.due_date is None, assignment.due_date or today(), -assignment.created_at.timestamp())


def _active_this_week(profile, now) -> bool:
    seen = profile.user.last_seen_at
    return seen is not None and now - seen <= timedelta(days=INACTIVE_AFTER_DAYS)


def _completions(assignments):
    """{(assignment_id, student_id): completion} pour ces devoirs."""
    return {(c.assignment_id, c.student_id): c for c in AssignmentCompletion.objects.filter(assignment__in=assignments)}


def _summary(assignment, students, done) -> dict:
    return {
        'assignment': assignment_payload(assignment),
        'mission': mission_payload(assignment.mission),
        'classroom': classroom_payload(assignment.classroom),
        'completed': sum(1 for s in students if (assignment.id, s.id) in done),
        'total': len(students),
    }


def _is_on_time(completion, assignment) -> bool:
    return assignment.due_date is None or timezone.localtime(completion.completed_at).date() <= assignment.due_date


def _progress(profile, assignments, done, day) -> dict:
    due = [a for a in assignments if _is_past_due(a, day)]
    return {
        'student': student_payload(profile),
        'due': len(due),
        'doneOnTime': sum(1 for a in due if (a.id, profile.id) in done and _is_on_time(done[(a.id, profile.id)], a)),
        'late': sum(1 for a in due if (a.id, profile.id) not in done),
    }


def _class_assignments(classroom):
    return sorted(Assignment.objects.filter(classroom=classroom).select_related('mission', 'classroom'), key=_due_sort_key)


# ─── Vue d'ensemble, classes, élèves ─────────────────────────────────────────

def me(teacher) -> dict:
    return teacher_payload(teachers_qs(teacher.school).get(pk=teacher.pk))


def overview(teacher) -> dict:
    now, day = timezone.now(), today()
    classes, to_follow, open_assignments = [], [], []
    for classroom in _classrooms(teacher):
        students = _students(teacher, classroom)
        assignments = _class_assignments(classroom)
        done = _completions(assignments)
        classes.append({'classroom': classroom_payload(classroom), 'studentCount': len(students),
                        'activeThisWeek': sum(1 for s in students if _active_this_week(s, now))})
        overdue = [a for a in assignments if _is_past_due(a, day)]
        for profile in students:
            reasons = []
            if profile.user.last_seen_at is None:
                reasons.append('Jamais connecté')
            elif not _active_this_week(profile, now):
                reasons.append(f'Inactif depuis {(now - profile.user.last_seen_at).days} j')
            late = sum(1 for a in overdue if (a.id, profile.id) not in done)
            if late:
                reasons.append(f"{late} devoir{'s' if late > 1 else ''} en retard")
            if reasons:
                to_follow.append({'student': student_payload(profile), 'classroom': classroom_payload(classroom), 'reasons': reasons})
        open_assignments += [(a, students, done) for a in assignments if not _is_past_due(a, day)]
    to_follow.sort(key=lambda row: (-len(row['reasons']), row['student']['lastName'].lower()))
    open_assignments.sort(key=lambda item: _due_sort_key(item[0]))
    return {
        'teacher': me(teacher),
        'classes': classes,
        'students': sum(c['studentCount'] for c in classes),
        'activeThisWeek': sum(c['activeThisWeek'] for c in classes),
        'studentsToFollow': to_follow,
        'openAssignments': [_summary(a, students, done) for a, students, done in open_assignments],
    }


def list_classes(teacher) -> list:
    now, day = timezone.now(), today()
    rows = []
    for classroom in _classrooms(teacher):
        students = _students(teacher, classroom)
        assignments = _class_assignments(classroom)
        done = _completions(assignments)
        rows.append({
            'classroom': classroom_payload(classroom),
            'studentCount': len(students),
            'activeThisWeek': sum(1 for s in students if _active_this_week(s, now)),
            'openAssignments': sum(1 for a in assignments if not _is_past_due(a, day)),
            'lateStudents': sum(1 for s in students if _progress(s, assignments, done, day)['late'] > 0),
        })
    return rows


def get_class(teacher, class_id) -> dict:
    classroom = _owned_classroom(teacher, class_id)
    now, day = timezone.now(), today()
    students = _students(teacher, classroom)
    assignments = _class_assignments(classroom)
    done = _completions(assignments)
    return {
        'classroom': classroom_payload(classroom),
        'activeThisWeek': sum(1 for s in students if _active_this_week(s, now)),
        'students': [_progress(s, assignments, done, day) for s in students],
        'assignments': [_summary(a, students, done) for a in assignments],
    }


def get_student(teacher, student_id) -> dict:
    profile = _owned_student(teacher, student_id)
    day = today()
    assignments = _class_assignments(profile.classroom)
    done = _completions(assignments)
    rows = []
    for assignment in assignments:
        completion = done.get((assignment.id, profile.id))
        state = 'termine' if completion else ('en_retard' if _is_past_due(assignment, day) else 'a_faire')
        rows.append({'assignment': assignment_payload(assignment), 'mission': mission_payload(assignment.mission),
                     'status': state, 'completion': completion_payload(completion) if completion else None})
    return {'student': student_payload(profile), 'classroom': classroom_payload(profile.classroom), 'assignments': rows}


def reset_student_password(teacher, student_id) -> dict:
    """L'enseignant réinitialise le mot de passe de SES élèves (jamais par e-mail)."""
    profile = _owned_student(teacher, student_id)
    password = generate_temporary_password()
    profile.user.set_password(password)
    profile.user.save(update_fields=['password'])
    staff = teacher.staff_profile
    log_activity(teacher.school, 'mdp_reinitialise',
                 f'Mot de passe de {profile.first_name} {profile.last_name} réinitialisé par {staff.first_name} {staff.last_name}')
    return {'login': profile.user.email, 'temporaryPassword': password}


@transaction.atomic
def issue_credentials(teacher, class_id, student_ids) -> list:
    classroom = _owned_classroom(teacher, class_id)
    if not isinstance(student_ids, list) or not student_ids:
        raise ApiError('Sélectionnez au moins un élève.')
    issued = []
    for student_id in student_ids:
        pk = parse_id(student_id)
        profile = students_qs(teacher.school).filter(pk=pk, classroom=classroom).first() if pk else None
        if profile is None:
            raise ApiError("Un des élèves sélectionnés n'est pas dans cette classe.")
        if not profile.user.is_active:
            raise ApiError(f'Le compte de {profile.first_name} {profile.last_name} est désactivé.')
        password = generate_temporary_password()
        profile.user.set_password(password)
        profile.user.save(update_fields=['password'])
        issued.append({'student': student_payload(profile), 'credentials': liens.credentials_with_code(profile, password)})
    staff = teacher.staff_profile
    count = len(issued)
    log_activity(teacher.school, 'mdp_reinitialise',
                 f"{plural(count, 'fiche')} de connexion générée{'s' if count > 1 else ''} par {staff.first_name} {staff.last_name}")
    return issued


# ─── Missions et devoirs ─────────────────────────────────────────────────────

def list_missions() -> list:
    """Bibliothèque : seulement les missions actives (celles retirées par l'équipe kEur IA n'y figurent plus).

    Les devoirs du programme sont mis à jour à chaque ouverture : une leçon ajoutée ou corrigée dans le Studio de contenu
    apparaît tout de suite. Ils sont rangés par parcours d'âge, module puis leçon (le bilan du module en premier)."""
    sync_programme_missions()
    missions = list(Mission.objects.filter(active=True).select_related('module', 'lesson'))

    def order(m):
        in_programme = m.module_id is not None
        return (not in_programme, m.track, m.module.order if in_programme else 0, 0 if m.kind == Mission.KIND_REVIEW else 1,
                m.lesson.order if m.lesson_id else 0, m.id)

    return [library_mission_payload(m) for m in sorted(missions, key=order)]


def list_assignments(teacher) -> list:
    rows = []
    for classroom in _classrooms(teacher):
        students = _students(teacher, classroom)
        assignments = _class_assignments(classroom)
        done = _completions(assignments)
        rows += [(a, students, done) for a in assignments]
    rows.sort(key=lambda item: _due_sort_key(item[0]))
    return [_summary(a, students, done) for a, students, done in rows]


@transaction.atomic
def assign(teacher, data) -> list:
    """Donne une mission en devoir à une ou plusieurs classes de l'enseignant (tout ou rien)."""
    mission_id = data.get('missionId')
    mission = Mission.objects.filter(pk=mission_id, active=True).first() if isinstance(mission_id, str) else None
    if mission is None:
        raise ApiError('Mission introuvable.')
    class_ids = data.get('classIds')
    if not isinstance(class_ids, list) or not class_ids:
        raise ApiError('Choisissez au moins une classe.')
    classrooms = [_owned_classroom(teacher, cid) for cid in class_ids]

    # Un devoir du programme est écrit pour un âge : on ne le donne qu'aux classes de ce parcours.
    if mission.track:
        wrong_age = [c for c in classrooms if level_info(c.level).track != mission.track]
        if wrong_age:
            names = ', '.join(class_name(c.level, c.section) for c in wrong_age)
            raise ApiError(f'« {mission.title} » est prévu pour les {mission.track.replace("-", "–")} ans : '
                           f'{names} {"n\'est pas" if len(wrong_age) == 1 else "ne sont pas"} de cet âge. Choisissez un devoir adapté à la classe.')

    day = today()
    due = None
    if data.get('dueDate') is not None:
        due = parse_iso_date(data.get('dueDate'))
        if due is None:
            raise ApiError("La date limite n'est pas valide.")
        if due < day:
            raise ApiError('La date limite ne peut pas être déjà passée.')
        if due > day + timedelta(days=MAX_DUE_DAYS_AHEAD):
            raise ApiError("La date limite doit être dans l'année qui vient.")
    instructions = str(data.get('instructions', '')).strip()
    if len(instructions) > MAX_INSTRUCTIONS_LENGTH:
        raise ApiError(f'La consigne est trop longue ({MAX_INSTRUCTIONS_LENGTH} caractères maximum).')

    # Pas deux fois la même mission en cours dans une classe.
    already = [c for c in classrooms if any(not _is_past_due(a, day) for a in Assignment.objects.filter(classroom=c, mission=mission))]
    if already:
        names = ', '.join(class_name(c.level, c.section) for c in already)
        raise ApiError(f'« {mission.title} » est déjà un devoir en cours pour {names}.')

    created = []
    for classroom in classrooms:
        assignment = Assignment.objects.create(school=teacher.school, mission=mission, classroom=classroom,
                                               teacher=teacher, due_date=due, instructions=instructions)
        created.append(_summary(assignment, _students(teacher, classroom), {}))
    return created


def assignment_detail(teacher, assignment_id) -> dict:
    assignment = _owned_assignment(teacher, assignment_id)
    students = _students(teacher, assignment.classroom)
    done_map = _completions([assignment])
    late = _is_past_due(assignment, today())
    done, pending = [], []
    for profile in students:
        completion = done_map.get((assignment.id, profile.id))
        if completion:
            done.append((completion.completed_at, {'student': student_payload(profile), 'completion': completion_payload(completion)}))
        else:
            pending.append({'student': student_payload(profile), 'late': late})
    done.sort(key=lambda item: item[0])
    scores = [row['completion']['score'] for _, row in done]
    return {
        'summary': _summary(assignment, students, done_map),
        'done': [row for _, row in done],
        'pending': pending,
        'averageScore': round(sum(scores) / len(scores)) if scores else None,
        'questionStats': _question_stats(assignment, {s.id for s in students}),
        'lessonId': assignment.mission.lesson.lesson_id if assignment.mission.lesson_id else None,
    }


def _question_stats(assignment, student_ids) -> list:
    """Par question : combien d'élèves ont répondu et quelle part a réussi (pour savoir quoi réexpliquer)."""
    answers = {}
    for step, correct, student_id in assignment.answers.values_list('step', 'correct', 'student_id'):
        if student_id in student_ids:
            counts = answers.setdefault(step, [0, 0])
            counts[0] += 1
            counts[1] += 1 if correct else 0
    stats = []
    for index, step in enumerate(quiz_for(assignment.mission)):
        answered, right = answers.get(index, (0, 0))
        stats.append({'index': index, 'question': step['question'], 'answered': answered, 'correct': right,
                      'successRate': round(100 * right / answered) if answered else None})
    return stats


def delete_assignment(teacher, assignment_id) -> None:
    """Retire un devoir donné par erreur, tant qu'aucun élève ne l'a rendu."""
    assignment = _owned_assignment(teacher, assignment_id)
    if assignment.completions.exists():
        raise ApiError('Des élèves ont déjà rendu ce devoir : il ne peut plus être supprimé, pour conserver leurs résultats.')
    assignment.delete()


# ─── Analytiques ─────────────────────────────────────────────────────────────

def _average(values):
    return round(sum(values) / len(values)) if values else None


def class_analytics(teacher, class_id) -> dict:
    classroom = _owned_classroom(teacher, class_id)
    day = today()
    students = _students(teacher, classroom)
    ids = {s.id for s in students}
    assignments = _class_assignments(classroom)
    completions = [c for c in AssignmentCompletion.objects.filter(assignment__in=assignments).select_related('assignment__mission', 'assignment')
                   if c.student_id in ids]
    due = [a for a in assignments if _is_past_due(a, day)]
    expected = len(due) * len(students)
    due_ids = {a.id: a for a in due}
    on_time = sum(1 for c in completions if c.assignment_id in due_ids and _is_on_time(c, due_ids[c.assignment_id]))

    def needs_help(profile):
        own = [c for c in completions if c.student_id == profile.id]
        late = any(not any(c.assignment_id == a.id for c in own) for a in due)
        score = _average([c.score for c in own])
        return late or (score is not None and score < WEAK_HELP_SCORE)

    # Notions : celles des devoirs du programme (une par module) quand la classe en a reçu ; sinon les thèmes d'origine.
    used = []
    for assignment in sorted(assignments, key=lambda a: (a.mission.module.order if a.mission.module_id else 0, a.id)):
        if assignment.mission.module_id and assignment.mission.category not in used:
            used.append(assignment.mission.category)
    categories = []
    for category in (used or CATEGORY_ORDER):
        within = [c for c in completions if c.assignment.mission.category == category]
        categories.append({'category': category, 'averageScore': _average([c.score for c in within]),
                           'completions': len(within),
                           'assignments': sum(1 for a in assignments if a.mission.category == category)})
    progress = []
    for label, low, high in PROGRESS_BUCKETS:
        count = sum(1 for s in students if s.lessons_total >= low and (high is None or s.lessons_total <= high))
        progress.append({'label': label, 'count': count})
    return {
        'classroom': classroom_payload(classroom),
        'studentCount': len(students),
        'onTimeRate': round(on_time / expected * 100) if expected else None,
        'averageScore': _average([c.score for c in completions]),
        'studentsNeedingHelp': sum(1 for s in students if needs_help(s)),
        'categories': categories,
        'progress': progress,
    }


# ─── Paramètres et code parent ───────────────────────────────────────────────

def teacher_settings(teacher) -> dict:
    return {'teacher': me(teacher),
            'classes': [{'classroom': classroom_payload(c), 'studentCount': len(_students(teacher, c))} for c in _classrooms(teacher)]}


def parent_link(teacher, student_id) -> dict:
    return liens.link_info(_owned_student(teacher, student_id))


def generate_parent_code(teacher, student_id) -> dict:
    profile = _owned_student(teacher, student_id)
    if profile.user.parent_id:
        raise ApiError('Un parent est déjà relié à cet élève.')
    return liens.generate_code(profile)


def school(teacher) -> dict:
    """École de l'enseignant (nom, ville, année, direction) pour le menu et ses Paramètres."""
    return school_payload(teacher.school)

def get_leaderboard(teacher, params) -> dict:
    """Classement des élèves des classes de l'enseignant, éventuellement d'une seule (?classId=)."""
    classrooms = _classrooms(teacher)
    class_id = params.get('classId')
    classroom = _owned_classroom(teacher, class_id) if class_id else None
    return classement.build_leaderboard(teacher.school, params.get('period'), classrooms,
                                        classroom=classroom, restrict_to_classrooms=True)

def class_blockings(teacher, class_id) -> dict:
    """Bloquages par leçon d'une classe : terminés, difficultés, arrêt (T4 reprise)."""
    from apps.progress.models import lesson_progress
    from ..models import Mission
    from ..payloads import classroom_payload, student_payload

    classroom = _owned_classroom(teacher, class_id)
    students = _students(teacher, classroom)
    user_ids = {s.user_id for s in students}
    track = level_info(classroom.level).track

    lessons = list(
        Mission.objects.filter(active=True, track=track, lesson__isnull=False)
        .select_related('module', 'lesson')
        .order_by('module__order', 'lesson__order', 'id')
    )
    ordered_ids = [m.lesson.lesson_id for m in lessons]

    progress_map = {s.user_id: {} for s in students}
    for entry in lesson_progress(Progress.objects.filter(user_id__in=user_ids or {None})):
        progress_map.setdefault(entry.user_id, {})[entry.lesson_id] = entry

    cutoff = timezone.now() - timedelta(days=INACTIVE_AFTER_DAYS)
    # Prépare, pour chaque élève, sa prochaine leçon non terminée et son état d'arrêt.
    next_lesson_for_student = {}
    inactive_students = set()
    for student in students:
        own = progress_map.get(student.user_id, {})
        dates = [e.completed_at for e in own.values() if getattr(e, 'completed_at', None)]
        last = max(dates) if dates else None
        remaining = [lid for lid in ordered_ids if lid not in own]
        if remaining and (last is None or last < cutoff):
            inactive_students.add(student.id)
            next_lesson_for_student[student.id] = remaining[0]

    lesson_rows = []
    for mission in lessons:
        lesson = mission.lesson
        lesson_id = lesson.lesson_id
        entries = []
        for student in students:
            entry = progress_map.get(student.user_id, {}).get(lesson_id)
            if entry is not None:
                entries.append(entry)
        completed = len(entries)
        stars = [e.stars for e in entries]
        average = round(sum(stars) / len(stars), 1) if stars else None

        difficult_profiles = [
            s for s in students
            if (e := progress_map.get(s.user_id, {}).get(lesson_id)) is not None and e.stars == 1
        ]
        stopped_profiles = [
            s for s in students
            if s.id in inactive_students and next_lesson_for_student.get(s.id) == lesson_id
        ]

        lesson_rows.append({
            'lessonId': lesson_id,
            'lessonTitle': lesson.title,
            'moduleTitle': mission.module.title if mission.module_id else None,
            'completed': completed,
            'total': len(students),
            'averageStars': average,
            'difficult': [student_payload(s) for s in difficult_profiles],
            'stopped': [student_payload(s) for s in stopped_profiles],
        })

    has_blockings = any(r['difficult'] or r['stopped'] for r in lesson_rows)
    return {
        'classroom': classroom_payload(classroom),
        'studentCount': len(students),
        'lessons': lesson_rows,
        'message': None if has_blockings else "Aucun élève n'est bloqué.",
    }
