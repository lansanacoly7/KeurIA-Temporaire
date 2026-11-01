"""
Contrôle du contenu du parcours 7-9 ans (frontend/content/parcours79/*.json).

Le contenu est écrit dans des fichiers JSON pour pouvoir être relu par une enseignante ou un enseignant ; ce module vérifie
qu'il respecte les règles de la bible narrative (Rapports/BIBLE_NARRATIVE_7-9.md) :

  - anti-« vernis » : chaque leçon a une scène, des personnages, un problème d'histoire, un rappel (sauf la première du
    chapitre) ; les personnages listés apparaissent dans le texte et inversement ; aucune tournure de remplissage ;
  - lisibilité 7-9 ans : deux phrases par écran, 14 mots au plus par phrase ;
  - pédagogie : chaque mauvaise réponse est expliquée, la bonne réponse n'est pas systématiquement la plus longue ;
  - cohérence avec le catalogue serveur (mêmes identifiants et mêmes titres).
"""
import json
import re
from pathlib import Path

from django.conf import settings

from .data.tracks_data import TRACKS_CATALOG



FRONTEND = Path(settings.BASE_DIR).parent / 'frontend'
CONTENT_DIR = FRONTEND / 'content' / 'parcours79'
LESSON_IMAGES_DIR = FRONTEND / 'public' / 'images' / 'parcours79' / 'lecons'
PICTOS_DIR = FRONTEND / 'public' / 'images' / 'parcours79' / 'pictos'

DEFAULT_GAMES_79 = {
    'choose', 'multi', 'sort', 'whois', 'rulesort', 'cleanup', 'train', 'relabel',
    'probe', 'focus', 'shield', 'machine', 'verify', 'loupe', 'layers', 'speak', 'lens',
}

DEFAULT_SCREENS_79 = {
    'story', 'discover', 'play', 'why', 'ai', 'media', 'create', 'bravo',
}

TRACK_CONFIGS = {
    '7-9': {
        'label': '7–9 ans',
        'content_dir': FRONTEND / 'content' / 'parcours79',
        'lesson_images_dir': FRONTEND / 'public' / 'images' / 'parcours79' / 'lecons',
        'emotes_dir': FRONTEND / 'public' / 'images' / 'parcours79' / 'palou',
        'voices_dir': FRONTEND / 'public' / 'audio' / 'palou' / 'lecons',
        'videos_dir': FRONTEND / 'public' / 'videos' / 'parcours79',
        'voice_base_url': '/audio/palou/lecons',
        'module_prefix': 'p',
        'file_prefix': 'm',
        'file_glob': 'm*.json',
        'lesson_id_re': r'^p\d{1,2}-\d{1,2}$',
        'image_name_re': r'^m\d{2}-l\d-[a-z0-9-]+\.webp$',
        'allowed_screens': DEFAULT_SCREENS_79,
        'allowed_games': DEFAULT_GAMES_79,
        'kind': 'lesson79',
        'studio': True,
        'school': False,
        'live': True,
        'picto_grid': (4, 3),
    },
    '7-9-ecole': {
        'label': '7–9 ans École',
        'content_dir': FRONTEND / 'content' / 'parcours79ecole',
        'lesson_images_dir': FRONTEND / 'public' / 'images' / 'parcours79ecole' / 'lecons',
        'emotes_dir': FRONTEND / 'public' / 'images' / 'parcours79' / 'palou',
        'voices_dir': FRONTEND / 'public' / 'audio' / 'palou' / 'ecole79',
        'videos_dir': FRONTEND / 'public' / 'videos' / 'parcours79ecole',
        'voice_base_url': '/audio/palou/ecole79',
        'module_prefix': 'ep',
        'file_prefix': 'm',
        'file_glob': 'm*.json',
        'lesson_id_re': r'^ep\d{1,2}-\d{1,2}$',
        'image_name_re': r'^ep\d{1,2}-l\d-[a-z0-9-]+\.webp$',
        'allowed_screens': DEFAULT_SCREENS_79 | {'classe', 'debat'},
        'allowed_games': DEFAULT_GAMES_79,
        'kind': 'lesson79ecole',
        'studio': False,
        'school': True,
        'live': False,
        'picto_grid': (4, 3),
    },
    '10-12': {
        'label': '10–12 ans',
        'content_dir': FRONTEND / 'content' / 'parcours1012',
        'lesson_images_dir': FRONTEND / 'public' / 'images' / 'parcours1012' / 'lecons',
        'emotes_dir': FRONTEND / 'public' / 'images' / 'parcours1012' / 'palou',
        'voices_dir': FRONTEND / 'public' / 'audio' / 'palou' / '1012',
        'videos_dir': FRONTEND / 'public' / 'videos' / 'parcours1012',
        'voice_base_url': '/audio/palou/1012',
        'module_prefix': 'a',
        'file_prefix': 'a',
        'file_glob': 'a*.json',
        'lesson_id_re': r'^a\d{1,2}-\d{1,2}$',
        'image_name_re': r'^a\d{2}-l\d-[a-z0-9-]+\.webp$',
        'allowed_screens': DEFAULT_SCREENS_79,
        'allowed_games': DEFAULT_GAMES_79,
        'kind': 'lesson1012',
        'studio': False,
        'school': False,
        'live': False,
        'picto_grid': (3, 3),
    },
    '10-12-ecole': {
        'label': '10–12 ans École',
        'content_dir': FRONTEND / 'content' / 'parcours1012ecole',
        'lesson_images_dir': FRONTEND / 'public' / 'images' / 'parcours1012ecole' / 'lecons',
        'emotes_dir': FRONTEND / 'public' / 'images' / 'parcours1012' / 'palou',
        'voices_dir': FRONTEND / 'public' / 'audio' / 'palou' / 'ecole1012',
        'videos_dir': FRONTEND / 'public' / 'videos' / 'parcours1012ecole',
        'voice_base_url': '/audio/palou/ecole1012',
        'module_prefix': 'ea',
        'file_prefix': 'ea',
        'file_glob': 'ea*.json',
        'lesson_id_re': r'^ea\d{1,2}-\d{1,2}$',
        'image_name_re': r'^ea\d{1,2}-l\d-[a-z0-9-]+\.webp$',
        'allowed_screens': DEFAULT_SCREENS_79 | {'classe', 'debat'},
        'allowed_games': DEFAULT_GAMES_79,
        'kind': 'lesson1012ecole',
        'studio': False,
        'school': True,
        'live': False,
        'picto_grid': (3, 3),
    },
    '13-15': {
        'label': '13–15 ans',
        'content_dir': FRONTEND / 'content' / 'parcours1315',
        'lesson_images_dir': FRONTEND / 'public' / 'images' / 'parcours1315' / 'lecons',
        'emotes_dir': FRONTEND / 'public' / 'images' / 'parcours1315' / 'palou',
        'voices_dir': FRONTEND / 'public' / 'audio' / 'palou' / '1315',
        'videos_dir': FRONTEND / 'public' / 'videos' / 'parcours1315',
        'voice_base_url': '/audio/palou/1315',
        'module_prefix': 'c',
        'file_prefix': 'c',
        'file_glob': 'c*.json',
        'lesson_id_re': r'^c\d{1,2}-\d{1,2}$',
        'image_name_re': r'^c\d{2}-l\d-[a-z0-9-]+\.webp$',
        'allowed_screens': DEFAULT_SCREENS_79,
        'allowed_games': DEFAULT_GAMES_79,
        'kind': 'lesson1315',
        'studio': False,
        'school': False,
        'live': False,
        'picto_grid': (3, 3),
    },
    '13-15-ecole': {
        'label': '13–15 ans École',
        'content_dir': FRONTEND / 'content' / 'parcours1315ecole',
        'lesson_images_dir': FRONTEND / 'public' / 'images' / 'parcours1315ecole' / 'lecons',
        'emotes_dir': FRONTEND / 'public' / 'images' / 'parcours1315' / 'palou',
        'voices_dir': FRONTEND / 'public' / 'audio' / 'palou' / 'ecole1315',
        'videos_dir': FRONTEND / 'public' / 'videos' / 'parcours1315ecole',
        'voice_base_url': '/audio/palou/ecole1315',
        'module_prefix': 'ec',
        'file_prefix': 'ec',
        'file_glob': 'ec*.json',
        'lesson_id_re': r'^ec\d{1,2}-\d{1,2}$',
        'image_name_re': r'^ec\d{1,2}-l\d-[a-z0-9-]+\.webp$',
        'allowed_screens': DEFAULT_SCREENS_79 | {'classe', 'debat'},
        'allowed_games': DEFAULT_GAMES_79,
        'kind': 'lesson1315ecole',
        'studio': False,
        'school': True,
        'live': False,
        'picto_grid': (3, 3),
    },
}


