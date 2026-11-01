from django.db import migrations

# Le dixième niveau de la carte des jeux 7-9 ans (« Grand Défi du Quartier », module 10) : même XP que dans
# frontend/app/dashboard/games-map-data.ts (un test compare les deux).
ACTIVITY = ("jeux7-9-10", "game_level", "Grand Défi du Quartier", 60)


def seed(apps, schema_editor):
    Activity = apps.get_model('curriculum', 'Activity')
    activity_id, kind, title, xp = ACTIVITY
    Activity.objects.get_or_create(activity_id=activity_id, defaults={'kind': kind, 'title': title, 'xp': xp})


def unseed(apps, schema_editor):
    apps.get_model('curriculum', 'Activity').objects.filter(activity_id=ACTIVITY[0]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('curriculum', '0005_seed_activities'),
    ]

    operations = [
        migrations.RunPython(seed, unseed),
    ]
