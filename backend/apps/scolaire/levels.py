"""Niveaux scolaires sénégalais et parcours kEur IA (miroir de frontend/app/_scolaire/lib/levels.ts)."""
from dataclasses import dataclass


@dataclass(frozen=True)
class Level:
    code: str
    label: str
    cycle: str
    typical_age: int
    track: str


LEVELS = (
    Level('CI', "Cours d'initiation", 'Élémentaire', 6, '7-9'),
    Level('CP', 'Cours préparatoire', 'Élémentaire', 7, '7-9'),
    Level('CE1', 'Cours élémentaire 1', 'Élémentaire', 8, '7-9'),
    Level('CE2', 'Cours élémentaire 2', 'Élémentaire', 9, '7-9'),
    Level('CM1', 'Cours moyen 1', 'Élémentaire', 10, '10-12'),
    Level('CM2', 'Cours moyen 2', 'Élémentaire', 11, '10-12'),
    Level('6e', 'Sixième', 'Moyen', 12, '10-12'),
    Level('5e', 'Cinquième', 'Moyen', 13, '13-15'),
    Level('4e', 'Quatrième', 'Moyen', 14, '13-15'),
    Level('3e', 'Troisième', 'Moyen', 15, '13-15'),
)

LEVEL_CODES = tuple(level.code for level in LEVELS)
LEVEL_CHOICES = [(level.code, level.code) for level in LEVELS]
_BY_CODE = {level.code: level for level in LEVELS}


def level_info(code: str) -> Level:
    return _BY_CODE[code]


def effective_track(profile) -> str | None:
    """Parcours effectif d'un élève d'école : l'exception posée par l'enseignant, sinon celui du niveau de sa classe.
    None quand il n'a ni l'une ni l'autre (élève sans classe)."""
    if profile.track_override:
        return profile.track_override
    return level_info(profile.classroom.level).track if profile.classroom_id else None


def next_level(code: str) -> str | None:
    index = LEVEL_CODES.index(code)
    return LEVEL_CODES[index + 1] if index + 1 < len(LEVEL_CODES) else None


def class_name(level: str, section: str) -> str:
    """« CE1 A » ; « CI » quand l'école n'a qu'une classe de ce niveau (la lettre est facultative)."""
    return f'{level} {section}'.strip()


def classroom_sort_key(classroom) -> tuple:
    """Tri naturel : ordre des niveaux, puis lettre."""
    return (LEVEL_CODES.index(classroom.level), classroom.section)
