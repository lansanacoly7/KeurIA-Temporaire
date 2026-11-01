from unittest import mock
from django.test import TestCase

from apps.curriculum.parcours79 import (
    Report,
    GAME_VALIDATORS,
    _check_round,
    register_game_validator,
)


class GameValidatorsTestCase(TestCase):
    def test_all_game_validators_accept_standard_signature(self):
        """Tous les validateurs de jeu acceptent la signature (report, where, rnd, stats=None)."""
        report = Report()
        dummy_round = {
            'prompt': 'Question de test',
            'success': 'Bravo !',
            'options': [{'text': 'A', 'correct': True}],
        }
        stats = {}
        for game_type, validator in list(GAME_VALIDATORS.items()):
            # Appel avec les 4 arguments sans lever d'erreur de signature
            try:
                validator(report, f'test_{game_type}', dummy_round, stats)
            except (KeyError, TypeError) as exc:
                # Si le validateur attend des champs spécifiques dans le round, TypeError ne doit PAS venir de la signature
                if isinstance(exc, TypeError) and "takes" in str(exc) and "positional arguments" in str(exc):
                    self.fail(f"Validateur {game_type} ne respecte pas la signature standard : {exc}")

    def test_register_game_validator_and_cleanup(self):
        """register_game_validator enregistre proprement un nouveau type de jeu et le nettoie après le test."""
        dummy_called = []

        def _check_dummy(report, where, rnd, stats=None):
            dummy_called.append((where, rnd.get('type')))
            if not rnd.get('secret_code'):
                report.error(where, "'secret_code' requis pour dummy.")

        with mock.patch.dict(GAME_VALIDATORS, {}):
            register_game_validator('dummy_type', _check_dummy)
            self.assertIn('dummy_type', GAME_VALIDATORS)

            # Test round checking with dummy_type
            report = Report()
            round_valid = {
                'type': 'dummy_type',
                'prompt': 'Consigne test',
                'hint': 'Indice test',
                'success': 'Bravo !',
                'secret_code': 'xyz',
            }
            _check_round(report, 'screen_1 · manche 1', round_valid, stats={})
            self.assertEqual(len(report.errors), 0)
            self.assertEqual(len(dummy_called), 1)

            # Test round checking invalid
            report_bad = Report()
            round_invalid = {
                'type': 'dummy_type',
                'prompt': 'Consigne test',
                'hint': 'Indice test',
                'success': 'Bravo !',
            }
            _check_round(report_bad, 'screen_1 · manche 2', round_invalid, stats={})
            self.assertTrue(any("'secret_code' requis" in e for e in report_bad.errors))

        # After the with block, GAME_VALIDATORS is restored
        self.assertNotIn('dummy_type', GAME_VALIDATORS)
