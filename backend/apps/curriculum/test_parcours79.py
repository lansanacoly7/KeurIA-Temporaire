"""Le contenu du parcours 7-9 respecte la bible narrative, et le contrôle refuse bien ce qui ne la respecte pas."""
import copy

from django.test import SimpleTestCase

from . import parcours79


def real_chapter():
    chapters = parcours79.load_chapters()
    assert chapters, 'aucun chapitre trouvé dans frontend/content/parcours79'
    return chapters[0][0], copy.deepcopy(chapters[0][1])


def errors_for(data, name='m01.json'):
    return parcours79.validate_all(chapters=[(name, data)]).errors


class RealContentTests(SimpleTestCase):
    def test_all_chapters_are_valid(self):
        report = parcours79.validate_all()

        self.assertEqual(report.errors, [])

    def test_every_lesson_id_is_unique_and_in_the_catalog(self):
        ids = [lesson['id'] for _, chapter in parcours79.load_chapters() for lesson in chapter['lessons']]

        self.assertEqual(len(ids), len(set(ids)))
        catalog = {lesson['id'] for lessons in parcours79._catalog_worlds().values() for lesson in lessons}
        self.assertTrue(set(ids) <= catalog)

    def test_export_for_the_reviewer_contains_the_text_and_the_answers(self):
        markdown = parcours79.export_markdown()

        self.assertIn('C’est quoi une IA ?', markdown)
        self.assertIn('✅', markdown)
        self.assertIn('❌', markdown)


class AntiVernishRulesTests(SimpleTestCase):
    def test_a_lesson_after_the_first_needs_a_callback(self):
        _, data = real_chapter()
        del data['lessons'][1]['callback']

        self.assertTrue(any('rappel' in e for e in errors_for(data)))

    def test_filler_phrases_are_forbidden(self):
        _, data = real_chapter()
        data['lessons'][0]['screens'][0]['text'] = 'Une caisse arrive. Au Sénégal, les enfants jouent.'

        self.assertTrue(any('remplissage' in e for e in errors_for(data)))

    def test_cast_must_match_the_names_used_in_the_text(self):
        _, data = real_chapter()
        data['lessons'][1]['cast'].append('papa-ibou')

        self.assertTrue(any('absents du texte' in e for e in errors_for(data)))

    def test_a_named_character_must_be_in_the_cast(self):
        _, data = real_chapter()
        data['lessons'][1]['screens'][0]['text'] = 'Papa Ibou arrive dans la cour. Palou saute de joie.'

        self.assertTrue(any('absents de la distribution' in e for e in errors_for(data)))

    def test_scene_and_problem_are_mandatory(self):
        _, data = real_chapter()
        data['lessons'][0]['scene'] = {}
        data['lessons'][0]['problem'] = ''

        errors = errors_for(data)
        self.assertTrue(any('scène' in e for e in errors))
        self.assertTrue(any('problème' in e for e in errors))


class ReadabilityAndPedagogyTests(SimpleTestCase):
    def test_a_screen_has_two_sentences_at_most(self):
        _, data = real_chapter()
        data['lessons'][0]['screens'][0]['text'] = 'Une caisse. Elle est grande. Elle est lourde.'

        self.assertTrue(any('3 phrases' in e for e in errors_for(data)))

    def test_a_sentence_is_never_longer_than_fourteen_words(self):
        _, data = real_chapter()
        data['lessons'][0]['screens'][0]['text'] = ' '.join(['mot'] * 15) + '.'

        self.assertTrue(any('15 mots' in e for e in errors_for(data)))

    def test_every_wrong_answer_is_explained(self):
        _, data = real_chapter()
        rnd = data['lessons'][0]['screens'][4]['rounds'][0]
        del next(o for o in rnd['options'] if not o.get('correct'))['explain']

        self.assertTrue(any('pas expliquée' in e for e in errors_for(data)))

    def test_exactly_one_correct_answer_in_a_choose_round(self):
        _, data = real_chapter()
        for option in data['lessons'][0]['screens'][4]['rounds'][0]['options']:
            option['correct'] = True

        self.assertTrue(any('bonnes réponses' in e for e in errors_for(data)))

    def test_the_correct_answer_cannot_be_systematically_the_longest(self):
        _, data = real_chapter()
        for screen in data['lessons'][0]['screens']:
            for rnd in screen.get('rounds', []):
                if rnd['type'] == 'choose':
                    for option in rnd['options']:
                        option['label'] = option['label'].rstrip('.') + (' avec beaucoup de détails en plus' if option.get('correct') else '')

        self.assertTrue(any('la plus longue' in e for e in errors_for(data)))

    def test_a_sort_needs_a_box_for_each_item(self):
        _, data = real_chapter()
        rnd = data['lessons'][2]['screens'][3]['rounds'][0]
        rnd['items'][0]['bin'] = 'inconnue'

        self.assertTrue(any('boîte inconnue' in e for e in errors_for(data)))


