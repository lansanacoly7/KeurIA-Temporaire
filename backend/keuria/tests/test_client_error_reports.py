import logging
from unittest.mock import patch

from django.conf import settings
from django.core.cache import cache
from rest_framework.test import APIClient, APITestCase

from keuria.monitoring import ClientErrorThrottle

URL = '/api/monitoring/client-error'


class ClientErrorReportTests(APITestCase):
    def setUp(self):
        cache.clear()

    def test_un_rapport_valide_est_journalise_sans_donnee_personnelle(self):
        with self.assertLogs('keuria.client', level=logging.ERROR) as logs:
            response = self.client.post(URL, {
                'kind': 'error', 'message': 'TypeError: x est indéfini pour awa@example.com',
                'stack': 'at lecon (app.js:1:1)', 'path': '/dashboard/modules?token=secret#haut',
            }, format='json')
        self.assertEqual(response.status_code, 204)
        line = logs.output[0]
        self.assertIn('path=/dashboard/modules ', line)
        self.assertNotIn('token=secret', line)
        self.assertNotIn('awa@example.com', line)
        self.assertIn('[e-mail masqué]', line)

    def test_aucune_session_requise_et_pas_de_csrf(self):
        client = APIClient(enforce_csrf_checks=True)
        response = client.post(URL, {'kind': 'boundary', 'message': 'boom'}, format='json')
        self.assertEqual(response.status_code, 204)

    def test_un_rapport_invalide_est_refuse(self):
        self.assertEqual(self.client.post(URL, {'kind': 'inconnu', 'message': 'x'}, format='json').status_code, 400)
        self.assertEqual(self.client.post(URL, {}, format='json').status_code, 400)

    def test_les_textes_trop_longs_sont_refuses(self):
        self.assertEqual(self.client.post(URL, {'message': 'x' * 5000}, format='json').status_code, 400)

    def test_methode_get_interdite(self):
        self.assertEqual(self.client.get(URL).status_code, 405)

    def test_limitation_du_debit(self):
        rates = {**settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'], 'client_error': '3/min'}
        with patch.object(ClientErrorThrottle, 'THROTTLE_RATES', rates):
            codes = [self.client.post(URL, {'message': 'x'}, format='json').status_code for _ in range(5)]
        self.assertEqual(codes[:3], [204, 204, 204])
        self.assertEqual(codes[3], 429)
