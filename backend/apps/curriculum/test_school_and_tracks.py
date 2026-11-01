import io
import json
from pathlib import Path
import tempfile
from unittest import mock

from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from PIL import Image
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.curriculum import parcours79
from apps.curriculum.catalog import base_catalog
from apps.curriculum.models import AgeTrack, ContentVersion, Lesson, LessonContent, Module
from apps.curriculum.tracks import can_open_lesson, track_for
from apps.curriculum.voices import clips_of
from apps.learners.models import LearnerProfile
from apps.schools.models import School


class TrackForAndIsolationTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.school = School.objects.create(name="École Dakar", slug="ecole-dakar", created_by_email="admin@ecole.sn")

        # Tracks
        self.track79, _ = AgeTrack.objects.get_or_create(key="7-9", defaults={"label": "7-9 ans", "name": "Explorateurs", "order": 1})
        self.track79ecole, _ = AgeTrack.objects.get_or_create(key="7-9-ecole", defaults={"label": "7-9 École", "name": "Classe 7-9", "order": 2})
        self.track1012, _ = AgeTrack.objects.get_or_create(key="10-12", defaults={"label": "10-12 ans", "name": "Aventuriers", "order": 3})
        self.track1012ecole, _ = AgeTrack.objects.get_or_create(key="10-12-ecole", defaults={"label": "10-12 École", "name": "Classe 10-12", "order": 4})

        # Lessons
        self.mod_p1 = Module.objects.create(track=self.track79, world_id="p1", title="Monde 7-9", order=1)
        self.les_p1_1 = Lesson.objects.create(module=self.mod_p1, lesson_id="p1-1", title="Leçon Enfant 7-9", order=1)
        LessonContent.objects.create(lesson=self.les_p1_1, mission="Mission 7-9")

        self.mod_ep1 = Module.objects.create(track=self.track79ecole, world_id="ep1", title="Monde 7-9 École", order=1)
        self.les_ep1_1 = Lesson.objects.create(module=self.mod_ep1, lesson_id="ep1-1", title="Leçon École 7-9", order=1)
        LessonContent.objects.create(lesson=self.les_ep1_1, mission="Mission École 7-9")

        # 1. Enfant de 8 ans (sans école)
        self.child8 = User.objects.create_user(email="enfant8@test.sn", role=User.ROLE_STUDENT, age_group="7-9")
        LearnerProfile.objects.create(learner=self.child8, age_track="7-9", nickname="E8")

        # 2. Enfant de 11 ans (sans école)
        self.child11 = User.objects.create_user(email="enfant11@test.sn", role=User.ROLE_STUDENT, age_group="10-12")
        LearnerProfile.objects.create(learner=self.child11, age_track="10-12", nickname="E11")

        # 3. Élève d'école de 8 ans
        self.pupil8 = User.objects.create_user(email="pupil8@test.sn", role=User.ROLE_STUDENT, age_group="7-9", school=self.school)
        LearnerProfile.objects.create(learner=self.pupil8, age_track="7-9", nickname="P8")

        # 4. Élève d'école de 11 ans
        self.pupil11 = User.objects.create_user(email="pupil11@test.sn", role=User.ROLE_STUDENT, age_group="10-12", school=self.school)
        LearnerProfile.objects.create(learner=self.pupil11, age_track="10-12", nickname="P11")

        # Utilisateurs avec d'autres rôles
        self.teacher = User.objects.create_user(email="prof@test.sn", role=User.ROLE_TEACHER, school=self.school)
        self.parent = User.objects.create_user(email="parent@test.sn", role=User.ROLE_PARENT)
        self.school_admin = User.objects.create_user(email="dir@test.sn", role=User.ROLE_SCHOOL_ADMIN, school=self.school)
        self.admin = User.objects.create_user(email="admin_global@test.sn", role=User.ROLE_ADMIN, is_staff=True)

    def test_track_for_resolves_all_six_cases(self):
        # 1. enfant de 8 ans -> 7-9
        self.assertEqual(track_for(self.child8), '7-9')
        # 2. enfant de 11 ans -> 10-12
        self.assertEqual(track_for(self.child11), '10-12')
        # 3. élève d'école de 8 ans -> 7-9 (repli car 7-9-ecole live=False) ou 7-9-ecole (sans repli)
        self.assertEqual(track_for(self.pupil8), '7-9')
        self.assertEqual(track_for(self.pupil8, fallback=False), '7-9-ecole')
        # 4. élève d'école de 11 ans -> 10-12 (repli car 10-12-ecole live=False) ou 10-12-ecole (sans repli)
        self.assertEqual(track_for(self.pupil11, fallback=True), '10-12')
        self.assertEqual(track_for(self.pupil11, fallback=False), '10-12-ecole')

    def test_pupil_fallback_allows_p1_1_when_track_not_live(self):
        # Quand 7-9-ecole n'est pas live, l'élève reçoit 7-9 et peut ouvrir p1-1 (200) et valider sa progression (200/201)
        self.client.force_authenticate(self.pupil8)
        resp = self.client.get('/api/curriculum/lessons/p1-1/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        resp_val = self.client.post('/api/progress', {'lessonId': 'p1-1', 'score': 100, 'stars': 3}, format='json')
        self.assertIn(resp_val.status_code, (status.HTTP_200_OK, status.HTTP_201_CREATED))

    def test_pupil_cannot_access_child_lesson_when_track_is_live(self):
        # Quand 7-9-ecole est live, l'élève a le verrou strict : ouvrir p1-1 retourne 403
        with mock.patch.dict(parcours79.TRACK_CONFIGS['7-9-ecole'], {'live': True}):
            self.assertEqual(track_for(self.pupil8), '7-9-ecole')
            self.client.force_authenticate(self.pupil8)
            resp = self.client.get('/api/curriculum/lessons/p1-1/')
            self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

            resp_val = self.client.post('/api/progress', {'lessonId': 'p1-1', 'score': 100, 'stars': 3}, format='json')
            self.assertEqual(resp_val.status_code, status.HTTP_403_FORBIDDEN)

    def test_child_cannot_access_pupil_lesson(self):
        # Child 8 is 7-9. Accessing pupil lesson ep1-1 must return 403.
        self.client.force_authenticate(self.child8)
        resp = self.client.get('/api/curriculum/lessons/ep1-1/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

        resp_val = self.client.post('/api/progress', {'lessonId': 'ep1-1', 'score': 100, 'stars': 3}, format='json')
        self.assertEqual(resp_val.status_code, status.HTTP_403_FORBIDDEN)

    def test_teacher_and_parent_and_admin_can_open_any_lesson(self):
        # R2: Seul l'élève a le verrou strict. Enseignant, parent, directeur et admin ouvrent n'importe quelle leçon.
        for user in [self.teacher, self.parent, self.school_admin, self.admin]:
            self.assertTrue(can_open_lesson(user, '7-9'))
            self.assertTrue(can_open_lesson(user, '7-9-ecole'))
            self.client.force_authenticate(user)
            resp_child = self.client.get('/api/curriculum/lessons/p1-1/')
            self.assertEqual(resp_child.status_code, status.HTTP_200_OK, f"Failed for {user.role}")
            resp_pupil = self.client.get('/api/curriculum/lessons/ep1-1/')
            self.assertEqual(resp_pupil.status_code, status.HTTP_200_OK, f"Failed for {user.role}")

    def test_parcours1012_contains_no_test_fixtures(self):
        # R4: Le dossier frontend/content/parcours1012/ ne doit contenir aucun fichier de test avec "Aminata", "Kofi", "Dr. Fall"
        p1012 = Path(parcours79.FRONTEND) / "content" / "parcours1012"
        if p1012.exists():
            for f in p1012.glob("*.json"):
                text = f.read_text(encoding='utf-8')
                for forbidden in ["Aminata", "Kofi", "Dr. Fall"]:
                    self.assertNotIn(forbidden, text, f"Forbidden string '{forbidden}' found in {f.name}")

    def test_base_catalog_raises_readable_error_on_broken_json(self):
        # R5: Lever une erreur lisible plutôt que masquer silencieusement si un JSON est cassé
        with tempfile.TemporaryDirectory() as tmpdir:
            tmppath = Path(tmpdir)
            corrupted = tmppath / "m01.json"
            corrupted.write_text('{"module": {invalid_json', encoding='utf-8')

            fake_cfg = {
                'content_dir': tmppath,
                'file_glob': 'm*.json',
                'live': True,
            }
            with mock.patch.dict(parcours79.TRACK_CONFIGS, {'test-track': fake_cfg}):
                with self.assertRaises(ValueError) as ctx:
                    base_catalog('test-track')
                self.assertIn("Fichier de contenu invalide dans le catalogue", str(ctx.exception))


class LessonFicheTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.school = School.objects.create(name="École Dakar", slug="ecole-dakar-2", created_by_email="admin@ecole.sn")

        self.pupil = User.objects.create_user(email="pupil@test.sn", role=User.ROLE_STUDENT, age_group="7-9", school=self.school)
        self.parent = User.objects.create_user(email="parent@test.sn", role=User.ROLE_PARENT)
        self.teacher = User.objects.create_user(email="prof@test.sn", role=User.ROLE_TEACHER, school=self.school)

        self.track = AgeTrack.objects.create(key="7-9-ecole", label="7-9 École", name="Classe 7-9", order=1)
        self.module = Module.objects.create(track=self.track, world_id="ep1", title="Monde 1 École", order=1)
        self.lesson = Lesson.objects.create(module=self.module, lesson_id="ep1-1", title="Première leçon", order=1)

        self.fiche_data = {
            "objectifs": ["Comprendre ce qu'est l'IA"],
            "deroule": ["10 min découverte", "10 min débat"],
            "materiel": ["Cahier", "Tableau"],
            "reponses": ["L'IA apprend avec des données"],
            "attention": ["Bien insister sur le rôle humain"],
        }
        self.lesson_content = {
            "id": "ep1-1",
            "title": "Première leçon",
            "fiche": self.fiche_data,
            "screens": [
                {"kind": "story", "text": "Bonjour la classe !", "speaker": "palou"}
            ]
        }
        ContentVersion.objects.create(
            kind="lesson79ecole",
            key="ep1-1",
            number=1,
            content=self.lesson_content,
            publish_at=timezone.now(),
        )

    def test_pupil_and_parent_get_403_on_fiche(self):
        self.client.force_authenticate(self.pupil)
        resp = self.client.get('/api/curriculum/fiche/ep1-1/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(self.parent)
        resp_parent = self.client.get('/api/curriculum/fiche/ep1-1/')
        self.assertEqual(resp_parent.status_code, status.HTTP_403_FORBIDDEN)

    def test_teacher_gets_200_with_fiche_data(self):
        self.client.force_authenticate(self.teacher)
        resp = self.client.get('/api/curriculum/fiche/ep1-1/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data.get('lesson_id'), 'ep1-1')
        self.assertEqual(resp.data.get('fiche'), self.fiche_data)

    def test_lesson_content_for_pupil_never_leaks_fiche(self):
        self.client.force_authenticate(self.pupil)
        resp = self.client.get('/api/curriculum/content79/ep1-1/')
        if resp.status_code == status.HTTP_200_OK:
            self.assertNotIn('fiche', resp.data)


class ScreenTypesAndVoiceTestCase(TestCase):
    def test_classe_and_debat_screens_validation(self):
        report = parcours79.Report()

        # Valid classe screen on 7-9-ecole
        scr_classe = {
            "kind": "classe",
            "titre": "Activité robot",
            "duree": "15 min",
            "groupes": "groupes de 4",
            "text": "Construisez votre robot sur papier.",
            "materiel": ["Feuilles", "Crayons"]
        }
        parcours79._check_screen(report, "ep1-1", 1, scr_classe, track="7-9-ecole")
        self.assertEqual(len(report.errors), 0)

        # Invalid classe screen: missing 'duree'
        rep_bad = parcours79.Report()
        bad_classe = dict(scr_classe)
        del bad_classe["duree"]
        parcours79._check_screen(rep_bad, "ep1-1", 1, bad_classe, track="7-9-ecole")
        self.assertTrue(any("duree" in e for e in rep_bad.errors))

        # Refused on non-ecole track (7-9)
        rep_refused = parcours79.Report()
        parcours79._check_screen(rep_refused, "p1-1", 1, scr_classe, track="7-9")
        self.assertTrue(any("écran non autorisé" in e for e in rep_refused.errors))

        # Valid debat screen on 7-9-ecole
        scr_debat = {
            "kind": "debat",
            "speaker": "mme-diop",
            "question": "L'ordinateur peut-il être intelligent ?",
            "text": "Échangeons ensemble sur cette question."
        }
        parcours79._check_screen(report, "ep1-1", 2, scr_debat, track="7-9-ecole")
        self.assertEqual(len(report.errors), 0)

    def test_voice_clips_generation_for_classe_and_debat(self):
        lesson = {
            "id": "ep1-1",
            "screens": [
                {
                    "kind": "classe",
                    "titre": "Activité robot",
                    "text": "Construisez votre robot.",
                },
                {
                    "kind": "debat",
                    "question": "L'IA pense-t-elle ?",
                    "text": "Donnez votre avis.",
                }
            ]
        }
        clips = list(clips_of(lesson))
        keys = [c[0] for c in clips]
        texts = [c[4] for c in clips]
        self.assertIn("e01", keys)
        self.assertIn("e02", keys)
        self.assertTrue(any("En classe" in t for t in texts))
        self.assertTrue(any("On en parle !" in t for t in texts))

    def test_check_voices_command_runs(self):
        out = io.StringIO()
        call_command('check_voices', track='7-9', stdout=out)
        self.assertIn("Contrôle des voix pour le parcours 7-9", out.getvalue())

    def test_slice_pictos_grid_3x3(self):
        # Create a dummy 3x3 sheet image (1536x1536) in tempdir
        with tempfile.TemporaryDirectory() as tmpdir:
            tmppath = Path(tmpdir)
            content_dir = tmppath / "content"
            content_dir.mkdir()
            images_dir = tmppath / "public" / "images" / content_dir.name
            src_dir = images_dir / "pictos-src"
            src_dir.mkdir(parents=True)

            # manifest
            manifest = {
                "sheets": [
                    {
                        "file": "sheet-01.png",
                        "ids": [f"picto_{i}" for i in range(1, 10)]
                    }
                ]
            }
            (content_dir / "pictos.json").write_text(json.dumps(manifest), encoding='utf-8')

            # create 1536x1536 white image
            img = Image.new("RGB", (1536, 1536), color=(255, 255, 255))
            img.save(src_dir / "sheet-01.png")

            fake_cfg = {
                'content_dir': content_dir,
            }
            with mock.patch('apps.curriculum.management.commands.slice_pictos79.get_track_config', return_value=fake_cfg), \
                 mock.patch('apps.curriculum.management.commands.slice_pictos79.FRONTEND', tmppath):
                out = io.StringIO()
                call_command('slice_pictos79', track='7-9-ecole', grid='3x3', stdout=out)
                self.assertIn("découpe 3x3", out.getvalue())
