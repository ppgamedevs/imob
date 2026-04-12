#!/usr/bin/env bash
# Prints a DATABASE_URL= line safe for Prisma (password is URL-encoded).
# Run from repo: ./scripts/print-prisma-database-url.sh
# Usage: add the printed line to infra/.env, then: docker compose up -d --force-recreate imobintel-api
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ ! -f .env ]]; then
  echo "Missing .env in $(pwd)" >&2
  exit 1
fi
set -a
# shellcheck disable=SC1091
source .env
set +a
user="${IMOBINTEL_APP_USER:-imobintel}"
db="${POSTGRES_DB:-imobintel}"
if [[ -z "${IMOBINTEL_APP_PASSWORD:-}" ]]; then
  echo "IMOBINTEL_APP_PASSWORD is empty in .env" >&2
  exit 1
fi
enc=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$IMOBINTEL_APP_PASSWORD")
# sslmode=disable: Docker Postgres is usually non-TLS; Prisma/libpq "prefer" can misbehave and surface as P1000.
echo "DATABASE_URL=postgresql://${user}:${enc}@postgres:5432/${db}?sslmode=disable"
