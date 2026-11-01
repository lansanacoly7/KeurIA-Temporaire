from django.db import migrations

from apps.curriculum.riddle_data import build


def seed(apps, schema_editor):
    Riddle = apps.get_model('curriculum', 'Riddle')
    for item in build():
        Riddle.objects.get_or_create(lesson_id=item['lesson_id'], question=item['question'], defaults=item)


def unseed(apps, schema_editor):
    Riddle = apps.get_model('curriculum', 'Riddle')
    for item in build():
        Riddle.objects.filter(lesson_id=item['lesson_id'], question=item['question']).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('curriculum', '0007_riddle'),
    ]

    operations = [
        migrations.RunPython(seed, unseed),
    ]