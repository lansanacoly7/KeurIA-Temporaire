import re
from pathlib import Path
from unittest import skipUnless

from django.conf import settings
from django.test import SimpleTestCase, TestCase, override_settings
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.curriculum.models import Activity, DailyChallenge
from apps.progress.levels import LEVEL_TIERS, TOP_TIER_SPAN, level_info
from apps.progress.models import EarnedReward, ParentNotification, Progress
from apps.progress.tests.helpers import make_lesson
from apps.progress.xp import activity_xp, total_xp

URL = "/api/progress"


class LevelTierTests(SimpleTestCase):
    def test_a_tier_is_reached_exactly_at_its_threshold(self):
        expectations = {
            0: (1, "Petit curieux"), 49: (1, "Petit curieux"),
            50: (2, "Explorateur débutant"), 149: (2, "Explorateur débutant"),
            150: (3, "Jeune aventurier"), 299: (3, "Jeune aventurier"),
            300: (4, "Maître de l'IA"), 5000: (4, "Maître de l'IA"),
        }
        for xp, (level, name) in expectations.items():
            info = level_info(xp)
            self.assertEqual((info["level"], info["name"]), (level, name), f"{xp} XP")

    def test_distance_to_the_next_tier_is_the_gap_to_its_start(self):
        info = level_info(60)

        self.assertEqual(info["nextName"], "Jeune aventurier")
        self.assertEqual(info["nextXp"], 150)
        self.assertEqual(info["xpToNext"], 90)  # 150 - 60 : le seuil du palier, pas la fin du suivant
        self.assertEqual((info["xpInLevel"], info["xpPerLevel"]), (10, 100))

    def test_top_tier_has_no_next_and_a_full_bar(self):
        info = level_info(300 + TOP_TIER_SPAN + 40)

        self.assertTrue(info["isMax"])
        self.assertIsNone(info["nextXp"])
        self.assertEqual(info["xpToNext"], 0)
        self.assertEqual(info["xpInLevel"], info["xpPerLevel"])

    def test_negative_xp_is_treated_as_zero(self):
        self.assertEqual(level_info(-10)["level"], 1)


class ActivityCatalogTests(APITestCase):
    def test_catalog_is_seeded_with_every_xp_activity(self):
        counts = {kind: Activity.objects.filter(kind=kind).count() for kind, _ in Activity.KIND_CHOICES}

        self.assertEqual(counts, {"game_level": 10, "arcade_game": 20, "arcade_quiz": 10, "bonus": 1})

    def test_lesson_xp_takes_precedence_and_unknown_ids_have_none(self):
        make_lesson("p1-1", xp=25)

        self.assertEqual(activity_xp("p1-1"), 25)
        self.assertEqual(activity_xp("arcade-game-01"), 30)
        self.assertEqual(activity_xp("bonus-easter-egg"), 10)
        self.assertIsNone(activity_xp("n-importe-quoi"))

    def test_inactive_activities_give_no_xp(self):
        Activity.objects.filter(activity_id="arcade-game-01").update(is_active=False)

        self.assertIsNone(activity_xp("arcade-game-01"))


