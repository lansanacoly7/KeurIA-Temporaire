from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User

from ..models import FamilyMessage

URL = '/api/famille/messages'
PASSWORD = 'motdepasse123'


class FamilyChatTests(APITestCase):
    def setUp(self):
        cache.clear()  # compteurs de limitation d'envoi
        self.parent = User.objects.create_user('maman@example.com', PASSWORD, role=User.ROLE_PARENT, display_name='Fatou Diop')
        self.child = User.objects.create_user('awa@example.com', PASSWORD, role=User.ROLE_STUDENT, display_name='Awa', parent=self.parent)
        self.other_parent = User.objects.create_user('papa@example.com', PASSWORD, role=User.ROLE_PARENT, display_name='Moussa Fall')
        self.other_child = User.objects.create_user('ibou@example.com', PASSWORD, role=User.ROLE_STUDENT, display_name='Ibou', parent=self.other_parent)

    def send(self, user, text):
        self.client.force_login(user)
        return self.client.post(URL, {'text': text}, format='json')

    def read(self, user, **params):
        self.client.force_login(user)
        return self.client.get(URL, params)

    def test_sign_in_is_required(self):
        self.assertIn(self.client.get(URL).status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))
        self.assertIn(self.client.post(URL, {'text': 'coucou'}, format='json').status_code,
                      (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_parent_and_child_share_their_family_channel(self):
        self.assertEqual(self.send(self.parent, 'Bravo pour ta leçon !').status_code, status.HTTP_201_CREATED)
        self.assertEqual(self.send(self.child, 'Merci maman').status_code, status.HTTP_201_CREATED)

        seen_by_child = self.read(self.child).data
        self.assertTrue(seen_by_child['available'])
        self.assertEqual([m['text'] for m in seen_by_child['messages']], ['Bravo pour ta leçon !', 'Merci maman'])
        self.assertEqual([m['senderRole'] for m in seen_by_child['messages']], ['parent', 'enfant'])
        self.assertEqual([m['mine'] for m in seen_by_child['messages']], [False, True])
        self.assertEqual(seen_by_child['messages'][0]['senderName'], 'Fatou')

    def test_other_family_sees_nothing_and_cannot_choose_a_channel(self):
        self.send(self.parent, 'Message privé')
        # Un identifiant de famille envoyé par le navigateur est ignoré.
        self.client.force_login(self.other_parent)
        self.client.post(URL, {'text': 'Intrus', 'family': self.parent.id, 'familyId': self.parent.id}, format='json')

        self.assertEqual([m['text'] for m in self.read(self.other_child, family=self.parent.id).data['messages']], ['Intrus'])
        self.assertEqual([m['text'] for m in self.read(self.parent).data['messages']], ['Message privé'])
        self.assertEqual(FamilyMessage.objects.get(text='Intrus').family, self.other_parent)

    def test_sender_is_set_by_the_server(self):
        self.client.force_login(self.child)
        self.client.post(URL, {'text': 'Salut', 'senderId': self.parent.id, 'senderRole': 'parent'}, format='json')
        message = FamilyMessage.objects.get()
        self.assertEqual(message.sender, self.child)
        self.assertEqual(self.read(self.parent).data['messages'][0]['senderRole'], 'enfant')

    def test_accounts_without_family_have_no_channel(self):
        teacher = User.objects.create_user('prof@example.com', PASSWORD, role=User.ROLE_TEACHER)
        lonely_parent = User.objects.create_user('seul@example.com', PASSWORD, role=User.ROLE_PARENT)
        orphan = User.objects.create_user('eleve@example.com', PASSWORD, role=User.ROLE_STUDENT)
        for user in (teacher, lonely_parent, orphan):
            self.assertEqual(self.read(user).data, {'available': False, 'messages': []})
            self.assertEqual(self.send(user, 'Bonjour').status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(FamilyMessage.objects.exists())

    def test_empty_or_too_long_messages_are_refused(self):
        for text in ('', '   ', 'x' * 1001):
            self.assertEqual(self.send(self.parent, text).status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.send(self.parent, 'x' * 1000).status_code, status.HTTP_201_CREATED)

    def test_after_returns_only_new_messages(self):
        first = self.send(self.parent, 'Un').data['message']['id']
        self.send(self.child, 'Deux')
        self.assertEqual([m['text'] for m in self.read(self.parent, after=first).data['messages']], ['Deux'])

    def test_sending_is_rate_limited(self):
        codes = [self.send(self.child, f'm{i}').status_code for i in range(31)]
        self.assertEqual(codes[-1], status.HTTP_429_TOO_MANY_REQUESTS)
        # La lecture reste possible pendant la limitation.
        self.assertEqual(self.read(self.child).status_code, status.HTTP_200_OK)
