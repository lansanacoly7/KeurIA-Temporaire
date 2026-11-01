from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from apps.curriculum.models import AgeTrack, Module, Lesson, LessonContent


class CurriculumModelAndAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.track = AgeTrack.objects.create(
            key="7-9",
            label="7-9 ans",
            name="Les Explorateurs de l'IA",
            tagline="Premier contact avec l'intelligence artificielle",
            accent="#2EC4B6",
            order=1
        )
        self.module = Module.objects.create(
            track=self.track,
            world_id="p1",
            title="Bonjour l'IA !",
            icon="🤖",
            description="Comprendre ce qu'est une IA simplement.",
            color="c-teal",
            order=1
        )
        self.lesson = Lesson.objects.create(
            module=self.module,
            lesson_id="p1-2",
            title="Comment apprend une IA ?",
            lesson_type="jeu",
            minutes=6,
            xp=30,
            stars=3,
            order=2
        )
        self.content = LessonContent.objects.create(
            lesson=self.lesson,
            mission="Aide Palou à découvrir comment une IA apprend avec des exemples !",
            objectives=["Comprendre le rôle des exemples", "Observer les différences chat / chien"],
            discover="Une IA observe des milliers d'exemples pour apprendre à reconnaître.",
            example="Exemple 1 : Chat, Exemple 2 : Chat, Exemple 3 : Chien.",
            activity={
                "prompt": "Que faut-il donner à une IA pour qu'elle apprenne ?",
                "options": ["Des exemples", "Des gâteaux"],
                "correct": 0,
                "success": "Bravo !"
            },
            remember=["L'IA apprend avec des exemples", "Plus il y a d'exemples, mieux elle apprend"],
            vocabulary=[["Exemple", "Image ou donnée montrée à l'IA pour qu'elle apprenne"]],
            challenge="Trouve l'animal mystère avec ses oreilles !",
            skill="Reconnaissance par exemples",
            questions=[
                {
                    "question": "Comment apprend une IA ?",
                    "options": ["Avec des exemples", "En dormant"],
                    "correct": 0,
                    "explain": "L'IA utilise des données et exemples pour apprendre."
                }
            ],
            steps=[]
        )

    def test_track_creation(self):
        self.assertEqual(str(self.track), "7-9 ans — Les Explorateurs de l'IA")
        self.assertEqual(self.track.modules.count(), 1)

    def test_module_creation(self):
        self.assertEqual(str(self.module), "[p1] Bonjour l'IA ! (7-9)")
        self.assertEqual(self.module.lessons.count(), 1)

    def test_lesson_and_content_relationship(self):
        self.assertEqual(str(self.lesson), "[p1-2] Comment apprend une IA ?")
        self.assertTrue(hasattr(self.lesson, "content"))
        self.assertEqual(self.lesson.content.mission, "Aide Palou à découvrir comment une IA apprend avec des exemples !")

    def test_api_tracks_list(self):
        url = reverse("curriculum:track-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["key"], "7-9")
        self.assertEqual(len(response.data[0]["worlds"]), 1)
        self.assertEqual(response.data[0]["worlds"][0]["id"], "p1")

    def test_api_overview(self):
        url = reverse("curriculum:curriculum-overview")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("7-9", response.data)
        self.assertEqual(response.data["7-9"]["name"], "Les Explorateurs de l'IA")
        self.assertEqual(len(response.data["7-9"]["worlds"]), 1)

    def test_api_track_detail(self):
        url = reverse("curriculum:track-detail", kwargs={"key": "7-9"})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["key"], "7-9")

    def test_api_module_detail(self):
        url = reverse("curriculum:module-detail", kwargs={"world_id": "p1"})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], "p1")
        self.assertEqual(len(response.data["lessons"]), 1)

    def test_api_lesson_detail(self):
        url = reverse("curriculum:lesson-detail", kwargs={"lesson_id": "p1-2"})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], "p1-2")
        self.assertIsNotNone(response.data["content"])
        self.assertEqual(response.data["content"]["activity"]["correct"], 0)

    def test_api_404_handling(self):
        res_track = self.client.get(reverse("curriculum:track-detail", kwargs={"key": "unknown"}))
        self.assertEqual(res_track.status_code, status.HTTP_404_NOT_FOUND)

        res_module = self.client.get(reverse("curriculum:module-detail", kwargs={"world_id": "unknown"}))
        self.assertEqual(res_module.status_code, status.HTTP_404_NOT_FOUND)

        res_lesson = self.client.get(reverse("curriculum:lesson-detail", kwargs={"lesson_id": "unknown"}))
        self.assertEqual(res_lesson.status_code, status.HTTP_404_NOT_FOUND)
