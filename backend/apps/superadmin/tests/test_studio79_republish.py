"""Republier sans rien changer est refusé ; deux ouvertures simultanées ne créent qu'une version d'origine (T17).

Le premier point protège l'écran d'un enfant : une publication « à vide » ne doit pas remettre en ligne un texte déjà vu
et ne pas consommer le délai de sécurité pour rien. Le second protège le serveur : deux administrateurs qui ouvrent la
même leçon au même instant doivent aboutir à la même version d'origine, jamais à deux.
"""
from unittest import mock

from django.db import IntegrityError
from django.test import TestCase
from django.utils import timezone

from apps.accounts.models import User
from apps.curriculum.models import ContentVersion
from apps.scolaire.errors import ApiError

from .. import studio79

LESSON = 'p1-1'


class RepublishTests(TestCase):
    def setUp(self):
        super().setUp()
        self.admin = User.objects.create_user(email='admin@keuria.sn', password='Baobab-Dakar-2026',
                                              role=User.ROLE_ADMIN, email_verified=True)

    def test_republishing_the_original_content_is_refused_as_identical(self):
        original = studio79.get_lesson(LESSON)['working']['content']
        studio79.save_draft(self.admin, LESSON, original, 'rien de neuf')

        with self.assertRaises(ApiError) as caught:
            studio79.publish(self.admin, LESSON)

        self.assertIn('identique', caught.exception.message)
        versions = ContentVersion.objects.filter(kind=studio79.KIND, key=LESSON)
        self.assertEqual(versions.filter(publish_at__isnull=False).count(), 1)      # seule la version d'origine est en ligne
        self.assertIsNone(versions.filter(publish_at__gt=timezone.now()).first())   # rien n'a été programmé

    def test_two_simultaneous_opens_create_only_one_version_one(self):
        # Les deux requêtes lisent « aucune version » avant que l'une des deux n'écrive : la seconde heurte l'unicité.
        with mock.patch.object(ContentVersion.objects, 'create', side_effect=IntegrityError('déjà écrite')):
            studio79._ensure_seeded(LESSON)

        self.assertEqual(ContentVersion.objects.filter(kind=studio79.KIND, key=LESSON).count(), 0)

        studio79._ensure_seeded(LESSON)                     # la requête gagnante réessaie, ou la suivante ouvre la leçon
        studio79._ensure_seeded(LESSON)                     # et une réouverture ne rajoute rien

        versions = ContentVersion.objects.filter(kind=studio79.KIND, key=LESSON)
        self.assertEqual(versions.count(), 1)
        self.assertEqual((versions.first().number, versions.first().source), (1, ContentVersion.SOURCE_IMPORT))
