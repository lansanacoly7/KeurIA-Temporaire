from django.core.management.base import BaseCommand

from apps.accounts.retention import apply_retention


class Command(BaseCommand):
    help = (
        "Conservation limitée des comptes familiaux : avertit (2 ans sans connexion), désactive (30 jours plus tard) puis "
        "supprime (30 jours de plus). Fige d'abord les chiffres du mois. À planifier une fois par jour (cron, tâche planifiée). "
        "--dry-run montre ce qui se passerait sans rien modifier ni envoyer."
    )

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help="Ne modifie rien et n'envoie aucun e-mail.")

    def handle(self, *args, dry_run=False, **options):
        result = apply_retention(dry_run=dry_run)
        prefix = '[simulation] ' if dry_run else ''
        self.stdout.write(self.style.SUCCESS(
            f"{prefix}{result['warned']} foyer(s) averti(s), {result['deactivated']} désactivé(s), {result['deleted']} supprimé(s), "
            f"{result['reset']} remis à zéro par une connexion, {result['errors']} e-mail(s) non envoyé(s)."))
