"""Tests de la gestion des médias du studio (T23) :
- Liste avec recherche textuelle (nom, alt text) et filtres (type, statut d'utilisation)
- Détection d'utilisation à travers tous les contenus (leçons, devoirs, défis, historique)
- Protection stricte de suppression : refus HTTP 409 Conflict si utilisé, suppression propre si inutilisé
- Modification des métadonnées (nom, texte alternatif pour accessibilité)
- Calcul du poids total et alerte de quota de stockage
"""
import io
from datetime import timedelta
from django.utils import timezone
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from apps.accounts.models import User
from apps.curriculum.models import ContentVersion, MediaAsset


def png_bytes(size=(200, 200), color='blue'):
    out = io.BytesIO()
    Image.new('RGB', size, color).save(out, 'PNG')
    return out.getvalue()


class StudioMediaTests(APITestCase):

    def setUp(self):
        super().setUp()
        self.admin = User.objects.create_user(
            email='admin@keuria.sn',
            password='Baobab-Dakar-2026',
            role=User.ROLE_ADMIN,
            email_verified=True,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def upload_image(self, name='image.png', alt='Texte alternatif test', color='blue'):
        return self.client.post(
            '/api/superadmin/media',
            {'file': SimpleUploadedFile(name, png_bytes(color=color), 'image/png'), 'alt': alt},
            format='multipart',
        )

    def upload_video(self, name='clip.mp4', alt='Vidéo test'):
        video_bytes = b'\x00\x00\x00\x18ftypmp42' + b'videodata' * 20
        return self.client.post(
            '/api/superadmin/media',
            {'file': SimpleUploadedFile(name, video_bytes, 'video/mp4'), 'alt': alt},
            format='multipart',
        )

    def test_upload_with_alt_text_and_storage_stats(self):
        res = self.upload_image('girafe.png', alt='Une grande girafe au Sénégal')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['name'], 'girafe.png')
        self.assertEqual(res.data['alt'], 'Une grande girafe au Sénégal')
        self.assertEqual(res.data['kind'], 'image')

        # Liste des médias
        list_res = self.client.get('/api/superadmin/media')
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        self.assertIn('storage', list_res.data)
        storage = list_res.data['storage']
        self.assertGreater(storage['totalBytes'], 0)
        self.assertEqual(storage['maxMb'], 500)
        self.assertFalse(storage['isWarning'])

    def test_search_media_by_name_and_alt(self):
        self.upload_image('lion_dakar.png', alt='Roi des animaux')
        self.upload_image('pirogue_mbour.png', alt='Pirogue traditionnelle de pêche')

        # Recherche par nom
        res_name = self.client.get('/api/superadmin/media?q=lion')
        self.assertEqual(res_name.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_name.data['results']), 1)
        self.assertEqual(res_name.data['results'][0]['name'], 'lion_dakar.png')

        # Recherche par alt text
        res_alt = self.client.get('/api/superadmin/media?q=traditionnelle')
        self.assertEqual(res_alt.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_alt.data['results']), 1)
        self.assertEqual(res_alt.data['results'][0]['name'], 'pirogue_mbour.png')

    def test_media_usage_tracking_blocks_deletion_with_409(self):
        # 1. Envoi d'une image
        created = self.upload_image('palou_hero.png', alt='Palou qui salue').data
        asset_id = created['id']
        ref = created['ref']

        # 2. Référencement de l'image dans une leçon ContentVersion
        ContentVersion.objects.create(
            key='p1-1',
            kind=ContentVersion.KIND_LESSON79,
            number=2,
            publish_at=timezone.now() - timedelta(minutes=1),
            content={
                'id': 'p1-1',
                'title': 'Bienvenue avec Palou',
                'screens': [
                    {'kind': 'story', 'text': 'Bonjour !', 'image': ref}
                ]
            }
        )

        # 3. Le détail du média indique l'utilisation
        detail_res = self.client.get(f'/api/superadmin/media/{asset_id}')
        self.assertEqual(detail_res.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_res.data['usageCount'], 1)
        self.assertFalse(detail_res.data['canDelete'])
        self.assertIn('Leçon p1-1', detail_res.data['usages'][0]['description'])

        # 4. Tentative de suppression -> 409 Conflict
        del_res = self.client.delete(f'/api/superadmin/media/{asset_id}')
        self.assertEqual(del_res.status_code, status.HTTP_409_CONFLICT)
        self.assertIn('utilisé dans 1 version', del_res.data['error'])

        # 5. Le média est toujours en base
        self.assertTrue(MediaAsset.objects.filter(pk=asset_id).exists())

    def test_media_used_in_draft_or_history_also_blocks_deletion(self):
        created = self.upload_image('carte_tresor.png', alt='Une vieille carte').data
        asset_id = created['id']
        ref = created['ref']

        # Référencé dans une version archivée (past) d'un devoir (mission)
        ContentVersion.objects.create(
            key='m-devoir-01',
            kind=ContentVersion.KIND_MISSION,
            number=1,
            publish_at=timezone.now() - timedelta(days=1),
            content={
                'title': 'Recherche sur le trésor',
                'description': f'Regarde bien cette image : {ref}',
                'quiz': []
            }
        )

        del_res = self.client.delete(f'/api/superadmin/media/{asset_id}')
        self.assertEqual(del_res.status_code, status.HTTP_409_CONFLICT)
        self.assertIn('en ligne', del_res.data['error'])
        self.assertTrue(MediaAsset.objects.filter(pk=asset_id).exists())

    def test_unused_media_can_be_deleted(self):
        created = self.upload_image('image_orpheline.png', alt='Image de test').data
        asset_id = created['id']

        # Vérification usage 0
        detail_res = self.client.get(f'/api/superadmin/media/{asset_id}')
        self.assertEqual(detail_res.data['usageCount'], 0)
        self.assertTrue(detail_res.data['canDelete'])

        # Suppression autorisée
        del_res = self.client.delete(f'/api/superadmin/media/{asset_id}')
        self.assertEqual(del_res.status_code, status.HTTP_200_OK)
        self.assertTrue(del_res.data['ok'])

        # Vérification disparition de la base
        self.assertFalse(MediaAsset.objects.filter(pk=asset_id).exists())

    def test_update_metadata_patch(self):
        created = self.upload_image('photo.png', alt='Ancien alt').data
        asset_id = created['id']

        patch_res = self.client.patch(
            f'/api/superadmin/media/{asset_id}',
            {'alt': 'Nouveau texte alternatif accessible', 'name': 'photo_renommee.png'},
            format='json'
        )
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_res.data['alt'], 'Nouveau texte alternatif accessible')
        self.assertEqual(patch_res.data['name'], 'photo_renommee.png')

        # Vérification en base
        asset = MediaAsset.objects.get(pk=asset_id)
        self.assertEqual(asset.alt, 'Nouveau texte alternatif accessible')
        self.assertEqual(asset.name, 'photo_renommee.png')

    @override_settings(STUDIO_MEDIA_MAX_MB=1, STUDIO_MEDIA_WARNING_PERCENT=1)
    def test_storage_warning_triggered_when_quota_threshold_exceeded(self):
        # Envoie une vidéo avec un quota max très bas (1 Mo) et un seuil d'alerte à 1%
        video_bytes = b'\x00\x00\x00\x18ftypmp42' + b'videodata' * 5000
        self.client.post(
            '/api/superadmin/media',
            {'file': SimpleUploadedFile('clip_lourd.mp4', video_bytes, 'video/mp4')},
            format='multipart',
        )
        res = self.client.get('/api/superadmin/media')
        storage = res.data['storage']
        self.assertTrue(storage['isWarning'])
        self.assertIsNotNone(storage['warningMessage'])
        self.assertIn('Attention : la médiathèque occupe', storage['warningMessage'])

    def test_filter_by_usage_status(self):
        # 1 média utilisé, 1 inutilisé
        m_used = self.upload_image('m_used.png', alt='Utilisé').data
        m_unused = self.upload_image('m_unused.png', alt='Inutilisé').data

        ContentVersion.objects.create(
            key='p2-1',
            kind=ContentVersion.KIND_LESSON79,
            number=1,
            publish_at=timezone.now() - timedelta(minutes=1),
            content={'id': 'p2-1', 'title': 'L2-1', 'screens': [{'text': 'x', 'image': m_used['ref']}]}
        )

        res_used = self.client.get('/api/superadmin/media?usage=used')
        used_ids = [m['id'] for m in res_used.data['results']]
        self.assertIn(m_used['id'], used_ids)
        self.assertNotIn(m_unused['id'], used_ids)

        res_unused = self.client.get('/api/superadmin/media?usage=unused')
        unused_ids = [m['id'] for m in res_unused.data['results']]
        self.assertIn(m_unused['id'], unused_ids)
        self.assertNotIn(m_used['id'], unused_ids)
