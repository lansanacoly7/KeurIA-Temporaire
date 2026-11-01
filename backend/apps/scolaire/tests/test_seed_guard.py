from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings


class SeedDemoSchoolGuardTests(TestCase):
    @override_settings(DEBUG=False)
    def test_refuses_to_run_outside_debug(self):
        with self.assertRaises(CommandError) as ctx:
            call_command('seed_demo_school')

        self.assertIn('DEBUG=True', str(ctx.exception))
