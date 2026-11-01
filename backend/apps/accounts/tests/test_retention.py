"""Conservation limitée : avertir, désactiver, supprimer — sans jamais surprendre ni toucher aux comptes d'école."""
from datetime import timedelta
from unittest import mock

from django.core import mail
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import AccountStatsSnapshot, User
from apps.accounts.retention import apply_retention, take_snapshot
from apps.progress.models import Progress
from apps.schools.models import School

NOW = timezone.now()
LONG_AGO = NOW - timedelta(days=800)   # plus de 2 ans
RECENT = NOW - timedelta(days=10)


def make(email, role, seen, **extra):
    user = User.objects.create_user(email=email, password="motdepasse123", role=role, **extra)
    User.objects.filter(pk=user.pk).update(last_seen_at=seen, created_at=seen or LONG_AGO)
    user.refresh_from_db()
    return user


def household(seen=LONG_AGO, child_seen=LONG_AGO):
    parent = make("parent@example.com", User.ROLE_PARENT, seen)
    child = make("awa@keuria.sn", User.ROLE_STUDENT, child_seen, parent=parent)
    return User.objects.get(pk=parent.pk), child


class RetentionTimelineTests(TestCase):
    def test_a_recently_used_household_is_left_alone(self):
        parent, _ = household(seen=RECENT, child_seen=RECENT)

        result = apply_retention(NOW)

        self.assertEqual((result['warned'], result['deactivated'], result['deleted']), (0, 0, 0))
        self.assertEqual(len(mail.outbox), 0)
        self.assertTrue(User.objects.get(pk=parent.pk).is_active)

    def test_an_idle_household_is_warned_first_and_nothing_else_happens(self):
        parent, child = household()

        result = apply_retention(NOW)

        self.assertEqual(result['warned'], 1)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["parent@example.com"])
        parent.refresh_from_db()
        self.assertIsNotNone(parent.retention_notified_at)
        self.assertTrue(parent.is_active)
        self.assertTrue(User.objects.filter(pk=child.pk).exists())

    def test_nothing_is_deleted_at_the_first_meeting_even_after_years(self):
        parent, child = household()

        apply_retention(NOW + timedelta(days=5000))

        self.assertTrue(User.objects.filter(pk=parent.pk, is_active=True).exists())
        self.assertTrue(User.objects.filter(pk=child.pk).exists())

    def test_it_is_deactivated_thirty_days_after_the_warning(self):
        parent, _ = household()
        apply_retention(NOW)

        early = apply_retention(NOW + timedelta(days=29))
        late = apply_retention(NOW + timedelta(days=31))

        self.assertEqual(early['deactivated'], 0)
        self.assertEqual(late['deactivated'], 1)
        parent.refresh_from_db()
        self.assertFalse(parent.is_active)
        self.assertIsNotNone(parent.retention_deactivated_at)

    def test_it_is_deleted_thirty_days_after_the_deactivation(self):
        parent, child = household()
        apply_retention(NOW)
        apply_retention(NOW + timedelta(days=31))

        early = apply_retention(NOW + timedelta(days=50))
        late = apply_retention(NOW + timedelta(days=62))

        self.assertEqual(early['deleted'], 0)
        self.assertEqual(late['deleted'], 1)
        self.assertFalse(User.objects.filter(pk__in=[parent.pk, child.pk]).exists())

    def test_running_twice_the_same_day_does_not_send_two_warnings(self):
        household()

        apply_retention(NOW)
        apply_retention(NOW)

        self.assertEqual(len(mail.outbox), 1)