class CatalogAndReviewTests(SimpleTestCase):
    def test_titles_must_match_the_server_catalog(self):
        _, data = real_chapter()
        data['lessons'][0]['title'] = 'Un autre titre'

        self.assertTrue(any('titre différent' in e for e in errors_for(data)))

    def test_unknown_module_is_refused(self):
        _, data = real_chapter()
        data['module']['id'] = 'p99'

        self.assertTrue(any('inconnu du catalogue' in e for e in errors_for(data)))

    def test_prenom_token_is_only_for_the_congratulations(self):
        _, data = real_chapter()
        data['lessons'][0]['screens'][0]['text'] = 'Salut {prenom} ! Une caisse arrive.'

        self.assertTrue(any('félicitations' in e for e in errors_for(data)))


def whois_chapter():
    """Le chapitre 3, dont la leçon 9 contient « Qui est-ce ? avec Palou » ; renvoie (fichier, données, manche)."""
    for name, data in parcours79.load_chapters():
        data = copy.deepcopy(data)
        for lesson in data['lessons']:
            for screen in lesson['screens']:
                for rnd in screen.get('rounds', []):
                    if rnd['type'] == 'whois':
                        return name, data, rnd
    raise AssertionError('aucune manche « Qui est-ce ? » dans le contenu')


class WhoisRoundTests(SimpleTestCase):
    """« Qui est-ce ? avec Palou » doit toujours être gagnable et montrer qu'il faut plusieurs données."""

    def test_the_real_whois_round_is_valid(self):
        name, data, _ = whois_chapter()

        self.assertEqual(errors_for(data, name), [])

    def test_a_single_data_that_finds_the_object_is_refused(self):
        name, data, rnd = whois_chapter()
        for item in rnd['items']:
            if item['id'] != rnd['target']:
                item['tags'] = [t for t in item['tags'] if t != 'nom-mangue']  # « mangue » suffit seule à isoler la cible

        self.assertTrue(any('suffit seule' in e for e in errors_for(data, name)))

    def test_all_right_data_must_isolate_the_target(self):
        name, data, rnd = whois_chapter()
        for item in rnd['items']:
            if item['id'] != rnd['target']:
                item['tags'] = ['nom-mangue', 'couleur-vert']  # un autre objet a exactement les mêmes données

        self.assertTrue(any('exactement 1 objet' in e for e in errors_for(data, name)))

    def test_a_wrong_data_needs_an_explanation(self):
        name, data, rnd = whois_chapter()
        del next(t for t in rnd['tags'] if t.get('explain'))['explain']

        self.assertTrue(any('n\'est pas expliquée' in e for e in errors_for(data, name)))

    def test_the_target_must_be_one_of_the_objects(self):
        name, data, rnd = whois_chapter()
        rnd['target'] = 'inconnu'

        self.assertTrue(any('n\'est pas parmi les objets' in e for e in errors_for(data, name)))



def rulesort_chapter():
    """Le chapitre 3, dont la leçon 10 contient « La machine à trier » ; renvoie (fichier, données, manche)."""
    for name, data in parcours79.load_chapters():
        data = copy.deepcopy(data)
        for lesson in data['lessons']:
            for screen in lesson['screens']:
                for rnd in screen.get('rounds', []):
                    if rnd['type'] == 'rulesort':
                        return name, data, rnd
    raise AssertionError('aucune manche « La machine à trier » dans le contenu')


