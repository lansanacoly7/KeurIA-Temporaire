"""
Années scolaires : calendrier, clôture encadrée, annulation (miroir de lib/anneeApi.ts).

Garde-fous de la clôture (tous revérifiés ici) :
  1. impossible avant la date de fin d'année (sauf simulation, en développement seulement) ;
  2. bilan de l'année téléchargé au préalable (enregistré côté serveur) ;
  3. décision explicite et valide pour chaque élève concerné ;
  4. confirmation en tapant le nom de l'année ;
  5. annulable pendant YearClosure.UNDO_DAYS jours, grâce au journal des changements.
Les matricules, identifiants et mots de passe des élèves ne changent jamais.
"""
import csv
import io
from datetime import date, timedelta

from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from ..errors import ApiError, NotFound
from ..levels import class_name, classroom_sort_key, next_level
from ..models import (
    AcademicYear,
    Assignment,
    AssignmentCompletion,
    Classroom,
    StudentProfile,
    YearClosure,
)
from ..payloads import (
    STATUS_LABELS,
    classroom_payload,
    current_year,
    iso,
    sort_students,
    student_payload,
    students_qs,
    year_payload,
)
from .common import log_activity, parse_iso_date, sync_learner_track, today
from .ecole import plural

DECISIONS = ('passe', 'redouble', 'sortant')


def next_label(label: str) -> str:
    start = int(label[:4]) + 1
    return f'{start}-{start + 1}'


def _pending_closure(school):
    closure = YearClosure.objects.filter(school=school, undone_at__isnull=True, undo_until__gt=timezone.now()).first()
    if closure is None:
        return None
    changes_since = school.activity.filter(at__gt=closure.closed_at).exclude(kind='annee_cloturee').count()
    return {'fromYear': closure.from_year, 'toYear': closure.to_year, 'closedAt': iso(closure.closed_at),
            'undoUntil': iso(closure.undo_until), 'changesSince': changes_since}


# ─── Calendrier ──────────────────────────────────────────────────────────────

def overview(school) -> dict:
    past = AcademicYear.objects.filter(school=school, status=AcademicYear.STATUS_CLOSED).order_by('-label')
    return {'current': year_payload(current_year(school)), 'past': [year_payload(y) for y in past],
            'pendingClosure': _pending_closure(school)}


def update_dates(school, data) -> dict:
    year = current_year(school)
    first, second = year.label[:4], year.label[5:]
    start, end = parse_iso_date(data.get('startDate')), parse_iso_date(data.get('endDate'))
    if start is None or str(start.year) != first:
        raise ApiError(f"La rentrée doit être une date de l'année {first}.")
    if end is None or str(end.year) != second:
        raise ApiError(f"La fin d'année doit être une date de l'année {second}.")
    year.start_date, year.end_date = start, end
    year.save(update_fields=['start_date', 'end_date'])
    return year_payload(year)


# ─── Clôture : vérifications, bilan, passage ─────────────────────────────────

def _demo_allowed(flag) -> bool:
    """« Simuler la fin de l'année » : réservé au développement, refusé en production."""
    return bool(flag) and settings.DEBUG


def _active_classrooms(school):
    return sorted(Classroom.objects.filter(school=school, archived=False).select_related('teacher'), key=classroom_sort_key)


def closure_check(school, demo_ignore_date=False) -> dict:
    year = current_year(school)
    classes = _active_classrooms(school)
    ongoing = Assignment.objects.filter(school=school, classroom__archived=False).filter(
        Q(due_date__isnull=True) | Q(due_date__gte=today())).count()
    without_class = StudentProfile.objects.filter(school=school, classroom__isnull=True, user__is_active=True).count()
    without_teacher = [c for c in classes if c.teacher_id is None]

    warnings = []
    if ongoing:
        warnings.append({'key': 'devoirs', 'href': '/ecole/classes',
                         'text': f"{plural(ongoing, 'devoir encore en cours', 'devoirs encore en cours')} : ils resteront consultables dans les classes archivées, mais ne pourront plus être rendus."})
    if without_class:
        verb = 'ils ne seront pas concernés' if without_class > 1 else 'il ne sera pas concerné'
        warnings.append({'key': 'sans-classe', 'href': '/ecole/eleves?classe=none',
                         'text': f"{plural(without_class, 'élève')} sans classe : {verb} par le passage."})
    if without_teacher:
        names = ', '.join(class_name(c.level, c.section) for c in without_teacher)
        warnings.append({'key': 'sans-enseignant', 'href': '/ecole/classes',
                         'text': f"Classe{'s' if len(without_teacher) > 1 else ''} sans enseignant cette année : {names}."})
    return {
        'year': year_payload(year),
        'nextYear': next_label(year.label),
        'endReached': _demo_allowed(demo_ignore_date) or today() >= year.end_date,
        'demoAvailable': settings.DEBUG,
        'pendingClosure': _pending_closure(school),
        'warnings': warnings,
    }


