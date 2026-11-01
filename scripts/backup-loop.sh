#!/bin/sh
# Sauvegarde de la base PostgreSQL (format « custom » de pg_dump : compressé, restaurable table par table avec pg_restore)
# et des fichiers téléversés (logos d'école), puis suppression des sauvegardes de plus de BACKUP_KEEP_DAYS jours.
#
# Lancé par le service « backup » du docker-compose : une sauvegarde au démarrage, puis une toutes les 24 h.
# BACKUP_ONCE=1 : une seule sauvegarde puis arrêt (utile avant une mise à jour : voir docs/EXPLOITATION.md).
# Variables PG* (PGHOST, PGUSER, PGDATABASE, PGPASSWORD) : fournies par le docker-compose.
BACKUP_DIR="${BACKUP_DIR:-/backups}"
MEDIA_DIR="${MEDIA_DIR:-/media}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
# BACKUP_PING_URL (facultatif) : adresse d'un service de surveillance de type « heartbeat » (healthchecks.io, Uptime Kuma…).
# Elle est appelée après chaque sauvegarde réussie, et avec « /fail » ajouté après un échec : le service prévient si une sauvegarde manque.
PING_URL="${BACKUP_PING_URL:-}"

ping() {
  [ -n "$PING_URL" ] || return 0
  wget -q -T 15 -O /dev/null "$PING_URL$1" || echo "[ping] le service de surveillance n'a pas répondu" >&2
}

backup_once() {
  stamp=$(date -u +%Y%m%dT%H%M%SZ)
  db_file="$BACKUP_DIR/keuria-$stamp.dump"
  tmp="$db_file.partial"

  if pg_dump --format=custom --no-owner --no-privileges --file="$tmp" && pg_restore --list "$tmp" > /dev/null; then
    mv "$tmp" "$db_file"
    echo "[$stamp] base sauvegardée : $db_file ($(du -h "$db_file" | cut -f1))"
  else
    rm -f "$tmp"
    echo "[$stamp] ECHEC de la sauvegarde de la base" >&2
    return 1
  fi

  # Un dossier media vide (aucun logo envoyé) ne donne pas d'archive.
  if [ -d "$MEDIA_DIR" ] && [ -n "$(ls -A "$MEDIA_DIR" 2>/dev/null)" ]; then
    media_file="$BACKUP_DIR/media-$stamp.tar.gz"
    if tar -czf "$media_file.partial" -C "$MEDIA_DIR" . && mv "$media_file.partial" "$media_file"; then
      echo "[$stamp] fichiers sauvegardés : $media_file"
    else
      rm -f "$media_file.partial"
      echo "[$stamp] ECHEC de la sauvegarde des fichiers" >&2
    fi
  fi

  find "$BACKUP_DIR" \( -name 'keuria-*.dump' -o -name 'media-*.tar.gz' \) -mtime +"$KEEP_DAYS" -delete
}

mkdir -p "$BACKUP_DIR"
if [ "${BACKUP_ONCE:-0}" = "1" ]; then
  if backup_once; then ping ""; exit 0; fi
  ping "/fail"
  exit 1
fi

# La boucle ne s'arrête jamais sur un échec : la sauvegarde suivante réessaie, l'erreur est dans les journaux.
while true; do
  if backup_once; then ping ""; else ping "/fail"; fi
  sleep 86400
done
