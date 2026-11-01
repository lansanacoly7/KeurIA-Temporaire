"""Génère les fichiers audio d'une leçon avec la voix de Palou (ElevenLabs, Eleven v4, stabilité 53 %, similarité 100 %).

Usage (depuis la racine du projet, avec le Python du venv ; `pip install mutagen` une fois) :
    venv\\Scripts\\python.exe scripts\\generate_voice79.py <dossier temporaire> <liste .csv> <dossier destination> <préfixe de leçon>
Exemple :
    venv\\Scripts\\python.exe scripts\\generate_voice79.py tmp\\stage_p8-1 docs\\voix-palou\\m08-p8\\p8-1.csv frontend\\public\\audio\\palou\\lecons\\m08\\p8-1 p8-1_

Variables d'environnement à définir avant (ne jamais écrire la clé dans un fichier du projet) :
    $env:ELEVEN_API_KEY = "<ta clé ElevenLabs>"      $env:ELEVEN_VOICE_ID = "FZ2DBQpJWRzjjLpw8ztP"

Le script ne dépose rien dans le dossier de destination si une durée est suspecte (balise lue à voix haute) ou si le dossier n'est pas vide."""
import csv, io, json, os, re, shutil, sys, urllib.request, urllib.error
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
from mutagen.mp3 import MP3

KEY, VOICE = os.environ["ELEVEN_API_KEY"], os.environ["ELEVEN_VOICE_ID"]
STAGING, CSV, DEST, PREFIX = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]), sys.argv[4]

# Règles de l'utilisateur : toujours la même énergie joyeuse.
# Explications après une mauvaise réponse : taquin, enthousiaste, joueur, excité. Tout le reste : excité, enthousiaste, plein d'espoir, joyeux.
EXPLAIN = ["[mischievously] [enthusiastic]", "[playful] [excited]", "[playful] [enthusiastic]", "[mischievously] [excited]"]
STORY = ["[enthusiastic] [hopeful]", "[excited] [joyful]", "[hopeful] [joyful]"]


def tags_for(key, counters):
    if re.search(r"-(o|i|f)\d+$", key):
        t = EXPLAIN[counters["x"] % len(EXPLAIN)]; counters["x"] += 1; return t
    if key.endswith("-ok") or key.endswith("-bravo"):
        return "[excited] [joyful]"
    if key.endswith("-q"):
        return "[enthusiastic] [hopeful]"
    if key.endswith("-retiens"):
        return "[enthusiastic] [joyful]"
    t = STORY[counters["s"] % len(STORY)]; counters["s"] += 1; return t


IA_RULES = [
    (r"\b([Dd]es|[Ll]es) IA\b", r"\1 ziya"),
    (r"\b([Uu]ne) IA\b", r"\1 niya"),
    (r"\b([Ll])[’'] ?IA\b", r"\1’iya"),
    (r"\bIA\b", "iya"),
]
OTHER = [(r"\bBaye\b", "Baï"), (r"\bMame\b", "Mamé"), (r"\bKermel\b", "Kermèl"), (r"\bGuet Ndar\b", "Guette Ndar"), (r"\bMme\b", "Madame")]


def pronounce(text):
    for pattern, repl in IA_RULES + OTHER:
        text = re.sub(pattern, repl, text)
    return text


def tts(text):
    body = json.dumps({"text": text, "model_id": "eleven_v4", "voice_settings": {"stability": 0.53, "similarity_boost": 1.0}}).encode("utf-8")
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}?output_format=mp3_44100_128", data=body, method="POST",
                                 headers={"xi-api-key": KEY, "Content-Type": "application/json", "Accept": "audio/mpeg"})
    with urllib.request.urlopen(req, timeout=180) as r:
        return r.read(), r.headers.get("character-cost")


rows = list(csv.DictReader(open(CSV, encoding="utf-8-sig"), delimiter=";"))
STAGING.mkdir(parents=True, exist_ok=True)
counters, total_cost, report = {"x": 0, "s": 0}, 0, []
for r in rows:
    name = Path(r["fichier_a_deposer"]).name
    key = name.replace(PREFIX, "").replace(".mp3", "")
    spoken = pronounce(r["texte"])
    tags = tags_for(key, counters)
    try:
        audio, cost = tts(f"{tags} {spoken}")
    except urllib.error.HTTPError as e:
        print(f"{name}: ÉCHEC HTTP {e.code} : {e.read().decode('utf-8', 'replace')[:300].replace(KEY, '***')}")
        sys.exit(2)
    duration = MP3(io.BytesIO(audio)).info.length
    (STAGING / name).write_bytes(audio)
    total_cost += int(cost or 0)
    expected = len(spoken) * 0.066 + 0.5            # débit observé sur la leçon 9 (~0,066 s par caractère)
    suspect = duration > expected + 1.5 or duration < 0.8
    report.append((name, duration, suspect))
    print(f"{name:24s} {tags:32s} {duration:4.1f} s (attendu ~{expected:3.1f}){'  ⚠' if suspect else ''} | {spoken}")

suspects = [n for n, _, s in report if s]
print("--- à vérifier (durée inhabituelle, balise lue ?) :", suspects or "aucun")
if suspects:
    print("Je ne dépose rien : à vérifier.")
    sys.exit(3)
DEST.mkdir(parents=True, exist_ok=True)
assert not any(DEST.iterdir()), f"le dossier contient déjà des fichiers : {[p.name for p in DEST.iterdir()]}"
for name, *_ in report:
    shutil.copy2(STAGING / name, DEST / name)
print(f"{len(report)} fichiers déposés dans {DEST} | crédits utilisés : {total_cost}")
