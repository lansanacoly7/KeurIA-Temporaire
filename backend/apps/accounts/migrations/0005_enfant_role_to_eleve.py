from django.db import migrations


def forwards(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    # 'enfant' n'a jamais fait partie de ROLE_CHOICES : des comptes ont été
    # créés avec ce rôle invalide par l'ancien code d'inscription enfant.
    User.objects.filter(role='enfant').update(role='eleve')

    # Les anciens codes de réinitialisation étaient stockés en clair ; ils ne
    # peuvent pas être vérifiés contre une empreinte. Ils expiraient en 15 min.
    PasswordResetCode = apps.get_model('accounts', 'PasswordResetCode')
    PasswordResetCode.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0004_harden_reset_code_and_protect_parent'),
    ]

    operations = [
        migrations.RunPython(forwards, migrations.RunPython.noop),
    ]
