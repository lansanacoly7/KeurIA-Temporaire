"""Studio des leçons 7-9 : brouillon, publication différée de sécurité, annulation, retour arrière, médiathèque."""
import copy
import io
from datetime import timedelta

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.utils import timezone
from PIL import Image
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from apps.accounts.models import User
from apps.curriculum.models import ContentVersion, MediaAsset

from ..models import AuditLog

LESSON = 'p1-1'
BASE = '/api/superadmin/studio79/lessons'


def png_bytes(size=(3000, 2000), color='red'):
    out = io.BytesIO()
    Image.new('RGB', size, color).save(out, 'PNG')
    return out.getvalue()


class StudioTestCase(APITestCase):
    def setUp(self):
        super().setUp()
        self.admin = User.objects.create_user(email='admin@keuria.sn', password='Baobab-Dakar-2026', role=User.ROLE_ADMIN, email_verified=True)
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def lesson(self, key=LESSON):
        response = self.client.get(f'{BASE}/{key}')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        return response.data

    def edited(self):
        """Contenu d'origine avec un changement de forme sans effet sur les règles de style (« . » devient « ! »)."""
        content = copy.deepcopy(self.lesson()['working']['content'])
        content['screens'][0]['text'] = content['screens'][0]['text'].rstrip('.!? ') + ' !'
        return content

    def save(self, content, key=LESSON):
        return self.client.put(f'{BASE}/{key}/draft', {'content': content, 'note': 'essai'}, format='json')

    def public(self, key=LESSON):
        return APIClient().get(f'/api/curriculum/content79/{key}/')

    def go_live(self, key=LESSON):
        """Fait comme si le délai de sécurité était écoulé."""
        ContentVersion.objects.filter(key=key, publish_at__gt=timezone.now()).update(publish_at=timezone.now() - timedelta(seconds=1))


