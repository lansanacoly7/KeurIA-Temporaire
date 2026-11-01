"""
Paliers de niveau : source unique côté serveur.

Le frontend affiche les mêmes paliers (frontend/app/level-tiers.ts) ; un test compare
les deux fichiers pour qu'ils ne puissent pas diverger. Un palier est atteint dès que
l'XP totale atteint son seuil `minXp` : ni avant, ni après.
"""

LEVEL_TIERS = (
    {"level": 1, "name": "Petit curieux", "minXp": 0},
    {"level": 2, "name": "Explorateur débutant", "minXp": 50},
    {"level": 3, "name": "Jeune aventurier", "minXp": 150},
    {"level": 4, "name": "Maître de l'IA", "minXp": 300},
)

# Le dernier palier n'a pas de suivant : sa barre se remplit sur cette étendue puis reste pleine.
TOP_TIER_SPAN = 200


def level_info(xp: int) -> dict:
    """Palier correspondant à `xp`, avec ce qu'il reste à gagner pour le suivant."""
    xp = max(0, int(xp))
    index = max(i for i, tier in enumerate(LEVEL_TIERS) if xp >= tier["minXp"])
    tier = LEVEL_TIERS[index]
    following = LEVEL_TIERS[index + 1] if index + 1 < len(LEVEL_TIERS) else None
    span = following["minXp"] - tier["minXp"] if following else TOP_TIER_SPAN
    return {
        "level": tier["level"],
        "name": tier["name"],
        "minXp": tier["minXp"],
        "nextName": following["name"] if following else None,
        "nextXp": following["minXp"] if following else None,
        "xpToNext": following["minXp"] - xp if following else 0,
        "xpInLevel": min(xp - tier["minXp"], span),
        "xpPerLevel": span,
        "isMax": following is None,
    }
