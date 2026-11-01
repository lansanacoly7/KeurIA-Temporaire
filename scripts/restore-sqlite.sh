#!/bin/sh
# Restauration d'une sauvegarde SQLite pour KeurIA.
# Usage :
#   ./scripts/restore-sqlite.sh                  (liste les sauvegardes)
#   ./scripts/restore-sqlite.sh keuria-sqlite-AAAAMMJJTHHMMSSZ.db (restaure la sauvegarde)
set -eu

BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [ -f "$BASE_DIR/venv/bin/python" ]; then
  PYTHON="$BASE_DIR/venv/bin/python"
elif [ -f "$BASE_DIR/venv/Scripts/python.exe" ]; then
  PYTHON="$BASE_DIR/venv/Scripts/python.exe"
else
  PYTHON="python3"
fi

if [ $# -eq 0 ]; then
  "$PYTHON" "$BASE_DIR/scripts/sqlite_backup.py" list
  exit 0
fi

FILE="$1"
"$PYTHON" "$BASE_DIR/scripts/sqlite_backup.py" restore "$FILE"