def safe_cell(value):
    """Neutralise l'injection de formule : un tableur exécute une cellule texte qui commence par
    = + - @ (ou tabulation/retour chariot). On la préfixe d'une apostrophe, sans toucher aux nombres."""
    if isinstance(value, str) and value[:1] in ('=', '+', '-', '@', '\t', '\r'):
        return "'" + value
    return value


def year_archive(school) -> dict:
    """Bilan de l'année, un élève par ligne (CSV « ; » avec BOM, s'ouvre dans Excel)."""
    year = current_year(school)
    scores = {}
    for completion in AssignmentCompletion.objects.filter(student__school=school).values('student_id', 'score'):
        scores.setdefault(completion['student_id'], []).append(completion['score'])
    buffer = io.StringIO()
    writer = csv.writer(buffer, delimiter=';', lineterminator='\r\n')
    writer.writerow(['Matricule', 'Nom', 'Prénom', 'Sexe', 'Date de naissance', 'Classe', 'Statut du compte',
                     'Leçons terminées', 'XP', 'Devoirs rendus', 'Score moyen (%)'])
    for profile in sort_students(students_qs(school)):
        data = student_payload(profile)
        own = scores.get(profile.id, [])
        classroom = profile.classroom
        writer.writerow([safe_cell(value) for value in (
            profile.matricule, profile.last_name, profile.first_name, profile.sexe, data['birthDate'],
            class_name(classroom.level, classroom.section) if classroom else 'Sans classe',
            STATUS_LABELS[data['status']], data['lessonsCompleted'], data['xp'], len(own),
            round(sum(own) / len(own)) if own else '')])
    year.archive_downloaded_at = timezone.now()
    year.save(update_fields=['archive_downloaded_at'])
    return {'filename': f'bilan-{year.label}-{school.slug}.csv', 'csv': '﻿' + buffer.getvalue()}


def promotion_plan(school) -> list:
    plan = []
    for classroom in _active_classrooms(school):
        following = next_level(classroom.level)
        students = students_qs(school).filter(classroom=classroom, user__is_active=True)
        plan.append({
            'classroom': classroom_payload(classroom),
            'nextClassName': class_name(following, classroom.section) if following else None,
            'students': [student_payload(s) for s in sort_students(students)],
        })
    return plan


# ─── Clôture et annulation ───────────────────────────────────────────────────

