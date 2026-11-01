from django.db import migrations

# XP identiques à celles affichées par l'interface (frontend/app/dashboard/games-map-data.ts,
# realGames et gameChallenges de DashboardClient.tsx). Un test compare ces valeurs au code du
# frontend pour qu'elles ne puissent pas diverger.
GAME_LEVELS = [
    ("C'est quoi l'IA ?", 30), ("Détective IA", 40), ("Tri en 3D", 50),
    ("Entraînement Express", 40), ("L'IA qui regarde", 50), ("L'IA qui parle", 50),
    ("Dessine pour l'IA", 45), ("Protège tes secrets", 45), ("Usages de l'IA", 45),
]

ARCADE_GAMES = [
    ("Je vois l'IA", 30), ("Memory IA", 40), ("Data Basket", 40), ("Classif' Express", 45),
    ("Prompt Builder", 45), ("Robot Mission", 50), ("La séquence de Palou", 45), ("Bouclier numérique", 45),
    ("Chasse aux sources", 55), ("Balance des données", 55), ("Model Lab", 60), ("Conseil de l'IA", 60),
    ("Le grand tri d'images", 50), ("Gestes magiques", 50), ("Palou devine mon dessin", 50),
    ("Mon premier modèle", 60), ("Fabrique ton chatbot", 60), ("Escape game IA", 70),
    ("Studio mini-jeu IA", 70), ("L'IA qui parle", 80),
]

ARCADE_QUIZZES = [
    ("IA ou pas IA ?", 20), ("Data Basket", 25), ("Classif’ Express", 30), ("Prompt Fixer", 35),
    ("Deepfake Détective", 40), ("Privacy Hero", 35), ("Bias Buster", 45), ("Model Match", 45),
    ("Fact-check Sprint", 40), ("Impact Lab", 50),
]

BONUS = [("bonus-easter-egg", "Œuf caché de Palou", 10)]


def catalog():
    for n, (title, xp) in enumerate(GAME_LEVELS, start=1):
        yield f"jeux7-9-{n:02d}", "game_level", title, xp
    for n, (title, xp) in enumerate(ARCADE_GAMES, start=1):
        yield f"arcade-game-{n:02d}", "arcade_game", title, xp
    for n, (title, xp) in enumerate(ARCADE_QUIZZES, start=1):
        yield f"arcade-quiz-{n:02d}", "arcade_quiz", title, xp
    for activity_id, title, xp in BONUS:
        yield activity_id, "bonus", title, xp


def seed(apps, schema_editor):
    Activity = apps.get_model('curriculum', 'Activity')
    for activity_id, kind, title, xp in catalog():
        Activity.objects.get_or_create(activity_id=activity_id, defaults={'kind': kind, 'title': title, 'xp': xp})


def unseed(apps, schema_editor):
    apps.get_model('curriculum', 'Activity').objects.filter(activity_id__in=[a[0] for a in catalog()]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('curriculum', '0004_activity'),
    ]

    operations = [
        migrations.RunPython(seed, unseed),
    ]