class RetentionResetTests(TestCase):
    def test_a_login_after_the_warning_resets_the_household(self):
        parent, _ = household()
        apply_retention(NOW)
        User.objects.filter(pk=parent.pk).update(last_seen_at=NOW + timedelta(days=5))

        result = apply_retention(NOW + timedelta(days=40))

        self.assertEqual(result['reset'], 1)
        parent.refresh_from_db()
        self.assertIsNone(parent.retention_notified_at)
        self.assertTrue(parent.is_active)

    def test_a_child_connecting_keeps_the_whole_household_alive(self):
        household(child_seen=RECENT)

        result = apply_retention(NOW)

        self.assertEqual(result['warned'], 0)
        self.assertEqual(len(mail.outbox), 0)

    def test_a_parent_deactivated_by_the_job_is_reactivated_when_someone_comes_back(self):
        parent, child = household()
        apply_retention(NOW)
        apply_retention(NOW + timedelta(days=31))
        User.objects.filter(pk=child.pk).update(last_seen_at=NOW + timedelta(days=40))

        apply_retention(NOW + timedelta(days=45))

        parent.refresh_from_db()
        self.assertTrue(parent.is_active)
        self.assertIsNone(parent.retention_deactivated_at)
        self.assertTrue(User.objects.filter(pk=child.pk).exists())


class RetentionExclusionTests(TestCase):
    def setUp(self):
        self.school = School.objects.create(name="École", slug="ecole")
        self.protected = [
            make("prof@example.com", User.ROLE_TEACHER, LONG_AGO, school=self.school),
            make("direction@example.com", User.ROLE_SCHOOL_ADMIN, LONG_AGO, school=self.school),
            make("eleve@ecole.keuria.sn", User.ROLE_STUDENT, LONG_AGO, school=self.school),
            make("equipe@example.com", User.ROLE_ADMIN, LONG_AGO),
        ]

    def test_school_and_team_accounts_are_never_touched(self):
        for days in (0, 40, 80, 400):
            apply_retention(NOW + timedelta(days=days))

        self.assertEqual(User.objects.filter(pk__in=[u.pk for u in self.protected], is_active=True).count(), 4)
        self.assertEqual(len(mail.outbox), 0)

    def test_a_school_student_linked_to_a_parent_survives_the_parents_deletion(self):
        parent, family_child = household()
        linked = User.objects.get(email="eleve@ecole.keuria.sn")
        User.objects.filter(pk=linked.pk).update(parent=parent)

        apply_retention(NOW)
        apply_retention(NOW + timedelta(days=31))
        apply_retention(NOW + timedelta(days=62))

        self.assertFalse(User.objects.filter(pk__in=[parent.pk, family_child.pk]).exists())
        linked.refresh_from_db()
        self.assertIsNone(linked.parent_id)
        self.assertEqual(linked.school_id, self.school.id)
        self.assertTrue(linked.is_active)


class RetentionSafetyTests(TestCase):
    def test_dry_run_changes_and_sends_nothing(self):
        parent, _ = household()

        result = apply_retention(NOW, dry_run=True)

        self.assertEqual(result['warned'], 1)
        self.assertEqual(len(mail.outbox), 0)
        parent.refresh_from_db()
        self.assertIsNone(parent.retention_notified_at)
        self.assertFalse(AccountStatsSnapshot.objects.exists())

    def test_if_the_warning_cannot_be_sent_nothing_moves_forward(self):
        parent, _ = household()

        with mock.patch("apps.accounts.retention.send_mail", side_effect=OSError("smtp down")):
            result = apply_retention(NOW)
            later = apply_retention(NOW + timedelta(days=40))

        self.assertEqual((result['warned'], result['errors']), (0, 1))
        self.assertEqual(later['deactivated'], 0)
        parent.refresh_from_db()
        self.assertIsNone(parent.retention_notified_at)
        self.assertTrue(parent.is_active)

    def test_a_never_activated_account_is_cleaned_without_a_warning(self):
        parent = make("jamais@example.com", User.ROLE_PARENT, None)
        User.objects.filter(pk=parent.pk).update(email_verified=False)

        result = apply_retention(NOW)

        self.assertEqual(result['deleted'], 1)
        self.assertEqual(len(mail.outbox), 0)
        self.assertFalse(User.objects.filter(pk=parent.pk).exists())

    @override_settings(RETENTION_INACTIVE_DAYS=1000)
    def test_the_durations_are_configurable(self):
        household()  # inactif depuis 800 jours seulement

        self.assertEqual(apply_retention(NOW)['warned'], 0)


