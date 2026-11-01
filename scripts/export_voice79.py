"""
Liste des phrases à faire dire par la voix officielle de Palou, module par module et leçon par leçon.
Paramétrable par tranche d'âge (--track 7-9 par défaut, ou 7-9-ecole, 10-12, etc.).

    venv\Scripts\python.exe scripts\export_voice79.py                        # tous les modules 7-9
    venv\Scripts\python.exe scripts\export_voice79.py --track 7-9-ecole       # parcours élève 7-9
    venv\Scripts\python.exe scripts\export_voice79.py --track 10-12           # parcours 10-12
    venv\Scripts\python.exe scripts\export_voice79.py m03                    # un seul module du 7-9
"""
import argparse
import csv
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent

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

EMOJI = re.compile("[\U0001F300-\U0001FAFF☀-➿️‍]")
PRONUNCIATIONS = [(r"\bIA\b", "I A"), (r"\bBaye\b", "Baï"), (r"\bMame\b", "Mamé"), (r"\bKermel\b", "Kermèl"), (r"\bGuet Ndar\b", "Guette Ndar"), (r"\bMme\b", "Madame")]

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


import sys
sys.path.insert(0, str(ROOT / "backend"))
from apps.curriculum.voices import clean, to_say, clips_of

def _unused_clean(text: str) -> str:
    text = text.replace("{prenom}", "")
    text = re.sub(r"\s+,", ",", text)
    text = re.sub(r"^\s*[,!]\s*", "", text)
    return re.sub(r"\s+", " ", EMOJI.sub("", text)).strip()


def to_say(text: str) -> str:
    out = text
    for pattern, spoken in PRONUNCIATIONS:
        out = re.sub(pattern, spoken, out)
    return out