def get_track_config(track: str) -> dict:
    if track not in TRACK_CONFIGS:
        raise ValueError(f"Parcours inconnu : {track}")
    return TRACK_CONFIGS[track]


CAST_NAMES = {
    'palou': 'Palou', 'moussa': 'Moussa', 'fatou': 'Fatou', 'mme-diop': 'Madame Diop', 'mame-awa': 'Mame Awa',
    'papa-ibou': 'Papa Ibou', 'tonton-cheikh': 'Tonton Cheikh', 'baye': 'Baye', 'mame-coumba': 'Mame Coumba',
}


def load_track_characters(track: str = '7-9', content_dir: Path | None = None) -> list[dict]:
    cfg = get_track_config(track)
    cdir = Path(content_dir or cfg['content_dir'])
    chars_file = cdir / 'characters.json'
    if chars_file.exists():
        try:
            data = json.loads(chars_file.read_text(encoding='utf-8'))
            return data.get('characters', [])
        except Exception:
            return []
    if track == '7-9':
        return [{'id': k, 'name': v} for k, v in CAST_NAMES.items()]
    return []


def load_track_cast(track: str = '7-9', content_dir: Path | None = None) -> dict[str, str]:
    characters = load_track_characters(track=track, content_dir=content_dir)
    cast = {}
    for c in characters:
        cid = c.get('id')
        if not cid:
            continue
        cname = c.get('name', cid)
        cast[cid] = cname
        for alias in c.get('aliases', []):
            cast[alias] = cname
    if not cast and track == '7-9':
        return dict(CAST_NAMES)
    return cast

POSES = {
    'Content', 'Surpris', 'Intelligent', 'Question', 'Reflexion', 'Celebration', 'Hero', 'Encouragement', 'Calme',
    'Rire', 'Triste', 'Determine', 'Gentil', 'Parfait',
}
TEXT_KINDS = {'story', 'discover', 'ai'}
BANNED_FILLER = [r"\bau s[ée]n[ée]gal\b", r"\bchez nous\b", r"\bdans notre pays\b"]
MAX_SENTENCES = 2
MAX_PROMPT_SENTENCES = 3
MAX_WORDS = 14          # au-delà : erreur
SOFT_WORDS = 12         # au-delà : avertissement
IMAGE_NAME = re.compile(r'^m\d{2}-l\d-[a-z0-9-]+\.webp$')
# Image envoyée depuis le studio : « media:<id>.<8 premiers caractères de l'empreinte> » (voir apps/curriculum/media.py).
MEDIA_REF = re.compile(r'^media:\d+\.[0-9a-f]{8}$')
SILLY = re.compile(r'nuage|cuill[eè]re|jouets? (?:qui|de)|seulement la nuit|manger des croquettes', re.I)
LAYOUT_IMAGE_POSITIONS = {'right', 'left', 'top', 'bottom'}
LAYOUT_IMAGE_SIZES = {'s', 'm', 'l'}
LAYOUT_TEXT_SIZES = {'sm', 'md', 'lg', 'xl'}
LAYOUT_TEXT_ALIGNS = {'left', 'center'}
LAYOUT_ALLOWED_KEYS = {'image', 'imageSize', 'textSize', 'align'}
MEDIA_TYPES = {'video-link', 'video-file', 'image'}
MEDIA_ACTION_KINDS = {'lesson', 'external'}
ALLOWED_VIDEO_DOMAINS = {
    'youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be',
    'youtube-nocookie.com', 'www.youtube-nocookie.com',
    'vimeo.com', 'player.vimeo.com',
}
LESSON_ID_RE = re.compile(r'^p\d{1,2}-\d{1,2}$')


def sentence_lengths(text):
    """Nombre de mots de chaque phrase (les signes de ponctuation isolés ne comptent pas)."""
    pieces = re.split(r'(?<=[.!?…])\s+', text.strip())
    return [n for n in (len([w for w in p.split() if re.search(r'\w', w)]) for p in pieces) if n > 0]


def _catalog_worlds(include_hidden=False, use_base=False, track='7-9', chapters=None):
    from apps.curriculum.catalog import base_catalog, get_active_catalog
    worlds = {}
    if track == '7-9':
        catalog = base_catalog('7-9') if use_base else get_active_catalog('7-9')
        for mod in sorted(catalog.get('modules', []), key=lambda m: m.get('order', 0)):
            if mod.get('hidden') and not include_hidden:
                continue
            mod_lessons = [
                les for les in catalog.get('lessons', [])
                if les.get('moduleId') == mod['id'] and (include_hidden or not les.get('hidden'))
            ]
            mod_lessons.sort(key=lambda les: les.get('order', 0))
            worlds[mod['id']] = [{'id': les['id'], 'title': les['title']} for les in mod_lessons]
    else:
        # Pour un parcours sans catalogue en base, la liste des modules et des leçons vient des fichiers de contenu eux-mêmes
        if chapters:
            for _cfile, data in chapters:
                module = data.get('module', {})
                mid = module.get('id')
                if mid:
                    lessons = data.get('lessons', [])
                    worlds[mid] = [{'id': les.get('id'), 'title': les.get('title', '')} for les in lessons]
        if not worlds:
            for trk in TRACKS_CATALOG:
                if trk.get('key') == track:
                    for world in trk.get('worlds', []):
                        worlds[world['id']] = [
                            {'id': f"{world['id']}-{i + 1}", 'title': title} for i, title in enumerate(world.get('lessons', []))
                        ]
    return worlds


class Report:
    def __init__(self):
        self.errors, self.warnings, self.missing_images = [], [], []
        # Parmi `errors`, celles qui sont des règles de style de la bible narrative (et non de structure) : le studio les
        # présente en avertissement que l'auteur peut confirmer, alors qu'une erreur de structure bloque la publication.
        self.soft = set()
        self.no_pict = 0              # choix sans pictogramme
        self.pictos = {}              # catalogue : identifiant -> description (pictos.json)
        self.missing_pictos = set()   # pictogrammes cités par le contenu mais pas encore dessinés

    def error(self, where, message, soft=False):
        text = f'{where} : {message}'
        self.errors.append(text)
        if soft:
            self.soft.add(text)

    def warn(self, where, message):
        self.warnings.append(f'{where} : {message}')


def load_chapters(content_dir=None, track='7-9'):
    cfg = get_track_config(track)
    cdir = Path(content_dir or cfg['content_dir'])
    chapters = []
    if not cdir.exists():
        return chapters
    glob_pattern = cfg.get('file_glob', f"{cfg['module_prefix']}*.json")
    for path in sorted(cdir.glob(glob_pattern)):
        try:
            chapters.append((path.name, json.loads(path.read_text(encoding='utf-8'))))
        except Exception:
            continue
    return chapters


def _all_strings(node):
    if isinstance(node, str):
        yield node
    elif isinstance(node, dict):
        for value in node.values():
            yield from _all_strings(value)
    elif isinstance(node, list):
        for value in node:
            yield from _all_strings(value)


def _check_text(report, where, text, max_sentences=MAX_SENTENCES):
    lengths = sentence_lengths(text)
    if len(lengths) > max_sentences:
        report.error(where, f'{len(lengths)} phrases (maximum {max_sentences}) : « {text[:60]}… »', soft=True)
    for n in lengths:
        if n > MAX_WORDS:
            report.error(where, f'phrase de {n} mots (maximum {MAX_WORDS}) : « {text[:60]}… »', soft=True)
        elif n > SOFT_WORDS:
            report.warn(where, f'phrase de {n} mots (idéal : {SOFT_WORDS} au plus) : « {text[:60]}… »')
    for pattern in BANNED_FILLER:
        if re.search(pattern, text, re.I):
            report.error(where, f'tournure de remplissage interdite (« {pattern} ») : « {text[:60]}… »', soft=True)


def _check_picts(report, where, entries):
    """Chaque choix montre une image (chat, mangue, cadenas…) : l'enfant voit la réponse, le texte la nomme."""
    for entry in entries:
        pict = entry.get('pict')
        if not pict:
            report.no_pict += 1
            continue
        if report.pictos and pict not in report.pictos:
            report.error(where, f'pictogramme inconnu du catalogue (pictos.json) : {pict}')
        elif not (PICTOS_DIR / f'{pict}.webp').exists():
            report.missing_pictos.add(pict)


