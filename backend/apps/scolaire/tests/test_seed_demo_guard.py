from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings

from apps.schools.models import School


class SeedDemoSchoolGuardTests(TestCase):
    @override_settings(DEBUG=False)
    def test_refuses_to_run_in_production(self):
        with self.assertRaisesMessage(CommandError, "Refusé"):
            call_command("seed_demo_school")

        self.assertFalse(School.objects.filter(slug="les-baobabs").exists())

    @override_settings(DEBUG=False)
    def test_reset_is_also_refused_in_production(self):
        with self.assertRaisesMessage(CommandError, "Refusé"):
            call_command("seed_demo_school", reset=True)

    @override_settings(DEBUG=True)
    def test_runs_in_debug(self):
        call_command("seed_demo_school", verbosity=0)

        self.assertTrue(School.objects.filter(slug="les-baobabs").exists())
