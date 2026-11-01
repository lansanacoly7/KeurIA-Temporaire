"""Les propositions du défi et de l'énigme du jour sont mélangées par le serveur : la bonne réponse n'a plus de place fixe."""
from collections import Counter

import pytest
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.curriculum.models import DailyChallenge, Riddle

from ..shuffle import display_order, to_displayed, to_original
from ..xp import record_xp

pytestmark = pytest.mark.shuffle

OPTIONS = ["trois", "quatre", "cinq", "six"]
RIGHT = "quatre"


def make_user(n):
    return User.objects.create_user(email=f"eleve{n}@example.com", password="motdepasse123", role=User.ROLE_STUDENT)


class ShuffleHelperTests(APITestCase):
    def test_the_order_is_a_permutation_and_stable(self):
        order = display_order("graine", 4)
        self.assertEqual(sorted(order), [0, 1, 2, 3])
        self.assertEqual(order, display_order("graine", 4))

    def test_displayed_and_original_positions_are_inverse(self):
        order = display_order("autre", 5)
        for original in range(5):
            self.assertEqual(to_original(order, to_displayed(order, original)), original)

    def test_different_children_get_different_orders(self):
        self.assertGreater(len({tuple(display_order(f"enfant{n}", 4)) for n in range(40)}), 5)


class DailyChallengeShuffleTests(APITestCase):
    def setUp(self):
        DailyChallenge.objects.all().delete()
        # Le défi a TOUJOURS sa bonne réponse en deuxième position dans la banque : c'est le défaut signalé.
        self.challenge = DailyChallenge.objects.create(
            theme="T", question="2 + 2 ?", options=OPTIONS, correct_index=1, explanation="Bravo !")
        self.url = "/api/daily-challenge"

    def play(self, user):
        client = self.client_class()
        client.force_authenticate(user)
        return client

    def displayed_right_position(self, client):
        return client.get(self.url).data["challenge"]["options"].index(RIGHT)

    def test_the_right_answer_does_not_always_sit_in_the_same_place(self):
        positions = Counter(self.displayed_right_position(self.play(make_user(n))) for n in range(40))
        self.assertGreaterEqual(len(positions), 3, positions)
        self.assertLess(max(positions.values()), 28, positions)  # aucune place ne concentre presque tous les enfants

    def test_options_keep_the_same_order_after_a_reload(self):
        client = self.play(make_user(1))
        first = client.get(self.url).data["challenge"]["options"]
        self.assertEqual(first, client.get(self.url).data["challenge"]["options"])
        self.assertCountEqual(first, OPTIONS)

    def test_answering_with_the_displayed_position_is_correct(self):
        client = self.play(make_user(2))
        shown = client.get(self.url).data["challenge"]["options"]
        response = client.post(self.url, {"answer": shown.index(RIGHT)}, format="json")
        self.assertTrue(response.data["correct"])
        self.assertEqual(response.data["xpGained"], 20)

    def test_a_wrong_displayed_position_is_wrong_and_returned_in_displayed_coordinates(self):
        client = self.play(make_user(3))
        shown = client.get(self.url).data["challenge"]["options"]
        wrong_position = shown.index("six")
        response = client.post(self.url, {"answer": wrong_position}, format="json")
        self.assertFalse(response.data["correct"])
        self.assertEqual(response.data["wrong"], [wrong_position])
        # Après rechargement de la page, les mauvaises réponses sont retrouvées à la même position affichée.
        self.assertEqual(client.get(self.url).data["wrong"], [wrong_position])

    def test_the_correct_index_is_never_sent(self):
        data = self.play(make_user(4)).get(self.url).data
        self.assertNotIn("correct_index", data["challenge"])
        self.assertNotIn("correctIndex", data["challenge"])

    def test_out_of_range_answer_is_still_rejected(self):
        response = self.play(make_user(5)).post(self.url, {"answer": 4}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class RiddleShuffleTests(APITestCase):
    def setUp(self):
        Riddle.objects.all().delete()
        self.riddle = Riddle.objects.create(
            lesson_id="p1-1", question="Combien font 2 + 2 ?", options=OPTIONS, correct_index=1, explanation="Quatre.")
        self.url = "/api/daily-riddle"

    def play(self, n):
        user = make_user(n)
        record_xp(user, "p1-1", 20, age_track="7-9")
        client = self.client_class()
        client.force_authenticate(user)
        return client

    def test_the_right_answer_moves_between_children(self):
        positions = Counter(self.play(n).get(self.url).data["riddle"]["options"].index(RIGHT) for n in range(40))
        self.assertGreaterEqual(len(positions), 3, positions)

    def test_right_answer_by_displayed_position_wins_and_reveals_displayed_index(self):
        client = self.play(1)
        shown = client.get(self.url).data["riddle"]["options"]
        response = client.post(self.url, {"answer": shown.index(RIGHT)}, format="json")
        self.assertTrue(response.data["correct"])
        self.assertEqual(response.data["xpGained"], 10)
        self.assertEqual(response.data["correctIndex"], shown.index(RIGHT))
        self.assertEqual(response.data["answer"], shown.index(RIGHT))

    def test_wrong_answer_reveals_the_displayed_correct_position(self):
        client = self.play(2)
        shown = client.get(self.url).data["riddle"]["options"]
        wrong = shown.index("six")
        response = client.post(self.url, {"answer": wrong}, format="json")
        self.assertFalse(response.data["correct"])
        self.assertEqual(response.data["answer"], wrong)
        self.assertEqual(response.data["correctIndex"], shown.index(RIGHT))
        # Le retour d'état après rechargement reste cohérent.
        state = client.get(self.url).data
        self.assertEqual((state["answer"], state["correctIndex"]), (wrong, shown.index(RIGHT)))