def _check_options(report, where, options, kind):
    _check_picts(report, where, options)
    correct = [o for o in options if o.get('correct')]
    wrong = [o for o in options if not o.get('correct')]
    if kind == 'choose' and len(correct) != 1:
        report.error(where, f'{len(correct)} bonnes réponses (il en faut exactement 1)')
    if kind == 'multi' and (len(correct) < 2 or not wrong):
        report.error(where, 'il faut au moins 2 bonnes réponses et 1 mauvaise')
    if not 2 <= len(options) <= 4:
        report.error(where, f'{len(options)} options (entre 2 et 4)')
    for option in wrong:
        if not option.get('explain'):
            report.error(where, f'la mauvaise réponse « {option.get("label")} » n\'est pas expliquée')
        if SILLY.search(option.get('label', '')):
            report.warn(where, f'distracteur peu plausible : « {option.get("label")} »')
    return correct, options


def _check_whois(report, where, rnd, stats=None):
    """
    « Qui est-ce ? avec Palou » : l'enfant décrit l'objet à trouver avec des données ; chaque donnée juste écarte des objets.
    Le jeu doit toujours être gagnable, et il doit montrer l'idée de la mécanique : une seule donnée ne suffit pas,
    c'est la combinaison de plusieurs données justes qui isole le bon objet.
    """
    items = rnd.get('items', [])
    tags = rnd.get('tags', [])
    _check_picts(report, where, items)
    if not 4 <= len(items) <= 8:
        report.error(where, f'« Qui est-ce ? » demande entre 4 et 8 objets ({len(items)})')
    if not 4 <= len(tags) <= 7:
        report.error(where, f'« Qui est-ce ? » demande entre 4 et 7 données ({len(tags)})')
    tag_ids = {t.get('id') for t in tags}
    if len(tag_ids) != len(tags) or len({i.get('id') for i in items}) != len(items):
        report.error(where, 'les identifiants des objets et des données doivent être uniques')
    target = next((i for i in items if i.get('id') == rnd.get('target')), None)
    if target is None:
        report.error(where, f'l\'objet à trouver (« {rnd.get("target")} ») n\'est pas parmi les objets')
        return
    for item in items:
        unknown = [t for t in item.get('tags', []) if t not in tag_ids]
        if unknown:
            report.error(where, f'l\'objet « {item.get("label")} » utilise des données inconnues : {unknown}')

    def remaining(chosen):
        return [i for i in items if all(t in i.get('tags', []) for t in chosen)]

    right = [t for t in tags if t.get('id') in target.get('tags', [])]
    wrong = [t for t in tags if t.get('id') not in target.get('tags', [])]
    if len(right) < 2:
        report.error(where, 'il faut au moins 2 données justes : une seule ne montrerait pas qu\'il en faut plusieurs')
    if len(remaining([t['id'] for t in right])) != 1:
        report.error(where, 'avec toutes les données justes, il doit rester exactement 1 objet : le bon')
    for tag in right:
        if len(remaining([tag['id']])) == 1:
            report.error(where, f'la donnée « {tag.get("label")} » suffit seule : il en faut plusieurs pour que l\'enfant voie « plus de données, mieux l\'IA trouve »')
    if not wrong:
        report.error(where, 'il faut au moins 1 donnée fausse')
    for tag in wrong:
        if not tag.get('explain'):
            report.error(where, f'la donnée fausse « {tag.get("label")} » n\'est pas expliquée')


def _check_rulesort(report, where, rnd, stats=None):
    """
    « La machine à trier » : l'enfant choisit une règle, la machine range tous les objets d'un coup. Une seule règle est la bonne ;
    chaque règle doit former au moins 2 groupes et donner un rangement différent des autres, pour que le choix change vraiment le résultat.
    """
    items = rnd.get('items', [])
    rules = rnd.get('rules', [])
    _check_picts(report, where, items + rules)
    if not 4 <= len(items) <= 8:
        report.error(where, f'« La machine à trier » demande entre 4 et 8 objets ({len(items)})')
    if not 2 <= len(rules) <= 4:
        report.error(where, f'« La machine à trier » demande entre 2 et 4 règles ({len(rules)})')
    if len([r for r in rules if r.get('correct')]) != 1:
        report.error(where, 'il faut exactement 1 bonne règle')
    if len({r.get('id') for r in rules}) != len(rules) or len({i.get('id') for i in items}) != len(items):
        report.error(where, 'les identifiants des objets et des règles doivent être uniques')
    partitions = []
    for rule in rules:
        prop, groups = rule.get('prop'), rule.get('groups') or {}
        values = [i.get('props', {}).get(prop) for i in items]
        if any(v is None for v in values):
            report.error(where, f'la règle « {rule.get("label")} » : un objet n\'a pas la propriété « {prop} »')
            continue
        unknown = sorted({v for v in values if v not in groups})
        if unknown:
            report.error(where, f'la règle « {rule.get("label")} » n\'a pas de nom de groupe pour : {unknown}')
        if len(set(values)) < 2:
            report.error(where, f'la règle « {rule.get("label")} » doit former au moins 2 groupes')
        if rule.get('correct') and max(values.count(v) for v in set(values)) < 2:
            report.error(where, 'la bonne règle doit réunir au moins 2 objets dans un même groupe')
        if not rule.get('correct') and not rule.get('explain'):
            report.error(where, f'la mauvaise règle « {rule.get("label")} » n\'est pas expliquée')
        partitions.append(frozenset(frozenset(i['id'] for i, v in zip(items, values, strict=True) if v == value) for value in set(values)))
    if len(set(partitions)) < len(partitions):
        report.error(where, 'deux règles donnent exactement le même rangement : le choix ne changerait rien')


def _check_cleanup(report, where, rnd, stats=None):
    """
    « Données propres, IA contente » : Palou compte les données de la liste ; l'enfant retire les intrus. Il faut au moins 1 intrus et
    au moins 2 bonnes données (sinon le compte de Palou ne veut rien dire), et chaque bonne donnée est expliquée si l'enfant la touche.
    """
    rows = rnd.get('rows', [])
    _check_picts(report, where, rows)
    if not rnd.get('counts'):
        report.error(where, '« counts » manquant (ce que Palou compte)')
    if not 4 <= len(rows) <= 7:
        report.error(where, f'« Données propres » demande entre 4 et 7 données ({len(rows)})')
    if len({r.get('id') for r in rows}) != len(rows):
        report.error(where, 'les identifiants des données doivent être uniques')
    intruders = [r for r in rows if r.get('intruder')]
    good = [r for r in rows if not r.get('intruder')]
    if not 1 <= len(intruders) <= 3:
        report.error(where, f'il faut entre 1 et 3 intrus ({len(intruders)})')
    if len(good) < 2:
        report.error(where, 'il faut au moins 2 bonnes données')
    for row in good:
        if not row.get('explain'):
            report.error(where, f'la bonne donnée « {row.get("label")} » n\'est pas expliquée')


def _check_train(report, where, rnd, stats=None):
    """
    « L'entraînement de Palou » : l'enfant montre de bons exemples, Palou finit par reconnaître la photo d'essai. Il faut 2 à 4 bons
    exemples (le nombre d'exemples à donner), au moins 1 mauvais exemple expliqué, et une phrase de Palou par exemple manquant.
    """
    examples = rnd.get('examples', [])
    _check_picts(report, where, examples + [rnd.get('test') or {}])
    if not rnd.get('learns') or not (rnd.get('test') or {}).get('label'):
        report.error(where, '« learns » et « test » (photo d\'essai) sont obligatoires')
    if not 4 <= len(examples) <= 7:
        report.error(where, f'« L\'entraînement de Palou » demande entre 4 et 7 exemples ({len(examples)})')
    if len({e.get('id') for e in examples}) != len(examples):
        report.error(where, 'les identifiants des exemples doivent être uniques')
    good = [e for e in examples if e.get('good')]
    bad = [e for e in examples if not e.get('good')]
    if not 2 <= len(good) <= 4:
        report.error(where, f'il faut entre 2 et 4 bons exemples ({len(good)})')
    if not bad:
        report.error(where, 'il faut au moins 1 mauvais exemple')
    for example in bad:
        if not example.get('explain'):
            report.error(where, f'le mauvais exemple « {example.get("label")} » n\'est pas expliqué')
    if len(rnd.get('says', [])) != len(good):
        report.error(where, f'« says » doit avoir une phrase par bon exemple, de 0 à {len(good) - 1} reçus ({len(good)} attendues)')

