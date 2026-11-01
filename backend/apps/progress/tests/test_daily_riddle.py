"""L'énigme du jour (parcours 7-9) : seulement sur les leçons terminées, un seul essai, +10 XP, retour chaque jour."""
import json
from collections import Counter
from datetime import date, timedelta
from pathlib import Path
from unittest.mock import patch

from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.curriculum.models import Riddle
from apps.curriculum.riddle_data import build

from ..models import RiddleDay
from ..xp import record_xp, total_xp

URL = "/api/daily-riddle"
CONTENT = Path(__file__).resolve().parents[4] / "frontend" / "content" / "parcours79"


def make_riddle(lesson_id, question="Combien font 2 + 2 ?", correct=1):
    return Riddle.objects.create(
        lesson_id=lesson_id, question=question, options=["3", "4", "5"], correct_index=correct,
        explanation="Deux plus deux font quatre.",
    )


# Ces tests répondent « 0 » ou « 1 » en supposant l'ordre d'origine des propositions : le mélange d'affichage (seed = enfant + jour) les ferait
# réussir ou échouer selon la date du jour. Le mélange lui-même est testé à part (voir test_shuffle).
@override_settings(SHUFFLE_ANSWER_OPTIONS=False)
class DailyRiddleTests(APITestCase):
    def setUp(self):
        Riddle.objects.all().delete()
        self.user = User.objects.create_user(email="eleve@example.com", password="motdepasse123", role=User.ROLE_STUDENT)
        self.client.force_authenticate(self.user)

    def finish(self, lesson_id):
        record_xp(self.user, lesson_id, 20, age_track="7-9")

    def answer(self, index):
        return self.client.post(URL, {"answer": index}, format="json")

    def on_day(self, day):
        return patch("django.utils.timezone.localdate", return_value=day)

    # ───── ce qui peut être demandé ─────

    def test_no_riddle_before_any_lesson_is_finished(self):
        make_riddle("p1-1")
        self.assertIsNone(self.client.get(URL).data["riddle"])

    def test_never_a_riddle_on_a_lesson_the_child_has_not_finished(self):
        make_riddle("p1-1", "Question de la leçon 1")
        make_riddle("p2-1", "Question de la leçon 5 jamais vue")
        make_riddle("p9-3", "Question d'une leçon lointaine")
        self.finish("p1-1")
        for offset in range(12):
            with self.on_day(date(2026, 10, 3) + timedelta(days=offset)):
                data = self.client.get(URL).data
            self.assertEqual(data["riddle"]["question"], "Question de la leçon 1")

    def test_the_pool_grows_with_progress(self):
        make_riddle("p1-1", "Leçon 1")
        make_riddle("p1-2", "Leçon 2")
        self.finish("p1-1")
        with self.on_day(date(2026, 10, 3)):
            self.assertEqual(self.client.get(URL).data["riddle"]["question"], "Leçon 1")
            self.answer(1)
        self.finish("p1-2")
        with self.on_day(date(2026, 10, 4)):
            self.assertEqual(self.client.get(URL).data["riddle"]["question"], "Leçon 2")

    def test_riddle_xp_does_not_count_as_a_finished_lesson(self):
        make_riddle("p1-1")
        self.finish("p1-1")
        self.client.get(URL)
        self.answer(1)
        progress = self.client.get("/api/progress").data["progress"]
        self.assertEqual(progress["completedLessons"], ["p1-1"])
        self.assertEqual(progress["xp"], 30)

    # ───── un seul choix par jour ─────

    def test_same_riddle_all_day_and_after_a_reload(self):
        for n in range(5):
            make_riddle("p1-1", f"Question {n}")
        self.finish("p1-1")
        first = self.client.get(URL).data["riddle"]["id"]
        for _ in range(4):
            self.assertEqual(self.client.get(URL).data["riddle"]["id"], first)

    def test_the_answer_is_not_sent_before_the_child_answers(self):
        make_riddle("p1-1")
        self.finish("p1-1")
        data = self.client.get(URL).data
        self.assertFalse(data["answered"])
        for hidden in ("correctIndex", "explanation", "correct", "answer"):
            self.assertNotIn(hidden, data)
        self.assertNotIn("correct_index", data["riddle"])

    # ───── réponses ─────

    def test_right_answer_gives_ten_xp_once_and_the_explanation(self):
        make_riddle("p1-1")
        self.finish("p1-1")
        before = total_xp(self.user)
        self.client.get(URL)
        response = self.answer(1)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["correct"])
        self.assertEqual(response.data["xpGained"], 10)
        self.assertEqual(response.data["correctIndex"], 1)
        self.assertIn("quatre", response.data["explanation"])
        self.assertEqual(total_xp(self.user), before + 10)
        again = self.answer(1)
        self.assertEqual(again.data["xpGained"], 0)
        self.assertEqual(total_xp(self.user), before + 10)

    def test_wrong_answer_gives_no_xp_but_still_explains(self):
        make_riddle("p1-1")
        self.finish("p1-1")
        before = total_xp(self.user)
        self.client.get(URL)
        response = self.answer(0)
        self.assertFalse(response.data["correct"])
        self.assertEqual(response.data["xpGained"], 0)
        self.assertEqual(response.data["correctIndex"], 1)
        self.assertIn("quatre", response.data["explanation"])
        self.assertEqual(total_xp(self.user), before)

    def test_only_one_try_a_second_answer_changes_nothing(self):
        make_riddle("p1-1")
        self.finish("p1-1")
        before = total_xp(self.user)
        self.client.get(URL)
        self.answer(0)
        second = self.answer(1)  # la bonne réponse, mais trop tard
        self.assertFalse(second.data["correct"])
        self.assertEqual(second.data["xpGained"], 0)
        self.assertEqual(total_xp(self.user), before)
        state = self.client.get(URL).data
        self.assertTrue(state["answered"])
        self.assertFalse(state["correct"])

    def test_invalid_choice_is_refused_and_does_not_use_the_try(self):
        make_riddle("p1-1")
        self.finish("p1-1")
        self.assertEqual(self.answer(7).status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(self.client.get(URL).data["answered"])

    def test_answering_without_any_finished_lesson_is_refused(self):
        make_riddle("p1-1")
        self.assertEqual(self.answer(1).status_code, status.HTTP_404_NOT_FOUND)

    # ───── chaque jour ─────

    def test_a_new_riddle_comes_back_the_next_day_and_new_ones_come_first(self):
        for n in range(4):
            make_riddle("p1-1", f"Question {n}")
        self.finish("p1-1")
        seen = []
        for offset in range(4):
            with self.on_day(date(2026, 10, 3) + timedelta(days=offset)):
                data = self.client.get(URL).data
                self.assertFalse(data["answered"])
                seen.append(data["riddle"]["id"])
                self.answer(1)
        self.assertEqual(len(set(seen)), 4, "pas de répétition tant qu'il reste des énigmes nouvelles")

    def test_when_everything_was_seen_the_oldest_comes_back(self):
        make_riddle("p1-1", "Seule question")
        self.finish("p1-1")
        for offset in range(3):
            with self.on_day(date(2026, 10, 3) + timedelta(days=offset)):
                self.assertEqual(self.client.get(URL).data["riddle"]["question"], "Seule question")
                self.answer(1)

    def test_each_child_has_their_own_riddle_day(self):
        make_riddle("p1-1")
        self.finish("p1-1")
        self.client.get(URL)
        self.answer(1)
        other = User.objects.create_user(email="autre@example.com", password="motdepasse123", role=User.ROLE_STUDENT)
        record_xp(other, "p1-1", 20, age_track="7-9")
        self.client.force_authenticate(other)
        self.assertFalse(self.client.get(URL).data["answered"])
        self.assertEqual(RiddleDay.objects.count(), 2)

    def test_requires_a_signed_in_user(self):
        self.client.force_authenticate(None)
        self.assertIn(self.client.get(URL).status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))