class StatsSnapshotTests(TestCase):
    def test_numbers_are_frozen_before_the_first_deletion_and_survive_it(self):
        parent, child = household()
        Progress.objects.create(user=child, owner_email=child.email, lesson_id="a1", age_track="7-9", xp=120)
        apply_retention(NOW)
        apply_retention(NOW + timedelta(days=31))
        apply_retention(NOW + timedelta(days=62))   # suppression : les comptes n'existent plus…

        # Le passage de suppression tombe deux mois plus tard : un instantané par mois, chacun figé AVANT ce qui suit.
        snapshots = list(AccountStatsSnapshot.objects.order_by('month'))
        self.assertEqual(len(snapshots), 3)
        first, last = snapshots[0], snapshots[-1]
        self.assertEqual((first.family_parents, first.family_children, first.total_xp), (1, 1, 120))
        self.assertEqual((last.family_parents, last.family_children, last.total_xp), (1, 1, 120))  # figé avant de supprimer
        self.assertEqual(sum(s.warned for s in snapshots), 1)
        self.assertEqual(sum(s.deactivated for s in snapshots), 1)
        self.assertEqual(sum(s.deleted for s in snapshots), 2)   # le parent et son enfant
        self.assertFalse(User.objects.filter(pk=parent.pk).exists())   # les comptes ont disparu, pas les chiffres

    def test_one_snapshot_per_month_and_the_first_run_wins(self):
        household()
        first = take_snapshot(NOW)
        User.objects.create_user(email="autre@example.com", password="motdepasse123", role=User.ROLE_PARENT)

        again = take_snapshot(NOW + timedelta(hours=1))

        self.assertEqual(first.pk, again.pk)
        self.assertEqual(AccountStatsSnapshot.objects.count(), 1)
        self.assertEqual(again.family_parents, 1)

    def test_a_new_month_gets_a_new_snapshot(self):
        take_snapshot(NOW)
        take_snapshot(NOW + timedelta(days=35))

        self.assertEqual(AccountStatsSnapshot.objects.count(), 2)

    def test_school_and_team_accounts_are_counted_apart(self):
        school = School.objects.create(name="École", slug="ecole")
        make("prof@example.com", User.ROLE_TEACHER, RECENT, school=school)
        make("eleve@ecole.keuria.sn", User.ROLE_STUDENT, RECENT, school=school)
        make("equipe@example.com", User.ROLE_ADMIN, RECENT)
        household(seen=RECENT, child_seen=RECENT)

        snapshot = take_snapshot(NOW)

        self.assertEqual((snapshot.teachers, snapshot.school_students, snapshot.family_parents, snapshot.family_children),
                         (1, 1, 1, 1))
        self.assertEqual(snapshot.active_30_days, 4)   # l'équipe kEur IA n'est pas comptée


class StatsHistoryEndpointTests(TestCase):
    def test_only_the_keur_ia_team_reads_the_history(self):
        take_snapshot(NOW)
        parent = make("parent@example.com", User.ROLE_PARENT, RECENT)
        team = make("equipe@example.com", User.ROLE_ADMIN, RECENT)

        for user, expected in ((None, 401), (parent, 403), (team, 200)):
            client = APIClient()
            if user:
                client.force_login(user)
            self.assertEqual(client.get("/api/superadmin/stats-history").status_code, expected)
        client = APIClient()
        client.force_login(team)
        self.assertEqual(len(client.get("/api/superadmin/stats-history").data), 1)


class DeleteAccountKeepsSchoolStudentsTests(TestCase):
    """Supprimer son compte parent ne doit jamais effacer l'élève que l'école a relié."""

    def test_delete_account_detaches_school_students(self):
        school = School.objects.create(name="École", slug="ecole")
        parent, family_child = household(seen=RECENT, child_seen=RECENT)
        linked = make("eleve@ecole.keuria.sn", User.ROLE_STUDENT, RECENT, school=school, parent=parent)
        client = APIClient()
        client.force_login(parent)

        response = client.post("/api/account/delete", {"password": "motdepasse123"}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertFalse(User.objects.filter(pk__in=[parent.pk, family_child.pk]).exists())
        linked.refresh_from_db()
        self.assertIsNone(linked.parent_id)
        self.assertTrue(linked.is_active)
