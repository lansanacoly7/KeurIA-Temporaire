#!/bin/sh
# Restaure la base depuis une sauvegarde du volume « backups ». À lancer depuis la racine du dépôt, sur le serveur.
#
#   ./scripts/restore.sh                      liste les sauvegardes disponibles
#   ./scripts/restore.sh keuria-20261003T020000Z.dump     restaure CETTE sauvegarde (remplace les données actuelles)
#
# Le site est arrêté pendant la restauration, puis redémarré. Les migrations manquantes sont rejouées au redémarrage (service migrate).
set -eu

if [ $# -eq 0 ]; then
  echo "Sauvegardes disponibles :"
  docker compose run --rm --no-deps --entrypoint sh backup -c 'ls -lh /backups | grep -E "keuria-.*\.dump|media-.*\.tar\.gz" || echo "(aucune)"'
  exit 0
fi

file="$1"
case "$file" in
  keuria-*.dump) ;;
  *) echo "Nom inattendu : $file (attendu : keuria-AAAAMMJJTHHMMSSZ.dump)" >&2; exit 1 ;;
esac

echo "ATTENTION : la base actuelle sera REMPLACEE par la sauvegarde $file."
printf "Tapez « oui » pour continuer : "
read -r answer
[ "$answer" = "oui" ] || { echo "Annulé."; exit 1; }

echo "1/4  Arrêt de l'application (la base et les sauvegardes restent actives)"
docker compose stop frontend backend retention

echo "2/4  Vérification de la sauvegarde"
docker compose run --rm --no-deps --entrypoint sh backup -c "test -s /backups/$file && pg_restore --list /backups/$file > /dev/null"

echo "3/4  Restauration"
docker compose run --rm --entrypoint sh backup -c "pg_restore --clean --if-exists --no-owner --no-privileges --dbname=\"\$PGDATABASE\" /backups/$file"

echo "4/4  Redémarrage"
docker compose up -d

echo "Terminé. Vérifier : curl -fsS http://localhost:3001/api/health/ready"