class RuleSortRoundTests(SimpleTestCase):
    """« La machine à trier » : une seule bonne règle, et chaque règle change vraiment le rangement."""

    def test_the_real_rulesort_round_is_valid(self):
        name, data, _ = rulesort_chapter()

        self.assertEqual(errors_for(data, name), [])

    def test_two_correct_rules_are_refused(self):
        name, data, rnd = rulesort_chapter()
        for rule in rnd['rules']:
            rule['correct'] = True

        self.assertTrue(any('exactement 1 bonne règle' in e for e in errors_for(data, name)))

    def test_two_rules_giving_the_same_result_are_refused(self):
        name, data, rnd = rulesort_chapter()
        rnd['rules'][1]['prop'] = rnd['rules'][0]['prop']
        rnd['rules'][1]['groups'] = dict(rnd['rules'][0]['groups'])

        self.assertTrue(any('même rangement' in e for e in errors_for(data, name)))

    def test_a_wrong_rule_needs_an_explanation(self):
        name, data, rnd = rulesort_chapter()
        del next(r for r in rnd['rules'] if not r.get('correct'))['explain']

        self.assertTrue(any('n\'est pas expliquée' in e for e in errors_for(data, name)))

    def test_every_value_needs_a_group_name(self):
        name, data, rnd = rulesort_chapter()
        rnd['rules'][0]['groups'].pop('mangue')

        self.assertTrue(any('pas de nom de groupe' in e for e in errors_for(data, name)))


def cleanup_chapter():
    """Le chapitre 3, dont la leçon 11 contient « Données propres » ; renvoie (fichier, données, manche)."""
    for name, data in parcours79.load_chapters():
        data = copy.deepcopy(data)
        for lesson in data['lessons']:
            for screen in lesson['screens']:
                for rnd in screen.get('rounds', []):
                    if rnd['type'] == 'cleanup':
                        return name, data, rnd
    raise AssertionError('aucune manche « Données propres » dans le contenu')


class CleanupRoundTests(SimpleTestCase):
    """« Données propres, IA contente » : des intrus à retirer, des bonnes données à garder et expliquées."""

    def test_the_real_cleanup_round_is_valid(self):
        name, data, _ = cleanup_chapter()

        self.assertEqual(errors_for(data, name), [])

    def test_a_round_without_intruder_is_refused(self):
        name, data, rnd = cleanup_chapter()
        for row in rnd['rows']:
            row.pop('intruder', None)
            row.setdefault('explain', 'ok')

        self.assertTrue(any('entre 1 et 3 intrus' in e for e in errors_for(data, name)))

    def test_too_few_good_data_are_refused(self):
        name, data, rnd = cleanup_chapter()
        for row in rnd['rows'][1:]:
            row['intruder'] = True

        self.assertTrue(any('au moins 2 bonnes données' in e for e in errors_for(data, name)))

    def test_a_good_row_needs_an_explanation(self):
        name, data, rnd = cleanup_chapter()
        del next(r for r in rnd['rows'] if not r.get('intruder'))['explain']

        self.assertTrue(any('n\'est pas expliquée' in e for e in errors_for(data, name)))


def train_chapter():
    """Le chapitre 4, dont la leçon 13 contient « L'entraînement de Palou » ; renvoie (fichier, données, manche)."""
    for name, data in parcours79.load_chapters():
        data = copy.deepcopy(data)
        for lesson in data['lessons']:
            for screen in lesson['screens']:
                for rnd in screen.get('rounds', []):
                    if rnd['type'] == 'train':
                        return name, data, rnd
    raise AssertionError('aucune manche « L\'entraînement de Palou » dans le contenu')


class TrainRoundTests(SimpleTestCase):
    """« L'entraînement de Palou » : de bons exemples à montrer, de mauvais exemples expliqués, une réaction de Palou par exemple."""

    def test_the_real_train_round_is_valid(self):
        name, data, _ = train_chapter()

        self.assertEqual(errors_for(data, name), [])

    def test_a_bad_example_needs_an_explanation(self):
        name, data, rnd = train_chapter()
        del next(e for e in rnd['examples'] if not e.get('good'))['explain']

        self.assertTrue(any('n\'est pas expliqué' in e for e in errors_for(data, name)))

    def test_palou_needs_one_sentence_per_good_example(self):
        name, data, rnd = train_chapter()
        rnd['says'].pop()

        self.assertTrue(any('une phrase par bon exemple' in e for e in errors_for(data, name)))

    def test_a_round_without_bad_example_is_refused(self):
        name, data, rnd = train_chapter()
        for example in rnd['examples']:
            example['good'] = True

        self.assertTrue(any('au moins 1 mauvais exemple' in e for e in errors_for(data, name)))


