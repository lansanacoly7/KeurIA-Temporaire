"""
Découpe les planches de pictogrammes par parcours en images individuelles.

Les planches (12 pictogrammes 4x3 pour 7-9, ou 9 pictogrammes 3x3 pour les autres séries) sont déposées dans
frontend/public/images/<parcours>/pictos-src/sheet-NN.png ; le manifeste frontend/content/<parcours>/pictos.json dit quel
pictogramme se trouve dans quelle case. Chaque case devient un WebP carré (fond rendu transparent) dans .../pictos/<id>.webp.

    python manage.py slice_pictos79                        # toutes les planches du 7-9
    python manage.py slice_pictos79 --track 10-12          # pour le 10-12
    python manage.py slice_pictos79 --track 7-9-ecole --grid 3x3
"""
import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from PIL import Image, ImageChops

from apps.curriculum.parcours79 import FRONTEND, TRACK_CONFIGS, get_track_config

SIZE = 256          # côté final d'un pictogramme
WHITE = 236         # au-dessus de ce niveau de gris, un pixel est du fond


def _segments(profile, expected):
    """Repère les `expected` zones de contenu séparées par du vide ; renvoie None si on n'en trouve pas exactement autant."""
    runs, start = [], None
    for i, value in enumerate(profile):
        if value > 0 and start is None:
            start = i
        elif value == 0 and start is not None:
            runs.append([start, i])
            start = None
    if start is not None:
        runs.append([start, len(profile)])
    # on recolle les zones séparées par un vide minuscule (un trait fin dans un même pictogramme)
    merged = []
    for run in runs:
        if merged and run[0] - merged[-1][1] < 14:
            merged[-1][1] = run[1]
        else:
            merged.append(run)
    merged = [r for r in merged if r[1] - r[0] > 24]
    return merged if len(merged) == expected else None


def _cells(image, columns_count, rows_count):
    """Les cases de la planche : repérées par les espaces vides, sinon par une grille régulière."""
    width, height = image.size
    mask = image.convert('L').point(lambda p: 255 if p < WHITE else 0)
    columns = list(mask.resize((width, 1), Image.BOX).getdata())
    rows = list(mask.resize((1, height), Image.BOX).getdata())
    xs = _segments(columns, columns_count)
    ys = _segments(rows, rows_count)
    if xs and ys:
        return [(x0, y0, x1, y1) for y0, y1 in ys for x0, x1 in xs], 'espaces'
    cw, ch = width / columns_count, height / rows_count
    return [(round(c * cw), round(r * ch), round((c + 1) * cw), round((r + 1) * ch)) for r in range(rows_count) for c in range(columns_count)], 'grille'


def _transparent(cell):
    """Rend le fond blanc transparent (remplissage depuis les bords, pour garder les blancs à l'intérieur du dessin)."""
    rgb = cell.convert('RGB')
    w, h = rgb.size
    marker = (255, 0, 255)
    work = rgb.copy()
    for seed in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        if sum(work.getpixel(seed)) > 3 * WHITE:
            from PIL import ImageDraw
            ImageDraw.floodfill(work, seed, marker, thresh=36)
    background = ImageChops.difference(work, Image.new('RGB', (w, h), marker)).convert('L').point(lambda p: 255 if p == 0 else 0)
    alpha = background.point(lambda p: 0 if p == 255 else 255)
    result = rgb.convert('RGBA')
    result.putalpha(alpha)
    return result


def _drop_fragments(rgba):
    """Efface les petits morceaux orphelins (bords des pictogrammes voisins quand la planche est découpée en grille).

    On regroupe les pixels visibles en îlots (deux morceaux proches sont un même dessin : un cœur et ses étincelles), puis on
    garde les îlots d'une taille comparable au plus gros. Sans numpy/scipy, l'image est rendue telle quelle.
    """
    try:
        import numpy as np
        from scipy import ndimage
    except ImportError:
        return rgba
    alpha = np.array(rgba.getchannel('A'))
    visible = alpha > 0
    if not visible.any():
        return rgba
    labels, count = ndimage.label(ndimage.binary_dilation(visible, iterations=14))
    if count < 2:
        return rgba
    sizes = ndimage.sum(visible, labels, range(1, count + 1))
    keep = np.zeros_like(visible)
    height, width = visible.shape
    biggest = int(np.argmax(sizes))
    for index, (size, box) in enumerate(zip(sizes, ndimage.find_objects(labels), strict=False)):
        on_edge = box[0].start <= 2 or box[1].start <= 2 or box[0].stop >= height - 2 or box[1].stop >= width - 2
        if index == biggest or (size >= sizes[biggest] * 0.12 and not on_edge):
            keep |= labels == index + 1
    cleaned = rgba.copy()
    cleaned.putalpha(Image.fromarray((alpha * keep).astype('uint8')))
    return cleaned