class RiddleContentTests(APITestCase):
    """Le contenu livré : chaque énigme est rattachée à une vraie leçon, bien formée, et chaque leçon en a deux."""

    def test_every_lesson_has_two_well_formed_riddles(self):
        lessons = []
        for path in sorted(CONTENT.glob("m*.json")):
            if path.stem[1:].isdigit():
                lessons += [lesson["id"] for lesson in json.loads(path.read_text(encoding="utf-8"))["lessons"]]
        riddles = build()
        per_lesson = Counter(r["lesson_id"] for r in riddles)
        self.assertEqual(set(per_lesson), set(lessons), "chaque leçon a ses énigmes, et aucune énigme ne vise une leçon inconnue")
        self.assertTrue(all(count == 2 for count in per_lesson.values()), per_lesson)
        for r in riddles:
            self.assertEqual(len(r["options"]), 3, r["question"])
            self.assertEqual(len(set(r["options"])), 3, f"réponses en double : {r['question']}")
            self.assertIn(r["correct_index"], (0, 1, 2))
            self.assertTrue(r["explanation"].strip(), r["question"])
        self.assertEqual(len({r["question"] for r in riddles}), len(riddles), "deux énigmes ont la même question")

    def test_the_right_answer_moves_around(self):
        positions = Counter(r["correct_index"] for r in build())
        self.assertEqual(set(positions), {0, 1, 2})
        self.assertLessEqual(max(positions.values()) - min(positions.values()), 1)

    def test_the_database_holds_them_after_migration(self):
        self.assertEqual(Riddle.objects.count(), len(build()))
