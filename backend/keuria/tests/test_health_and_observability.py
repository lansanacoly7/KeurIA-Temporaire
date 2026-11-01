import json
import logging
from unittest import mock

from django.test import Client, SimpleTestCase, TestCase, override_settings

from keuria.observability import JsonFormatter, RequestIdFilter, current_request_id


class HealthProbeTests(TestCase):
    def test_live_answers_without_any_login(self):
        response = self.client.get('/api/health/live')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'status': 'ok'})
        self.assertIn('no-cache', response['Cache-Control'])

    def test_ready_checks_the_database_and_the_cache(self):
        response = self.client.get('/api/health/ready')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'status': 'ok', 'checks': {'database': True, 'cache': True}})

    def test_ready_turns_503_when_the_database_is_down(self):
        with mock.patch('keuria.health._database_ok', return_value=False):
            response = self.client.get('/api/health/ready')
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()['status'], 'degraded')
        self.assertFalse(response.json()['checks']['database'])

    def test_probes_only_accept_get(self):
        self.assertEqual(self.client.post('/api/health/live').status_code, 405)

    @override_settings(SECURE_SSL_REDIRECT=True, SECURE_REDIRECT_EXEMPT=[r'^api/health/'])
    def test_probes_are_not_redirected_to_https_but_the_rest_is(self):
        client = Client()  # nouveau gestionnaire : la chaîne de middlewares relit les réglages
        self.assertEqual(client.get('/api/health/live').status_code, 200)
        self.assertEqual(client.get('/api/profile').status_code, 301)


class RequestIdTests(TestCase):
    def test_a_request_id_is_created_and_returned(self):
        response = self.client.get('/api/health/live')
        self.assertRegex(response['X-Request-ID'], r'^[0-9a-f]{32}$')

    def test_a_clean_incoming_request_id_is_kept(self):
        response = self.client.get('/api/health/live', headers={'X-Request-ID': 'abc-123_DEF.456'})
        self.assertEqual(response['X-Request-ID'], 'abc-123_DEF.456')

    def test_a_dirty_incoming_request_id_is_replaced(self):
        # Retour à la ligne ou contenu étrange : jamais recopié dans les journaux.
        response = self.client.get('/api/health/live', headers={'X-Request-ID': 'bad id\nforged line'})
        self.assertRegex(response['X-Request-ID'], r'^[0-9a-f]{32}$')

    def test_the_id_does_not_leak_outside_the_request(self):
        self.client.get('/api/health/live')
        self.assertEqual(current_request_id(), '-')


class AccessLogTests(TestCase):
    def test_an_access_line_is_written_without_personal_data(self):
        with self.assertLogs('keuria.access', level='INFO') as captured:
            self.client.get('/api/profile?email=secret@example.com')
        record = captured.records[0]
        self.assertEqual((record.method, record.path, record.status), ('GET', '/api/profile', 401))
        self.assertIsNone(record.user_id)
        self.assertNotIn('secret@example.com', captured.output[0])  # ni l'URL complète ni la requête

    def test_health_probes_are_not_logged(self):
        with self.assertNoLogs('keuria.access', level='INFO'):
            self.client.get('/api/health/live')


class JsonFormatterTests(SimpleTestCase):
    def test_one_valid_json_object_per_event(self):
        record = logging.LogRecord('apps.test', logging.WARNING, __file__, 1, 'bonjour %s', ('Fatou',), None)
        RequestIdFilter().filter(record)
        payload = json.loads(JsonFormatter().format(record))
        self.assertEqual(payload['level'], 'WARNING')
        self.assertEqual(payload['message'], 'bonjour Fatou')
        self.assertEqual(payload['request_id'], '-')

    def test_exceptions_are_included(self):
        try:
            raise ValueError('boom')
        except ValueError:
            import sys

            record = logging.LogRecord('apps.test', logging.ERROR, __file__, 1, 'échec', (), sys.exc_info())
        payload = json.loads(JsonFormatter().format(record))
        self.assertIn('ValueError: boom', payload['exception'])


