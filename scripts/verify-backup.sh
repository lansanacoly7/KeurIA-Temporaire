#!/bin/sh
# Vérifie qu'une sauvegarde est RESTAURABLE : la restaure dans une base temporaire (la vraie base n'est jamais touchée), compte les tables
# et les comptes, puis supprime la base temporaire. À lancer depuis la racine du dépôt, sur le serveur ; idéalement chaque semaine (cron).
#
#   ./scripts/verify-backup.sh                       vérifie la sauvegarde la plus récente
#   ./scripts/verify-backup.sh keuria-2026...Z.dump  vérifie CETTE sauvegarde
#
# Code de sortie 0 = la sauvegarde se restaure et contient des données ; autre code = problème (à traiter tout de suite).
set -eu

file="${1:-}"
docker compose run --rm --no-deps -e VERIFY_FILE="$file" --entrypoint sh backup -c '
  set -eu
  file="${VERIFY_FILE:-}"
  if [ -z "$file" ]; then file=$(ls -1t /backups/keuria-*.dump 2>/dev/null | head -n 1 || true); else file="/backups/$file"; fi
  [ -n "$file" ] && [ -f "$file" ] || { echo "Aucune sauvegarde à vérifier." >&2; exit 2; }
  tmp="keuria_verify_$$"
  echo "Sauvegarde vérifiée : $file ($(du -h "$file" | cut -f1))"
  age_h=$(( ( $(date +%s) - $(stat -c %Y "$file") ) / 3600 ))
  echo "Âge : $age_h h"
  [ "$age_h" -le 48 ] || echo "ATTENTION : la dernière sauvegarde a plus de 48 h." >&2
  createdb "$tmp"
  trap "dropdb --if-exists $tmp" EXIT
  pg_restore --no-owner --no-privileges --dbname="$tmp" "$file"
  tables=$(psql -tA -d "$tmp" -c "select count(*) from information_schema.tables where table_schema = '"'"'public'"'"'")
  users=$(psql -tA -d "$tmp" -c "select count(*) from accounts_user")
  echo "Tables restaurées : $tables ; comptes : $users"
  [ "$tables" -gt 10 ] || { echo "ECHEC : trop peu de tables dans la sauvegarde." >&2; exit 3; }
  echo "OK : la sauvegarde se restaure."
'