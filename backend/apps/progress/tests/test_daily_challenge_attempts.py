"""Le défi du jour n'est pas rejouable jusqu'à la bonne réponse : deux mauvaises réponses par jour."""
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.curriculum.models import DailyChallenge


# Le mélange d'affichage (seed = enfant + jour) ferait réussir ces tests selon la date du jour : on le coupe ici, il est testé à part.
@override_settings(SHUFFLE_ANSWER_OPTIONS=False)
class DailyChallengeAttemptsTests(APITestCase):
    url = "/api/daily-challenge"

    def setUp(self):
        DailyChallenge.objects.all().delete()
        DailyChallenge.objects.create(theme="Test", question="2 + 2 ?", options=["3", "4", "5", "6"], correct_index=1,
                                      explanation="Bravo !")
        self.client.force_authenticate(User.objects.create_user(email="eleve@example.com", password="motdepasse123",
                                                                role=User.ROLE_STUDENT))

    def answer(self, index):
        return self.client.post(self.url, {"answer": index}, format="json")

    def test_first_wrong_answer_leaves_one_attempt(self):
        response = self.answer(0)

        self.assertFalse(response.data["correct"])
        self.assertEqual(response.data["attemptsLeft"], 1)

    def test_after_two_wrong_answers_the_challenge_is_closed_for_the_day(self):
        self.answer(0)
        self.answer(2)

        response = self.answer(3)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(response.data["locked"])

    def test_even_the_right_answer_no_longer_counts_once_locked(self):
        self.answer(0)
        self.answer(2)

        response = self.answer(1)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(self.client.get(self.url).data["completed"])
        self.assertEqual(self.client.get("/api/progress").data["progress"]["xp"], 0)

    def test_right_answer_after_one_mistake_still_wins(self):
        self.answer(0)

        response = self.answer(1)

        self.assertTrue(response.data["correct"])
        self.assertEqual(response.data["xpGained"], 20)

    def test_the_same_wrong_answer_twice_costs_one_attempt(self):
        self.answer(0)
        response = self.answer(0)

        self.assertEqual(response.data["attemptsLeft"], 1)

    def test_state_survives_a_page_reload(self):
        self.answer(0)

        state = self.client.get(self.url).data

        self.assertEqual(state["wrong"], [0])
        self.assertEqual(state["attemptsLeft"], 1)

    def test_attempts_are_per_child(self):
        self.answer(0)
        self.answer(2)
        self.client.force_authenticate(User.objects.create_user(email="autre@example.com", password="motdepasse123",
                                                                role=User.ROLE_STUDENT))

        self.assertEqual(self.answer(1).data["xpGained"], 20)