class AlertingTests(TestCase):
    @override_settings(
        ADMINS=[('Ops', 'ops@keuria.sn')],
        WHATSAPP_ALERT_WEBHOOK_URL='https://webhook.example.com/alerts'
    )
    def test_alert_dispatched_with_email_and_whatsapp(self):
        from keuria.observability import dispatch_critical_alert

        with mock.patch('keuria.observability.send_critical_email_alert') as mock_email, \
             mock.patch('keuria.observability.send_whatsapp_alert') as mock_wa:
            dispatch_critical_alert(
                subject="[KeurIA TEST 500] Erreur de test",
                message="Détail du test d'alerte",
                context={'method': 'POST', 'path': '/api/test/fail', 'status': 500},
                sync=True
            )
            mock_email.assert_called_once()
            mock_wa.assert_called_once()

    def test_alert_cooldown_throttles_rapid_duplicates(self):
        from keuria.observability import is_alert_throttled

        fingerprint = "POST:/api/critical-crash:500"
        # Premier appel : non throttlé
        self.assertFalse(is_alert_throttled(fingerprint, cooldown=10.0))
        # Deuxième appel immédiat : throttlé
        self.assertTrue(is_alert_throttled(fingerprint, cooldown=10.0))

    def test_send_whatsapp_alert_handles_network_error_gracefully(self):
        from keuria.observability import send_whatsapp_alert

        with override_settings(WHATSAPP_ALERT_WEBHOOK_URL='https://invalid.nowhere/webhook'):
            with mock.patch('urllib.request.urlopen', side_effect=Exception("Connection refused")):
                success = send_whatsapp_alert(subject="Test error", message="Error message", context={'path': '/api/test'})
                self.assertFalse(success)

    @override_settings(DEBUG=False)
    def test_a_webhook_that_is_not_https_is_refused(self):
        from keuria.observability import send_whatsapp_alert

        with mock.patch('urllib.request.urlopen') as mock_urlopen:
            for url in ('http://alerte.example.org/hook', 'file:///etc/passwd', 'ftp://x.example/y', 'alerte.example.org/hook'):
                with override_settings(WHATSAPP_ALERT_WEBHOOK_URL=url):
                    self.assertFalse(send_whatsapp_alert('s', 'm'), url)
            mock_urlopen.assert_not_called()

    def test_without_a_webhook_nothing_is_sent(self):
        from keuria.observability import send_whatsapp_alert

        with override_settings(WHATSAPP_ALERT_WEBHOOK_URL=''):
            self.assertFalse(send_whatsapp_alert('s', 'm'))

    def test_incident_fingerprint_ignores_numbers_and_is_bounded(self):
        from keuria.observability import alert_fingerprint

        self.assertEqual(alert_fingerprint('GET', '/api/x/12', 500), alert_fingerprint('GET', '/api/x/98765', 500))
        self.assertLessEqual(len(alert_fingerprint('GET', '/a' * 500, 500)), 100)

    def test_the_total_number_of_alerts_is_capped(self):
        from keuria.observability import ALERT_BUDGET, is_alert_throttled

        results = [is_alert_throttled(f'GET:/chemin-{chr(97 + i % 26)}{"x" * i}:500') for i in range(ALERT_BUDGET + 5)]
        self.assertEqual(results.count(False), ALERT_BUDGET)  # au-delà du plafond, plus aucune alerte

    @override_settings(ADMINS=[], WHATSAPP_ALERT_WEBHOOK_URL='')
    def test_the_exception_text_never_leaves_the_server(self):
        """Un message d'erreur peut contenir des données d'enfants : seul son type est transmis."""
        from keuria.observability import RequestContextMiddleware

        captured = {}

        def fake_dispatch(**kwargs):
            captured.update(kwargs)

        def boom(request):
            raise ValueError("Duplicate entry 'fatou.diop@example.com' for key 'email'")

        request = mock.MagicMock(path='/api/x', method='GET')
        request.headers = {}
        with mock.patch('keuria.observability.dispatch_critical_alert', side_effect=fake_dispatch):
            with self.assertRaises(ValueError):
                RequestContextMiddleware(boom)(request)
        self.assertIn('ValueError', captured['message'])
        self.assertNotIn('fatou.diop', captured['message'])
        self.assertNotIn('Duplicate entry', captured['message'])

    def test_settings_have_no_hard_coded_alert_recipient(self):
        from django.conf import settings

        self.assertNotIn('alerts@keuria.sn', str(settings.ADMINS))
