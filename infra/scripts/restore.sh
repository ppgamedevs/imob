#!/usr/bin/env bash
set -euo pipefail

# ===========================================
# Restore a Postgres backup
# Usage: ./restore.sh /backups/imobintel_20260301_030000.sql.gz
# ===========================================

BACKUP_FILE="${1:?Usage: restore.sh <backup-file.sql.gz>}"

DB_HOST="${POSTGRES_HOST:-postgres}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_USER="${POSTGRES_USER:?POSTGRES_USER not set}"
DB_NAME="${POSTGRES_DB:?POSTGRES_DB not set}"

export PGPASSWORD="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD not set}"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: File not found: $BACKUP_FILE"
  exit 1
fi

echo "[$(date -Iseconds)] Restoring ${BACKUP_FILE} into ${DB_NAME}..."
echo "WARNING: This will DROP and recreate the database. Press Ctrl+C to cancel."
sleep 5

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();" \
  -c "DROP DATABASE IF EXISTS ${DB_NAME};" \
  -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"

gunzip -c "$BACKUP_FILE" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"

echo "[$(date -Iseconds)] Restore complete."