def round_of_type(kind):
    """La première manche de ce type dans le contenu ; renvoie (fichier, données, manche)."""
    for name, data in parcours79.load_chapters():
        data = copy.deepcopy(data)
        for lesson in data['lessons']:
            for screen in lesson['screens']:
                for rnd in screen.get('rounds', []):
                    if rnd['type'] == kind:
                        return name, data, rnd
    raise AssertionError(f'aucune manche « {kind} » dans le contenu')


class RelabelRoundTests(SimpleTestCase):
    """« Corrige l'étiquette » : une seule photo à corriger, les autres expliquées."""

    def test_the_real_relabel_round_is_valid(self):
        name, data, _ = round_of_type('relabel')

        self.assertEqual(errors_for(data, name), [])

    def test_two_photos_to_fix_are_refused(self):
        name, data, rnd = round_of_type('relabel')
        for card in rnd['cards'][:2]:
            card['fix'] = 'autre'

        self.assertTrue(any('exactement 1 photo à corriger' in e for e in errors_for(data, name)))

    def test_the_fix_must_differ_from_the_wrong_tag(self):
        name, data, rnd = round_of_type('relabel')
        card = next(c for c in rnd['cards'] if c.get('fix'))
        card['fix'] = card['tag']

        self.assertTrue(any('doit différer' in e for e in errors_for(data, name)))

    def test_a_correct_photo_needs_an_explanation(self):
        name, data, rnd = round_of_type('relabel')
        del next(c for c in rnd['cards'] if not c.get('fix'))['explain']

        self.assertTrue(any('n\'est pas expliquée' in e for e in errors_for(data, name)))


class FocusRoundTests(SimpleTestCase):
    """« Les yeux de Palou » : une photo, des crans de netteté, et un cran où Palou reconnaît."""

    def test_the_real_focus_round_is_valid(self):
        name, data, _ = round_of_type('focus')

        self.assertEqual(errors_for(data, name), [])

    def test_palou_must_not_recognise_at_the_first_level(self):
        name, data, rnd = round_of_type('focus')
        rnd['enough'] = 0

        self.assertTrue(any('« enough »' in e for e in errors_for(data, name)))

    def test_enough_must_be_one_of_the_levels(self):
        name, data, rnd = round_of_type('focus')
        rnd['enough'] = len(rnd['levels'])

        self.assertTrue(any('« enough »' in e for e in errors_for(data, name)))

    def test_every_level_needs_a_sentence(self):
        name, data, rnd = round_of_type('focus')
        rnd['levels'][1]['says'] = ''

        self.assertTrue(any('phrase de Palou' in e for e in errors_for(data, name)))

    def test_the_effect_must_be_known(self):
        name, data, rnd = round_of_type('focus')
        rnd['effect'] = 'rainbow'

        self.assertTrue(any('« effect »' in e for e in errors_for(data, name)))


class ShieldRoundTests(SimpleTestCase):
    """« Cache pour protéger » : des secrets à cacher, des informations sans danger expliquées."""

    def test_the_real_shield_rounds_are_valid(self):
        name, data, _ = round_of_type('shield')

        self.assertEqual(errors_for(data, name), [])

    def test_at_least_two_secrets_are_needed(self):
        name, data, rnd = round_of_type('shield')
        for item in rnd['items'][1:]:
            item['secret'] = False
            item['explain'] = 'ok'

        self.assertTrue(any('au moins 2 informations secrètes' in e for e in errors_for(data, name)))

    def test_a_round_without_safe_item_is_refused(self):
        name, data, rnd = round_of_type('shield')
        for item in rnd['items']:
            item['secret'] = True

        self.assertTrue(any('au moins 1 information sans danger' in e for e in errors_for(data, name)))

    def test_a_safe_item_needs_an_explanation(self):
        name, data, rnd = round_of_type('shield')
        del next(i for i in rnd['items'] if not i.get('secret'))['explain']

        self.assertTrue(any('n\'est pas expliquée' in e for e in errors_for(data, name)))


