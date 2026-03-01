#!/usr/bin/env bash
set -euo pipefail

# ===========================================
# Healthcheck: verify Postgres, Redis, API
# Run manually or via cron for alerting.
# ===========================================

ERRORS=0

check() {
  local name="$1"
  shift
  if "$@" > /dev/null 2>&1; then
    echo "[OK]   ${name}"
  else
    echo "[FAIL] ${name}"
    ERRORS=$((ERRORS + 1))
  fi
}

check "Postgres" docker compose exec -T postgres pg_isready -U "${POSTGRES_USER:-imobintel}"
check "Redis"    docker compose exec -T redis redis-cli -a "${REDIS_PASSWORD:-changeme}" ping
check "API"      curl -sf --max-time 5 http://localhost:3000/api/health

# Disk usage alert (warn at 70%, fail at 90%)
DISK_PCT=$(df / | awk 'NR==2 {gsub("%",""); print $5}')
if [ "$DISK_PCT" -ge 90 ]; then
  echo "[FAIL] Disk usage: ${DISK_PCT}%"
  ERRORS=$((ERRORS + 1))
elif [ "$DISK_PCT" -ge 70 ]; then
  echo "[WARN] Disk usage: ${DISK_PCT}%"
else
  echo "[OK]   Disk usage: ${DISK_PCT}%"
fi

if [ "$ERRORS" -gt 0 ]; then
  echo ""
  echo "${ERRORS} check(s) failed."
  exit 1
fi

echo ""
echo "All checks passed."