class AccessTests(StudioTestCase):
    def test_only_the_team_can_use_the_studio(self):
        parent = User.objects.create_user(email='p@example.com', password='Baobab-Dakar-2026', role=User.ROLE_PARENT, email_verified=True)
        other = APIClient()
        other.force_authenticate(parent)

        self.assertEqual(other.get(f'{BASE}').status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(other.put(f'{BASE}/{LESSON}/draft', {'content': {}}, format='json').status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(other.post('/api/superadmin/media').status_code, status.HTTP_403_FORBIDDEN)

    def test_lists_the_forty_lessons_in_ten_modules(self):
        data = self.client.get(BASE).data

        self.assertEqual((len(data['lessons']), len(data['modules'])), (40, 10))
        self.assertEqual(data['delayMinutes'], 15)
        self.assertFalse(any(lesson['modified'] or lesson['hasDraft'] for lesson in data['lessons']))

    def test_unknown_lesson_is_not_found(self):
        self.assertEqual(self.client.get(f'{BASE}/zz-9').status_code, status.HTTP_404_NOT_FOUND)


class DraftAndPublishTests(StudioTestCase):
    def test_opening_a_lesson_keeps_the_original_as_live_version_one(self):
        data = self.lesson()

        self.assertEqual(data['live']['number'], 1)
        self.assertEqual(data['live']['source'], 'import')
        self.assertEqual(data['working']['from'], 'live')
        self.assertEqual([i for i in data['issues'] if i['severity'] == 'error'], [])
        self.assertEqual(self.public().status_code, status.HTTP_404_NOT_FOUND)     # le site garde son contenu d'origine

    def test_a_draft_is_invisible_to_children(self):
        response = self.save(self.edited())

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(self.lesson()['working']['from'], 'draft')
        self.assertEqual(self.public().status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.get(BASE).data['lessons'][0]['hasDraft'], True)

    def test_saving_again_updates_the_same_draft(self):
        self.save(self.edited())
        self.save(self.edited())

        self.assertEqual(ContentVersion.objects.filter(key=LESSON, publish_at__isnull=True).count(), 1)

    def test_publish_goes_live_only_after_the_safety_delay(self):
        self.save(self.edited())

        response = self.client.post(f'{BASE}/{LESSON}/publish', {}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        wait = ContentVersion.objects.get(key=LESSON, number=2).publish_at - timezone.now()
        self.assertTrue(timedelta(minutes=14) < wait <= timedelta(minutes=15), wait)
        self.assertEqual(self.public().status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.lesson()['pending']['number'], 2)

        self.go_live()
        live = self.public()
        self.assertEqual(live.status_code, status.HTTP_200_OK)
        self.assertEqual(live.data['version'], 2)
        self.assertTrue(live.data['content']['screens'][0]['text'].endswith(' !'))
        self.assertEqual(self.client.get(BASE).data['lessons'][0]['modified'], True)
        self.assertEqual(APIClient().get('/api/curriculum/content79/').data, {LESSON: {'version': 2, 'source': 'studio'}})
        self.assertTrue(AuditLog.objects.filter(action='studio_publication', label__contains=LESSON).exists())

    def test_a_changed_spoken_text_is_muted_and_untouched_text_keeps_its_voice(self):
        self.save(self.edited())
        self.client.post(f'{BASE}/{LESSON}/publish', {}, format='json')
        self.go_live()

        self.assertEqual(self.public().data['content']['voiceOff'], ['e01'])

        original = self.lesson()['history'][-1]['number']          # retour au contenu d'origine : tous les enregistrements valent de nouveau
        self.client.post(f'{BASE}/{LESSON}/rollback', {'number': original}, format='json')
        self.assertNotIn('voiceOff', self.public().data['content'])

    @override_settings(STUDIO_PUBLISH_DELAY_MINUTES=30)
    def test_delay_is_a_setting(self):
        self.save(self.edited())
        self.client.post(f'{BASE}/{LESSON}/publish', {}, format='json')

        wait = ContentVersion.objects.get(key=LESSON, number=2).publish_at - timezone.now()
        self.assertTrue(timedelta(minutes=29) < wait <= timedelta(minutes=30))

    def test_nothing_to_publish_without_a_draft_or_without_changes(self):
        self.assertEqual(self.client.post(f'{BASE}/{LESSON}/publish', {}, format='json').status_code, status.HTTP_400_BAD_REQUEST)
        self.save(self.lesson()['working']['content'])        # brouillon identique à la version en ligne

        response = self.client.post(f'{BASE}/{LESSON}/publish', {}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('identique', response.data['error'])

    def test_a_style_rule_needs_confirmation_but_a_structure_error_blocks(self):
        soft = self.edited()
        soft['screens'][0]['text'] = 'Palou arrive. Il sourit. Il salue. Il rit.'     # 4 phrases : règle de style
        self.save(soft)

        warned = self.client.post(f'{BASE}/{LESSON}/publish', {}, format='json')
        self.assertEqual(warned.status_code, status.HTTP_409_CONFLICT)
        self.assertTrue(warned.data['needsAcknowledge'])
        self.assertTrue(all(i['severity'] == 'warning' for i in warned.data['issues'] if 'phrases' in i['message']))
        self.assertEqual(self.client.post(f'{BASE}/{LESSON}/publish', {'acknowledge': True}, format='json').status_code, status.HTTP_200_OK)

    def test_structure_errors_block_even_when_confirmed(self):
        broken = self.edited()
        play = next(s for s in broken['screens'] if s['kind'] in ('play', 'why'))
        play['rounds'][0]['type'] = 'inventé'
        self.save(broken)

        response = self.client.post(f'{BASE}/{LESSON}/publish', {'acknowledge': True}, format='json')

        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertTrue(response.data['blocking'])
        self.assertTrue(any(i['severity'] == 'error' and 'inconnu' in i['message'] for i in response.data['issues']))
        self.assertEqual(ContentVersion.objects.filter(key=LESSON, number=2, publish_at__isnull=True).count(), 1)   # reste un brouillon

    def test_valid_layout_can_be_published(self):
        valid = self.edited()
        valid['screens'][0]['layout'] = {
            'image': 'left',
            'imageSize': 'l',
            'textSize': 'xl',
            'align': 'center',
        }
        self.save(valid)

        response = self.client.post(f'{BASE}/{LESSON}/publish', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_unknown_layout_value_blocks_publication(self):
        broken = self.edited()
        broken['screens'][0]['layout'] = {'image': 'invente'}
        self.save(broken)

        response = self.client.post(f'{BASE}/{LESSON}/publish', {'acknowledge': True}, format='json')
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertTrue(response.data['blocking'])
        self.assertTrue(any(i['severity'] == 'error' and 'position d\'image invalide' in i['message'] for i in response.data['issues']))

    def test_image_layout_on_screen_without_image_is_confirmable_warning(self):
        warn = self.edited()
        # Dernier écran (bravo) : pas d'image
        bravo = warn['screens'][-1]
        self.assertNotIn('image', bravo)
        bravo['layout'] = {'image': 'top', 'imageSize': 's'}
        self.save(warn)

        # Bloqué par avertissement de style à confirmer
        response = self.client.post(f'{BASE}/{LESSON}/publish', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertTrue(response.data['needsAcknowledge'])
        self.assertTrue(any('sans image' in i['message'] for i in response.data['issues']))

        # Avec confirmation, la publication réussit
        confirmed = self.client.post(f'{BASE}/{LESSON}/publish', {'acknowledge': True}, format='json')
        self.assertEqual(confirmed.status_code, status.HTTP_200_OK)


    def test_malformed_content_is_refused_or_reported(self):
        self.assertEqual(self.save({'screens': 'nope'}).status_code, status.HTTP_400_BAD_REQUEST)
        issues = self.client.post(f'{BASE}/{LESSON}/validate', {'content': {'id': LESSON, 'screens': [{'rounds': 5}]}}, format='json').data['issues']
        self.assertEqual(issues[0]['severity'], 'error')

    def test_a_new_publication_replaces_the_one_that_is_waiting(self):
        self.save(self.edited())
        self.client.post(f'{BASE}/{LESSON}/publish', {}, format='json')
        second = self.edited()
        second['screens'][0]['text'] = second['screens'][0]['text'].rstrip(' !') + ' ?'
        self.save(second)

        self.assertEqual(self.client.post(f'{BASE}/{LESSON}/publish', {}, format='json').status_code, status.HTTP_200_OK)

        self.assertEqual(ContentVersion.objects.get(key=LESSON, number=2).discarded_at is not None, True)
        self.assertEqual(self.lesson()['pending']['number'], 3)

    def test_cancelling_a_waiting_publication_brings_it_back_as_the_draft(self):
        self.save(self.edited())
        self.client.post(f'{BASE}/{LESSON}/publish', {}, format='json')

        response = self.client.post(f'{BASE}/{LESSON}/cancel')

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        data = self.lesson()
        self.assertIsNone(data['pending'])
        self.assertEqual((data['draft']['number'], data['working']['from']), (2, 'draft'))
        self.go_live()
        self.assertEqual(self.public().status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.post(f'{BASE}/{LESSON}/cancel').status_code, status.HTTP_400_BAD_REQUEST)

    def test_discarding_a_draft(self):
        self.save(self.edited())

        self.assertEqual(self.client.delete(f'{BASE}/{LESSON}/draft').status_code, status.HTTP_200_OK)

        self.assertIsNone(self.lesson()['draft'])
        self.assertEqual(self.client.delete(f'{BASE}/{LESSON}/draft').status_code, status.HTTP_400_BAD_REQUEST)

    def test_rollback_restores_an_old_version_immediately(self):
        original = self.lesson()['working']['content']
        self.save(self.edited())
        self.client.post(f'{BASE}/{LESSON}/publish', {}, format='json')
        self.go_live()

        response = self.client.post(f'{BASE}/{LESSON}/rollback', {'number': 1}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        live = self.public()
        self.assertEqual((live.status_code, live.data['version']), (200, 3))
        self.assertEqual(live.data['content'], original)
        history = self.lesson()['history']
        self.assertEqual([h['number'] for h in history], [3, 2, 1])
        self.assertEqual(history[0]['source'], 'rollback')
        self.assertEqual(self.client.post(f'{BASE}/{LESSON}/rollback', {'number': 3}, format='json').status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.client.post(f'{BASE}/{LESSON}/rollback', {'number': 9}, format='json').status_code, status.HTTP_404_NOT_FOUND)

    def test_title_must_stay_aligned_with_the_catalog(self):
        content = self.edited()
        content['title'] = 'Un autre titre'
        self.save(content)

        response = self.client.post(f'{BASE}/{LESSON}/publish', {'acknowledge': True}, format='json')

        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)


class MediaTests(StudioTestCase):
    def upload(self, name, data, content_type='application/octet-stream'):
        return self.client.post('/api/superadmin/media', {'file': SimpleUploadedFile(name, data, content_type)}, format='multipart')

    def test_images_are_resized_and_converted_to_webp(self):
        response = self.upload('photo.png', png_bytes((3000, 2000)), 'image/png')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual((response.data['kind'], response.data['contentType']), ('image', 'image/webp'))
        self.assertEqual(max(response.data['width'], response.data['height']), 1600)
        self.assertLess(response.data['size'], 20_000)
        asset = MediaAsset.objects.get(pk=response.data['id'])
        self.assertEqual(Image.open(io.BytesIO(bytes(asset.data))).format, 'WEBP')
        self.assertEqual(response.data['ref'], f'media:{asset.pk}.{asset.sha256[:8]}')

    def test_media_is_served_publicly_with_a_long_cache(self):
        created = self.upload('photo.png', png_bytes((400, 300))).data

        served = APIClient().get(created['url'])

        self.assertEqual(served.status_code, status.HTTP_200_OK)
        self.assertEqual(served['Content-Type'], 'image/webp')
        self.assertIn('immutable', served['Cache-Control'])
        self.assertEqual(APIClient().get(created['url'], HTTP_IF_NONE_MATCH=served['ETag']).status_code, status.HTTP_304_NOT_MODIFIED)
        self.assertEqual(APIClient().get(f'/api/media/{created["id"]}/deadbeef').status_code, status.HTTP_404_NOT_FOUND)

    def test_files_are_checked_by_content_not_by_name(self):
        self.assertEqual(self.upload('photo.png', b'<script>alert(1)</script>', 'image/png').status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.upload('x.svg', b'<svg xmlns="http://www.w3.org/2000/svg"/>', 'image/svg+xml').status_code, status.HTTP_400_BAD_REQUEST)
        gif = io.BytesIO()
        frames = [Image.new('RGB', (20, 20), c) for c in ('red', 'blue')]
        frames[0].save(gif, 'GIF', save_all=True, append_images=frames[1:])
        self.assertIn('animées', self.upload('a.gif', gif.getvalue()).data['error'])
        self.assertEqual(MediaAsset.objects.count(), 0)

    @override_settings(STUDIO_VIDEO_MAX_MB=1)
    def test_small_videos_are_kept_and_can_be_read_by_ranges(self):
        video = b'\x00\x00\x00\x18ftypmp42' + bytes(range(256)) * 4
        created = self.upload('clip.mp4', video).data

        self.assertEqual((created['kind'], created['contentType']), ('video', 'video/mp4'))
        partial = APIClient().get(created['url'], HTTP_RANGE='bytes=12-19')
        self.assertEqual(partial.status_code, status.HTTP_206_PARTIAL_CONTENT)
        self.assertEqual(partial.content, video[12:20])
        self.assertEqual(partial['Content-Range'], f'bytes 12-19/{len(video)}')
        self.assertEqual(APIClient().get(created['url'], HTTP_RANGE='bytes=99999-').status_code, 416)

    @override_settings(STUDIO_VIDEO_MAX_MB=1)
    def test_heavy_videos_are_refused_with_a_hint_about_links(self):
        response = self.upload('big.mp4', b'\x00\x00\x00\x18ftypmp42' + b'0' * (1024 * 1024 + 10))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('YouTube', response.data['error'])

    def test_library_lists_assets_without_their_bytes(self):
        self.upload('a.png', png_bytes((50, 50)))
        self.upload('b.png', png_bytes((60, 60)))

        data = self.client.get('/api/superadmin/media?kind=image').data

        self.assertEqual(data['total'], 2)
        self.assertNotIn('data', data['results'][0])
        self.assertEqual(data['results'][0]['name'], 'b.png')

    def test_an_image_from_the_library_can_be_used_in_a_lesson_but_a_missing_one_blocks(self):
        asset = self.upload('a.png', png_bytes((50, 50))).data
        content = self.edited()
        content['screens'][0]['image'] = asset['ref']
        content['screens'][0]['alt'] = 'Palou sur la plage'
        self.save(content)
        self.assertEqual(self.client.post(f'{BASE}/{LESSON}/publish', {}, format='json').status_code, status.HTTP_200_OK)

        ContentVersion.objects.filter(key=LESSON, number=2).update(discarded_at=timezone.now())
        content['screens'][0]['image'] = 'media:99999.abcdef12'
        self.save(content)
        response = self.client.post(f'{BASE}/{LESSON}/publish', {'acknowledge': True}, format='json')

        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertTrue(any('introuvable' in i['message'] for i in response.data['issues']))

    def test_media_screen_with_video_file_or_link_can_be_saved_in_draft(self):
        video = b'\x00\x00\x00\x18ftypmp42' + bytes(range(256))
        asset = self.upload('test.mp4', video).data
        content = self.edited()
        content['screens'].insert(1, {
            'kind': 'media',
            'text': 'Regarde cette courte vidéo avec moi !',
            'media': {
                'type': 'video-file',
                'ref': asset['ref'],
            },
            'actions': [
                {'label': 'Continuer', 'kind': 'lesson', 'target': 'p1-2'},
            ],
        })
        res = self.save(content)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