class MachineRoundTests(SimpleTestCase):
    """« Construis ton IA » : 3 cases à remplir, une seule bonne option par case, puis des cas à présenter à la machine."""

    def test_the_real_machine_round_is_valid(self):
        name, data, _ = round_of_type('machine')

        self.assertEqual(errors_for(data, name), [])

    def test_exactly_three_slots_are_needed(self):
        name, data, rnd = round_of_type('machine')
        rnd['slots'].pop()

        self.assertTrue(any('exactement 3 cases' in e for e in errors_for(data, name)))

    def test_each_slot_needs_exactly_one_correct_option(self):
        name, data, rnd = round_of_type('machine')
        for option in rnd['slots'][0]['options']:
            option['correct'] = True

        self.assertTrue(any('exactement 1 bonne option' in e for e in errors_for(data, name)))

    def test_a_wrong_option_needs_an_explanation(self):
        name, data, rnd = round_of_type('machine')
        del next(o for o in rnd['slots'][1]['options'] if not o.get('correct'))['explain']

        self.assertTrue(any('n\'est pas expliquée' in e for e in errors_for(data, name)))

    def test_the_demo_needs_answers_and_a_reachable_goal(self):
        name, data, rnd = round_of_type('machine')
        rnd['demo']['cases'][0]['result'] = ''
        rnd['demo']['need'] = 99

        errors = errors_for(data, name)
        self.assertTrue(any('« result »' in e for e in errors))
        self.assertTrue(any('« demo.need »' in e for e in errors))


class VerifyRoundTests(SimpleTestCase):
    """« Enquête » : des questions utiles et inutiles, un tampon à poser, une jauge facultative."""

    def test_the_real_verify_rounds_are_valid(self):
        name, data, _ = round_of_type('verify')

        self.assertEqual(errors_for(data, name), [])

    def test_need_cannot_exceed_the_useful_questions(self):
        name, data, rnd = round_of_type('verify')
        rnd['need'] = 99

        self.assertTrue(any('« need »' in e for e in errors_for(data, name)))

    def test_a_useless_question_needs_an_explanation(self):
        name, data, rnd = round_of_type('verify')
        del next(c for c in rnd['checks'] if not c.get('useful'))['explain']

        self.assertTrue(any('question inutile' in e and 'n\'est pas expliquée' in e for e in errors_for(data, name)))

    def test_exactly_one_stamp_is_correct(self):
        name, data, rnd = round_of_type('verify')
        for stamp in rnd['stamps']:
            stamp['correct'] = True

        self.assertTrue(any('exactement 1 bon' in e for e in errors_for(data, name)))

    def test_a_wrong_stamp_needs_an_explanation(self):
        name, data, rnd = round_of_type('verify')
        del next(s for s in rnd['stamps'] if not s.get('correct'))['explain']

        self.assertTrue(any('mauvais tampon' in e for e in errors_for(data, name)))

    def test_the_meter_must_stay_between_0_and_100(self):
        name, data, rnd = round_of_type('verify')
        rnd['meter']['start'] = 150

        self.assertTrue(any('« meter »' in e for e in errors_for(data, name)))


class LoupeRoundTests(SimpleTestCase):
    """« La loupe » : des zones à indice et des zones normales expliquées, placées dans l'image."""

    def test_the_real_loupe_round_is_valid(self):
        name, data, _ = round_of_type('loupe')

        self.assertEqual(errors_for(data, name), [])

    def test_a_spot_outside_the_image_is_refused(self):
        name, data, rnd = round_of_type('loupe')
        rnd['spots'][0]['x'] = 140

        self.assertTrue(any('entre 0 et 100' in e for e in errors_for(data, name)))

    def test_a_normal_spot_needs_an_explanation(self):
        name, data, rnd = round_of_type('loupe')
        del next(s for s in rnd['spots'] if not s.get('clue'))['explain']

        self.assertTrue(any('zone normale' in e for e in errors_for(data, name)))

    def test_at_least_two_clues_are_needed(self):
        name, data, rnd = round_of_type('loupe')
        rnd['need'] = 1

        self.assertTrue(any('« need »' in e for e in errors_for(data, name)))

    def test_every_spot_cannot_be_a_clue(self):
        name, data, rnd = round_of_type('loupe')
        for spot in rnd['spots']:
            spot['clue'] = True

        self.assertTrue(any('au moins 1 zone normale' in e for e in errors_for(data, name)))