def _check_relabel(report, where, rnd, stats=None):
    """
    « Corrige l'étiquette » : une seule photo de la mémoire de Palou porte une fausse étiquette (elle a `fix`, la bonne étiquette,
    différente de `tag`) ; les autres photos sont expliquées si l'enfant les touche.
    """
    cards = rnd.get('cards', [])
    _check_picts(report, where, cards + [rnd.get('test') or {}])
    if not rnd.get('says') or not (rnd.get('test') or {}).get('label'):
        report.error(where, '« says » (réponse fausse de Palou) et « test » (photo d\'essai) sont obligatoires')
    if not 3 <= len(cards) <= 5:
        report.error(where, f'« Corrige l\'étiquette » demande entre 3 et 5 photos ({len(cards)})')
    if len({c.get('id') for c in cards}) != len(cards):
        report.error(where, 'les identifiants des photos doivent être uniques')
    fixed = [c for c in cards if c.get('fix')]
    if len(fixed) != 1:
        report.error(where, f'il faut exactement 1 photo à corriger ({len(fixed)})')
    for card in cards:
        if card.get('fix') and card['fix'] == card.get('tag'):
            report.error(where, 'la bonne étiquette doit différer de la fausse')
        if not card.get('fix') and not card.get('explain'):
            report.error(where, f'la photo « {card.get("label")} » n\'est pas expliquée')


def _check_probe(report, where, rnd, stats=None):
    """
    « Le test de Palou » : Palou devine des photos et se trompe sur exactement une ; puis l'enfant choisit le meilleur exemple
    parmi des options (une seule bonne, les autres expliquées).
    """
    photos = rnd.get('photos', [])
    _check_picts(report, where, photos)
    if not 3 <= len(photos) <= 5:
        report.error(where, f'« Le test de Palou » demande entre 3 et 5 photos ({len(photos)})')
    if len({p.get('id') for p in photos}) != len(photos):
        report.error(where, 'les identifiants des photos doivent être uniques')
    if len([p for p in photos if p.get('wrong')]) != 1:
        report.error(where, 'Palou doit se tromper sur exactement 1 photo')
    for photo in photos:
        if not photo.get('guess'):
            report.error(where, f'la photo « {photo.get("label")} » n\'a pas de réponse de Palou')
        if not photo.get('wrong') and not photo.get('explain'):
            report.error(where, f'la photo « {photo.get("label")} » n\'est pas expliquée')
    if not rnd.get('found'):
        report.error(where, '« found » manquant (ce que Palou dit quand l\'erreur est trouvée)')
    _check_options(report, where, (rnd.get('fix') or {}).get('options', []), 'choose')

def _check_focus(report, where, rnd, stats=None):
    """
    « Les yeux de Palou » : une photo et 3 à 5 crans de netteté. Palou ne reconnaît pas au premier cran (`enough` > 0) et reconnaît
    à partir du cran `enough` ; chaque cran a une phrase de Palou.
    """
    _check_picts(report, where, [rnd.get('photo') or {}])
    if rnd.get('effect') not in ('pixels', 'blur', 'dark'):
        report.error(where, '« effect » doit valoir pixels, blur ou dark')
    levels = rnd.get('levels', [])
    if not 3 <= len(levels) <= 5:
        report.error(where, f'« Les yeux de Palou » demande entre 3 et 5 crans ({len(levels)})')
    if any(not level.get('says') for level in levels):
        report.error(where, 'chaque cran doit avoir une phrase de Palou')
    enough = rnd.get('enough')
    if not isinstance(enough, int) or not 1 <= enough < max(len(levels), 1):
        report.error(where, '« enough » doit être un cran après le premier (Palou ne reconnaît pas tout de suite)')

def _check_lens(report, where, rnd, stats=None):
    """
    « Regarde comme Palou » : 3 ou 4 regards possibles sur une photo ; exactement un seul (celui qui montre les détails) permet de
    reconnaître la feuille malade. Chaque regard a une phrase de Palou, et chaque mauvais regard est expliqué.
    """
    lenses = rnd.get('lenses', [])
    _check_picts(report, where, lenses + [rnd.get('photo') or {}])
    if not (rnd.get('photo') or {}).get('pict'):
        report.error(where, '« photo » (avec « pict ») est obligatoire')
    if not 3 <= len(lenses) <= 4:
        report.error(where, f'« Regarde comme Palou » demande 3 ou 4 regards ({len(lenses)})')
    if len({lens.get('id') for lens in lenses}) != len(lenses):
        report.error(where, 'les identifiants des regards doivent être uniques')
    if len([lens for lens in lenses if lens.get('correct')]) != 1:
        report.error(where, 'il faut exactement 1 bon regard')
    for lens in lenses:
        if lens.get('view') not in ('shape', 'colors', 'sharp'):
            report.error(where, f'le regard « {lens.get("label")} » : « view » doit valoir shape, colors ou sharp')
        if not lens.get('says'):
            report.error(where, f'le regard « {lens.get("label")} » n\'a pas de phrase de Palou')
        if not lens.get('correct') and not lens.get('explain'):
            report.error(where, f'le mauvais regard « {lens.get("label")} » n\'est pas expliqué')

def _speech_words(text):
    """Mots d'une phrase, sans accents ni ponctuation (même règle que checkSpeech côté application)."""
    import unicodedata
    plain = unicodedata.normalize('NFD', text.lower())
    plain = ''.join(c for c in plain if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9 ]+", ' ', plain.replace("'", ' ').replace('’', ' ')).split()


def _check_speak(report, where, rnd, stats=None):
    """
    « Parle à Palou » : l'enfant touche des cartes de mots pour former sa phrase (pas de micro). Chaque groupe de mots
    attendus a une carte, et les mots à éviter sont aussi dans les cartes (pour pouvoir se tromper). Palou répond par des
    phrases préparées : `missing` toujours, `vague` si des mots sont à éviter.
    """
    cards = rnd.get('cards', [])
    need = rnd.get('need', [])
    avoid = rnd.get('avoid') or []
    if not rnd.get('say'):
        report.error(where, '« say » manquant (ce que l\'enfant doit dire)')
    if not 5 <= len(cards) <= 10:
        report.error(where, f'« Parle à Palou » demande entre 5 et 10 cartes ({len(cards)})')
    if len(set(cards)) != len(cards):
        report.error(where, 'les cartes de mots doivent être différentes')
    if not need or any(not group for group in need):
        report.error(where, '« need » doit avoir au moins un groupe de mots, sans groupe vide')
    card_words = {word for card in cards for word in _speech_words(card)}
    for group in need:
        if not any(set(_speech_words(word)) <= card_words for word in group):
            report.error(where, f'aucune carte ne permet de dire le groupe {group}')
    for word in avoid:
        if not set(_speech_words(word)) <= card_words:
            report.error(where, f'le mot à éviter « {word} » n\'est dans aucune carte')
    if not rnd.get('missing'):
        report.error(where, '« missing » manquant (réponse de Palou quand un mot manque)')
    if avoid and not rnd.get('vague'):
        report.error(where, '« vague » manquant (réponse de Palou quand un mot à éviter est dit)')

def _check_layers(report, where, rnd, stats=None):
    """
    « Décris, Palou dessine » : des cartes à ajouter au dessin de Palou. `need` bonnes cartes à placer (au plus le nombre de
    cartes `good`), une phrase de Palou par nombre de cartes déjà placées, au moins une carte hors sujet expliquée.
    """
    cards = rnd.get('cards', [])
    _check_picts(report, where, cards + [rnd.get('goal') or {}])
    if not (rnd.get('goal') or {}).get('label'):
        report.error(where, '« goal » (l\'idée de départ) est obligatoire')
    if not 4 <= len(cards) <= 6:
        report.error(where, f'« Décris, Palou dessine » demande entre 4 et 6 cartes ({len(cards)})')
    if len({c.get('id') for c in cards}) != len(cards):
        report.error(where, 'les identifiants des cartes doivent être uniques')
    good = [c for c in cards if c.get('good')]
    bad = [c for c in cards if not c.get('good')]
    need = rnd.get('need')
    if not isinstance(need, int) or not 1 <= need <= len(good):
        report.error(where, f'« need » doit être entre 1 et le nombre de bonnes cartes ({len(good)})')
    elif len(rnd.get('says', [])) != need:
        report.error(where, f'« says » doit avoir une phrase par carte à placer ({need} attendues)')
    if not bad:
        report.error(where, 'il faut au moins 1 carte hors sujet')
    for card in bad:
        if not card.get('explain'):
            report.error(where, f'la carte hors sujet « {card.get("label")} » n\'est pas expliquée')

