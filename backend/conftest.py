import pytest
from django.core.cache import cache


@pytest.fixture(autouse=True)
def _clean_cache():
    """Le lanceur de tests de Django vide le cache entre deux tests (keuria/test_runner.py) ; pytest, non. Sans cela, la conversation de
    Palou, les compteurs de verrouillage et les alertes d'un test fuient dans le suivant."""
    cache.clear()
    yield
    cache.clear()


@pytest.fixture(autouse=True)
def _fast_password_hashing(settings):
    """Comme le lanceur Django : hachage rapide en test (le vrai PBKDF2 de production ralentit chaque création de compte)."""
    settings.PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']


@pytest.fixture(autouse=True)
def _synchronous_parent_notifications(settings):
    """Les notifications parentales sont exécutées en tâche de fond en production. En test, on les force en synchrone
    pour que les effets de bord (e-mail, push) soient observables immédiatement et sans timing dépendant du thread."""
    settings.ASYNC_NOTIFICATIONS = False


@pytest.fixture(autouse=True)
def _answer_options_in_stored_order(request, settings):
    """Les anciens tests de défi/énigme désignent les propositions par leur position dans la banque de questions : ils tournent
    donc sans mélange. Les tests marqués `@pytest.mark.shuffle` (apps/progress/tests/test_answer_shuffle.py) l'activent."""
    settings.SHUFFLE_ANSWER_OPTIONS = request.node.get_closest_marker('shuffle') is not None
