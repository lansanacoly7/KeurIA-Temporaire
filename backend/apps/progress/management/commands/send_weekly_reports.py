from django.core.management.base import BaseCommand

from apps.progress.mailing import send_weekly_reports


class Command(BaseCommand):
    help = (
        "Envoie le bilan des 7 derniers jours aux parents qui ont activé « Bilan hebdomadaire ». "
        "À planifier une fois par semaine (cron, tâche planifiée, etc.)."
    )

    def handle(self, *args, **options):
        sent = send_weekly_reports()
        self.stdout.write(self.style.SUCCESS(f"{sent} bilan(s) hebdomadaire(s) envoyé(s)."))