def _check_verify(report, where, rnd, stats=None):
    """
    « Enquête » : une affirmation, 3 à 5 questions dont au moins `need` utiles (elles révèlent un indice) et au moins une inutile
    (expliquée), puis un tampon à poser parmi 3 choix : un seul est le bon, les autres sont expliqués.
    """
    checks = rnd.get('checks', [])
    stamps = rnd.get('stamps', [])
    _check_picts(report, where, checks + stamps + [rnd.get('claim') or {}])
    if not (rnd.get('claim') or {}).get('text'):
        report.error(where, '« claim » (l\'affirmation) est obligatoire')
    if not 3 <= len(checks) <= 5:
        report.error(where, f'« Enquête » demande entre 3 et 5 questions ({len(checks)})')
    if len({c.get('id') for c in checks}) != len(checks):
        report.error(where, 'les identifiants des questions doivent être uniques')
    useful = [c for c in checks if c.get('useful')]
    useless = [c for c in checks if not c.get('useful')]
    need = rnd.get('need')
    if not isinstance(need, int) or not 1 <= need <= len(useful):
        report.error(where, f'« need » doit être entre 1 et le nombre de questions utiles ({len(useful)})')
    if not useless:
        report.error(where, 'il faut au moins 1 question inutile')
    for check in checks:
        if not check.get('reveal'):
            report.error(where, f'la question « {check.get("label")} » n\'a pas de réponse (« reveal »)')
    for check in useless:
        if not check.get('explain'):
            report.error(where, f'la question inutile « {check.get("label")} » n\'est pas expliquée')
    if not rnd.get('ask'):
        report.error(where, '« ask » manquant (la phrase qui demande le tampon)')
    if len(stamps) != 3 or len([s for s in stamps if s.get('correct')]) != 1:
        report.error(where, 'il faut 3 tampons dont exactement 1 bon')
    for stamp in stamps:
        if not stamp.get('correct') and not stamp.get('explain'):
            report.error(where, f'le mauvais tampon « {stamp.get("label")} » n\'est pas expliqué')
    meter = rnd.get('meter')
    if meter and (not meter.get('label') or not all(isinstance(meter.get(k), int) and 0 <= meter[k] <= 100 for k in ('start', 'end'))):
        report.error(where, '« meter » demande un « label » et des « start » / « end » entre 0 et 100')


def _check_loupe(report, where, rnd, stats=None):
    """
    « La loupe » : une image et 4 à 6 zones à regarder ; au moins `need` zones à indice (avec la phrase de Palou), les autres
    sont des zones normales expliquées. Les coordonnées sont des pourcentages de l'image.
    """
    spots = rnd.get('spots', [])
    _check_picts(report, where, spots + [rnd.get('photo') or {}])
    if not (rnd.get('photo') or {}).get('pict'):
        report.error(where, '« photo » (avec « pict ») est obligatoire')
    if not 4 <= len(spots) <= 6:
        report.error(where, f'« La loupe » demande entre 4 et 6 zones ({len(spots)})')
    if len({s.get('id') for s in spots}) != len(spots):
        report.error(where, 'les identifiants des zones doivent être uniques')
    clues = [s for s in spots if s.get('clue')]
    need = rnd.get('need')
    if not isinstance(need, int) or not 2 <= need <= len(clues):
        report.error(where, f'« need » doit être entre 2 et le nombre de zones à indice ({len(clues)})')
    if len(clues) == len(spots):
        report.error(where, 'il faut au moins 1 zone normale (sans indice)')
    for spot in spots:
        if not all(isinstance(spot.get(k), int | float) and 0 <= spot[k] <= 100 for k in ('x', 'y')):
            report.error(where, f'la zone « {spot.get("label")} » : « x » et « y » doivent être entre 0 et 100')
        if not spot.get('says'):
            report.error(where, f'la zone « {spot.get("label")} » n\'a pas de phrase de Palou')
        if not spot.get('clue') and not spot.get('explain'):
            report.error(where, f'la zone normale « {spot.get("label")} » n\'est pas expliquée')

def _check_machine(report, where, rnd, stats=None):
    """
    « Construis ton IA » : exactement 3 cases (elle regarde, elle apprend, elle fait), chacune avec 2 à 4 options dont une seule bonne
    (les autres sont expliquées), puis 2 à 4 cas à présenter à la machine ; `demo.need` cas à essayer pour finir.
    """
    slots = rnd.get('slots', [])
    demo = rnd.get('demo') or {}
    cases = demo.get('cases', [])
    _check_picts(report, where, cases + [rnd.get('goal') or {}])
    if not (rnd.get('goal') or {}).get('label'):
        report.error(where, '« goal » (l\'IA à construire) est obligatoire')
    if len(slots) != 3:
        report.error(where, f'« Construis ton IA » demande exactement 3 cases ({len(slots)})')
    for slot in slots:
        options = slot.get('options', [])
        _check_picts(report, where, options)
        label = slot.get('label')
        if not label or not slot.get('question'):
            report.error(where, 'chaque case a un « label » et une « question »')
        if not 2 <= len(options) <= 4:
            report.error(where, f'la case « {label} » demande entre 2 et 4 options ({len(options)})')
        if len([o for o in options if o.get('correct')]) != 1:
            report.error(where, f'la case « {label} » doit avoir exactement 1 bonne option')
        for option in options:
            if not option.get('correct') and not option.get('explain'):
                report.error(where, f'l\'option « {option.get("label")} » (case « {label} ») n\'est pas expliquée')
    if not demo.get('prompt'):
        report.error(where, '« demo.prompt » manquant (phrase lue quand la machine est prête)')
    if not 2 <= len(cases) <= 4:
        report.error(where, f'« demo.cases » demande entre 2 et 4 cas ({len(cases)})')
    if len({c.get('id') for c in cases}) != len(cases):
        report.error(where, 'les identifiants des cas doivent être uniques')
    if not isinstance(demo.get('need'), int) or not 1 <= demo['need'] <= max(len(cases), 1):
        report.error(where, '« demo.need » doit être entre 1 et le nombre de cas')
    for case in cases:
        if not case.get('result'):
            report.error(where, f'le cas « {case.get("label")} » n\'a pas de réponse de la machine (« result »)')

def _check_shield(report, where, rnd, stats=None):
    """
    « Cache pour protéger » : 4 à 6 informations, dont au moins 2 secrètes (à cacher) et au moins 1 sans danger, expliquée (elle
    peut rester visible).
    """
    items = rnd.get('items', [])
    _check_picts(report, where, items + [rnd.get('scene') or {}])
    if not (rnd.get('scene') or {}).get('label'):
        report.error(where, '« scene » (le message ou la photo à protéger) est obligatoire')
    if not 4 <= len(items) <= 6:
        report.error(where, f'« Cache pour protéger » demande entre 4 et 6 informations ({len(items)})')
    if len({i.get('id') for i in items}) != len(items):
        report.error(where, 'les identifiants des informations doivent être uniques')
    secrets = [i for i in items if i.get('secret')]
    safe = [i for i in items if not i.get('secret')]
    if len(secrets) < 2:
        report.error(where, f'il faut au moins 2 informations secrètes ({len(secrets)})')
    if not safe:
        report.error(where, 'il faut au moins 1 information sans danger')
    for item in safe:
        if not item.get('explain'):
            report.error(where, f'l\'information sans danger « {item.get("label")} » n\'est pas expliquée')


GAME_VALIDATORS = {}


def register_game_validator(game_type: str, validator_fn):
    """Enregistre un validateur de manche pour un type de jeu."""
    GAME_VALIDATORS[game_type] = validator_fn


for _k, _fn in [
    ('whois', _check_whois),
    ('rulesort', _check_rulesort),
    ('cleanup', _check_cleanup),
    ('train', _check_train),
    ('relabel', _check_relabel),
    ('probe', _check_probe),
    ('focus', _check_focus),
    ('shield', _check_shield),
    ('machine', _check_machine),
    ('verify', _check_verify),
    ('loupe', _check_loupe),
    ('layers', _check_layers),
    ('speak', _check_speak),
    ('lens', _check_lens),
]:
    register_game_validator(_k, _fn)


def _check_round(report, where, rnd, stats=None, track='7-9'):
    for key in ('prompt', 'hint', 'success'):
        if not rnd.get(key):
            report.error(where, f'« {key} » manquant')
    if rnd.get('prompt'):
        _check_text(report, f'{where} (consigne)', rnd['prompt'], MAX_PROMPT_SENTENCES)
    kind = rnd.get('type')
    if kind in ('choose', 'multi'):
        correct, options = _check_options(report, where, rnd.get('options', []), kind)
        if kind == 'choose' and len(correct) == 1:
            stats['choose'] += 1
            longest = max(len(o['label']) for o in options)
            if len(correct[0]['label']) == longest and sum(len(o['label']) == longest for o in options) == 1:
                stats['correct_longest'] += 1
    elif kind == 'sort':
        bins = {b['id'] for b in rnd.get('bins', [])}
        items = rnd.get('items', [])
        _check_picts(report, where, rnd.get('bins', []) + items)
        if len(bins) < 2 or len(items) < 3:
            report.error(where, 'un tri demande au moins 2 boîtes et 3 objets')
        used = set()
        for item in items:
            if item.get('bin') not in bins:
                report.error(where, f'l\'objet « {item.get("label")} » vise une boîte inconnue')
            used.add(item.get('bin'))
            if not item.get('explain'):
                report.error(where, f'l\'objet « {item.get("label")} » n\'est pas expliqué')
        if bins - used:
            report.error(where, 'une boîte ne reçoit aucun objet')
    elif kind in GAME_VALIDATORS:
        fn = GAME_VALIDATORS[kind]
        fn(report, where, rnd, stats)
    else:
        report.error(where, f'type de manche inconnu : {kind!r}')