class LayersRoundTests(SimpleTestCase):
    """« Décris, Palou dessine » : des cartes à placer, des cartes hors sujet expliquées, une phrase de Palou par étape."""

    def test_the_real_layers_rounds_are_valid(self):
        name, data, _ = round_of_type('layers')

        self.assertEqual(errors_for(data, name), [])

    def test_need_cannot_exceed_the_good_cards(self):
        name, data, rnd = round_of_type('layers')
        rnd['need'] = 99

        self.assertTrue(any('« need »' in e for e in errors_for(data, name)))

    def test_palou_needs_one_sentence_per_card_to_place(self):
        name, data, rnd = round_of_type('layers')
        rnd['says'].append('de trop')

        self.assertTrue(any('une phrase par carte' in e for e in errors_for(data, name)))

    def test_an_off_topic_card_needs_an_explanation(self):
        name, data, rnd = round_of_type('layers')
        del next(c for c in rnd['cards'] if not c.get('good'))['explain']

        self.assertTrue(any('n\'est pas expliquée' in e for e in errors_for(data, name)))

    def test_a_round_without_off_topic_card_is_refused(self):
        name, data, rnd = round_of_type('layers')
        for card in rnd['cards']:
            card['good'] = True

        self.assertTrue(any('au moins 1 carte hors sujet' in e for e in errors_for(data, name)))


class SpeakRoundTests(SimpleTestCase):
    """« Parle à Palou » : la phrase se construit avec les cartes de mots, qui doivent permettre de réussir."""

    def test_the_real_speak_rounds_are_valid(self):
        name, data, _ = round_of_type('speak')

        self.assertEqual(errors_for(data, name), [])

    def test_a_needed_word_without_a_card_is_refused(self):
        name, data, rnd = round_of_type('speak')
        rnd['need'].append(['xylophone'])

        self.assertTrue(any('aucune carte' in e for e in errors_for(data, name)))

    def test_a_word_to_avoid_needs_a_vague_answer(self):
        name, data, rnd = round_of_type('speak')
        rnd['avoid'] = [rnd['cards'][0]]
        rnd.pop('vague', None)

        self.assertTrue(any('« vague » manquant' in e for e in errors_for(data, name)))

    def test_palou_must_answer_when_a_word_is_missing(self):
        name, data, rnd = round_of_type('speak')
        rnd['missing'] = ''

        self.assertTrue(any('« missing » manquant' in e for e in errors_for(data, name)))

    def test_duplicate_cards_are_refused(self):
        name, data, rnd = round_of_type('speak')
        rnd['cards'][1] = rnd['cards'][0]

        self.assertTrue(any('cartes de mots doivent être différentes' in e for e in errors_for(data, name)))


class LensRoundTests(SimpleTestCase):
    """« Regarde comme Palou » : un seul bon regard, les autres expliqués."""

    def test_the_real_lens_round_is_valid(self):
        name, data, _ = round_of_type('lens')

        self.assertEqual(errors_for(data, name), [])

    def test_two_correct_lenses_are_refused(self):
        name, data, rnd = round_of_type('lens')
        for lens in rnd['lenses']:
            lens['correct'] = True

        self.assertTrue(any('exactement 1 bon regard' in e for e in errors_for(data, name)))

    def test_a_wrong_lens_needs_an_explanation(self):
        name, data, rnd = round_of_type('lens')
        del next(lens for lens in rnd['lenses'] if not lens.get('correct'))['explain']

        self.assertTrue(any('n\'est pas expliqué' in e for e in errors_for(data, name)))

    def test_every_lens_needs_a_sentence_and_a_known_view(self):
        name, data, rnd = round_of_type('lens')
        rnd['lenses'][0]['says'] = ''
        rnd['lenses'][1]['view'] = 'x-ray'

        errors = errors_for(data, name)
        self.assertTrue(any('phrase de Palou' in e for e in errors))
        self.assertTrue(any('« view »' in e for e in errors))


