#!/usr/bin/env bash
set -euo pipefail

# ===========================================
# First-run init: create databases and users
# for all projects hosted on this VPS.
# Runs automatically via docker-entrypoint-initdb.d
# ===========================================

echo "[init-db] Creating project databases and users..."

create_project_db() {
  local db_name="$1"
  local db_user="$2"
  local db_pass="$3"

  echo "[init-db] Setting up database: ${db_name}, user: ${db_user}"

  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-SQL
    DO \$\$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${db_user}') THEN
        CREATE ROLE ${db_user} WITH LOGIN PASSWORD '${db_pass}';
      END IF;
    END
    \$\$;

    SELECT 'CREATE DATABASE ${db_name} OWNER ${db_user}'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${db_name}')\gexec

    GRANT ALL PRIVILEGES ON DATABASE ${db_name} TO ${db_user};
SQL

  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "${db_name}" <<-SQL
    GRANT ALL ON SCHEMA public TO ${db_user};
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${db_user};
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${db_user};
SQL

  echo "[init-db] Done: ${db_name}"
}

# The main database (POSTGRES_DB) is created automatically by the PG image.
# Create additional project databases below.

if [ -n "${ROMARKETCAP_DB_USER:-}" ]; then
  create_project_db "${ROMARKETCAP_DB:-romarketcap}" "$ROMARKETCAP_DB_USER" "$ROMARKETCAP_DB_PASSWORD"
fi

if [ -n "${FLORISTMARKET_DB_USER:-}" ]; then
  create_project_db "${FLORISTMARKET_DB:-floristmarket}" "$FLORISTMARKET_DB_USER" "$FLORISTMARKET_DB_PASSWORD"
fi

if [ -n "${FIVMATCH_DB_USER:-}" ]; then
  create_project_db "${FIVMATCH_DB:-fivmatch}" "$FIVMATCH_DB_USER" "$FIVMATCH_DB_PASSWORD"
fi

echo "[init-db] All project databases ready."
