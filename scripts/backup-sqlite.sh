#!/bin/sh
# Sauvegarde atomique de la base SQLite et des médias pour l'environnement de développement KeurIA.
# Usage : ./scripts/backup-sqlite.sh
set -eu

BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="$BASE_DIR/backups/sqlite"
mkdir -p "$BACKUP_DIR"

if [ -f "$BASE_DIR/venv/bin/python" ]; then
  PYTHON="$BASE_DIR/venv/bin/python"
elif [ -f "$BASE_DIR/venv/Scripts/python.exe" ]; then
  PYTHON="$BASE_DIR/venv/Scripts/python.exe"
else
  PYTHON="python3"
fi

"$PYTHON" "$BASE_DIR/scripts/sqlite_backup.py" backup