class ProbeRoundTests(SimpleTestCase):
    """« Le test de Palou » : Palou se trompe sur une seule photo, puis l'enfant choisit le bon exemple."""

    def test_the_real_probe_round_is_valid(self):
        name, data, _ = round_of_type('probe')

        self.assertEqual(errors_for(data, name), [])

    def test_palou_must_be_wrong_on_exactly_one_photo(self):
        name, data, rnd = round_of_type('probe')
        for photo in rnd['photos']:
            photo['wrong'] = True

        self.assertTrue(any('exactement 1 photo' in e for e in errors_for(data, name)))

    def test_a_right_guess_needs_an_explanation(self):
        name, data, rnd = round_of_type('probe')
        del next(p for p in rnd['photos'] if not p.get('wrong'))['explain']

        self.assertTrue(any('n\'est pas expliquée' in e for e in errors_for(data, name)))

    def test_the_fix_needs_exactly_one_correct_example(self):
        name, data, rnd = round_of_type('probe')
        for option in rnd['fix']['options']:
            option['correct'] = True

        self.assertTrue(errors_for(data, name))


class ScreenLayoutTests(SimpleTestCase):
    """Contrôle de la mise en page personnalisée choisie dans le studio (T19)."""

    def test_valid_layout_is_accepted(self):
        name, data = real_chapter()
        screen = data['lessons'][0]['screens'][0]  # histoire avec image
        screen['layout'] = {
            'image': 'left',
            'imageSize': 'l',
            'textSize': 'xl',
            'align': 'center',
        }
        report = parcours79.validate_all(chapters=[(name, data)])
        self.assertEqual(report.errors, [])

    def test_layout_must_be_a_dict(self):
        name, data = real_chapter()
        data['lessons'][0]['screens'][0]['layout'] = 'left'
        report = parcours79.validate_all(chapters=[(name, data)])
        self.assertTrue(any('doit être un objet' in e for e in report.errors))

    def test_unknown_layout_key_is_a_structure_error(self):
        name, data = real_chapter()
        data['lessons'][0]['screens'][0]['layout'] = {'fantaisie': True}
        report = parcours79.validate_all(chapters=[(name, data)])
        self.assertTrue(any('clé de mise en page inconnue' in e for e in report.errors))

    def test_invalid_layout_values_are_structure_errors(self):
        name, data = real_chapter()
        screen = data['lessons'][0]['screens'][0]

        screen['layout'] = {'image': 'diagonal'}
        self.assertTrue(any('position d\'image invalide' in e for e in errors_for(data, name)))

        screen['layout'] = {'imageSize': 'giant'}
        self.assertTrue(any('taille d\'image invalide' in e for e in errors_for(data, name)))

        screen['layout'] = {'textSize': 'tiny'}
        self.assertTrue(any('taille de texte invalide' in e for e in errors_for(data, name)))

        screen['layout'] = {'align': 'justify'}
        self.assertTrue(any('alignement de texte invalide' in e for e in errors_for(data, name)))

    def test_image_options_on_screen_without_image_is_a_soft_warning(self):
        name, data = real_chapter()
        bravo = data['lessons'][0]['screens'][-1]
        self.assertNotIn('image', bravo)
        bravo['layout'] = {'image': 'top', 'imageSize': 's'}
        report = parcours79.validate_all(chapters=[(name, data)])
        # Il y a bien une erreur
        layout_errors = [e for e in report.errors if 'options d\'image définies sur un écran sans image' in e]
        self.assertEqual(len(layout_errors), 1)
        # Mais elle est douce (soft=True) : confirmable dans le studio
        self.assertIn(layout_errors[0], report.soft)


