from unittest import mock

from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User


class PalouDailyCapTests(APITestCase):
    """Un enfant ne peut pas envoyer un nombre illimité de messages par jour : coût du service et temps passé."""

    def setUp(self):
        self.user = User.objects.create_user(email="eleve@example.com", password="motdepasse123", role=User.ROLE_STUDENT)
        self.client.force_authenticate(self.user)
        self.url = "/api/palou/chat"

    def send(self):
        with mock.patch("apps.progress.palou.ask_palou", return_value="Bonjour !"):
            return self.client.post(self.url, {"message": "Salut"}, format="json")

    @override_settings(PALOU_DAILY_MESSAGES=3)
    def test_the_fourth_message_of_the_day_is_refused(self):
        statuses = [self.send().status_code for _ in range(4)]
        self.assertEqual(statuses, [200, 200, 200, status.HTTP_429_TOO_MANY_REQUESTS])
        self.assertTrue(self.send().data["dailyLimit"])

    @override_settings(PALOU_DAILY_MESSAGES=0)
    def test_zero_means_no_cap(self):
        self.assertTrue(all(self.send().status_code == 200 for _ in range(5)))

    @override_settings(PALOU_DAILY_MESSAGES=1)
    def test_each_child_has_their_own_counter(self):
        self.assertEqual(self.send().status_code, 200)
        other = User.objects.create_user(email="autre@example.com", password="motdepasse123", role=User.ROLE_STUDENT)
        self.client.force_authenticate(other)
        self.assertEqual(self.send().status_code, 200)
