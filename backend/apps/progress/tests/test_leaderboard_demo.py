from io import StringIO

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings

from apps.accounts.models import User
from apps.progress.leaderboard import _independent_students, rank_students
from apps.progress.management.commands.seed_leaderboard_demo import POOLS, VIEWER_EMAIL, demo_users
from apps.progress.models import Progress


def run(*args):
    out = StringIO()
    call_command('seed_leaderboard_demo', *args, stdout=out)
    return out.getvalue()


class LeaderboardDemoSeedTests(TestCase):
    @override_settings(DEBUG=True)
    def test_creates_ranked_students_with_different_periods(self):
        output = run('--viewer-password', 'Demo-Viewer-2026')
        self.assertIn(VIEWER_EMAIL, output)
        self.assertEqual(demo_users().count(), sum(POOLS.values()) + 1)

        pool = _independent_students('7-9').values('id')
        weekly, monthly, all_time = (rank_students(pool, period) for period in ('weekly', 'monthly', 'all_time'))
        self.assertGreaterEqual(len(all_time), 40)
        # Les trois périodes ne donnent pas le même classement : de plus en plus de monde, et un podium net sur 7 jours.
        self.assertLess(len(weekly), len(monthly))
        self.assertLessEqual(len(monthly), len(all_time))
        self.assertEqual(len({e['xp'] for e in weekly[:3]}), 3)

        viewer = User.objects.get(email=VIEWER_EMAIL)
        self.assertTrue(viewer.check_password('Demo-Viewer-2026'))
        self.assertTrue(any(e['user_id'] == viewer.id for e in weekly))

    @override_settings(DEBUG=True)
    def test_running_twice_replaces_instead_of_duplicating(self):
        run()
        run()
        self.assertEqual(demo_users().count(), sum(POOLS.values()) + 1)

    @override_settings(DEBUG=True)
    def test_clear_removes_accounts_and_their_xp_only(self):
        real = User.objects.create_user('vrai.eleve@example.com', 'Pass-1234', role=User.ROLE_STUDENT)
        Progress.objects.create(user=real, owner_email=real.email, lesson_id='p1-1', age_track='7-9', xp=20)
        run()
        self.assertGreater(Progress.objects.filter(lesson_id__startswith='demo-lb-').count(), 0)
        run('--clear')
        self.assertEqual(demo_users().count(), 0)
        self.assertEqual(Progress.objects.filter(lesson_id__startswith='demo-lb-').count(), 0)
        self.assertEqual(Progress.objects.filter(user=real).count(), 1)

    @override_settings(DEBUG=False)
    def test_refuses_outside_debug(self):
        with self.assertRaises(CommandError):
            run()
        self.assertEqual(demo_users().count(), 0)
