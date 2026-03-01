#!/usr/bin/env bash
set -euo pipefail

# ===========================================
# Postgres backup script
# Run via: docker compose --profile backup run --rm backup
# Or schedule with cron on the host.
# ===========================================

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
KEEP_DAYS="${BACKUP_RETENTION_DAYS:-7}"

DB_HOST="${POSTGRES_HOST:-postgres}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_USER="${POSTGRES_USER:?POSTGRES_USER not set}"
DB_NAME="${POSTGRES_DB:?POSTGRES_DB not set}"

export PGPASSWORD="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD not set}"

FILENAME="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

echo "[$(date -Iseconds)] Starting backup of ${DB_NAME}..."

pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --no-owner \
  --no-acl \
  --format=plain \
  | gzip > "$FILENAME"

SIZE=$(du -h "$FILENAME" | cut -f1)
echo "[$(date -Iseconds)] Backup complete: ${FILENAME} (${SIZE})"

echo "[$(date -Iseconds)] Pruning backups older than ${KEEP_DAYS} days..."
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +"$KEEP_DAYS" -delete

REMAINING=$(find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" | wc -l)
echo "[$(date -Iseconds)] Done. ${REMAINING} backup(s) on disk."
