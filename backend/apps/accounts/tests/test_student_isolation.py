"""Étanchéité des rôles : un élève ne doit atteindre aucune route de gestion (école, enseignant, super admin, parent)."""
import re

from django.urls import get_resolver
from rest_framework.test import APITestCase

from apps.accounts.models import User

STAFF_PREFIXES = ("api/ecole/", "api/enseignant/", "api/superadmin/", "api/parent/")
METHODS = ("get", "post", "put", "patch", "delete")


def _staff_paths():
    def walk(resolver, prefix=""):
        for entry in resolver.url_patterns:
            if hasattr(entry, "url_patterns"):
                yield from walk(entry, prefix + str(entry.pattern))
            else:
                yield prefix + str(entry.pattern)

    for route in walk(get_resolver()):
        route = route.lstrip("^")
        if not route.startswith(STAFF_PREFIXES):
            continue
        route = re.sub(r"\(\?P<label>[^)]*\)\)?", "2024-2025", route).rstrip("$")
        route = re.sub(r"<int:[^>]+>", "1", route)
        route = re.sub(r"<str:[^>]+>", "x", route)
        yield "/" + route


class StudentIsolationTests(APITestCase):
    def test_student_is_refused_on_every_management_route(self):
        User.objects.create_user(email="eleve@example.com", password="motdepasse123", role=User.ROLE_STUDENT)
        self.assertTrue(self.client.login(email="eleve@example.com", password="motdepasse123"))
        paths = sorted(set(_staff_paths()))
        self.assertGreater(len(paths), 50)
        for path in paths:
            for method in METHODS:
                response = getattr(self.client, method)(path, {}, format="json")
                self.assertEqual(response.status_code, 403, f"{method.upper()} {path} -> {response.status_code}")
