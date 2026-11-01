"""Surface exposée en production : administration Django fermée par défaut, cache partagé exigé."""
import os
from unittest import mock

from django.core.checks import Error, Warning
from django.test import SimpleTestCase, override_settings

from keuria.checks import admin_is_not_published_by_default, shared_cache_configured

LOCAL = {'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}
REDIS = {'default': {'BACKEND': 'django.core.cache.backends.redis.RedisCache', 'LOCATION': 'redis://x/1'}}


class SharedCacheCheckTests(SimpleTestCase):
    @override_settings(CACHES=LOCAL)
    def test_local_cache_is_a_deployment_error(self):
        with mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop('ALLOW_LOCAL_CACHE', None)
            problems = shared_cache_configured(None)

        self.assertEqual([type(p) for p in problems], [Error])

    @override_settings(CACHES=LOCAL)
    def test_single_process_can_opt_out(self):
        with mock.patch.dict(os.environ, {'ALLOW_LOCAL_CACHE': 'True'}):
            self.assertEqual(shared_cache_configured(None), [])

    @override_settings(CACHES=REDIS)
    def test_redis_is_accepted(self):
        self.assertEqual(shared_cache_configured(None), [])


class AdminExposureTests(SimpleTestCase):
    @override_settings(ADMIN_ENABLED=True, ADMIN_URL='admin/')
    def test_default_admin_address_is_flagged(self):
        self.assertEqual([type(p) for p in admin_is_not_published_by_default(None)], [Warning])

    @override_settings(ADMIN_ENABLED=True, ADMIN_URL='gestion-7f3a/')
    def test_custom_address_is_fine(self):
        self.assertEqual(admin_is_not_published_by_default(None), [])

    @override_settings(ADMIN_ENABLED=False, ADMIN_URL='admin/')
    def test_closed_admin_is_fine(self):
        self.assertEqual(admin_is_not_published_by_default(None), [])
