#!/usr/bin/env python3
"""Utilitaire de sauvegarde et restauration atomique de la base de données SQLite pour KeurIA.

Utilise l'API native `sqlite3.Connection.backup` de Python pour garantir une cohérence transactionnelle
parfaite sans verrouiller ni corrompre la base, même si le serveur de développement est actif.
"""
import argparse
import os
import shutil
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB_FILE = BASE_DIR / "backend" / "db.sqlite3"
BACKUPS_DIR = BASE_DIR / "backups" / "sqlite"


def do_backup() -> Path:
    if not DB_FILE.exists():
        print(f"Erreur : Le fichier de base de données {DB_FILE} est introuvable.", file=sys.stderr)
        sys.exit(1)

    BACKUPS_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    dest_file = BACKUPS_DIR / f"keuria-sqlite-{stamp}.db"

    print(f"Création de la sauvegarde atomique : {dest_file.name} ...")
    src_conn = sqlite3.connect(DB_FILE)
    dest_conn = sqlite3.connect(dest_file)

    try:
        with dest_conn:
            src_conn.backup(dest_conn, pages=100)
    finally:
        dest_conn.close()
        src_conn.close()

    # Vérification de l'intégrité de la copie
    verify_conn = sqlite3.connect(dest_file)
    try:
        cur = verify_conn.cursor()
        cur.execute("PRAGMA integrity_check;")
        result = cur.fetchone()[0]
        if result != "ok":
            print(f"Erreur : Intégrité compromise ({result}).", file=sys.stderr)
            dest_file.unlink(missing_ok=True)
            sys.exit(1)
    finally:
        verify_conn.close()

    size_kb = round(dest_file.stat().st_size / 1024, 1)
    print(f"Sauvegarde réussie : {dest_file} ({size_kb} Ko, intégrité validée).")
    return dest_file


def list_backups():
    if not BACKUPS_DIR.exists():
        print("Aucune sauvegarde SQLite trouvée (dossier absent).")
        return

    files = sorted(BACKUPS_DIR.glob("keuria-sqlite-*.db"), reverse=True)
    if not files:
        print("Aucune sauvegarde SQLite trouvée dans", BACKUPS_DIR)
        return

    print("Sauvegardes SQLite disponibles :")
    for f in files:
        size_kb = round(f.stat().st_size / 1024, 1)
        mtime = datetime.fromtimestamp(f.stat().st_mtime).strftime("%Y-%m-%d %H:%M:%S")
        print(f"  - {f.name} ({size_kb} Ko, {mtime})")


def do_restore(backup_name: str, force: bool = False):
    target = BACKUPS_DIR / backup_name
    if not target.exists():
        # Essayer avec le nom direct si le chemin complet a été passé
        target = Path(backup_name)
    if not target.exists():
        print(f"Erreur : Fichier de sauvegarde introuvable : {backup_name}", file=sys.stderr)
        sys.exit(1)

    # Vérification de l'intégrité avant restauration
    verify_conn = sqlite3.connect(target)
    try:
        cur = verify_conn.cursor()
        cur.execute("PRAGMA integrity_check;")
        res = cur.fetchone()[0]
        if res != "ok":
            print(f"Erreur : La sauvegarde spécifiée est corrompue ({res}). Restauration annulée.", file=sys.stderr)
            sys.exit(1)
    finally:
        verify_conn.close()

    if not force:
        print(f"ATTENTION : Cette action va remplacer {DB_FILE} par {target.name}.")
        confirm = input("Confirmer la restauration ? (oui/non) : ").strip().lower()
        if confirm != "oui":
            print("Restauration annulée.")
            sys.exit(0)

    # Sauvegarde de précaution avant écrasement
    if DB_FILE.exists():
        precaution = BACKUPS_DIR / f"pre-restore-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}.db"
        shutil.copy2(DB_FILE, precaution)
        print(f"Copie de précaution créée : {precaution.name}")

    # Restauration atomique
    src_conn = sqlite3.connect(target)
    dest_conn = sqlite3.connect(DB_FILE)
    try:
        with dest_conn:
            src_conn.backup(dest_conn, pages=100)
    finally:
        dest_conn.close()
        src_conn.close()

    print(f"Restauration terminée avec succès depuis {target.name}.")


def main():
    parser = argparse.ArgumentParser(description="Gestion des sauvegardes SQLite KeurIA")
    subparsers = parser.add_subparsers(dest="command")

    subparsers.add_parser("backup", help="Créer une nouvelle sauvegarde SQLite atomique")
    subparsers.add_parser("list", help="Lister les sauvegardes SQLite disponibles")

    restore_p = subparsers.add_parser("restore", help="Restaurer une sauvegarde SQLite")
    restore_p.add_argument("filename", help="Nom du fichier .db à restaurer")
    restore_p.add_argument("--force", action="store_true", help="Ignorer la confirmation interactive")

    args = parser.parse_args()

    if args.command == "backup" or args.command is None:
        do_backup()
    elif args.command == "list":
        list_backups()
    elif args.command == "restore":
        do_restore(args.filename, force=args.force)


if __name__ == "__main__":
    main()
