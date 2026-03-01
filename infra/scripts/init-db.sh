#!/usr/bin/env bash
set -euo pipefail

# ===========================================
# First-run init: create databases and users
# for all projects hosted on this VPS.
# Each project gets its own DB + user with least privilege.
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
        CREATE ROLE ${db_user} WITH LOGIN PASSWORD '${db_pass}' NOSUPERUSER NOCREATEDB NOCREATEROLE;
      END IF;
    END
    \$\$;

    SELECT 'CREATE DATABASE ${db_name} OWNER ${db_user}'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${db_name}')\gexec
SQL

  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "${db_name}" <<-SQL
    -- Revoke public access
    REVOKE ALL ON DATABASE ${db_name} FROM PUBLIC;
    REVOKE ALL ON SCHEMA public FROM PUBLIC;

    -- Grant only what the app needs
    GRANT CONNECT ON DATABASE ${db_name} TO ${db_user};
    GRANT USAGE, CREATE ON SCHEMA public TO ${db_user};
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${db_user};
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${db_user};
SQL

  echo "[init-db] Done: ${db_name} (user: ${db_user}, least-privilege)"
}

# The main database (POSTGRES_DB / POSTGRES_USER) is created automatically
# by the PG image and has full superuser access for migrations.
# App connections should use a separate limited user below.

if [ -n "${IMOBINTEL_APP_USER:-}" ]; then
  create_project_db "${POSTGRES_DB}" "$IMOBINTEL_APP_USER" "$IMOBINTEL_APP_PASSWORD"
fi

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
