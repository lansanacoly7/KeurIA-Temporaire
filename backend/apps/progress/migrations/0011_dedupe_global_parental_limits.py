from django.db import migrations


def keep_latest_global_rule(apps, schema_editor):
    """Avant d'ajouter l'unicité : ne garder que la règle « tous les enfants » la plus récente par parent."""
    ParentalLimits = apps.get_model('progress', 'ParentalLimits')
    seen = set()
    for limits in ParentalLimits.objects.filter(child__isnull=True).order_by('-updated_at', '-id'):
        if limits.parent_id in seen:
            limits.delete()
        else:
            seen.add(limits.parent_id)


class Migration(migrations.Migration):

    dependencies = [
        ('progress', '0010_remove_weeklyxp'),
    ]

    operations = [
        migrations.RunPython(keep_latest_global_rule, migrations.RunPython.noop),
    ]
