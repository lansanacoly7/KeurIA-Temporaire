from django.db import migrations


# Champs qui, avec `user`, forment une contrainte d'unicité (unique_progress_user,
# unique_daily_usage_user) : deux anciennes lignes dont l'e-mail ne diffère que
# par la casse ne doivent pas faire échouer la migration.
UNIQUE_WITH_USER = {
    'Progress': ('lesson_id',),
    'QuizAttempt': (),
    'DailyUsage': ('usage_date', 'age_track'),
}


def forwards(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    users_by_email = {email.lower(): pk for pk, email in User.objects.values_list('id', 'email')}

    for model_name, unique_fields in UNIQUE_WITH_USER.items():
        Model = apps.get_model('progress', model_name)
        for row in Model.objects.filter(user__isnull=True).order_by('pk'):
            user_id = users_by_email.get((row.owner_email or '').lower())
            # Sans compte correspondant, la ligne reste orpheline (user=NULL) :
            # elle n'est plus visible par personne, y compris par un futur
            # compte qui réutiliserait le même e-mail.
            if not user_id:
                continue
            duplicate = Model.objects.filter(user_id=user_id, **{f: getattr(row, f) for f in unique_fields})
            if unique_fields and duplicate.exists():
                continue  # doublon historique : la première ligne est conservée
            Model.objects.filter(pk=row.pk).update(user_id=user_id)


class Migration(migrations.Migration):

    dependencies = [
        ('progress', '0003_add_user_fk'),
        ('accounts', '0005_enfant_role_to_eleve'),
    ]

    operations = [
        migrations.RunPython(forwards, migrations.RunPython.noop),
    ]
