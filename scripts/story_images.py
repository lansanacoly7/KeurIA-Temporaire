"""Prépare le travail d'Antigravity pour les images des écrans d'histoire qui n'en ont pas encore.

    venv\\Scripts\\python.exe scripts\\story_images.py liste     # écrit docs/images-histoires/PROMPTS_IMAGES_HISTOIRES.md (+ le tableau CSV)
    venv\\Scripts\\python.exe scripts\\story_images.py brancher  # branche dans les JSON les images déjà déposées dans public/images/parcours79/lecons/

Un écran d'histoire sans image affiche seulement le décor de la leçon. Nom de fichier attendu : m<module>-l<leçon>-s<numéro d'écran>.webp
(800 x 600 px, WebP), à déposer dans frontend/public/images/parcours79/lecons/. « brancher » ajoute `image` et `alt` à l'écran concerné.
"""
import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "frontend" / "content" / "parcours79"
IMAGES = ROOT / "frontend" / "public" / "images" / "parcours79" / "lecons"
OUT = ROOT / "docs" / "images-histoires"

CAST = {
    "palou": "Palou (le petit lion-robot orange et crème, mascotte)", "moussa": "Moussa (garçon de 8 ans)", "fatou": "Fatou (fille de 8 ans)",
    "mme-diop": "Madame Diop (la maîtresse, robe wax bleue)", "mame-awa": "Mame Awa (commerçante du marché)", "papa-ibou": "Papa Ibou (le père de Moussa)",
    "tonton-cheikh": "Tonton Cheikh (le pêcheur)", "baye": "Baye (garçon du quartier)", "mame-coumba": "Mame Coumba (la grand-mère)",
}
PHOTOS = {"palou": "Palou_Content.png", "moussa": "moussa.webp", "fatou": "fatou.webp", "mme-diop": "mme-diop.webp", "mame-awa": "mame-awa.webp",
          "papa-ibou": "papa-ibou.webp", "tonton-cheikh": "tonton-cheikh.webp", "baye": "baye.webp", "mame-coumba": "mame-coumba.webp"}


def missing():
    rows = []
    for path in sorted(CONTENT.glob("m[0-9]*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        for lesson in data["lessons"]:
            for number, screen in enumerate(lesson["screens"], 1):
                if screen["kind"] != "story" or screen.get("image"):
                    continue
                lid = lesson["id"]                               # p3-2
                module, k = lid[1:].split("-")
                name = f"m{int(module):02d}-l{k}-s{number:02d}.webp"
                present = [c for c in lesson.get("cast", []) if c in CAST]
                speaker = screen.get("speaker")
                rows.append({
                    "fichier": name, "leçon": lid, "titre_leçon": lesson["title"], "écran": number, "décor": lesson.get("scene", {}).get("label", ""),
                    "texte": screen["text"], "qui_parle": speaker or "", "personnages_de_la_leçon": ", ".join(present), "fichier_json": path.name,
                    "branché": (IMAGES / name).exists(),
                })
    return rows


def liste():
    rows = missing()
    OUT.mkdir(parents=True, exist_ok=True)
    if not rows:
        (OUT / "PROMPTS_IMAGES_HISTOIRES.md").write_text(
            "# Images des écrans d'histoire\n\nToutes les images d'histoire sont livrées et branchées : il ne reste rien à produire.\n", encoding="utf-8")
        (OUT / "images_histoires.csv").write_text("", encoding="utf-8")
        print("Plus aucune image à produire.")
        return
    with (OUT / "images_histoires.csv").open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]), delimiter=";")
        writer.writeheader()
        writer.writerows(rows)
    lines = [
        "# Images des écrans d'histoire à créer (pour Antigravity)", "",
        f"**{len(rows)} images** à produire. Chaque écran d'histoire ci-dessous n'a pas encore d'image : il n'affiche que le décor de la leçon.", "",
        "## Règles communes (les mêmes que les images déjà livrées, ex. `m01-l1-caisse.webp`)", "",
        "- **Format** : WebP, **800 × 600 px** (4:3, paysage), fond complet (pas de transparence), moins de 150 Ko.",
        "- **Style** : illustration jeunesse chaleureuse, couleurs vives et douces, traits nets, lumière dorée du Sénégal. Même style que les images déjà présentes dans `frontend/public/images/parcours79/lecons/`.",
        "- **Personnages** : toujours reconnaissables. Joindre les références de `frontend/public/images/parcours79/personnages/` (une par personnage) et `frontend/public/images/palou/` pour Palou. Mêmes visages, mêmes vêtements d'une image à l'autre.",
        "- **Vue de face ou de trois quarts**, scène lisible d'un coup d'œil par un enfant de 7 ans : 1 à 3 personnages, une action claire, peu de détails.",
        "- **Aucun texte écrit dans l'image** (pas de lettres, pas de panneaux lisibles), aucun logo, aucune marque.",
        "- **Contexte** : Sénégal d'aujourd'hui (école, marché, quartier, plage de Guet Ndar). Respectueux, joyeux, sans violence.",
        "- Le sujet doit montrer **ce que dit le texte de l'écran** (colonne « Texte »).", "",
        "Nom du fichier = colonne « Fichier » (à déposer dans `frontend/public/images/parcours79/lecons/`). Quand des images sont déposées,",
        "lancer `venv\\Scripts\\python.exe scripts\\story_images.py brancher` : le script les branche dans les leçons.", "",
        "| Fichier | Leçon | Décor | Texte de l'écran | Personnages à joindre |", "|---|---|---|---|---|",
    ]
    for r in rows:
        who = []
        for c in [r["qui_parle"]] + r["personnages_de_la_leçon"].split(", "):
            if c and c in PHOTOS and c not in who:
                who.append(c)
        refs = ", ".join(f"{CAST.get(c, c).split(' (')[0]} (`{PHOTOS[c]}`)" for c in who[:4]) or "—"
        lines.append(f"| `{r['fichier']}` | {r['leçon']} — {r['titre_leçon']} | {r['décor']} | {r['texte']} | {refs} |")
    (OUT / "PROMPTS_IMAGES_HISTOIRES.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"{len(rows)} images listées dans {OUT.relative_to(ROOT)}")


def brancher():
    done = 0
    for path in sorted(CONTENT.glob("m[0-9]*.json")):
        raw = path.read_text(encoding="utf-8")
        data = json.loads(raw)
        changed = False
        for lesson in data["lessons"]:
            module, k = lesson["id"][1:].split("-")
            for number, screen in enumerate(lesson["screens"], 1):
                name = f"m{int(module):02d}-l{k}-s{number:02d}.webp"
                if screen["kind"] == "story" and not screen.get("image") and (IMAGES / name).exists():
                    screen["image"] = name
                    screen["alt"] = f"Illustration : {screen['text']}"
                    changed = True
                    done += 1
        if changed:
            newline = "\r\n" if "\r\n" in raw else "\n"
            path.write_text(json.dumps(data, ensure_ascii=False, indent=2).replace("\n", newline) + newline, encoding="utf-8", newline="")
    print(f"{done} image(s) branchée(s)")


if __name__ == "__main__":
    {"liste": liste, "brancher": brancher}.get(sys.argv[1] if len(sys.argv) > 1 else "", lambda: print(__doc__))()
