from django.db import migrations, models

from apps.curriculum.data.glossary_unlock import GENERAL_UNLOCKS, LESSON_TERMS_79


def seed_unlocks(apps, schema_editor):
    """Relie les mots existants à leurs leçons et crée les mots du parcours 7-9 (idempotent)."""
    GlossaryTerm = apps.get_model('curriculum', 'GlossaryTerm')
    for word, lessons in GENERAL_UNLOCKS.items():
        GlossaryTerm.objects.filter(word=word).update(unlock_lessons=lessons)
    for term in LESSON_TERMS_79:
        GlossaryTerm.objects.update_or_create(
            word=term['word'],
            defaults={
                'definition': term['definition'], 'example': term['example'], 'icon': term['icon'],
                'color': term['color'], 'background': term['background'], 'unlock_lessons': term['lessons'],
                'is_active': True,
            },
        )


class Migration(migrations.Migration):

    dependencies = [
        ('curriculum', '0010_simplify_daily_challenges'),
    ]

    operations = [
        migrations.AddField(
            model_name='glossaryterm',
            name='unlock_lessons',
            field=models.JSONField(blank=True, default=list, verbose_name='Leçons qui débloquent le mot'),
        ),
        migrations.RunPython(seed_unlocks, migrations.RunPython.noop),
    ]
