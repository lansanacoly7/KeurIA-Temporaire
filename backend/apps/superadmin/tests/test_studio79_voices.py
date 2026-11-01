"""Les voix du studio 7-9 : `spoken_clips` doit nommer exactement les fichiers que la voix officielle a enregistrés (T17).

`voiceOff` coupe la voix d'un passage dont le texte a changé : si une clé ne correspond à aucun fichier, l'enfant entendrait
du silence à tort ; si un fichier narré échappe à `spoken_clips`, un texte modifié lirait l'ancien enregistrement.
Les autres fichiers du dossier (`e05-m1-ok`, `e05-m1-o2`…) sont les RÉACTIONS de manche, dites par `sayRound` côté enfant :
elles ne font pas partie du récit et ne doivent pas entrer dans `voiceOff`.
"""
import re
from pathlib import Path

from django.test import SimpleTestCase

from apps.curriculum import parcours79

from ..studio79 import spoken_clips

AUDIO = Path(__file__).resolve().parents[4] / 'frontend' / 'public' / 'audio' / 'palou' / 'lecons'
REACTION = re.compile(r'^e\d{2}-m\d+-(ok|o\d+|i\d+|s\d+|f\d+|r\d+|a|d)$')     # réaction de manche, pas un passage narré


def lesson_audio_dir(lesson_id):
    return AUDIO / f'm{int(lesson_id.split("-")[0][1:]):02d}' / lesson_id


class SpokenClipsMatchTheRecordingsTests(SimpleTestCase):
    """La référence des voix doit être exacte pour les 40 leçons d'origine."""

    def lessons(self):
        return [lesson for _, chapter in parcours79.load_chapters() for lesson in chapter['lessons']]

    def test_every_spoken_key_has_its_recording_on_disk(self):
        for lesson in self.lessons():
            clips = spoken_clips(lesson)
            self.assertTrue(clips, f"{lesson['id']} : Palou a au moins une phrase à dire")
            recorded = {path.stem[len(lesson['id']) + 1:] for path in lesson_audio_dir(lesson['id']).glob('*.mp3')}
            missing = sorted(set(clips) - recorded)
            self.assertEqual(missing, [], f"{lesson['id']} : ces clés n'ont aucun fichier audio : {missing}")

    def test_every_recording_is_either_a_spoken_key_or_a_round_reaction(self):
        for lesson in self.lessons():
            clips = set(spoken_clips(lesson))
            recorded = {path.stem[len(lesson['id']) + 1:] for path in lesson_audio_dir(lesson['id']).glob('*.mp3')}
            unexplained = sorted(key for key in recorded - clips if not REACTION.match(key))
            self.assertEqual(unexplained, [],
                             f"{lesson['id']} : ces fichiers ne sont ni un passage narré ni une réaction de manche : {unexplained}")

    def test_the_keys_look_like_the_ones_the_child_player_builds(self):
        """Le lecteur de l'enfant fabrique « e03 », « e04-m1-q », « e07-bravo » : `spoken_clips` doit parler le même langage."""
        for lesson in self.lessons():
            for key in spoken_clips(lesson):
                self.assertRegex(key, r'^(e\d{2}(-m\d+-q)?|e\d{2}-(bravo|retiens))$',
                                 f"{lesson['id']} : la clé « {key} » n'est pas de la forme attendue par le lecteur")

    def test_a_round_question_and_the_bravo_page_are_spoken_too(self):
        lesson = next(lesson for lesson in self.lessons() if lesson['id'] == 'p1-1')
        clips = spoken_clips(lesson)
        bravo = lesson['screens'][-1]

        self.assertEqual(bravo['kind'], 'bravo')
        self.assertIn('e05-m1-q', clips)                      # la consigne de la première manche
        self.assertIn('e07-bravo', clips)                     # la page de victoire
        self.assertIn('e07-retiens', clips)
        self.assertEqual(clips['e07-bravo'], bravo.get('dit') or bravo.get('text'))
        self.assertEqual(clips['e07-retiens'], bravo.get('learned'))
