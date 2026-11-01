"""Contrat entre l'espace parent du frontend et l'API : chaque champ lu par l'interface doit exister, du bon type.

Si un de ces tests casse, l'écran parent affichera une valeur vide ou fausse : corriger l'API ou le frontend
(frontend/app/dashboard/Parent*.tsx, components/ParentNotificationCenter.tsx), jamais le test seul.
"""
from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.progress.models import DailyUsage, ParentNotification

PASSWORD = "motdepasse123"


class ParentDashboardContractTests(APITestCase):
    def setUp(self):
        self.parent = User.objects.create_user(email="parent@example.com", password=PASSWORD, role=User.ROLE_PARENT, display_name="Aïssatou Ba")
        self.child = User.objects.create_user(email="awa@keuria.sn", password=PASSWORD, role=User.ROLE_STUDENT,
                                              parent=self.parent, display_name="Awa", age_group="7-9")
        today = timezone.localdate()
        DailyUsage.objects.create(user=self.child, owner_email=self.child.email, usage_date=today, age_track="7-9",
                                  minutes=40, presence_minutes=15, lessons=1, quizzes=1, games=1)
        DailyUsage.objects.create(user=self.child, owner_email=self.child.email, usage_date=today - timedelta(days=3),
                                  age_track="7-9", minutes=20, presence_minutes=20)
        self.client.post("/api/auth/login", {"email": "parent@example.com", "password": PASSWORD}, format="json")

    def _tracked(self):
        response = self.client.get("/api/progress/tracking")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response.data["tracking"][0]

    def test_tracking_has_every_field_the_children_view_reads(self):
        child = self._tracked()
        for key in ("id", "displayName", "email", "xp", "level", "completedLessons", "lastLesson", "earnedBadges",
                    "comprehensionRate", "todayUsage", "timeSpent", "totalLessons", "streak", "pedagogy"):
            self.assertIn(key, child, key)
        for key in ("level", "xpInLevel", "xpPerLevel"):
            self.assertIn(key, child["level"], key)
        for key in ("minutes", "lessons", "quizzes", "games"):
            self.assertIsInstance(child["todayUsage"][key], int, key)
        for key in ("windowDays", "activeDays", "sessionsPerWeek", "avgMinutesPerActiveDay", "lastActivityAt", "quizAttempts", "modules"):
            self.assertIn(key, child["pedagogy"], key)

    def test_time_spent_shape_and_real_presence(self):
        spent = self._tracked()["timeSpent"]
        for key in ("totalMinutes", "todayMinutes", "weekMinutes", "days", "weeks", "since"):
            self.assertIn(key, spent, key)
        self.assertEqual(spent["todayMinutes"], 15)       # présence réelle, pas les 40 min avec forfaits
        self.assertEqual(spent["totalMinutes"], 35)
        self.assertEqual(len(spent["days"]), 7)
        self.assertEqual(len(spent["weeks"]), 4)
        self.assertTrue(all({"date", "minutes"} <= set(d) for d in spent["days"]))
        self.assertTrue(all({"start", "minutes"} <= set(w) for w in spent["weeks"]))
        # Moyenne par jour actif : calculée sur la présence réelle (15 et 20 min), pas sur les forfaits.
        self.assertEqual(self._tracked()["pedagogy"]["avgMinutesPerActiveDay"], round((15 + 20) / 2))

    def test_settings_payload(self):
        data = self.client.get("/api/progress/parental-limits").data
        self.assertTrue(data["ok"])
        for key in ("strictTimeLimit", "dailyLimitMinutes", "bedtimeEnabled", "bedtimeStart", "bedtimeEnd",
                    "emailNotifs", "pushNotifs", "weeklyReport", "twoFactor", "palouEnabled"):
            self.assertIn(key, data["limits"], key)
        # Contrat minimal : ces champs existent avec ces valeurs ; le serveur peut en ajouter d'autres (schoolId, isPendingDeletion…) sans casser l'écran.
        self.assertEqual(len(data["children"]), 1)
        self.assertEqual({k: data["children"][0].get(k) for k in ("id", "displayName", "todayMinutes")}, {"id": self.child.id, "displayName": "Awa", "todayMinutes": 40})
        per_child = self.client.get(f"/api/progress/parental-limits?childId={self.child.id}")
        self.assertEqual(per_child.status_code, status.HTTP_200_OK)

    def test_profile_payload_for_the_settings_screen(self):
        profile = self.client.get("/api/profile").data["profile"]
        self.assertEqual(profile["displayName"], "Aïssatou Ba")
        self.assertEqual(profile["email"], "parent@example.com")
        self.assertEqual(profile["role"], "parent")

    def test_notifications_payload(self):
        ParentNotification.objects.create(parent=self.parent, child=self.child, notif_type="badge", payload={"badgeLabel": "En route"})
        data = self.client.get("/api/progress/notifications").data
        self.assertEqual(data["unreadCount"], 1)
        self.assertEqual(len(data["notifications"]), 1)
        self.assertEqual(self.client.patch("/api/progress/notifications").status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.get("/api/progress/notifications").data["unreadCount"], 0)

    def test_child_creation_and_password_reset_responses(self):
        created = self.client.post("/api/parent/children", {"displayName": "Ibou Fall", "password": "kids2026ok", "age": 11}, format="json")
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertEqual(created.data["child"]["ageGroup"], "10-12")
        self.assertIn("email", created.data["child"])          # identifiant affiché au parent à la création
        reset = self.client.post(f"/api/parent/children/{self.child.id}/reset-password", {"password": "NouveauMdp2026"}, format="json")
        self.assertEqual(reset.status_code, status.HTTP_200_OK)
        self.assertTrue(reset.data["ok"])
        # Une erreur renvoie toujours un message lisible dans `error` (c'est ce que le frontend affiche).
        weak = self.client.post(f"/api/parent/children/{self.child.id}/reset-password", {"password": "123"}, format="json")
        self.assertEqual(weak.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(weak.data["error"])

    def test_another_parent_cannot_touch_my_child(self):
        other = User.objects.create_user(email="autre@example.com", password=PASSWORD, role=User.ROLE_PARENT)
        self.client.logout()
        self.client.post("/api/auth/login", {"email": other.email, "password": PASSWORD}, format="json")
        self.assertEqual(self.client.get("/api/progress/tracking").data["tracking"], [])
        self.assertEqual(self.client.post(f"/api/parent/children/{self.child.id}/reset-password", {"password": "NouveauMdp2026"}, format="json").status_code, 404)
        self.assertEqual(self.client.get(f"/api/progress/parental-limits?childId={self.child.id}").data["limits"]["dailyLimitMinutes"], 45)
        self.assertNotIn(self.child.id, [c["id"] for c in self.client.get("/api/progress/parental-limits").data["children"]])
