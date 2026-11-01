"""Bibliothèque de missions (reprise de frontend/app/dashboard/TeacherMissionsView.tsx)."""
from django.db import migrations

MISSIONS = [
    ('m1', 'Chasse aux fausses images', "Les élèves doivent repérer les deepfakes parmi une série d'images et justifier leurs choix avec des indices visuels.", 'IA Générative', 'Débutant', 15, 50),
    ('m2', 'Le bon mot de passe', "Créer un mot de passe fort et comprendre pourquoi il ne faut jamais le partager. Atelier pratique avec Palou.", 'Sécurité', 'Débutant', 10, 30),
    ('m3', 'Trieur de déchets intelligent', "Entraîner un modèle IA simple pour reconnaître différents types de déchets (plastique, carton, verre).", 'Données', 'Intermédiaire', 25, 100),
    ('m4', 'Mon premier Prompt', "Apprendre à donner des instructions claires à un assistant virtuel pour obtenir une réponse précise sur l'histoire du Sénégal.", 'IA Générative', 'Intermédiaire', 20, 80),
    ('m5', 'Boucle et répétition', 'Utiliser des blocs de code pour faire danser Palou avec une boucle Répéter.', 'Programmation', 'Débutant', 15, 40),
    ('m6', "Débat : L'IA à l'école", "Une mission de réflexion où l'élève doit répondre à un quiz sur l'utilisation responsable de l'IA pour faire ses devoirs.", 'Sécurité', 'Avancé', 30, 120),
]


def add_missions(apps, schema_editor):
    Mission = apps.get_model('scolaire', 'Mission')
    for mission_id, title, description, category, difficulty, minutes, xp in MISSIONS:
        Mission.objects.update_or_create(id=mission_id, defaults={
            'title': title, 'description': description, 'category': category,
            'difficulty': difficulty, 'duration_minutes': minutes, 'xp': xp,
        })


def remove_missions(apps, schema_editor):
    apps.get_model('scolaire', 'Mission').objects.filter(id__in=[m[0] for m in MISSIONS]).delete()


class Migration(migrations.Migration):
    dependencies = [('scolaire', '0001_initial')]
    operations = [migrations.RunPython(add_missions, remove_missions)]