def _square(cell):
    rgba = _drop_fragments(_transparent(cell))
    box = rgba.getchannel('A').getbbox()
    if not box:
        return None
    rgba = rgba.crop(box)
    side = int(max(rgba.size) * 1.12)
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    canvas.paste(rgba, ((side - rgba.width) // 2, (side - rgba.height) // 2), rgba)
    return canvas.resize((SIZE, SIZE), Image.LANCZOS)


class Command(BaseCommand):
    help = 'Découpe les planches de pictogrammes (pictos-src/sheet-NN.png) en pictos/<id>.webp.'

    def add_arguments(self, parser):
        parser.add_argument('sheets', nargs='*', type=int, help='numéros de planches (par défaut : toutes celles qui existent)')
        parser.add_argument('--track', choices=list(TRACK_CONFIGS), default='7-9',
                            help="Parcours cible ('7-9' par défaut).")
        parser.add_argument('--grid', default=None,
                            help="Grille de découpage (ex: '4x3' ou '3x3'). Par défaut 4x3 pour 7-9, 3x3 pour les autres.")
        parser.add_argument('--redo', default='', help='identifiants (séparés par des virgules) des pictogrammes refaits sur sheet-redo.png, dans l\'ordre des cases')
        parser.add_argument('--from', dest='source', metavar='CHEMIN', help='Dossier racine optionnel pour le contenu.')

    def handle(self, *args, **options):
        track = options.get('track', '7-9')
        cfg = get_track_config(track)
        grid_str = options.get('grid')
        if grid_str:
            cols, rows = map(int, grid_str.split('x'))
        else:
            cols, rows = cfg.get('picto_grid', (4, 3))

        source_base = Path(options['source']) if options.get('source') else cfg['content_dir']
        manifest_path = source_base / 'pictos.json'
        if not manifest_path.exists():
            raise CommandError(f'Manifeste des pictogrammes introuvable : {manifest_path}')

        images_base = FRONTEND / 'public' / 'images' / cfg['content_dir'].name
        sources_dir = images_base / 'pictos-src'
        target_dir = images_base / 'pictos'

        manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
        if options['redo']:
            return self._redo([i.strip() for i in options['redo'].split(',') if i.strip()], manifest, sources_dir, target_dir, cols, rows)

        wanted = set(options['sheets'])
        target_dir.mkdir(parents=True, exist_ok=True)
        done = missing = 0
        for number, sheet in enumerate(manifest.get('sheets', []), 1):
            if wanted and number not in wanted:
                continue
            source = sources_dir / sheet['file']
            if not source.exists():
                if wanted:
                    raise CommandError(f'planche introuvable : {source}')
                missing += 1
                continue
            image = Image.open(source).convert('RGB')
            cells, mode = _cells(image, cols, rows)
            self.stdout.write(f'{sheet["file"]} : {image.size[0]}x{image.size[1]}, découpe {cols}x{rows} par {mode}')
            for pid, box in zip(sheet['ids'], cells, strict=False):
                picto = _square(image.crop(box))
                if picto is None:
                    self.stderr.write(f'  ✗ {pid} : case vide')
                    continue
                picto.save(target_dir / f'{pid}.webp', 'WEBP', quality=88, method=6)
                done += 1
        self.stdout.write(self.style.SUCCESS(f'{done} pictogramme(s) écrit(s) pour {track} ; {missing} planche(s) pas encore reçue(s).'))
        return None

    def _redo(self, ids, manifest, sources_dir, target_dir, cols, rows):
        known = {pid for sheet in manifest.get('sheets', []) for pid in sheet.get('ids', [])}
        unknown = [i for i in ids if i not in known]
        if unknown:
            raise CommandError(f'identifiants inconnus : {", ".join(unknown)}')
        source = sources_dir / 'sheet-redo.png'
        if not source.exists():
            raise CommandError(f'planche introuvable : {source}')
        image = Image.open(source).convert('RGB')
        cells, mode = _cells(image, cols, rows)
        self.stdout.write(f'sheet-redo.png : {image.size[0]}x{image.size[1]}, découpe {cols}x{rows} par {mode}')
        target_dir.mkdir(parents=True, exist_ok=True)
        for pid, box in zip(ids, cells, strict=False):
            picto = _square(image.crop(box))
            if picto is None:
                self.stderr.write(f'  ✗ {pid} : case vide')
                continue
            picto.save(target_dir / f'{pid}.webp', 'WEBP', quality=88, method=6)
        self.stdout.write(self.style.SUCCESS(f'{len(ids)} pictogramme(s) refait(s).'))