class LevelUpTests(APITestCase):
    def setUp(self):
        self.parent = User.objects.create_user(email="parent@example.com", password="motdepasse123", role="parent")
        self.child = User.objects.create_user(
            email="enfant@example.com", password="motdepasse123", role="eleve", display_name="Awa Diop", parent=self.parent,
        )
        self.client.force_authenticate(self.child)

    def post(self, activity_id):
        return self.client.post(URL, {"lessonId": activity_id, "age": "7-9"}, format="json")

    def test_no_level_up_below_the_threshold(self):
        self.post("arcade-quiz-01")            # 20 XP
        response = self.post("arcade-quiz-02")  # +25 = 45 XP

        self.assertEqual(response.data["progress"]["xp"], 45)
        self.assertIsNone(response.data["progress"]["levelUp"])
        self.assertEqual(response.data["progress"]["level"]["level"], 1)

    def test_level_up_is_reported_exactly_when_the_threshold_is_reached(self):
        self.post("arcade-quiz-01")            # 20 XP
        response = self.post("jeux7-9-01")     # +30 = 50 XP pile

        self.assertEqual(response.data["progress"]["xp"], 50)
        self.assertEqual(response.data["progress"]["levelUp"]["name"], "Explorateur débutant")

    def test_level_up_is_reported_only_once(self):
        self.post("arcade-quiz-01")
        self.post("jeux7-9-01")

        response = self.post("arcade-quiz-03")  # +30 = 80 XP, toujours palier 2

        self.assertIsNone(response.data["progress"]["levelUp"])

    def test_replaying_cannot_trigger_a_level_up(self):
        self.post("arcade-quiz-01")
        self.post("jeux7-9-01")

        again = self.post("jeux7-9-01")

        self.assertIsNone(again.data["progress"]["levelUp"])
        self.assertEqual(again.data["progress"]["xp"], 50)

    def test_parent_is_notified_of_the_new_tier_by_name(self):
        self.post("arcade-quiz-01")
        self.post("jeux7-9-01")

        notification = ParentNotification.objects.get(parent=self.parent, notif_type="level_up")

        self.assertEqual(notification.payload["levelName"], "Explorateur débutant")
        self.assertIn("Explorateur débutant", notification.payload["title"])

    def test_total_xp_is_always_the_sum_of_recorded_activities(self):
        for activity in ("arcade-quiz-01", "jeux7-9-01", "bonus-easter-egg"):
            self.post(activity)

        self.assertEqual(total_xp(self.child), 20 + 30 + 10)
        self.assertEqual(self.client.get(URL).data["progress"]["xp"], 60)

    @override_settings(SHUFFLE_ANSWER_OPTIONS=False)   # sinon la bonne réponse change de place selon la date du jour
    def test_daily_challenge_goes_through_the_same_pipeline(self):
        DailyChallenge.objects.all().delete()
        DailyChallenge.objects.create(theme="T", question="Q", options=["a", "b"], correct_index=0, explanation="e")
        Progress.objects.create(user=self.child, owner_email=self.child.email, lesson_id="arcade-game-01", age_track="7-9", xp=40)

        response = self.client.post("/api/daily-challenge", {"answer": 0}, format="json")  # +20 XP : 40 -> 60

        self.assertEqual(response.data["xpGained"], 20)
        self.assertEqual(response.data["progress"]["xp"], 60)
        self.assertEqual(response.data["progress"]["levelUp"]["name"], "Explorateur débutant")
        self.assertTrue(ParentNotification.objects.filter(parent=self.parent, notif_type="level_up").exists())

class LevelAnimationsAreNotConsumedByAParentTests(APITestCase):
    def setUp(self):
        self.parent = User.objects.create_user(email="parent@example.com", password="motdepasse123", role="parent")
        self.child = User.objects.create_user(email="enfant@example.com", password="motdepasse123", role="eleve", parent=self.parent)
        Progress.objects.create(user=self.child, owner_email=self.child.email, lesson_id="arcade-game-01", age_track="7-9", xp=200, score=100)

    def test_a_child_reading_own_progress_marks_reached_tiers_as_seen_but_never_the_starting_tier(self):
        self.client.force_authenticate(self.child)

        seen = self.client.get(URL).data["progress"]["seenEvents"]

        self.assertIn("level_anim_Explorateur débutant", seen)
        self.assertIn("level_anim_Jeune aventurier", seen)
        self.assertNotIn("level_anim_Petit curieux", seen)  # le palier de départ n'a pas d'animation
        self.assertNotIn("level_anim_Maître de l'IA", seen)  # pas encore atteint

    def test_a_parent_viewing_the_child_does_not_consume_the_childs_celebrations(self):
        self.client.force_authenticate(self.parent)

        self.client.get(URL, {"child_id": self.child.id})

        self.assertFalse(EarnedReward.objects.filter(user=self.child).exclude(reward_type=EarnedReward.REWARD_BADGE).exists())
        self.assertFalse(EarnedReward.objects.filter(user=self.child, seen_at__isnull=False).exists())

    def test_progress_payload_exposes_the_canonical_level(self):
        self.client.force_authenticate(self.child)

        level = self.client.get(URL).data["progress"]["level"]

        self.assertEqual(level["name"], "Jeune aventurier")
        self.assertEqual(level["nextName"], "Maître de l'IA")
        self.assertEqual(level["xpToNext"], 100)

    def test_parent_tracking_uses_the_same_level_definition(self):
        self.client.force_authenticate(self.parent)

        child = self.client.get("/api/progress/tracking").data["tracking"][0]

        self.assertEqual(child["level"]["name"], "Jeune aventurier")
        self.assertEqual(child["level"]["level"], level_info(child["xp"])["level"])


