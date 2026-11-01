"""Lanceur de tests : `python manage.py test` se comporte comme `pytest` (voir conftest.py).

- le cache (compteurs de limitation de débit et de verrouillage) est vidé avant chaque test, sinon les
  connexions d'un test comptent contre le suivant et finissent en erreur 429 ;
- le hachage de mot de passe rapide (MD5) remplace PBKDF2 : la suite passe de plusieurs minutes à quelques secondes.
La production n'est pas concernée : ce lanceur n'est utilisé que par la commande `test`.
"""
from django.core.cache import cache
from django.test import SimpleTestCase
from django.test.runner import DiscoverRunner

_ORIGINAL_SETUP_AND_CALL = SimpleTestCase._setup_and_call


def _setup_and_call_with_clean_cache(test_case, result, debug=False):
    cache.clear()
    return _ORIGINAL_SETUP_AND_CALL(test_case, result, debug)


class KeuriaTestRunner(DiscoverRunner):
    def setup_test_environment(self, **kwargs):
        super().setup_test_environment(**kwargs)
        from django.conf import settings

        settings.PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']
        settings.ASYNC_NOTIFICATIONS = False
        SimpleTestCase._setup_and_call = _setup_and_call_with_clean_cache

    def teardown_test_environment(self, **kwargs):
        SimpleTestCase._setup_and_call = _ORIGINAL_SETUP_AND_CALL
        super().teardown_test_environment(**kwargs)