@transaction.atomic
def close_year(school, data) -> dict:
    year = AcademicYear.objects.select_for_update().get(school=school, status=AcademicYear.STATUS_CURRENT)
    now = timezone.now()
    if _pending_closure(school):
        raise ApiError("La clôture précédente est encore annulable : attendez la fin du délai d'annulation.")
    if not _demo_allowed(data.get('demoIgnoreDate')) and today() < year.end_date:
        raise ApiError("L'année n'est pas terminée : la clôture sera possible à partir de la date de fin d'année.")
    if year.archive_downloaded_at is None:
        raise ApiError("Téléchargez d'abord le bilan de l'année.")
    if str(data.get('confirmation', '')).strip() != year.label:
        raise ApiError(f'Pour confirmer, tapez exactement « {year.label} ».')
    decisions = data.get('decisions')
    if not isinstance(decisions, dict):
        raise ApiError('Décisions manquantes.')

    classes = _active_classrooms(school)
    members = {c.pk: list(StudentProfile.objects.filter(classroom=c).select_related('user')) for c in classes}
    for classroom in classes:
        for profile in members[classroom.pk]:
            if not profile.user.is_active:
                continue
            decision = decisions.get(str(profile.pk))
            if decision not in DECISIONS:
                raise ApiError('Une décision manque pour au moins un élève.')
            if decision == 'passe' and next_level(classroom.level) is None:
                raise ApiError(f"Après la {classroom.level}, un élève ne peut que redoubler ou quitter l'école.")

    new_label = next_label(year.label)
    # Nouvelles classes : la même organisation, plus celles qu'imposent les passages.
    keys = {(c.level, c.section) for c in classes}
    for classroom in classes:
        following = next_level(classroom.level)
        if following and any(decisions.get(str(p.pk)) == 'passe' for p in members[classroom.pk] if p.user.is_active):
            keys.add((following, classroom.section))

    journal = {'students': [], 'archived': [], 'created': []}
    for classroom in classes:
        journal['archived'].append(classroom.pk)
        classroom.archived = True
        classroom.archived_student_ids = [p.pk for p in members[classroom.pk]]
        classroom.save(update_fields=['archived', 'archived_student_ids'])
    # Les nouvelles classes démarrent sans enseignant : la direction les réattribue.
    created = {}
    for level, section in sorted(keys):
        created[(level, section)] = Classroom.objects.create(school=school, level=level, section=section, academic_year=new_label)
    journal['created'] = [c.pk for c in created.values()]

    counts = {'passe': 0, 'redouble': 0, 'sortant': 0}
    for classroom in classes:
        for profile in members[classroom.pk]:
            journal['students'].append({'id': profile.pk, 'classroom': classroom.pk, 'active': profile.user.is_active,
                                        'left': profile.left_in_year})
            if not profile.user.is_active:
                profile.classroom = None
                profile.save(update_fields=['classroom'])
                continue
            decision = decisions[str(profile.pk)]
            counts[decision] += 1
            if decision == 'sortant':
                profile.classroom, profile.left_in_year = None, year.label
                profile.save(update_fields=['classroom', 'left_in_year'])
                profile.user.is_active = False
                profile.user.save(update_fields=['is_active'])
            else:
                level = next_level(classroom.level) if decision == 'passe' else classroom.level
                profile.classroom = created[(level, classroom.section)]
                profile.save(update_fields=['classroom'])
                sync_learner_track(profile)

    summary = {'classesArchived': len(classes), 'classesCreated': len(created), 'promoted': counts['passe'],
               'repeating': counts['redouble'], 'leaving': counts['sortant']}
    year.status, year.closed_at, year.summary = AcademicYear.STATUS_CLOSED, now, summary
    year.save(update_fields=['status', 'closed_at', 'summary'])
    AcademicYear.objects.create(school=school, label=new_label, status=AcademicYear.STATUS_CURRENT,
                                start_date=date(int(new_label[:4]), 10, 1), end_date=date(int(new_label[5:]), 7, 31))
    YearClosure.objects.create(school=school, from_year=year.label, to_year=new_label, closed_at=now,
                               undo_until=now + timedelta(days=YearClosure.UNDO_DAYS), changes=journal)
    log_activity(school, 'annee_cloturee', f'Année {year.label} clôturée, passage en {new_label}')
    return summary


@transaction.atomic
def undo_closure(school) -> None:
    """
    Inverse le journal de la clôture. Les élèves inscrits depuis dans les nouvelles
    classes se retrouvent sans classe ; les devoirs donnés depuis à ces classes sont retirés.
    """
    closure = YearClosure.objects.select_for_update().filter(
        school=school, undone_at__isnull=True, undo_until__gt=timezone.now()).first()
    if closure is None:
        raise ApiError("Il n'y a plus de clôture annulable.")
    journal = closure.changes
    created = Classroom.objects.filter(school=school, pk__in=journal['created'])
    StudentProfile.objects.filter(classroom__in=created).update(classroom=None)
    for entry in journal['students']:
        profile = StudentProfile.objects.select_related('user').filter(school=school, pk=entry['id']).first()
        if profile is None:
            continue
        profile.classroom_id, profile.left_in_year = entry['classroom'], entry['left']
        profile.save(update_fields=['classroom', 'left_in_year'])
        if profile.user.is_active != entry['active']:
            profile.user.is_active = entry['active']
            profile.user.save(update_fields=['is_active'])
        profile.classroom = Classroom.objects.get(pk=entry['classroom'])
        sync_learner_track(profile)
    created.delete()
    Classroom.objects.filter(school=school, pk__in=journal['archived']).update(archived=False, archived_student_ids=[])
    AcademicYear.objects.filter(school=school, label=closure.to_year).delete()
    AcademicYear.objects.filter(school=school, label=closure.from_year).update(
        status=AcademicYear.STATUS_CURRENT, closed_at=None, summary=None)
    closure.undone_at = timezone.now()
    closure.save(update_fields=['undone_at'])
    log_activity(school, 'cloture_annulee', f"Clôture de l'année {closure.from_year} annulée")


# ─── Années passées ──────────────────────────────────────────────────────────

def past_year(school, label) -> dict:
    year = AcademicYear.objects.filter(school=school, label=label, status=AcademicYear.STATUS_CLOSED).first()
    if year is None:
        raise NotFound('Année scolaire introuvable.')
    classes = sorted(Classroom.objects.filter(school=school, archived=True, academic_year=label), key=classroom_sort_key)
    return {'year': year_payload(year),
            'classes': [{'classroom': classroom_payload(c), 'studentCount': len(c.archived_student_ids)} for c in classes]}
