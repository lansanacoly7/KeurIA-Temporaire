from django.db import migrations

# Notifications que l'ancien code fabriquait à la première lecture (jamais issues d'une activité réelle).
# On ne supprime que les lignes dont le type ET le titre exact correspondent : une vraie notification,
# dont le titre est produit à partir d'événements réels, n'est jamais concernée.
FABRICATED = {
    'level_up': "Nouveau palier atteint : Niveau 2 (Éclaireur de l'IA) ⭐",
    'streak': "Série de connexion : 5 jours consécutifs ! 🔥",
    'vocab_word': "Nouveau concept maîtrisé : « Réseau de neurones » 💡",
    'leaderboard': "Classement : 3e place au classement général ! 🏆",
    'new_title': "Nouveau titre honorifique : « Explorateur des Étoiles » 👑",
    'inactivity': "Alerte : 4 jours d'inactivité sur kEur IA ⏳",
}


def purge(apps, schema_editor):
    ParentNotification = apps.get_model('progress', 'ParentNotification')
    doomed = [
        n.pk for n in ParentNotification.objects.filter(notif_type__in=FABRICATED)
        if isinstance(n.payload, dict) and n.payload.get('title') == FABRICATED[n.notif_type]
    ]
    ParentNotification.objects.filter(pk__in=doomed).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('progress', '0012_screen_time_credit'),
    ]

    operations = [
        migrations.RunPython(purge, migrations.RunPython.noop),
    ]
