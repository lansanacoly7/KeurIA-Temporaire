"""Génère une piste MP3 par scène (voix neuronale Edge-TTS) et durations.json (durée en secondes de chaque piste).
Usage : python voix.py <dossier de sortie>   (sortie par défaut : ./sortie/audio)"""
import asyncio, json, re, subprocess, sys
from pathlib import Path

import edge_tts
import imageio_ffmpeg

ICI = Path(__file__).parent
SORTIE = Path(sys.argv[1]) if len(sys.argv) > 1 else ICI / "sortie" / "audio"
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()


def duree(fichier: Path) -> float:
    """Durée lue dans la sortie de « ffmpeg -i » (pas besoin de ffprobe)."""
    sortie = subprocess.run([FFMPEG, "-i", str(fichier)], capture_output=True, text=True).stderr
    h, m, s = re.search(r"Duration: (\d+):(\d+):([\d.]+)", sortie).groups()
    return int(h) * 3600 + int(m) * 60 + float(s)


async def main():
    scenario = json.loads((ICI / "scenario.json").read_text(encoding="utf-8"))
    SORTIE.mkdir(parents=True, exist_ok=True)
    durees = {}
    for scene in scenario["scenes"]:
        fichier = SORTIE / f"{scene['id']}.mp3"
        await edge_tts.Communicate(scene["texte"], scenario["voix"], rate=scenario["vitesse"]).save(str(fichier))
        durees[scene["id"]] = round(duree(fichier), 2)
        print(scene["id"], durees[scene["id"]], "s")
    (SORTIE / "durations.json").write_text(json.dumps(durees, indent=2), encoding="utf-8")
    print("total", round(sum(durees.values()), 1), "s")


asyncio.run(main())