def clips_of(lesson: dict):
    """(clé, vague, écran, type, texte) pour chaque fichier audio de la leçon."""
    for si, screen in enumerate(lesson.get("screens") or [], start=1):
        e = f"e{si:02d}"
        kind = screen.get("kind")
        if kind == "bravo":
            yield f"{e}-bravo", 1, si, "félicitations de fin", screen["text"]
            yield f"{e}-retiens", 1, si, "« Je retiens »", screen["learned"]
        elif kind == "classe":
            yield e, 2, si, "activité en classe", f"En classe : {screen.get('titre', '')}. {screen.get('text', '')}"
        elif kind == "debat":
            yield e, 2, si, "débat", f"On en parle ! {screen.get('question', '')} {screen.get('text', '')}"
        else:
            wave = 1 if kind in ("story", "discover") else 2
            yield e, wave, si, f"texte ({kind})", screen.get("text", "")

        for ri, rnd in enumerate(screen.get("rounds") or [], start=1):
            r = f"{e}-m{ri}"
            if rnd.get("dit") or rnd.get("prompt"):
                yield f"{r}-q", 2, si, "consigne du jeu", rnd.get("dit") or rnd["prompt"]
            if rnd.get("success"):
                yield f"{r}-ok", 2, si, "bravo (bonne réponse)", rnd["success"]
            for oi, opt in enumerate(rnd.get("options") or [], start=1):
                if not opt.get("correct") and opt.get("explain"):
                    yield f"{r}-o{oi}", 3, si, "explication (mauvaise réponse)", opt["explain"]
            for ti, tag in enumerate(rnd.get("tags") or [], start=1):
                if tag.get("explain"):
                    yield f"{r}-o{ti}", 3, si, "explication (mauvaise donnée)", tag["explain"]
            for ui, rule in enumerate(rnd.get("rules") or [], start=1):
                if rule.get("explain") and not rule.get("correct"):
                    yield f"{r}-o{ui}", 3, si, "explication (mauvaise règle)", rule["explain"]
            if rnd.get("type") == "shield":
                for ii, item in enumerate(rnd.get("items") or [], start=1):
                    if item.get("explain") and not item.get("secret"):
                        yield f"{r}-o{ii}", 3, si, "explication (information sans danger)", item["explain"]
            if rnd.get("type") == "machine":
                running = 0
                for slot in rnd.get("slots") or []:
                    for option in slot.get("options") or []:
                        running += 1
                        if option.get("explain") and not option.get("correct"):
                            yield f"{r}-o{running}", 3, si, "explication (mauvaise option de la case)", option["explain"]
                if rnd.get("demo") and rnd["demo"].get("prompt"):
                    yield f"{r}-d", 3, si, "machine prête", rnd["demo"]["prompt"]
                for ki, case in enumerate((rnd.get("demo") or {}).get("cases") or [], start=1):
                    yield f"{r}-r{ki}", 3, si, "réponse de la machine", case["result"]
            if rnd.get("type") == "verify":
                for ci, check in enumerate(rnd.get("checks") or [], start=1):
                    if check.get("useful") and check.get("reveal"):
                        yield f"{r}-s{ci}", 3, si, "indice révélé par la question", check["reveal"]
                    elif check.get("explain"):
                        yield f"{r}-o{ci}", 3, si, "explication (question inutile)", check["explain"]
                if rnd.get("ask"):
                    yield f"{r}-a", 3, si, "demande du tampon", rnd["ask"]
                for fi, stamp in enumerate(rnd.get("stamps") or [], start=1):
                    if stamp.get("explain") and not stamp.get("correct"):
                        yield f"{r}-f{fi}", 3, si, "explication (mauvais tampon)", stamp["explain"]
            if rnd.get("type") == "loupe":
                for si2, spot in enumerate(rnd.get("spots") or [], start=1):
                    if spot.get("clue") and spot.get("says"):
                        yield f"{r}-s{si2}", 3, si, "ce que Palou voit dans la loupe", spot["says"]
                    elif spot.get("explain"):
                        yield f"{r}-o{si2}", 3, si, "explication (zone normale)", spot["explain"]
            if rnd.get("type") == "layers":
                for k, line in enumerate(rnd.get("says") or []):
                    if k >= 1:
                        yield f"{r}-s{k}", 3, si, "réaction de Palou (carte placée)", line
                for ci, card in enumerate(rnd.get("cards") or [], start=1):
                    if card.get("explain") and not card.get("good"):
                        yield f"{r}-o{ci}", 3, si, "explication (carte hors sujet)", card["explain"]
            if rnd.get("type") == "speak":
                if rnd.get("missing"):
                    yield f"{r}-o1", 3, si, "réponse de Palou (un mot manque)", rnd["missing"]
                if rnd.get("vague"):
                    yield f"{r}-o2", 3, si, "réponse de Palou (c'est vague)", rnd["vague"]
            if rnd.get("type") == "lens":
                for li, lens in enumerate(rnd.get("lenses") or [], start=1):
                    if lens.get("explain") and not lens.get("correct"):
                        yield f"{r}-o{li}", 3, si, "explication (mauvais regard)", lens["explain"]
            if rnd.get("type") == "focus":
                for k, level in enumerate(rnd.get("levels") or []):
                    if level.get("says"):
                        yield f"{r}-s{k}", 3, si, f"ce que Palou voit (cran {k + 1})", level["says"]
            if rnd.get("type") == "relabel":
                for ci, card in enumerate(rnd.get("cards") or [], start=1):
                    if card.get("explain") and not card.get("fix"):
                        yield f"{r}-o{ci}", 3, si, "explication (photo déjà juste)", card["explain"]
            if rnd.get("type") == "probe":
                for pi, photo in enumerate(rnd.get("photos") or [], start=1):
                    if photo.get("explain") and not photo.get("wrong"):
                        yield f"{r}-o{pi}", 3, si, "explication (Palou avait juste)", photo["explain"]
                if rnd.get("found"):
                    yield f"{r}-s1", 3, si, "erreur trouvée + question", rnd["found"]
                for fi, option in enumerate((rnd.get("fix") or {}).get("options") or [], start=1):
                    if option.get("explain") and not option.get("correct"):
                        yield f"{r}-f{fi}", 3, si, "explication (mauvais exemple à donner)", option["explain"]
            if rnd.get("type") == "train":
                for k, line in enumerate(rnd.get("says") or []):
                    if k >= 1:
                        yield f"{r}-s{k}", 3, si, "réaction de Palou (exemple reçu)", line
                for ei, ex in enumerate(rnd.get("examples") or [], start=1):
                    if ex.get("explain") and not ex.get("good"):
                        yield f"{r}-o{ei}", 3, si, "explication (mauvais exemple)", ex["explain"]
            for wi, row in enumerate(rnd.get("rows") or [], start=1):
                if row.get("explain") and not row.get("intruder"):
                    yield f"{r}-o{wi}", 3, si, "explication (bonne donnée touchée)", row["explain"]
            for ii, item in enumerate(rnd.get("items") or [], start=1):
                if item.get("explain"):
                    yield f"{r}-i{ii}", 3, si, "explication (objet à ranger)", item["explain"]


def write_csv(path: Path, header, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as f:
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
            rows.sort(key=lambda r: (r[1], r[0]))
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
