"""Lecture sûre des identifiants numériques reçus du navigateur."""

MAX_ID = 2 ** 62  # au-delà, la base de données refuserait la valeur


def parse_id(value) -> int | None:
    """Entier positif reçu d'un corps JSON ou d'une URL, ou None s'il est absent, négatif, trop grand ou invalide.

    `str.isdigit()` ne suffit pas : « ² » ou « ① » y répondent vrai alors que `int()` les refuse (erreur 500).
    On n'accepte donc que les chiffres ASCII."""
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        number = value
    elif isinstance(value, str) and value.isascii() and value.isdigit():
        number = int(value)
    else:
        return None
    return number if 0 <= number < MAX_ID else None