def _check_media_screen(report, where, screen):
    media = screen.get('media')
    if not isinstance(media, dict):
        report.error(where, 'l\'écran média doit contenir un objet « media »')
        return
    mtype = media.get('type')
    if mtype not in MEDIA_TYPES:
        report.error(where, f'type de média inconnu : {mtype!r} (attendu : video-link, video-file, image)')
        return

    if mtype == 'video-link':
        url = media.get('url') or ''
        if not url:
            report.error(where, '« url » est obligatoire pour un lien vidéo')
        elif not url.startswith('https://'):
            report.error(where, 'l\'adresse du lien vidéo doit obligatoirement commencer par « https:// »')
        else:
            from urllib.parse import urlparse
            parsed = urlparse(url)
            netloc = parsed.netloc.lower()
            base_domain = netloc[4:] if netloc.startswith('www.') else netloc
            if base_domain not in ALLOWED_VIDEO_DOMAINS and netloc not in ALLOWED_VIDEO_DOMAINS:
                report.error(where, f'domaine vidéo non autorisé : {netloc} (seuls YouTube et Vimeo sont acceptés)')
    elif mtype == 'video-file':
        ref = media.get('ref')
        if not ref or not MEDIA_REF.match(ref):
            report.error(where, f'référence de fichier vidéo invalide : {ref!r} (format attendu : media:<id>.<empreinte>)')
    elif mtype == 'image':
        ref = media.get('ref') or media.get('url') or screen.get('image')
        if not ref:
            report.error(where, 'une image ou référence de média est obligatoire')

    actions = screen.get('actions')
    if actions is not None:
        if not isinstance(actions, list):
            report.error(where, '« actions » doit être une liste')
        else:
            for idx, act in enumerate(actions, 1):
                awhere = f'{where} · action {idx}'
                if not isinstance(act, dict):
                    report.error(awhere, 'chaque action doit être un objet')
                    continue
                label = act.get('label')
                if not label or not isinstance(label, str) or not label.strip():
                    report.error(awhere, 'libellé de l\'action manquant')
                akind = act.get('kind')
                if akind not in MEDIA_ACTION_KINDS:
                    report.error(awhere, f'type d\'action inconnu : {akind!r} (attendu : lesson ou external)')
                    continue
                target = act.get('target') or ''
                if not target or not isinstance(target, str) or not target.strip():
                    report.error(awhere, 'cible (« target ») de l\'action manquante')
                elif akind == 'lesson' and not LESSON_ID_RE.match(target):
                    report.error(awhere, f'identifiant de leçon cible invalide : {target!r} (ex: p2-3)')
                elif akind == 'external' and not target.startswith('https://'):
                    report.error(awhere, 'l\'adresse cible d\'un lien externe doit commencer par « https:// »')


def _check_screen(report, lesson_id, number, screen, track='7-9', stats=None, total_screens=None):
    cfg = get_track_config(track)
    kind = screen.get('kind')
    swhere = f"{lesson_id} · écran {number} ({kind})"

    if kind in ('classe', 'debat') and not cfg.get('school'):
        report.error(swhere, f"type d'écran non autorisé pour le parcours {track} : '{kind}'")
        return

    if kind == 'classe':
        for req in ('titre', 'duree', 'groupes', 'text'):
            if not screen.get(req):
                report.error(swhere, f"champ obligatoire manquant : '{req}'")
        if 'materiel' in screen and not isinstance(screen['materiel'], list):
            report.error(swhere, "'materiel' doit être une liste")
        return

    if kind == 'debat':
        for req in ('question', 'text'):
            if not screen.get(req):
                report.error(swhere, f"champ obligatoire manquant : '{req}'")
        sp = screen.get('speaker')
        if sp:
            cast = load_track_cast(track=track)
            if sp not in cast:
                report.error(swhere, f"personnage qui parle inconnu : {sp}")
        return

    if screen.get('pose') and screen['pose'] not in POSES:
        report.error(swhere, f'pose de Palou inconnue : {screen["pose"]}')
    if not screen.get('text'):
        if kind != 'media':
            report.error(swhere, 'texte manquant')
    else:
        _check_text(report, swhere, screen['text'])
        if '{prenom}' in screen['text'] and kind != 'bravo':
            report.error(swhere, '« {prenom} » n\'est autorisé que dans les félicitations', soft=True)
    if screen.get('image'):
        img_re = re.compile(cfg.get('image_name_re', r'^.*\.webp$'))
        if not (img_re.match(screen['image']) or MEDIA_REF.match(screen['image'])):
            report.error(swhere, f'nom d\'image invalide : {screen["image"]}')
        if not screen.get('alt'):
            report.error(swhere, 'une image doit avoir sa description (« alt »)')
        if not MEDIA_REF.match(screen['image']):
            target_img = cfg['lesson_images_dir'] / screen['image']
            if not target_img.exists():
                lid = lesson_id.split(' · ')[-1] if ' · ' in lesson_id else lesson_id
                report.missing_images.append((lid, screen['image'], screen.get('alt', '')))
    if 'layout' in screen:
        layout = screen['layout']
        if not isinstance(layout, dict):
            report.error(swhere, 'la mise en page (« layout ») doit être un objet')
        else:
            unknown = set(layout.keys()) - LAYOUT_ALLOWED_KEYS
            if unknown:
                report.error(swhere, f'clé de mise en page inconnue : {sorted(unknown)}')
            if 'image' in layout and layout['image'] not in LAYOUT_IMAGE_POSITIONS:
                report.error(swhere, f'position d\'image invalide : « {layout["image"]} »')
            if 'imageSize' in layout and layout['imageSize'] not in LAYOUT_IMAGE_SIZES:
                report.error(swhere, f'taille d\'image invalide : « {layout["imageSize"]} »')
            if 'textSize' in layout and layout['textSize'] not in LAYOUT_TEXT_SIZES:
                report.error(swhere, f'taille de texte invalide : « {layout["textSize"]} »')
            if 'align' in layout and layout['align'] not in LAYOUT_TEXT_ALIGNS:
                report.error(swhere, f'alignement de texte invalide : « {layout["align"]} »')
            if not screen.get('image') and ('image' in layout or 'imageSize' in layout):
                report.error(swhere, 'options d\'image définies sur un écran sans image', soft=True)

    if kind == 'discover' and not screen.get('word'):
        report.error(swhere, 'le mot nouveau est obligatoire')
    if kind in ('play', 'why'):
        if not screen.get('rounds'):
            report.error(swhere, 'aucune manche')
        for r, rnd in enumerate(screen.get('rounds', []), 1):
            _check_round(report, f'{swhere} · manche {r}', rnd, stats, track=track)
    if kind == 'create':
        if not screen.get('carnet'):
            report.error(swhere, 'le titre du carnet est obligatoire')
        for step in screen.get('steps', []):
            _check_picts(report, swhere, step.get('tray', []))
            if not 1 <= step.get('count', 0) < len(step.get('tray', [])):
                report.error(swhere, f'étape « {step.get("prompt")} » : il faut moins de choix demandés que d\'objets proposés')
    if kind == 'bravo' and not screen.get('learned'):
        report.error(swhere, '« ce que j\'ai appris » est obligatoire')
    if kind == 'bravo' and screen.get('sticker') and total_screens is not None and number != total_screens:
        report.error(swhere, "l'autocollant se donne sur le dernier écran")
    if kind == 'media':
        _check_media_screen(report, swhere, screen)


