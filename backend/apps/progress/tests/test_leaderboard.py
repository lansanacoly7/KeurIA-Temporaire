from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.learners.models import LearnerProfile
from apps.progress.models import Progress
from apps.schools.models import School

URL = "/api/progress/leaderboard/weekly"


def make_learner(email, name, track="10-12", school=None, role="eleve"):
    user = User.objects.create_user(email=email, password="motdepasse123", role=role, display_name=name, school=school)
    LearnerProfile.objects.create(learner=user, owner_email=email, learner_email=email, age_track=track, nickname=name)
    return user


def earn(user, lesson_id, xp, days_ago=0):
    Progress.objects.create(
        user=user, owner_email=user.email, lesson_id=lesson_id, age_track="10-12", xp=xp, score=100,
        completed_at=timezone.now() - timedelta(days=days_ago),
    )


class LeaderboardAccessTests(APITestCase):
    def test_requires_authentication(self):
        self.assertEqual(self.client.get(URL).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_parents_and_teachers_do_not_get_the_student_leaderboard(self):
        for role in ("parent", "enseignant"):
            user = User.objects.create_user(email=f"{role}@example.com", password="motdepasse123", role=role)
            self.client.force_authenticate(user)

            self.assertEqual(self.client.get(URL).status_code, status.HTTP_403_FORBIDDEN, role)

    def test_unknown_period_is_rejected(self):
        self.client.force_authenticate(make_learner("a@example.com", "Awa Diop"))

        self.assertEqual(self.client.get(URL, {"period": "yearly"}).status_code, status.HTTP_400_BAD_REQUEST)

    def test_the_old_public_endpoint_is_gone(self):
        self.assertEqual(self.client.get("/api/leaderboard").status_code, status.HTTP_404_NOT_FOUND)


class GlobalLeaderboardTests(APITestCase):
    """Élèves sans école : classés par parcours d'âge, sans jamais mentionner d'école."""

    def setUp(self):
        self.me = make_learner("me@example.com", "Awa Diop")
        self.client.force_authenticate(self.me)

    def board(self, **params):
        return self.client.get(URL, params).data

    def test_only_learners_of_the_same_track_are_ranked(self):
        earn(self.me, "p1-1", 10)
        earn(make_learner("grand@example.com", "Moussa Fall"), "p1-1", 50)
        earn(make_learner("petit@example.com", "Fatou Sow", track="7-9"), "p1-1", 90)

        data = self.board()

        self.assertEqual(data["scope"], "global")
        self.assertEqual(data["track"], "10-12")
        self.assertEqual([e["xpEarned"] for e in data["leaderboard"]], [50, 10])
        self.assertEqual(self.board(track="7-9")["leaderboard"][0]["xpEarned"], 90)

    def test_learner_with_profile_track_overrides_user_age_group(self):
        """Un enfant avec age_track='10-12' dans son profil et age_group='7-9' sur son compte User
        n'apparaît QUE dans le classement 10-12, jamais dans le 7-9."""
        user = User.objects.create_user(
            email="conflict@example.com",
            password="motdepasse123",
            role="eleve",
            display_name="Conflit Test",
            age_group="7-9",
        )
        LearnerProfile.objects.create(
            learner=user,
            owner_email=user.email,
            learner_email=user.email,
            age_track="10-12",
            nickname="Conflit Test",
        )
        earn(user, "a1-1", 75)

        board_1012 = self.board(track="10-12")
        names_1012 = [e["displayName"] for e in board_1012["leaderboard"]]
        self.assertIn("Conflit T.", names_1012)

        board_79 = self.board(track="7-9")
        names_79 = [e["displayName"] for e in board_79["leaderboard"]]
        self.assertNotIn("Conflit T.", names_79)

    def test_school_students_never_appear_in_the_general_ranking(self):
        school = School.objects.create(name="École Privée", slug="ecole-privee", created_by_email="x@example.com")
        earn(make_learner("eleve@ecole.test", "Ismaila Ba", school=school), "p1-1", 500)
        earn(self.me, "p1-1", 10)

        data = self.board()

        self.assertEqual([e["displayName"] for e in data["leaderboard"]], ["Awa D."])

    def test_no_school_information_is_exposed(self):
        earn(self.me, "p1-1", 10)

        payload = str(self.board())

        self.assertNotIn("school", payload.lower().replace("scope", ""))
        self.assertNotIn("email", payload)

    def test_names_are_abbreviated_and_ids_are_not_exposed(self):
        earn(self.me, "p1-1", 10)

        entry = self.board()["leaderboard"][0]

        self.assertEqual(entry["displayName"], "Awa D.")
        self.assertEqual(entry["initials"], "AD")
        self.assertNotIn("id", entry)

    def test_a_blank_display_name_does_not_break_the_ranking(self):
        blank = make_learner("blank@example.com", "   ")
        earn(blank, "p1-1", 30)

        entry = self.board()["leaderboard"][0]

        self.assertEqual(entry["displayName"], "Explorateur")

    def test_learners_without_xp_are_not_ranked(self):
        make_learner("inactif@example.com", "Inactif Total")
        earn(self.me, "p1-1", 10)

        data = self.board()

        self.assertEqual(data["totalParticipants"], 1)
        self.assertEqual(len(data["leaderboard"]), 1)

    def test_my_position_and_distance_to_the_next_rank(self):
        earn(make_learner("leader@example.com", "Leader Un"), "p1-1", 50)
        earn(self.me, "p1-1", 30)

        data = self.board()

        me = next(e for e in data["leaderboard"] if e["isMe"])
        self.assertEqual(me["rank"], 2)
        self.assertEqual(data["currentUser"]["rank"], 2)
        self.assertEqual(data["currentUser"]["xpToNextRank"], 21)  # dépasser 50 XP demande 51

    def test_current_user_is_none_until_the_first_xp(self):
        earn(make_learner("leader@example.com", "Leader Un"), "p1-1", 50)

        self.assertIsNone(self.board()["currentUser"])

    def test_ties_share_the_same_rank(self):
        earn(make_learner("a@example.com", "Aïcha Sy"), "p1-1", 40)
        earn(make_learner("b@example.com", "Bakary Sy"), "p1-1", 40)
        earn(self.me, "p1-1", 10)

        self.assertEqual([e["rank"] for e in self.board()["leaderboard"]], [1, 1, 3])

    def test_period_window(self):
        earn(self.me, "p1-1", 90, days_ago=10)
        earn(self.me, "p1-2", 15, days_ago=1)

        self.assertEqual(self.board()["leaderboard"][0]["xpEarned"], 15)
        self.assertEqual(self.board(period="monthly")["leaderboard"][0]["xpEarned"], 105)
        self.assertEqual(self.board(period="all_time")["periodLabel"], "Depuis le début")

    def test_daily_challenge_xp_counts_for_the_ranking(self):
        earn(self.me, "dc:2026-09-29", 20)

        self.assertEqual(self.board()["leaderboard"][0]["xpEarned"], 20)


class SchoolStudentLeaderboardTests(APITestCase):
    """Un élève d'école n'est classé qu'avec les élèves de son établissement."""

    def setUp(self):
        self.school = School.objects.create(name="École A", slug="ecole-a", created_by_email="x@example.com")
        self.other_school = School.objects.create(name="École B", slug="ecole-b", created_by_email="x@example.com")
        self.me = make_learner("me@ecole-a.test", "Awa Diop", school=self.school)
        self.client.force_authenticate(self.me)

    def test_only_schoolmates_are_ranked(self):
        earn(self.me, "p1-1", 10)
        earn(make_learner("ami@ecole-a.test", "Modou Sy", school=self.school, track="7-9"), "p1-1", 30)
        earn(make_learner("autre@ecole-b.test", "Cheikh Kane", school=self.other_school), "p1-1", 999)
        earn(make_learner("libre@example.com", "Libre Enfant"), "p1-1", 999)

        data = self.client.get(URL).data

        self.assertEqual(data["scope"], "school")
        self.assertEqual(data["scopeLabel"], "Mon établissement")
        self.assertIsNone(data["track"])
        self.assertEqual([e["displayName"] for e in data["leaderboard"]], ["Modou S.", "Awa D."])  # tous parcours confondus
        self.assertNotIn("École", str(data).replace("Mon établissement", ""))

    def test_inactive_accounts_are_excluded(self):
        gone = make_learner("parti@ecole-a.test", "Parti Loin", school=self.school)
        earn(gone, "p1-1", 80)
        gone.is_active = False
        gone.save(update_fields=["is_active"])
        earn(self.me, "p1-1", 10)

        self.assertEqual([e["xpEarned"] for e in self.client.get(URL).data["leaderboard"]], [10])


class NearMeViewTests(APITestCase):
    """Vue « proche de moi » : les voisins de classement, avec leurs vrais rangs."""

    def setUp(self):
        self.users = [make_learner(f"u{i}@example.com", f"Eleve{i:02d}") for i in range(12)]
        for i, user in enumerate(self.users):
            earn(user, "p1-1", 100 - i)  # u0 = 1er ... u11 = 12e
        self.client.force_authenticate(self.users[8])  # 9e

    def test_near_shows_three_above_and_three_below_with_real_ranks(self):
        data = self.client.get(URL, {"view": "near"}).data

        self.assertEqual(data["view"], "near")
        self.assertEqual([e["rank"] for e in data["leaderboard"]], [6, 7, 8, 9, 10, 11, 12])
        self.assertEqual([e["isMe"] for e in data["leaderboard"]].count(True), 1)

    def test_general_is_the_default_and_starts_at_the_top(self):
        data = self.client.get(URL).data

        self.assertEqual(data["view"], "general")
        self.assertEqual(data["leaderboard"][0]["rank"], 1)

    def test_near_falls_back_to_general_when_i_have_no_xp(self):
        self.client.force_authenticate(make_learner("neuf@example.com", "Nouveau"))

        data = self.client.get(URL, {"view": "near"}).data

        self.assertEqual(data["view"], "general")
        self.assertFalse(data["nearAvailable"])

    def test_unknown_view_is_rejected(self):
        self.assertEqual(self.client.get(URL, {"view": "x"}).status_code, status.HTTP_400_BAD_REQUEST)


class PodiumAlwaysPresentTests(APITestCase):
    def setUp(self):
        self.users = [make_learner(f"p{i}@example.com", f"Eleve{i:02d}") for i in range(10)]
        for i, user in enumerate(self.users):
            earn(user, "p1-1", 100 - i)
        self.client.force_authenticate(self.users[8])

    def test_podium_is_returned_in_both_views(self):
        for view in ("general", "near"):
            data = self.client.get(URL, {"view": view}).data
            self.assertEqual([e["rank"] for e in data["podium"]], [1, 2, 3], view)
            self.assertEqual([e["position"] for e in data["podium"]], [1, 2, 3], view)

    def test_entries_carry_their_position_in_the_list(self):
        data = self.client.get(URL, {"view": "near"}).data

        self.assertEqual([e["position"] for e in data["leaderboard"]], [6, 7, 8, 9, 10])

    def test_podium_with_fewer_than_three_ranked(self):
        User.objects.all().delete()
        me = make_learner("seul@example.com", "Seul")
        earn(me, "p1-1", 5)
        self.client.force_authenticate(me)

        self.assertEqual(len(self.client.get(URL).data["podium"]), 1)


class ProfilePreviewFieldsTests(APITestCase):
    """Données de la fenêtre « aperçu » : avatar choisi, XP totale (depuis le début) et niveau."""

    def setUp(self):
        self.me = make_learner("me@example.com", "Awa Diop")
        self.rival = make_learner("rival@example.com", "Moussa Fall")
        LearnerProfile.objects.filter(learner=self.rival).update(avatar="explorateur-moussa")
        self.client.force_authenticate(self.me)
        earn(self.rival, "p1-1", 60)
        earn(self.rival, "p1-2", 100, days_ago=40)  # hors de la semaine : compte dans l'XP totale, pas dans la période
        earn(self.me, "p1-1", 10)

    def test_entries_carry_avatar_total_xp_and_level(self):
        data = self.client.get(URL).data

        rival = next(e for e in data["leaderboard"] if not e["isMe"])
        self.assertEqual(rival["avatar"], "explorateur-moussa")
        self.assertEqual(rival["xpEarned"], 60)
        self.assertEqual(rival["totalXp"], 160)
        self.assertEqual(rival["level"]["level"], 3)  # 160 XP : « Jeune aventurier » (palier à 150)
        self.assertEqual(rival["level"]["name"], "Jeune aventurier")
        self.assertEqual(rival["level"]["xpToNext"], 140)

    def test_podium_and_current_user_also_carry_them(self):
        data = self.client.get(URL).data

        self.assertEqual(data["podium"][0]["avatar"], "explorateur-moussa")
        self.assertEqual(data["currentUser"]["totalXp"], 10)
        self.assertEqual(data["currentUser"]["level"]["level"], 1)

    def test_nothing_private_is_added(self):
        payload = str(self.client.get(URL).data)

        self.assertNotIn("email", payload)
        self.assertNotIn("example.com", payload)
