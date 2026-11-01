from django.db import migrations


def copy_messages(apps, schema_editor):
    """Le chat familial vit désormais dans l'app `famille` : on y recopie les messages existants."""
    Old = apps.get_model('progress', 'FamilyMessage')
    New = apps.get_model('famille', 'FamilyMessage')
    New.objects.bulk_create([
        New(family_id=m.family_id, sender_id=m.sender_id, text=m.text, created_at=m.created_at)
        for m in Old.objects.order_by('created_at', 'id')
    ])


class Migration(migrations.Migration):

    dependencies = [
        ('progress', '0014_push_subscription'),
        ('famille', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(copy_messages, migrations.RunPython.noop),
        migrations.DeleteModel(name='FamilyMessage'),
    ]
