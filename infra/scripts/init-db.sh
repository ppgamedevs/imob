#!/usr/bin/env bash
set -euo pipefail

# ===========================================
# First-run init: create SSL certs for Postgres
# Runs automatically via docker-entrypoint-initdb.d
# ===========================================

CERT_DIR="/var/lib/postgresql"

if [ ! -f "$CERT_DIR/server.key" ]; then
  echo "[init-db] Generating self-signed SSL certificate..."
  openssl req -new -x509 -days 3650 -nodes \
    -subj "/CN=imob-postgres" \
    -keyout "$CERT_DIR/server.key" \
    -out "$CERT_DIR/server.crt"
  chmod 600 "$CERT_DIR/server.key"
  chown postgres:postgres "$CERT_DIR/server.key" "$CERT_DIR/server.crt"
  echo "[init-db] SSL certificate generated."
else
  echo "[init-db] SSL certificate already exists, skipping."
fi
