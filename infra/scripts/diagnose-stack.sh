#!/usr/bin/env bash
# Rulează pe VPS din directorul infra (unde e docker-compose.yml):
#   chmod +x scripts/diagnose-stack.sh && ./scripts/diagnose-stack.sh
set -euo pipefail

cd "$(dirname "$0")/.."

echo "=== docker compose ps (-a) ==="
docker compose ps -a

echo ""
echo "=== Host: cine ascultă pe 80 / 443 (dacă alt proces ocupă, Caddy ImobIntel nu vede trafic) ==="
if command -v ss >/dev/null 2>&1; then
  ss -tlnp 2>/dev/null | grep -E ':(80|443)\s' || true
else
  echo "(ss indisponibil)"
fi

echo ""
echo "=== Ultimile loguri imobintel-api (100 linii) ==="
docker compose logs --tail=100 imobintel-api 2>&1 || true

echo ""
echo "=== Ultimile loguri caddy (80 linii) ==="
docker compose logs --tail=80 caddy 2>&1 || true

echo ""
echo "=== Din containerul caddy: health către API (trebuie HTTP 200) ==="
if docker compose ps --status running --format '{{.Name}}' | grep -q caddy; then
  docker compose exec -T caddy wget -q -S -O /dev/null http://imobintel-api:3000/api/health/live 2>&1 || true
else
  echo "(caddy nu rulează — sări peste wget)"
fi

echo ""
echo "=== postgres / redis health (din compose) ==="
docker compose ps postgres redis 2>&1 || true

echo ""
echo "=== Gata. Dacă API e unhealthy: vezi erori în loguri (Prisma, DATABASE_URL, migrări). ==="
echo "    Dacă port 80/443 e luat de alt nginx/caddy: fie oprești acel serviciu, fie pui ImobIntel în spatele proxy-ului comun. ==="
