from copy import deepcopy
from pathlib import Path
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.curriculum import parcours79
from apps.curriculum.models import AgeTrack, Character

FIXTURES_1012 = Path(__file__).resolve().parent / "tests" / "fixtures" / "parcours1012"


class TrackCharactersTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.track1012, _ = AgeTrack.objects.get_or_create(
            key="10-12",
            defaults={"label": "10–12 ans", "name": "Jeunes Aventuriers", "order": 2}
        )
        self.char_palou = Character.objects.create(
            track=self.track1012,
            character_id="palou",
            name="Palou",
            role="Guide IA",
            avatar="/images/palou.webp",
            voice_id="voice_palou_01",
            module="",
            order=1
        )
        self.char_ex1 = Character.objects.create(
            track=self.track1012,
            character_id="exemple-1",
            name="Personnage exemple 1",
            role="Rôle exemple 1",
            avatar="/images/exemple-1.webp",
            voice_id="voice_ex1",
            module="a1",
            order=2
        )
        self.char_ex2 = Character.objects.create(
            track=self.track1012,
            character_id="exemple-2",
            name="Personnage exemple 2",
            role="Rôle exemple 2",
            avatar="/images/exemple-2.webp",
            voice_id="voice_ex2",
            module="a2",
            order=3
        )

    def test_load_track_cast_contains_1012_characters(self):
        cast = parcours79.load_track_cast(track='10-12', content_dir=FIXTURES_1012)
        self.assertIn('palou', cast)
        self.assertIn('exemple-1', cast)
        self.assertIn('exemple-2', cast)

    def test_unknown_speaker_rejected_by_content_validation(self):
        chapters = parcours79.load_chapters(track='10-12', content_dir=FIXTURES_1012)
        mutated = deepcopy(chapters)
        mutated[0][1]['lessons'][0]['screens'][0]['speaker'] = 'personnage_mystere_inconnu'
        report = parcours79.validate_all(chapters=mutated, track='10-12', content_dir=FIXTURES_1012)
        error_found = any('personnage qui parle inconnu' in e for e in report.errors)
        self.assertTrue(error_found, "Le validateur doit refuser un personnage qui parle inconnu")

    def test_unknown_cast_member_rejected_by_content_validation(self):
        chapters = parcours79.load_chapters(track='10-12', content_dir=FIXTURES_1012)
        mutated = deepcopy(chapters)
        mutated[0][1]['lessons'][0]['cast'].append('personnage_inconnu')
        report = parcours79.validate_all(chapters=mutated, track='10-12', content_dir=FIXTURES_1012)
        error_found = any('personnages inconnus' in e for e in report.errors)
        self.assertTrue(error_found, "Le validateur doit refuser un personnage absent du catalogue")

    def test_speaker_not_in_lesson_cast_reported(self):
        chapters = parcours79.load_chapters(track='10-12', content_dir=FIXTURES_1012)
        mutated = deepcopy(chapters)
        mutated[0][1]['lessons'][0]['cast'] = ['palou', 'exemple-1']
        mutated[0][1]['lessons'][0]['screens'][0]['speaker'] = 'exemple-2'
        report = parcours79.validate_all(chapters=mutated, track='10-12', content_dir=FIXTURES_1012)
        soft_found = any("n'est pas dans la distribution" in e for e in report.errors)
        self.assertTrue(soft_found, "Un personnage qui parle sans faire partie de la distribution doit être signalé")

    def test_api_characters_list_and_module_filter(self):
        # All characters for 10-12
        response = self.client.get('/api/curriculum/characters/?track=10-12')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [c['id'] for c in response.data]
        self.assertIn('palou', ids)
        self.assertIn('exemple-1', ids)
        self.assertIn('exemple-2', ids)

        # Filter by module=a1: should return palou (global) and exemple-1 (a1), but NOT exemple-2 (a2)
        resp_filtered = self.client.get('/api/curriculum/characters/?track=10-12&module=a1')
        self.assertEqual(resp_filtered.status_code, status.HTTP_200_OK)
        f_ids = [c['id'] for c in resp_filtered.data]
        self.assertIn('palou', f_ids)
        self.assertIn('exemple-1', f_ids)
        self.assertNotIn('exemple-2', f_ids)

    def test_api_track_detail_includes_characters(self):
        response = self.client.get('/api/curriculum/tracks/10-12/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('characters', response.data)
        ids = [c['id'] for c in response.data['characters']]
        self.assertIn('palou', ids)
        self.assertIn('exemple-1', ids)
