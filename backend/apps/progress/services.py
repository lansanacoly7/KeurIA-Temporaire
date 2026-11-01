from datetime import timedelta

from django.db.models import Count, Max, Sum
from django.utils import timezone

from apps.accounts.models import User
from apps.curriculum.models import Lesson
from apps.learners.models import LearnerProfile

from .models import Progress

INACTIVE_AFTER_DAYS = 7
DEFAULT_AGE_TRACK = '7-9'


def build_admin_dashboard(users):
    """Construit `learners` et `analytics` au format attendu par app/admin/AdminClient.tsx."""
    now = timezone.now()
    today = now.date()

    lessons_per_track = {
        row['module__track__key']: row['n']
        for row in Lesson.objects.values('module__track__key').annotate(n=Count('id'))
    }
    lesson_ids = set(Lesson.objects.values_list('lesson_id', flat=True))
    profiles = {p.learner_id: p for p in LearnerProfile.objects.filter(learner__isnull=False)}

    students = [u for u in users if u.role == User.ROLE_STUDENT]
    stats = {
        row['user']: row
        for row in Progress.objects.filter(user__in=students)
        .values('user')
        .annotate(xp=Sum('xp'), last=Max('completed_at'))
    }
    completed_by_user = {}
    for user_id, lesson_id in Progress.objects.filter(user__in=students).values_list('user', 'lesson_id'):
        if lesson_id in lesson_ids:
            completed_by_user[user_id] = completed_by_user.get(user_id, 0) + 1

    learners = []
    for student in students:
        profile = profiles.get(student.id)
        age_track = profile.age_track if profile else DEFAULT_AGE_TRACK
        total = lessons_per_track.get(age_track, 0)
        completed = completed_by_user.get(student.id, 0)
        row = stats.get(student.id, {})
        last_activity = row.get('last') or student.last_seen_at
        inactive_days = (now - last_activity).days if last_activity else None

        if completed == 0:
            learner_status = "à démarrer"
        elif inactive_days is not None and inactive_days >= INACTIVE_AFTER_DAYS:
            learner_status = "alerte"
        else:
            learner_status = "actif"

        learners.append({
            "id": student.id,
            "email": student.email,
            "displayName": student.display_name,
            "ageTrack": age_track,
            "avatar": profile.avatar if profile else None,
            "completed": completed,
            "total": total,
            "percent": min(100, round(completed / total * 100)) if total else 0,
            "xp": row.get('xp') or 0,
            "lastActivity": last_activity.isoformat() if last_activity else None,
            "inactiveDays": inactive_days or 0,
            "status": learner_status,
        })

    roles = {key: 0 for key, _ in User.ROLE_CHOICES}
    for user in users:
        roles[user.role] = roles.get(user.role, 0) + 1

    seen = [u for u in users if u.last_seen_at]
    recent = sorted(seen, key=lambda u: u.last_seen_at, reverse=True)[:8]

    analytics = {
        "connectedToday": sum(1 for u in seen if u.last_seen_at.date() == today),
        "activeWeek": sum(1 for u in seen if u.last_seen_at >= now - timedelta(days=7)),
        "lessonsCompleted": sum(completed_by_user.values()),
        "averageProgress": round(sum(item["percent"] for item in learners) / len(learners)) if learners else 0,
        "alerts": sum(1 for item in learners if item["status"] != "actif"),
        "roles": roles,
        "recentConnections": [
            {
                "id": u.id,
                "displayName": u.display_name,
                "email": u.email,
                "role": u.role,
                "lastSeenAt": u.last_seen_at.isoformat(),
                "loginCount": u.login_count,
            }
            for u in recent
        ],
    }
    return learners, analytics