def _check_lesson(report, chapter_file, index, lesson, catalog_lessons, module_index, track='7-9', content_dir=None):
    lid = lesson.get('id', f'#{index}')
    where = f'{chapter_file} · {lid}'
    catalog = catalog_lessons[index] if index < len(catalog_lessons) else None
    if catalog is None or catalog['id'] != lid:
        report.error(where, f'identifiant absent du catalogue à cette position (attendu : {catalog and catalog["id"]})')
    elif catalog['title'] != lesson.get('title'):
        report.error(where, f'titre différent du catalogue : « {lesson.get("title")} » ≠ « {catalog["title"]} »')

    # Anti-vernis : scène, personnages, problème, rappel
    scene = lesson.get('scene') or {}
    if not scene.get('id') or not scene.get('label'):
        report.error(where, 'la scène (lieu de l\'histoire) est obligatoire', soft=True)
    cast = lesson.get('cast') or []
    if 'palou' not in cast:
        report.error(where, 'Palou doit faire partie de la distribution', soft=True)
    cfg = get_track_config(track)
    cast_names = load_track_cast(track=track, content_dir=content_dir)
    track_chars = load_track_characters(track=track, content_dir=content_dir)
    char_by_id = {c['id']: c for c in track_chars if 'id' in c}

    unknown = [c for c in cast if c not in cast_names]
    if unknown:
        report.error(where, f'personnages inconnus : {unknown}')
    if len(lesson.get('problem', '')) < 20:
        report.error(where, 'le problème de l\'histoire est obligatoire (« Le problème : … »)', soft=True)
    if index > 0 and not lesson.get('callback'):
        report.error(where, 'un rappel d\'un épisode précédent est obligatoire (sauf pour la première leçon du chapitre)', soft=True)

    # Fiche enseignant
    if cfg.get('school'):
        fiche = lesson.get('fiche')
        if not fiche or not isinstance(fiche, dict):
            report.error(where, "fiche enseignant manquante ('fiche')")
        else:
            for f_key in ('objectifs', 'deroule', 'materiel', 'reponses', 'attention'):
                if f_key not in fiche or not isinstance(fiche[f_key], list):
                    report.error(where, f"champ obligatoire manquant ou non-liste dans la fiche : '{f_key}'")
            if fiche.get('objectifs') and len(fiche['objectifs']) < 1:
                report.error(where, "au moins 1 phrase requise dans 'objectifs'")
            if fiche.get('deroule') and len(fiche['deroule']) < 1:
                report.error(where, "au moins 1 phrase requise dans 'deroule'")
    elif 'fiche' in lesson:
        report.error(where, "la fiche enseignant n'est autorisée que dans les parcours école")

    # Le casting listé correspond au casting nommé dans le texte
    text = ' '.join(_all_strings({k: v for k, v in lesson.items() if k not in ('id', 'cast', 'scene')}))
    named = set()
    for c in track_chars:
        cid = c.get('id')
        if not cid:
            continue
        cname = c.get('name', cid)
        patterns = [rf'\b{re.escape(cname)}\b']
        for alias in c.get('aliases', []):
            patterns.append(rf'\b{re.escape(alias)}\b')
        if cid == 'mme-diop':
            patterns.append(r'\bMme Diop\b')
        if any(re.search(pat, text) for pat in patterns):
            named.add(cid)
    missing = set(cast) - named
    extra = named - set(cast)
    if missing:
        report.error(where, f'personnages listés mais absents du texte : {sorted(missing)}', soft=True)
    if extra:
        report.error(where, f'personnages cités mais absents de la distribution : {sorted(extra)}', soft=True)

    # Écrans
    screens = lesson.get('screens', [])
    kinds = [s.get('kind') for s in screens]
    if not 6 <= len(screens) <= 9:
        report.error(where, f'{len(screens)} écrans (entre 6 et 9)', soft=True)
    if kinds and kinds[0] != 'story':
        report.error(where, 'le premier écran doit être une histoire', soft=True)
    if kinds and kinds[-1] != 'bravo':
        report.error(where, 'le dernier écran doit être « Bravo »')
    if kinds.count('discover') != 1:
        report.error(where, 'il faut exactement un écran « Découvre » (un seul mot nouveau)', soft=True)
    if not ({'play', 'why'} & set(kinds)):
        report.error(where, 'il faut au moins une activité', soft=True)
    if 'create' not in kinds and kinds.count('play') < 2:
        report.error(where, 'il faut un écran « Crée » (ou un second écran de jeu : « le défi de Palou »)', soft=True)
    if kinds.count('bravo') != 1:
        report.error(where, 'il faut exactement un écran « Bravo »')

    stats = {'choose': 0, 'correct_longest': 0}
    wolof = 0
    for number, screen in enumerate(screens, 1):
        _check_screen(report, where, number, screen, track=track, stats=stats, total_screens=len(screens))
        sp = screen.get('speaker')
        if sp:
            if sp not in cast_names:
                report.error(where, f'personnage qui parle inconnu : {sp}')
            elif sp not in cast:
                report.error(where, f"le personnage « {sp} » parle mais n'est pas dans la distribution de la leçon")
            c_info = char_by_id.get(sp, {})
            c_mod = c_info.get('module')
            is_principal = c_info.get('principal', False)
            if c_mod and not is_principal and c_mod != module_index:
                report.warn(where, f"le personnage « {sp} » parle dans le module {module_index} alors qu'il est rattaché à {c_mod}")
        if screen.get('wolof'):
            wolof += 1
    if wolof > 2:
        report.warn(where, f'{wolof} pastilles de wolof : « quelques mots seulement »')
    if stats['choose'] >= 2 and stats['correct_longest'] / stats['choose'] > 0.5:
        report.error(where, 'la bonne réponse est la plus longue dans plus de la moitié des questions', soft=True)


def validate_all(content_dir=None, chapters=None, use_base=True, track='7-9'):
    """Valide tous les chapitres d'un parcours ; renvoie un `Report`."""
    cfg = get_track_config(track)
    report = Report()
    cdir = Path(content_dir or cfg['content_dir'])
    manifest = cdir / 'pictos.json'
    if manifest.exists():
        report.pictos = json.loads(manifest.read_text(encoding='utf-8')).get('pictos', {})
    ch_list = chapters if chapters is not None else load_chapters(content_dir=content_dir, track=track)
    catalog = _catalog_worlds(use_base=use_base, track=track, chapters=ch_list)
    seen = set()
    if not ch_list:
        report.error(str(cdir), f"aucun contenu trouvé pour le parcours {track}")
        return report
    for chapter_file, data in ch_list:
        module = data.get('module', {})
        mid = module.get('id')
        if mid not in catalog:
            report.error(chapter_file, f'module inconnu du catalogue : {mid!r}')
            continue
        for key in ('title', 'place', 'intro'):
            if not module.get(key):
                report.error(chapter_file, f'module : « {key} » manquant')

        for vkey in ('video_arrivee', 'video_depart'):
            vname = module.get(vkey)
            if vname:
                vpath = cfg['videos_dir'] / vname
                if not vpath.exists():
                    report.warn(chapter_file, f"la vidéo {vkey} « {vname} » n'existe pas encore")

        catalog_lessons = catalog[mid]
        lessons = data.get('lessons', [])
        if len(lessons) != len(catalog_lessons):
            report.error(chapter_file, f'{len(lessons)} leçons, le catalogue en attend {len(catalog_lessons)}')
        for index, lesson in enumerate(lessons):
            if lesson.get('id') in seen:
                report.error(chapter_file, f'leçon en double : {lesson.get("id")}')
            seen.add(lesson.get('id'))
            _check_lesson(report, chapter_file, index, lesson, catalog_lessons, mid, track=track, content_dir=content_dir)
    return report


