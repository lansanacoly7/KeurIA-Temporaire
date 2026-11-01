"""Hasheur de mot de passe allégé, utilisé UNIQUEMENT en développement (DEBUG=True, voir settings.py).

Django protège les mots de passe avec un million et demi d'itérations de PBKDF2 : c'est voulu en production, mais sur un ordinateur
de développement chargé une connexion peut durer de 6 à 20 secondes. Ici on garde le même algorithme et le même format de hash
(ce sont des hashes PBKDF2 normaux, qu'un serveur de production vérifie sans problème) avec bien moins d'itérations.
À la première connexion réussie, un ancien hash est réécrit automatiquement avec ce nombre allégé.
"""
from django.contrib.auth.hashers import PBKDF2PasswordHasher


class DevPBKDF2PasswordHasher(PBKDF2PasswordHasher):
    iterations = 60_000
