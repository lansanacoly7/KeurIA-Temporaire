"""Durcissements du studio 7-9 (T17) : taille d'une leçon, cadence d'envoi de fichiers, aucun octet de média journalisé."""
import io

from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from apps.accounts.models import User
from apps.curriculum.models import ContentVersion, MediaAsset

from ..models import AuditLog
from .test_studio79 import LESSON, png_bytes, StudioTestCase


class LessonSizeTests(StudioTestCase):
    """Un contenu de leçon de plus de 2 Mo est refusé : le lecteur de l'enfant ne saurait pas le jouer."""

    def test_a_lesson_content_heavier_than_two_megabytes_is_refused(self):
        content = self.edited()
        content['screens'][0]['text'] = 'Palou répète la même phrase. ' * 90_000   # > 2 Mo de texte

        response = self.save(content)

        self.assertEqual(response.status_code, status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, response.data)
        self.assertIn('trop volumineuse', response.data['error'])
        self.assertIsNone(self.lesson()['draft'])                    # rien n'a été gardé
        self.assertEqual(ContentVersion.objects.filter(key=LESSON).count(), 1)   # seule la version d'origine


class MediaUploadPaceTests(APITestCase):
    """La médiathèque est un atelier, pas un dépôt : 30 envois par minute et par administrateur."""

    def setUp(self):
        super().setUp()
        cache.clear()                       # compteurs de limitation d'envoi
        self.admin = User.objects.create_user(email='admin@keuria.sn', password='Baobab-Dakar-2026',
                                              role=User.ROLE_ADMIN, email_verified=True)
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def upload(self, n):
        return self.client.post('/api/superadmin/media',
                                {'file': SimpleUploadedFile(f'f{n}.png', png_bytes((20, 20)), 'image/png')},
                                format='multipart')

    def test_the_thirty_first_upload_of_the_minute_is_refused_in_french(self):
        codes = [self.upload(n).status_code for n in range(31)]

        self.assertEqual(codes[:30], [status.HTTP_201_CREATED] * 30)
        self.assertEqual(codes[-1], status.HTTP_429_TOO_MANY_REQUESTS)
        refused = self.upload(31)
        self.assertIn('réessayez dans une minute', refused.data['error'])

    def test_reading_the_library_is_not_limited(self):
        for n in range(31):
            self.upload(n)

        self.assertEqual(self.client.get('/api/superadmin/media').status_code, status.HTTP_200_OK)

    def test_the_pace_is_per_administrator(self):
        other = User.objects.create_user(email='atelier@keuria.sn', password='Baobab-Dakar-2026',
                                         role=User.ROLE_ADMIN, email_verified=True)
        for n in range(31):
            self.upload(n)

        self.client.force_authenticate(other)
        self.assertEqual(self.upload(0).status_code, status.HTTP_201_CREATED)


class NoMediaBytesLeakTests(APITestCase):
    """Les octets d'un média ne doivent jamais apparaître dans un journal ni dans une erreur."""

    def setUp(self):
        super().setUp()
        self.admin = User.objects.create_user(email='admin@keuria.sn', password='Baobab-Dakar-2026',
                                              role=User.ROLE_ADMIN, email_verified=True)
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def upload(self, name='photo.png', data=None, content_type='image/png'):
        return self.client.post('/api/superadmin/media',
                                {'file': SimpleUploadedFile(name, data or png_bytes((40, 30)), content_type)},
                                format='multipart')

    def test_a_sent_file_is_logged_by_name_and_size_only(self):
        self.upload()

        entry = AuditLog.objects.filter(action='studio_media_envoye').first()

        self.assertIsNotNone(entry)
        self.assertIn('photo.png', entry.label)
        self.assertIn('Ko', entry.label)                            # la taille, jamais le contenu
        self.assertNotIn('data', entry.label)

    def test_a_refused_file_leaves_no_bytes_in_the_answer_or_in_a_log(self):
        response = self.upload('photo.png', b'<script>alert(1)</script>')      # contenu qui n'est pas une image

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertNotIn('alert', response.data['error'])
        self.assertNotIn('script', response.data['error'])
        for entry in AuditLog.objects.all():                                   # rien non plus n'est resté au journal
            self.assertNotIn('alert', entry.label)
            self.assertNotIn('script', entry.label)
        self.assertEqual(MediaAsset.objects.count(), 0)

    def test_no_answer_carries_the_stored_bytes(self):
        created = self.upload().data
        listing = self.client.get('/api/superadmin/media').data

        self.assertNotIn('data', created)
        self.assertNotIn('data', listing['results'][0])
        self.assertNotIn('data', self.client.get('/api/superadmin/media?kind=image').data['results'][0])

    def test_the_bytes_only_ever_leave_through_the_media_route(self):
        created = self.upload().data

        served = APIClient().get(created['url'])

        self.assertEqual(served.status_code, status.HTTP_200_OK)
        self.assertEqual(served['Content-Type'], 'image/webp')      # c'est la seule route qui renvoie les octets
        self.assertEqual(Image.open(io.BytesIO(served.content)).format, 'WEBP')
