"""Identifiants élèves et mots de passe provisoires (miroir de lib/identifiers.ts)."""
import re
import secrets
import unicodedata

# Domaine réservé : ces identifiants ne sont pas de vraies boîtes mail et ne reçoivent jamais d'e-mail.
LOGIN_DOMAIN = 'keuria.sn'

# Mots simples et faciles à recopier pour des enfants (pas de caractères ambigus).
PASSWORD_WORDS = ('Baobab', 'Mangue', 'Soleil', 'Pirogue', 'Lion', 'Etoile', 'Tambour', 'Palmier', 'Girafe', 'Kora')


def normalize_text(value: str) -> str:
    """Minuscules sans accents : « Ndèye » → « ndeye »."""
    decomposed = unicodedata.normalize('NFD', value.lower())
    return ''.join(ch for ch in decomposed if unicodedata.category(ch) != 'Mn')


def slugify_name(value: str) -> str:
    """« Aïssatou N'Diaye » → « aissatou-ndiaye »."""
    text = re.sub(r"['’]", '', normalize_text(value))
    return re.sub(r'[^a-z0-9]+', '-', text).strip('-')


def generate_student_login(first_name: str, last_name: str, school_slug: str, taken) -> str:
    """prenom.nom@<ecole>.keuria.sn ; homonymes : awa.ndiaye2@…"""
    base = f'{slugify_name(first_name)}.{slugify_name(last_name)}'
    domain = f'@{school_slug}.{LOGIN_DOMAIN}'
    candidate = f'{base}{domain}'
    n = 2
    while candidate in taken:
        candidate = f'{base}{n}{domain}'
        n += 1
    return candidate


def generate_temporary_password() -> str:
    """Mot de passe provisoire lisible : « Pirogue-4821 » (aléa cryptographique)."""
    return f'{secrets.choice(PASSWORD_WORDS)}-{1000 + secrets.randbelow(9000)}'


def is_reserved_login_email(email: str) -> bool:
    return email.endswith((f'.{LOGIN_DOMAIN}', f'@{LOGIN_DOMAIN}'))
