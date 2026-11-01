"""Liste les phrases de Palou hors leçons (tutoriel, accueil, défi du jour, jeux, « Finis d'abord… ») dans docs/voix-palou/ui.csv.

Source : frontend/content/voix-ui.json (une clé = un fichier audio : frontend/public/audio/palou/ui/<clé>.mp3).
Le CSV a le même format que ceux des leçons : on le donne ensuite à scripts/generate_voice79.py (préfixe vide) pour générer les voix.

    venv\\Scripts\\python.exe scripts\\export_voice_ui.py
"""
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "frontend" / "content" / "voix-ui.json"
OUT = ROOT / "docs" / "voix-palou" / "ui.csv"
DEST = "frontend/public/audio/palou/ui"

phrases = json.loads(SOURCE.read_text(encoding="utf-8"))
OUT.parent.mkdir(parents=True, exist_ok=True)
with OUT.open("w", encoding="utf-8-sig", newline="") as f:
    writer = csv.writer(f, delimiter=";")
    writer.writerow(["cle", "texte", "fichier_a_deposer"])
    for key, text in phrases.items():
        writer.writerow([key, text, f"{DEST}/{key}.mp3"])
print(f"{len(phrases)} phrases listées dans {OUT.relative_to(ROOT)} ({sum(len(t) for t in phrases.values())} caractères)")
