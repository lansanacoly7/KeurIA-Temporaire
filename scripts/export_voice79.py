"""
Liste des phrases à faire dire par la voix officielle de Palou, module par module et leçon par leçon.
Paramétrable par tranche d'âge (--track 7-9 par défaut, ou 7-9-ecole, 10-12, etc.).

    venv\Scripts\python.exe scripts\export_voice79.py                        # tous les modules 7-9
    venv\Scripts\python.exe scripts\export_voice79.py --track 7-9-ecole       # parcours élève 7-9
    venv\Scripts\python.exe scripts\export_voice79.py --track 10-12           # parcours 10-12
    venv\Scripts\python.exe scripts\export_voice79.py m03                    # un seul module du 7-9

Trois vagues, pour ne pas tout générer d'un coup :
  vague 1 = l'histoire que Palou raconte (récits, mot découverte, « Je retiens », félicitations) : la première version ;
  vague 2 = les jeux (consignes, bravos) et les écrans d'activité ;
  vague 3 = les explications après une erreur et les petites phrases communes.
Ce qui n'est pas enregistré reste lu par la voix du navigateur (ou simplement affiché).

Les noms de fichiers sont stables (écran, manche, option). Le prénom de l'enfant ne se pré-enregistre pas :
« Bravo {prenom} ! » est écrit sans prénom (comme le fait déjà le lecteur).
"""
import argparse
import csv
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))

from apps.curriculum.voices import clean, clips_of, to_say

# Dossiers par parcours
TRACK_MAP = {
    "7-9": {
        "content": ROOT / "frontend" / "content" / "parcours79",
        "out": ROOT / "docs" / "voix-palou",
        "dest": "frontend/public/audio/palou/lecons",
        "pattern": "m[0-9][0-9].json",
    },
    "7-9-ecole": {
        "content": ROOT / "frontend" / "content" / "parcours79ecole",
        "out": ROOT / "docs" / "voix-ecole",
        "dest": "frontend/public/audio/palou/ecole79",
        "pattern": "m[0-9][0-9].json",
    },
    "10-12": {
        "content": ROOT / "frontend" / "content" / "parcours1012",
        "out": ROOT / "docs" / "voix-1012",
        "dest": "frontend/public/audio/palou/1012",
        "pattern": "a[0-9][0-9].json",
    },
    "10-12-ecole": {
        "content": ROOT / "frontend" / "content" / "parcours1012ecole",
        "out": ROOT / "docs" / "voix-ecole1012",
        "dest": "frontend/public/audio/palou/ecole1012",
        "pattern": "ea[0-9][0-9].json",
    },
    "13-15": {
        "content": ROOT / "frontend" / "content" / "parcours1315",
        "out": ROOT / "docs" / "voix-1315",
        "dest": "frontend/public/audio/palou/1315",
        "pattern": "c[0-9][0-9].json",
    },
    "13-15-ecole": {
        "content": ROOT / "frontend" / "content" / "parcours1315ecole",
        "out": ROOT / "docs" / "voix-ecole1315",
        "dest": "frontend/public/audio/palou/ecole1315",
        "pattern": "ec[0-9][0-9].json",
    },
}

COMMON = [
    ("commun_mission", "Mission accomplie !", 1),
    ("commun_tu-as-3-etoiles", "Tu as gagné trois étoiles !", 1),
    ("commun_tu-as-2-etoiles", "Tu as gagné deux étoiles !", 1),
    ("commun_tu-as-1-etoile", "Tu as gagné une étoile !", 1),
    ("commun_3-etoiles", "Bravo, tu as tout réussi du premier coup ! Palou est très fier de toi.", 1),
    ("commun_2-etoiles", "Très bien ! Encore un petit effort et tu auras les trois étoiles.", 1),
    ("commun_1-etoile", "Bien joué, tu as persévéré ! Rejoue la leçon pour gagner plus d’étoiles.", 1),
    ("commun_autocollant", "Nouvel autocollant !", 1),
    ("commun_presque-regarde", "Presque ! Regarde encore.", 3),
    ("commun_presque-boite", "Presque ! Essaie l’autre boîte.", 3),
]
HEADER = ["fichier_a_deposer", "vague", "ecran", "type", "texte", "texte_a_generer", "caracteres"]


def write_csv(path: Path, header, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as f:  # BOM : s'ouvre bien dans Excel
        writer = csv.writer(f, delimiter=";")
        writer.writerow(header)
        writer.writerows(rows)


def main():
    parser = argparse.ArgumentParser(description="Export des voix par parcours.")
    parser.add_argument("module", nargs="?", default=None, help="Identifiant d'un module unique (ex: m03, a01)")
    parser.add_argument("--track", choices=list(TRACK_MAP.keys()), default="7-9", help="Tranche d'âge ('7-9' par défaut)")
    parser.add_argument("--from", dest="source", metavar="CHEMIN", help="Dossier racine optionnel pour le contenu")
    args = parser.parse_args()

    t_info = TRACK_MAP[args.track]
    content_dir = Path(args.source) if args.source else t_info["content"]
    out_dir = t_info["out"]
    dest_prefix = t_info["dest"]
    pattern = t_info["pattern"]

    if not content_dir.exists():
        print(f"Dossier de contenu introuvable : {content_dir}")
        return

    summary, total = [], 0
    files = sorted(content_dir.glob(pattern))
    for module_file in files:
        mid = module_file.stem
        if args.module and args.module != mid:
            continue
        try:
            module_data = json.loads(module_file.read_text(encoding="utf-8"))
        except Exception:
            continue
        mod_info = module_data.get("module") or {}
        mod_id = mod_info.get("id", mid)
        mod_title = mod_info.get("title", "")
        folder = f"{mid}-{mod_id}" if mod_id else mid

        for lesson in module_data.get("lessons") or []:
            rows = []
            for key, wave, screen, kind, text in clips_of(lesson):
                shown = clean(text)
                filename = f"{lesson['id']}_{key}.mp3"
                rows.append([f"{dest_prefix}/{mid}/{lesson['id']}/{filename}", wave, screen, kind, shown, to_say(shown), len(shown)])
            rows.sort(key=lambda r: (r[1], r[0]))  # la vague 1 d'abord
            write_csv(out_dir / folder / f"{lesson['id']}.csv", HEADER, rows)
            waves = [sum(1 for r in rows if r[1] == w) for w in (1, 2, 3)]
            summary.append([mid, mod_title, lesson["id"], lesson.get("title", ""), len(rows), *waves, sum(r[6] for r in rows)])
            total += len(rows)

    if not args.module:
        rows = [[f"{dest_prefix}/commun/{k}.mp3", w, "—", "phrase commune", clean(t), to_say(clean(t)), len(clean(t))] for k, t, w in COMMON]
        write_csv(out_dir / "commun.csv", HEADER, rows)
        total += len(rows)

    name = "_recapitulatif.csv" if not args.module else f"_recapitulatif_{args.module}.csv"
    write_csv(out_dir / name, ["module", "titre_module", "lecon", "titre_lecon", "fichiers", "vague_1", "vague_2", "vague_3", "caracteres"], summary)
    print(f"{total} fichiers audio listés pour {args.track} dans {out_dir.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
