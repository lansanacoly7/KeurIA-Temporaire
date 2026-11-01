from django.db import migrations, models
from django.db.models import F


def backfill_presence(apps, schema_editor):
    """`minutes` = minutes de présence + forfaits (10 par leçon, 5 par quiz, 15 par jeu) : on retire les forfaits."""
    DailyUsage = apps.get_model('progress', 'DailyUsage')
    for usage in DailyUsage.objects.all().iterator():
        forfaits = usage.lessons * 10 + usage.quizzes * 5 + usage.games * 15
        usage.presence_minutes = max(0, usage.minutes - forfaits)
        usage.save(update_fields=['presence_minutes'])


class Migration(migrations.Migration):

    dependencies = [
        ('progress', '0018_palou_off_by_default'),
    ]

    operations = [
        migrations.AddField(
            model_name='dailyusage',
            name='presence_minutes',
            field=models.PositiveIntegerField(default=0, verbose_name='Minutes de présence'),
        ),
        migrations.RunPython(backfill_presence, migrations.RunPython.noop),
    ]
