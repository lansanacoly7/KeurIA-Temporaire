"""
Extraction des clips audio et traitement du texte pour les voix des leçons.
"""
import re

EMOJI = re.compile(r"[\U0001F300-\U0001FAFF☀-➿️‍]")
PRONUNCIATIONS = [
    (r"\bIA\b", "I A"),
    (r"\bBaye\b", "Baï"),
    (r"\bMame\b", "Mamé"),
    (r"\bKermel\b", "Kermèl"),
    (r"\bGuet Ndar\b", "Guette Ndar"),
    (r"\bMme\b", "Madame"),
]


def clean(text: str) -> str:
    """Texte lu : emoji retirés, {prenom} retiré."""
    text = text.replace("{prenom}", "")
    text = re.sub(r"\s+,", ",", text)
    text = re.sub(r"^\s*[,!]\s*", "", text)
    return re.sub(r"\s+", " ", EMOJI.sub("", text)).strip()


def to_say(text: str) -> str:
    """Ajuste les prononciations pour la voix de synthèse."""
    out = text
    for pattern, spoken in PRONUNCIATIONS:
        out = re.sub(pattern, spoken, out)
    return out


def clips_of(lesson: dict):
    """Génère (clé, vague, écran, type, texte) pour chaque fichier audio de la leçon."""
    for si, screen in enumerate(lesson.get("screens") or [], start=1):
        e = f"e{si:02d}"
        kind = screen.get("kind")
        if kind == "bravo":
            yield f"{e}-bravo", 1, si, "félicitations de fin", screen.get("text", "")
            yield f"{e}-retiens", 1, si, "« Je retiens »", screen.get("learned", "")
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

