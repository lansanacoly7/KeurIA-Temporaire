from django.db import migrations


def forwards(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    LearnerProfile = apps.get_model('learners', 'LearnerProfile')

    for profile in LearnerProfile.objects.filter(learner__isnull=True).exclude(learner_email__isnull=True):
        learner = User.objects.filter(email__iexact=profile.learner_email).first()
        if learner is None or LearnerProfile.objects.filter(learner=learner).exists():
            continue
        profile.learner = learner
        profile.save(update_fields=['learner'])

        # Les enfants inscrits via /api/profiles n'étaient pas reliés à leur
        # parent (User.parent vide) : on restaure le lien à partir de
        # owner_email, uniquement quand c'est sans ambiguïté.
        if learner.parent_id is None and learner.role == 'eleve':
            owner = User.objects.filter(email__iexact=profile.owner_email, role='parent').first()
            if owner and owner.pk != learner.pk:
                learner.parent = owner
                learner.save(update_fields=['parent'])


class Migration(migrations.Migration):

    dependencies = [
        ('learners', '0002_add_learner_fk'),
        ('accounts', '0005_enfant_role_to_eleve'),
    ]

    operations = [
        migrations.RunPython(forwards, migrations.RunPython.noop),
    ]
