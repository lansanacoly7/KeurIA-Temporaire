import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    """Validation de l'inscription d'un parent par l'équipe kEur IA.

    Tous les comptes déjà présents restent « acceptés » (valeur par défaut) : seules les nouvelles inscriptions
    publiques de parents passent par la file d'attente.
    """

    dependencies = [
        ('accounts', '0015_user_deleted_at'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='approval_status',
            field=models.CharField(choices=[('approved', 'Acceptée'), ('pending', 'En attente'), ('rejected', 'Refusée')], db_index=True, default='approved', max_length=10, verbose_name="Validation de l'inscription"),
        ),
        migrations.AddField(
            model_name='user',
            name='approval_decided_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Décision prise le'),
        ),
        migrations.AddField(
            model_name='user',
            name='approval_decided_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to=settings.AUTH_USER_MODEL, verbose_name='Décision prise par'),
        ),
        migrations.AddField(
            model_name='user',
            name='approval_note',
            field=models.CharField(blank=True, default='', max_length=300, verbose_name='Motif communiqué au parent'),
        ),
    ]
