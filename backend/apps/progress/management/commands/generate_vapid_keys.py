from django.core.management.base import BaseCommand

from apps.progress.push import generate_vapid_keys


class Command(BaseCommand):
    help = "Génère une paire de clés VAPID pour les alertes push (à placer dans backend/.env, jamais dans git)."

    def handle(self, *args, **options):
        public, private = generate_vapid_keys()
        self.stdout.write("Ajoutez ces lignes à backend/.env :\n")
        self.stdout.write(f"VAPID_PUBLIC_KEY={public}")
        self.stdout.write(f"VAPID_PRIVATE_KEY={private}")
        self.stdout.write("VAPID_CLAIMS_SUBJECT=mailto:votre-adresse@exemple.com")
