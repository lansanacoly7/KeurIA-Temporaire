from django.db import transaction
from django.utils import timezone
from rest_framework import status

from apps.accounts.models import User
from ..errors import ApiError, NotFound
from ..mission_quizzes import quiz_for
from ..models import Assignment, AssignmentAnswer, AssignmentCompletion, StudentProfile
from .common import parse_id, today


def get_school_student_profile(user) -> StudentProfile | None:
    """Retourne le profil scolaire de l'élève connecté, ou None s'il s'agit d'un compte particulier/famille."""
    if not user or not user.is_authenticated or user.role != User.ROLE_STUDENT:
        return None
    if not user.school_id:
        return None
    return getattr(user, 'student_profile', None)


def list_assignments(user) -> dict:
    """Liste les devoirs assignés à la classe de l'élève scolaire connecté."""
    profile = get_school_student_profile(user)
    if profile is None or profile.classroom is None:
        return {
            'isSchoolStudent': False,
            'classroom': None,
            'assignments': [],
        }

    now_day = today()
    assignments_qs = (
        Assignment.objects.filter(classroom=profile.classroom)
        .select_related('mission', 'teacher', 'teacher__staff_profile', 'classroom')
        .order_by('due_date', '-created_at')
    )
    assignments = list(assignments_qs)

    completions = {
        c.assignment_id: c
        for c in AssignmentCompletion.objects.filter(assignment__in=assignments, student=profile)
    }

    result = []
    for a in assignments:
        completion = completions.get(a.id)
        if completion:
            st = 'termine'
        elif a.due_date and a.due_date < now_day:
            st = 'en_retard'
        else:
            st = 'a_faire'

        teacher_name = "Votre enseignant"
        if a.teacher and hasattr(a.teacher, 'staff_profile'):
            sp = a.teacher.staff_profile
            teacher_name = f"{sp.first_name} {sp.last_name}"

        result.append({
            'id': a.id,
            'mission': {
                'id': a.mission.id,
                'title': a.mission.title,
                'description': a.mission.description,
                'category': a.mission.category,
                'difficulty': a.mission.difficulty,
                'durationMinutes': a.mission.duration_minutes,
                'xp': a.mission.xp,
            },
            'teacherName': teacher_name,
            'dueDate': a.due_date.isoformat() if a.due_date else None,
            'instructions': a.instructions,
            'createdAt': a.created_at.isoformat(),
            'status': st,
            'completion': {
                'score': completion.score,
                'completedAt': completion.completed_at.isoformat(),
            } if completion else None,
        })

    # Trier : à faire en premier (urgents / en retard d'abord), puis terminés
    status_order = {'en_retard': 0, 'a_faire': 1, 'termine': 2}
    result.sort(key=lambda item: (status_order.get(item['status'], 3), item['dueDate'] or '9999-99-99'))

    return {
        'isSchoolStudent': True,
        'classroom': {
            'id': profile.classroom.id,
            'level': profile.classroom.level,
            'section': profile.classroom.section,
        },
        'assignments': result,
    }


def _school_assignment(user, assignment_id):
    """(profil, devoir) de l'élève d'école connecté ; le devoir doit être celui de SA classe."""
    profile = get_school_student_profile(user)
    if profile is None or profile.classroom is None:
        raise ApiError("Seuls les élèves d'une école peuvent faire ce devoir.", status.HTTP_403_FORBIDDEN)
    assignment = (Assignment.objects.select_related('mission')
                  .filter(pk=assignment_id, classroom=profile.classroom).first())
    if assignment is None:
        raise NotFound("Devoir introuvable ou non assigné à votre classe.")
    return profile, assignment


def _answers(profile, assignment) -> dict:
    return {a.step: a for a in AssignmentAnswer.objects.filter(assignment=assignment, student=profile)}


def _answered_payload(steps, answers) -> dict:
    """Réponses déjà données, avec la correction : elle n'est révélée qu'après la réponse de l'élève à cette question."""
    payload = {}
    for index, answer in answers.items():
        if index >= len(steps):
            continue
        options = steps[index]['options']
        payload[str(index)] = {
            'option': answer.option,
            'correct': answer.correct,
            'correctOption': next(i for i, o in enumerate(options) if o['correct']),
            'explanation': options[answer.option]['explanation'],
        }
    return payload