def export_markdown(chapters=None, track='7-9'):
    """Document lisible du contenu (texte, bonnes réponses, explications, images)."""
    cfg = get_track_config(track)
    cast_names = load_track_cast(track)
    out = [f'# Contenu du parcours {cfg.get("label", track)}', '', '✅ = bonne réponse.', '']
    for _chapter_file, data in (chapters if chapters is not None else load_chapters(track=track)):
        module = data['module']
        out += [f'## Chapitre {module.get("chapter", 1)} · {module.get("title", "")}', f'*Lieu : {module.get("place", "")}*', '', f'> {module.get("intro", "")}', '']
        for lesson in data.get('lessons', []):
            cast_display = ", ".join(cast_names.get(c, c) for c in lesson.get("cast", []))
            scene_label = lesson.get("scene", {}).get("label", "")
            out += [f'### {lesson.get("id")} · {lesson.get("title")}',
                    f'- **Scène :** {scene_label}',
                    f'- **Personnages :** {cast_display}',
                    f'- **Le problème :** {lesson.get("problem", "")}']
            if lesson.get('callback'):
                out.append(f'- **Rappel :** {lesson["callback"]}')
            out.append('')
            for number, screen in enumerate(lesson['screens'], 1):
                out.append(f'**Écran {number} · {screen.get("kind", "")}**' + (f' · {cast_names.get(screen["speaker"], screen["speaker"])} parle' if screen.get('speaker') else ''))
                out.append(f'> {screen["text"]}')
                if screen.get('wolof'):
                    out.append(f'- Wolof : *{screen["wolof"]["mot"]}* = {screen["wolof"]["sens"]}')
                if screen.get('word'):
                    out.append(f'- Mot nouveau : **{screen["word"]["terme"]}** : {screen["word"]["sens"]}')
                if screen.get('learned'):
                    out.append(f'- Ce que j\'ai appris : {screen["learned"]}')
                for r, rnd in enumerate(screen.get('rounds', []), 1):
                    out.append(f'- *Manche {r} ({rnd["type"]})* : {rnd["prompt"]}  \n  Indice : {rnd["hint"]}  \n  Réussite : {rnd["success"]}')
                    for option in rnd.get('options', []):
                        mark = '✅' if option.get('correct') else '❌'
                        why = '' if option.get('correct') else f' → {option["explain"]}'
                        out.append(f'  - {mark} {option.get("emoji", "")} {option["label"]}{why}')
                    if rnd['type'] == 'rulesort':
                        for rule in rnd['rules']:
                            mark = '✅' if rule.get('correct') else '❌'
                            out.append(f'  - {mark} Règle « {rule["label"]} » → ' + ' | '.join(
                                f'{name} : ' + ', '.join(i['label'] for i in rnd['items'] if i['props'][rule['prop']] == value)
                                for value, name in rule['groups'].items()) + ('' if rule.get('correct') else f' ({rule["explain"]})'))
                        continue
                    if rnd['type'] == 'shield':
                        out.append(f'  - À protéger : {rnd["scene"]["label"]}')
                        for item in rnd['items']:
                            out.append(f'  - {"✅ secret (à cacher)" if item.get("secret") else "❌ sans danger"} : {item["label"]}' + ('' if item.get('secret') else f' → {item["explain"]}'))
                        continue
                    if rnd['type'] == 'machine':
                        out.append(f'  - IA à construire : {rnd["goal"]["label"]}')
                        for slot in rnd['slots']:
                            out.append(f'  - Case « {slot["label"]} » : {slot["question"]}')
                            for option in slot['options']:
                                out.append(f'    - {"✅" if option.get("correct") else "❌"} {option["label"]}' + ('' if option.get('correct') else f' → {option["explain"]}'))
                        out.append(f'  - Machine prête : {rnd["demo"]["prompt"]} (cas à essayer : {rnd["demo"]["need"]})')
                        for case in rnd['demo']['cases']:
                            out.append(f'  - Cas « {case["label"]} » → la machine répond : {case["result"]}')
                        continue
                    if rnd['type'] == 'verify':
                        out.append(f'  - Affirmation : {rnd["claim"]["text"]} · indices à trouver : {rnd["need"]}')
                        for check in rnd['checks']:
                            out.append(f'  - {"✅ utile" if check.get("useful") else "❌ inutile"} : {check["label"]} → {check["reveal"]}' + ('' if check.get('useful') else f' ({check["explain"]})'))
                        out.append(f'  - Tampon : {rnd["ask"]}')
                        for stamp in rnd['stamps']:
                            out.append(f'  - {"✅" if stamp.get("correct") else "❌"} {stamp["label"]}' + ('' if stamp.get('correct') else f' → {stamp["explain"]}'))
                        continue
                    if rnd['type'] == 'loupe':
                        out.append(f'  - Image : {rnd["photo"]["label"]} · indices à repérer : {rnd["need"]}')
                        for spot in rnd['spots']:
                            out.append(f'  - {"✅ indice" if spot.get("clue") else "❌ normal"} : {spot["label"]} ({spot["x"]} %, {spot["y"]} %) → Palou : {spot["says"]}' + ('' if spot.get('clue') else f' ({spot["explain"]})'))
                        continue
                    if rnd['type'] == 'layers':
                        out.append(f'  - L\'idée : {rnd["goal"]["label"]} · cartes à placer : {rnd["need"]}')
                        for k, line in enumerate(rnd['says']):
                            out.append(f'  - Palou dit après {k} carte(s) : {line}')
                        for card in rnd['cards']:
                            out.append(f'  - {"✅ bonne carte" if card.get("good") else "❌ hors sujet"} : {card["label"]}' + ('' if card.get('good') else f' → {card["explain"]}'))
                        continue
                    if rnd['type'] == 'speak':
                        out.append(f'  - L\'enfant dit : « {rnd["say"]} » · mots attendus : {rnd["need"]} · à éviter : {rnd.get("avoid") or "aucun"}')
                        out.append(f'  - Cartes : {", ".join(rnd["cards"])}')
                        out.append(f'  - Palou si un mot manque : {rnd["missing"]}')
                        if rnd.get('vague'):
                            out.append(f'  - Palou si c\'est vague : {rnd["vague"]}')
                        continue
                    if rnd['type'] == 'lens':
                        out.append(f'  - Photo : {rnd["photo"]["label"]}')
                        for lens in rnd['lenses']:
                            out.append(f'  - {"✅" if lens.get("correct") else "❌"} Regard « {lens["label"]} » ({lens["view"]}) : Palou dit « {lens["says"]} »' + ('' if lens.get('correct') else f' → {lens["explain"]}'))
                        continue
                    if rnd['type'] == 'focus':
                        out.append(f'  - Photo : {rnd["photo"]["label"]} · effet : {rnd["effect"]} · Palou reconnaît dès le cran {rnd["enough"] + 1}')
                        for k, level in enumerate(rnd['levels'], 1):
                            out.append(f'  - Cran {k} : Palou dit « {level["says"]} »')
                        continue
                    if rnd['type'] == 'relabel':
                        out.append(f'  - Photo d\'essai : {rnd["test"]["label"]} · Palou répond d\'abord : {rnd["says"]}')
                        for card in rnd['cards']:
                            out.append(f'  - {"✅ à corriger" if card.get("fix") else "❌"} {card["label"]} (étiquette « {card["tag"]} »)' + (f' → devient « {card["fix"]} »' if card.get('fix') else f' → {card["explain"]}'))
                        continue
                    if rnd['type'] == 'probe':
                        for photo in rnd['photos']:
                            out.append(f'  - {"✅ Palou se trompe" if photo.get("wrong") else "❌"} {photo["label"]} : Palou dit « {photo["guess"]} »' + ('' if photo.get('wrong') else f' → {photo["explain"]}'))
                        out.append(f'  - Quand l\'erreur est trouvée : {rnd["found"]}')
                        for option in rnd['fix']['options']:
                            out.append(f'  - {"✅" if option.get("correct") else "❌"} {option["label"]}' + ('' if option.get('correct') else f' → {option["explain"]}'))
                        continue
                    if rnd['type'] == 'train':
                        out.append(f'  - Palou apprend : {rnd["learns"]} · photo d\'essai : {rnd["test"]["label"]}')
                        for k, line in enumerate(rnd['says']):
                            out.append(f'  - Palou dit après {k} exemple(s) : {line}')
                        for example in rnd['examples']:
                            out.append(f'  - {"✅ bon exemple" if example.get("good") else "❌ mauvais exemple"} : {example["label"]}' + ('' if example.get('good') else f' → {example["explain"]}'))
                        continue
                    if rnd['type'] == 'cleanup':
                        out.append(f'  - Palou compte : {rnd["counts"]}')
                        for row in rnd['rows']:
                            out.append(f'  - {"❌ intrus" if row.get("intruder") else "✅ à garder"} : {row["label"]}' + ('' if row.get('intruder') else f' → {row["explain"]}'))
                        continue
                    if rnd['type'] == 'whois':
                        target = next(i for i in rnd['items'] if i['id'] == rnd['target'])
                        tag_label = {t['id']: t['label'] for t in rnd['tags']}
                        out.append(f'  - Objet à trouver : {target["label"]}')
                        for item in rnd['items']:
                            out.append(f'  - {item["label"]} → données : {", ".join(tag_label[t] for t in item["tags"]) or "aucune"}')
                        for tag in rnd['tags']:
                            right = tag['id'] in target['tags']
                            out.append(f'  - {"✅" if right else "❌"} {tag["label"]}' + ('' if right else f' → {tag["explain"]}'))
                        continue
                    for item in rnd.get('items', []):
                        out.append(f'  - {item.get("emoji", "")} {item["label"]} → boîte « {item["bin"]} » ({item["explain"]})')
                for step in screen.get('steps', []):
                    labels = ', '.join(t['label'] for t in step['tray'])
                    out.append(f'- *Crée* : {step["prompt"]} ({step["count"]} à toucher) : {labels}')
                out.append('')
            out.append('')
    return '\n'.join(out)
