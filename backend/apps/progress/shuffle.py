"""Ordre d'affichage des propositions d'un défi ou d'une énigme.

Dans la banque de questions, la bonne réponse occupe une position fixe (souvent la même : 3 défis sur 4 l'avaient à la deuxième place).
Un enfant finit par répondre « B » sans lire. Le serveur mélange donc les propositions, avec un ordre :
  - stable pour un enfant et un jour donnés (recharger la page ne déplace rien, sinon l'enfant ne retrouverait pas ses mauvaises réponses) ;
  - différent d'un enfant à l'autre et d'un jour à l'autre ;
  - invisible du navigateur : il reçoit les propositions déjà dans l'ordre d'affichage et renvoie la POSITION affichée, que le serveur
    retraduit en position d'origine. La bonne réponse n'est jamais envoyée.
Réglage : SHUFFLE_ANSWER_OPTIONS (vrai par défaut).
"""
import random

from django.conf import settings


def display_order(seed: str, count: int) -> list[int]:
    """order[i] = position d'origine de la proposition affichée en i-ème position."""
    order = list(range(count))
    if getattr(settings, 'SHUFFLE_ANSWER_OPTIONS', True) and count > 1:
        random.Random(seed).shuffle(order)  # noqa: S311 - mélange d'affichage, aucun secret
    return order


def to_original(order: list[int], displayed: int) -> int:
    return order[displayed]


def to_displayed(order: list[int], original: int) -> int:
    return order.index(original)
