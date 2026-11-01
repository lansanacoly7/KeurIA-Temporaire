from django.core.management.base import BaseCommand

from apps.scolaire.services.programme import sync_programme_missions


class Command(BaseCommand):
    help = "Met à jour la bibliothèque de devoirs à partir du programme (une leçon = un devoir, un bilan par module)."

    def handle(self, *args, **options):
        result = sync_programme_missions()
        self.stdout.write(self.style.SUCCESS(
            f"Devoirs du programme : {result['created']} créés, {result['updated']} mis à jour, {result['retired']} retirés"
            + (f", {result['legacyRetired']} anciennes missions génériques retirées" if result['legacyRetired'] else "")))