class MediaScreenTests(SimpleTestCase):
    def _create_chapter_with_screen(self, screen_dict):
        name, data = real_chapter()
        # Remplace le deuxième écran par un écran média
        data['lessons'][0]['screens'][1] = screen_dict
        return name, data

    def test_valid_youtube_video_and_lesson_action(self):
        screen = {
            'kind': 'media',
            'text': 'Regarde cette vidéo avec moi !',
            'media': {
                'type': 'video-link',
                'url': 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                'caption': 'Une vidéo explicative',
            },
            'actions': [
                {'label': 'Continuer', 'kind': 'lesson', 'target': 'p1-2'},
            ],
        }
        name, data = self._create_chapter_with_screen(screen)
        report = parcours79.validate_all(chapters=[(name, data)])
        self.assertEqual(report.errors, [])

    def test_valid_vimeo_video_and_external_action(self):
        screen = {
            'kind': 'media',
            'media': {
                'type': 'video-link',
                'url': 'https://player.vimeo.com/video/76979871',
            },
            'actions': [
                {'label': 'En savoir plus', 'kind': 'external', 'target': 'https://senegal-education.sn'},
            ],
        }
        name, data = self._create_chapter_with_screen(screen)
        report = parcours79.validate_all(chapters=[(name, data)])
        self.assertEqual(report.errors, [])

    def test_valid_video_file(self):
        screen = {
            'kind': 'media',
            'text': 'Voici l\'animation préparée par Palou.',
            'media': {
                'type': 'video-file',
                'ref': 'media:42.abcdef01',
            },
        }
        name, data = self._create_chapter_with_screen(screen)
        report = parcours79.validate_all(chapters=[(name, data)])
        self.assertEqual(report.errors, [])

    def test_invalid_video_domain_is_rejected(self):
        screen = {
            'kind': 'media',
            'media': {
                'type': 'video-link',
                'url': 'https://untrusted-site.com/video.mp4',
            },
        }
        name, data = self._create_chapter_with_screen(screen)
        errors = errors_for(data, name)
        self.assertTrue(any('domaine vidéo non autorisé' in e for e in errors))

    def test_non_https_video_link_is_rejected(self):
        screen = {
            'kind': 'media',
            'media': {
                'type': 'video-link',
                'url': 'http://youtube.com/watch?v=test',
            },
        }
        name, data = self._create_chapter_with_screen(screen)
        errors = errors_for(data, name)
        self.assertTrue(any('doit obligatoirement commencer par « https:// »' in e for e in errors))

    def test_invalid_video_file_ref_is_rejected(self):
        screen = {
            'kind': 'media',
            'media': {
                'type': 'video-file',
                'ref': 'video.mp4',
            },
        }
        name, data = self._create_chapter_with_screen(screen)
        errors = errors_for(data, name)
        self.assertTrue(any('référence de fichier vidéo invalide' in e for e in errors))

    def test_invalid_action_target_for_lesson_is_rejected(self):
        screen = {
            'kind': 'media',
            'media': {
                'type': 'video-link',
                'url': 'https://youtu.be/dQw4w9WgXcQ',
            },
            'actions': [
                {'label': 'Aller', 'kind': 'lesson', 'target': 'bad-lesson-id'},
            ],
        }
        name, data = self._create_chapter_with_screen(screen)
        errors = errors_for(data, name)
        self.assertTrue(any('identifiant de leçon cible invalide' in e for e in errors))

    def test_invalid_action_target_for_external_is_rejected(self):
        screen = {
            'kind': 'media',
            'media': {
                'type': 'video-link',
                'url': 'https://youtu.be/dQw4w9WgXcQ',
            },
            'actions': [
                {'label': 'Lien dangereux', 'kind': 'external', 'target': 'javascript:alert(1)'},
            ],
        }
        name, data = self._create_chapter_with_screen(screen)
        errors = errors_for(data, name)
        self.assertTrue(any('doit commencer par « https:// »' in e for e in errors))

    def test_missing_action_label_is_rejected(self):
        screen = {
            'kind': 'media',
            'media': {
                'type': 'video-link',
                'url': 'https://youtu.be/dQw4w9WgXcQ',
            },
            'actions': [
                {'label': '', 'kind': 'lesson', 'target': 'p1-1'},
            ],
        }
        name, data = self._create_chapter_with_screen(screen)
        errors = errors_for(data, name)
        self.assertTrue(any('libellé de l\'action manquant' in e for e in errors))