def quiz_state(user, assignment_id: int) -> dict:
    """Questions du devoir (sans la correction) et réponses déjà données : de quoi reprendre là où l'élève s'était arrêté."""
    profile, assignment = _school_assignment(user, assignment_id)
    steps = quiz_for(assignment.mission)
    return {
        'steps': [{'question': s['question'], 'options': [o['label'] for o in s['options']]} for s in steps],
        'answers': _answered_payload(steps, _answers(profile, assignment)),
        'completed': AssignmentCompletion.objects.filter(assignment=assignment, student=profile).exists(),
    }


@transaction.atomic
def answer_step(user, assignment_id: int, data: dict) -> dict:
    """Enregistre la réponse à une question. La première réponse est définitive (redemander ne change rien)."""
    profile, assignment = _school_assignment(user, assignment_id)
    steps = quiz_for(assignment.mission)
    step, option = parse_id(data.get('step')), parse_id(data.get('option'))
    if step is None or step >= len(steps):
        raise ApiError('Question inconnue.')
    if option is None or option >= len(steps[step]['options']):
        raise ApiError('Réponse inconnue.')
    answer, _ = AssignmentAnswer.objects.get_or_create(
        assignment=assignment, student=profile, step=step,
        defaults={'option': option, 'correct': steps[step]['options'][option]['correct']},
    )
    return _answered_payload(steps, {step: answer})[str(step)]


@transaction.atomic
def restart_practice(user, assignment_id: int) -> dict:
    """Permet de refaire un devoir déjà rendu pour s'entraîner. Avant la première remise, on ne peut pas recommencer :
    sinon l'élève pourrait voir toutes les corrections, effacer ses réponses et rendre un sans-faute."""
    profile, assignment = _school_assignment(user, assignment_id)
    if not AssignmentCompletion.objects.filter(assignment=assignment, student=profile).exists():
        raise ApiError("Termine d'abord ce devoir : tes premières réponses comptent pour la note.", status.HTTP_409_CONFLICT)
    AssignmentAnswer.objects.filter(assignment=assignment, student=profile).delete()
    return quiz_state(user, assignment_id)


@transaction.atomic
def complete_assignment(user, assignment_id: int) -> dict:
    """Rend le devoir. La note est calculée ICI, à partir des réponses enregistrées ; la première remise fait foi
    (note et date), les XP ne sont gagnées qu'une fois."""
    profile, assignment = _school_assignment(user, assignment_id)
    steps = quiz_for(assignment.mission)
    answers = _answers(profile, assignment)

    existing = AssignmentCompletion.objects.filter(assignment=assignment, student=profile).first()
    if existing is not None:
        return _completion_payload(assignment, existing, xp_gained=0)

    if any(index not in answers for index in range(len(steps))):
        raise ApiError('Réponds à toutes les questions avant de rendre ton devoir.')
    score = round(100 * sum(1 for i in range(len(steps)) if answers[i].correct) / len(steps))

    completion, created = AssignmentCompletion.objects.get_or_create(
        assignment=assignment, student=profile, defaults={'score': score, 'completed_at': timezone.now()})
    gained_xp = assignment.mission.xp if (created and score > 0) else 0
    if created:
        # L'XP du devoir est créditée une seule fois, dans Progress : c'est la source unique des totaux,
        # niveaux et classements (voir apps/progress/xp.py).
        from apps.learners.models import LearnerProfile
        from apps.progress.xp import record_xp
        age_track = LearnerProfile.objects.filter(learner=user).values_list('age_track', flat=True).first() or '10-12'
        record_xp(user, f'devoir:{assignment.id}', gained_xp, age_track=age_track, score=score)
    return _completion_payload(assignment, completion, xp_gained=gained_xp)


def _completion_payload(assignment, completion, *, xp_gained: int) -> dict:
    return {
        'ok': True,
        'assignmentId': assignment.id,
        'score': completion.score,
        'completedAt': completion.completed_at.isoformat(),
        'xpGained': xp_gained,
    }
