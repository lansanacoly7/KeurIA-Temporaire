"""Thèmes de l'espace élèves (miroir de lib/themes.ts) : seules ces couleurs sont acceptées."""

THEMES = (
    ('baobab', 'Baobab', '#173e3c', '#d9ef59'),
    ('ocean', 'Océan', '#0b3a5b', '#7fd3f0'),
    ('savane', 'Savane', '#4a3b12', '#f2c94c'),
    ('sienne', 'Terre de Sienne', '#7a2e14', '#f6c9a8'),
    ('bissap', 'Bissap', '#5c1537', '#f4a7c3'),
    ('nuit', 'Nuit étoilée', '#1f2150', '#b9b4f5'),
    ('mangue', 'Mangue', '#0f4d3a', '#ffb347'),
    ('lagune', 'Lagune', '#0d5c63', '#c8f0e0'),
)


def is_theme(primary: str, accent: str) -> bool:
    pair = (primary.lower(), accent.lower())
    return any(pair == (p, a) for _, _, p, a in THEMES)
