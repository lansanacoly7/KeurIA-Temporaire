from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.curriculum.data.glossary_unlock import GENERAL_UNLOCKS, LESSON_TERMS_79
from apps.curriculum.models import AgeTrack, GlossaryTerm, Lesson, Module
from apps.learners.models import LearnerProfile
from apps.progress.models import Progress

URL = "/api/curriculum/glossary/"


class GlossaryUnlockTests(APITestCase):
    """Le dictionnaire de l'élève se remplit leçon après leçon : il ne contient que ce qu'il a appris."""

    def setUp(self):
        GlossaryTerm.objects.all().delete()
        track = AgeTrack.objects.create(key="7-9", label="7-9 ans", name="Petits Explorateurs")
        module = Module.objects.create(track=track, world_id="p1", title="Bonjour, l'IA", description="d", order=1)
        for i in (1, 2, 3):
            Lesson.objects.create(module=module, lesson_id=f"p1-{i}", title=f"Leçon {i}", order=i)
        GlossaryTerm.objects.create(word="IA", definition="d1", unlock_lessons=["p1-1"])
        GlossaryTerm.objects.create(word="Exemple", definition="d2", unlock_lessons=["p1-2"])
        GlossaryTerm.objects.create(word="Indice", definition="d3", unlock_lessons=["p1-3"])
        GlossaryTerm.objects.create(word="Adulte", definition="d4", unlock_lessons=[])
        self.child = User.objects.create_user(email="enfant@example.com", password="motdepasse123", role="eleve")
        LearnerProfile.objects.create(learner=self.child, owner_email=self.child.email, age_track="7-9")
        self.client.force_authenticate(self.child)

    def finish(self, lesson_id, days_ago=0):
        Progress.objects.create(user=self.child, owner_email=self.child.email, lesson_id=lesson_id, age_track="7-9",
                                xp=20, score=100, completed_at=timezone.now() - timedelta(days=days_ago))

    def test_child_who_did_nothing_has_an_empty_dictionary_with_a_hint(self):
        data = self.client.get(URL).data

        self.assertEqual(data["terms"], [])
        self.assertEqual((data["discovered"], data["total"]), (0, 3))
        self.assertEqual(data["next"], {"lessonId": "p1-1", "lessonTitle": "Leçon 1"})

    def test_a_word_appears_only_after_its_lesson_is_finished(self):
        self.finish("p1-1")

        data = self.client.get(URL).data

        self.assertEqual([t["word"] for t in data["terms"]], ["IA"])
        self.assertEqual(data["terms"][0]["lesson"], {"id": "p1-1", "title": "Leçon 1"})
        self.assertEqual((data["discovered"], data["total"]), (1, 3))
        self.assertEqual(data["next"]["lessonId"], "p1-2")

    def test_hidden_words_are_never_sent_to_the_browser(self):
        self.finish("p1-1")

        body = self.client.get(URL).content.decode()

        self.assertNotIn("Exemple", body)
        self.assertNotIn("Indice", body)
        self.assertNotIn("Adulte", body)

    def test_recent_words_are_flagged_new(self):
        self.finish("p1-1", days_ago=30)
        self.finish("p1-2", days_ago=1)

        terms = {t["word"]: t for t in self.client.get(URL).data["terms"]}

        self.assertFalse(terms["IA"]["isNew"])
        self.assertTrue(terms["Exemple"]["isNew"])

    def test_finishing_everything_completes_the_dictionary(self):
        for lesson_id in ("p1-1", "p1-2", "p1-3"):
            self.finish(lesson_id)

        data = self.client.get(URL).data

        self.assertEqual((data["discovered"], data["total"]), (3, 3))
        self.assertIsNone(data["next"])

    def test_account_without_profile_uses_the_track_of_its_progress(self):
        other_track = AgeTrack.objects.create(key="10-12", label="10-12 ans", name="Explorateurs")
        module = Module.objects.create(track=other_track, world_id="a1", title="Autre", description="d", order=1)
        Lesson.objects.create(module=module, lesson_id="a1-1", title="Leçon A", order=1)
        GlossaryTerm.objects.create(word="Robot", definition="d5", unlock_lessons=["a1-1"])
        LearnerProfile.objects.filter(learner=self.child).delete()
        self.finish("p1-1")

        data = self.client.get(URL).data

        self.assertEqual(data["total"], 3)  # les mots du parcours 10-12 ne comptent pas pour cet enfant
        self.assertEqual(data["next"]["lessonId"], "p1-2")

    def test_another_childs_progress_does_not_unlock_words(self):
        other = User.objects.create_user(email="autre@example.com", password="motdepasse123", role="eleve")
        Progress.objects.create(user=other, owner_email=other.email, lesson_id="p1-1", age_track="7-9", xp=20, score=100)

        self.assertEqual(self.client.get(URL).data["terms"], [])

    def test_adults_see_every_active_word(self):
        self.client.force_authenticate(User.objects.create_user(email="parent@example.com", password="motdepasse123", role="parent"))

        data = self.client.get(URL).data

        self.assertEqual(len(data["terms"]), 4)
        self.assertFalse(data["lockedForLearner"])

    def test_anonymous_visitors_get_nothing(self):
        self.client.force_authenticate(None)

        self.assertEqual(self.client.get(URL).data["terms"], [])


class GlossarySeedDataTests(APITestCase):
    """Les données de déblocage livrées avec l'application sont cohérentes avec le catalogue des leçons."""

    def test_every_seeded_word_unlocks_on_a_real_79_lesson_or_other_track(self):
        for term in LESSON_TERMS_79:
            self.assertRegex(term["lessons"][0], r"^p(10|[1-9])-[1-4]$", term["word"])
            self.assertTrue(term["definition"].strip(), term["word"])
        for word, lessons in GENERAL_UNLOCKS.items():
            self.assertTrue(lessons, word)

    def test_word_names_are_unique(self):
        words = [t["word"].lower() for t in LESSON_TERMS_79] + [w.lower() for w in GENERAL_UNLOCKS]
        self.assertEqual(len(words), len(set(words)))

    def test_migration_gave_the_general_words_their_unlock_lessons(self):
        self.assertEqual(GlossaryTerm.objects.get(word="Pixel").unlock_lessons[0], "p5-1")
        self.assertEqual(GlossaryTerm.objects.filter(unlock_lessons=[], is_active=True).count(), 0)
