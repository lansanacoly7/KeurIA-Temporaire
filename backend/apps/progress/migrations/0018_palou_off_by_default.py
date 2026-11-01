from django.db import migrations, models


def switch_off(apps, schema_editor):
    """Aucun parent n'a encore choisi en connaissance de cause : tout repart éteint (le parent l'autorise ensuite)."""
    apps.get_model('progress', 'ParentalLimits').objects.update(palou_enabled=False)


class Migration(migrations.Migration):
    dependencies = [('progress', '0017_palou_enabled')]

    operations = [
        migrations.AlterField(
            model_name='parentallimits',
            name='palou_enabled',
            field=models.BooleanField(default=False, verbose_name='Assistant Palou autorisé'),
        ),
        migrations.RunPython(switch_off, migrations.RunPython.noop),
    ]