# ─── Garde anti-dérive : le frontend affiche les mêmes valeurs que le serveur ─────────────────

FRONTEND_APP = Path(settings.BASE_DIR).parent / "frontend" / "app"


@skipUnless(FRONTEND_APP.exists(), "frontend absent (backend déployé seul)")
class FrontendStaysInSyncWithTheServerTests(TestCase):
    def read(self, relative):
        return (FRONTEND_APP / relative).read_text(encoding="utf-8")

    def test_level_tiers_are_identical(self):
        source = self.read("level-tiers.ts")
        frontend = re.findall(r'\{ level: (\d+), name: "([^"]+)", image: "[^"]+", min: (\d+), max: (\d+) \}', source)

        self.assertEqual(len(frontend), len(LEVEL_TIERS))
        for (level, name, minimum, _maximum), tier in zip(frontend, LEVEL_TIERS, strict=False):
            self.assertEqual((int(level), name, int(minimum)), (tier["level"], tier["name"], tier["minXp"]))
        for (_, _, _, maximum), following in zip(frontend[:-1], LEVEL_TIERS[1:], strict=False):
            self.assertEqual(int(maximum), following["minXp"], "la fin d'un palier est le début du suivant")

    def test_game_map_xp_matches_the_catalog(self):
        source = self.read("dashboard/games-map-data.ts")
        levels = re.findall(r"id: levelId\((\d+)\).*?xp: (\d+)", source, re.DOTALL)  # le fichier peut être mis en forme sur plusieurs lignes

        self.assertEqual(len(levels), 10)
        for number, xp in levels:
            self.assertEqual(activity_xp(f"jeux7-9-{int(number):02d}"), int(xp), f"niveau {number}")

    def test_arcade_games_xp_matches_the_catalog(self):
        source = self.read("dashboard/DashboardActivities.tsx")
        block = source.split("const realGames = [", 1)[1].split("] as const;", 1)[0]
        games = re.findall(r'\["[^"]*", "([^"]+)", "[^"]+", (\d+), "[^"]+", \d+\]', block)

        self.assertEqual(len(games), 20)
        for index, (title, xp) in enumerate(games, start=1):
            activity = Activity.objects.get(activity_id=f"arcade-game-{index:02d}")
            self.assertEqual((activity.title, activity.xp), (title, int(xp)), f"jeu {index}")

    def test_badges_are_the_same_on_both_sides(self):
        from apps.progress.views import BADGES_DEFINITIONS

        source = self.read("lms-data.ts")
        frontend_ids = re.findall(r'\{ id: "(b_\w+)", icon: "[^"]+", name: "([^"]+)"', source)
        server = {b["id"]: b for b in BADGES_DEFINITIONS}

        self.assertEqual({i for i, _ in frontend_ids}, set(server), "mêmes badges côté serveur et côté navigateur")
        for badge_id, name in frontend_ids:
            self.assertEqual(server[badge_id]["label"], name, badge_id)

        # Seuils : « if (completedCount >= N) » / « if (xp >= N) » dans computeEarnedBadges.
        for kind, threshold, badge_id in re.findall(r'if \((completedCount|xp) >= (\d+)\) earned\.push\("(b_\w+)"\)', source):
            expected_type = "lessons" if kind == "completedCount" else "xp"
            self.assertEqual((server[badge_id]["type"], server[badge_id]["threshold"]), (expected_type, int(threshold)), badge_id)

    def test_arcade_quiz_xp_matches_the_catalog(self):
        source = self.read("dashboard/dashboardShared.tsx")
        block = source.split("const gameChallenges = [", 1)[1].split("\n];", 1)[0]
        quiz_xp = re.findall(r"xp: (\d+), question:", block)

        self.assertEqual(len(quiz_xp), 10)
        for index, xp in enumerate(quiz_xp, start=1):
            self.assertEqual(activity_xp(f"arcade-quiz-{index:02d}"), int(xp), f"quiz {index}")
