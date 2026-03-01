# ImobIntel — VPS Infrastructure

Production infrastructure for ImobIntel and future projects.

- **Frontend** runs on **Vercel** (`imobintel.ro`) — SSR, CDN, zero-ops
- **API + DB + Redis + Workers** run on **Hetzner VPS** (`api.imobintel.ro`) — private, secure

## Architecture

```
  Browser
    │
    ▼
┌──────────────────────────┐           ┌──────────────────────────────────┐
│   Vercel                  │   HTTPS    │   Hetzner VPS                    │
│                           │           │                                  │
│   imobintel.ro            │           │   api.imobintel.ro               │
│   (Next.js pages/SSR)     │           │                                  │
│                           │           │   ┌─────────┐                   │
│   /api/* ─── rewrite ─────┼──────────►│   │  Caddy   │ :443 auto-TLS   │
│   (transparent proxy)     │           │   └────┬────┘                   │
│                           │           │        │                         │
│   /api/auth/* also ───────┼──────────►│   ┌────▼──────────┐            │
│   proxied (needs DB)      │           │   │ imobintel-api  │            │
│                           │           │   │ (Next.js :3000)│            │
└──────────────────────────┘           │   └──┬──────────┬─┘            │
                                        │      │          │               │
                                        │   ┌──▼────┐ ┌──▼────┐         │
                                        │   │Postgres│ │ Redis  │ private │
                                        │   │ :5432  │ │ :6379  │ network │
                                        │   └───────┘ └───────┘         │
                                        └──────────────────────────────────┘

  Postgres and Redis have NO public ports.
  Only Caddy exposes 80/443 to the internet.
  Vercel never touches the database directly.
```

## Domain Routing

| Domain | Points to | Purpose |
|--------|-----------|---------|
| `imobintel.ro` | **Vercel** | Web frontend (pages, SSR, static assets) |
| `www.imobintel.ro` | **Vercel** (redirect) | Redirect to apex |
| `api.imobintel.ro` | **VPS IP** (Caddy) | API backend (Next.js + DB) |
| `status.imobintel.ro` | **VPS IP** (Caddy) | Uptime Kuma (optional) |

### How API Calls Work

1. Browser requests `imobintel.ro/api/analyze`
2. Vercel's `next.config.ts` has a rewrite rule for `/api/*`
3. Vercel proxies the request to `api.imobintel.ro/api/analyze`
4. The VPS API handles it (has DB access) and returns the response
5. Browser sees `imobintel.ro` throughout — the VPS is invisible

This means:
- **Cookies work** — the browser sees `imobintel.ro`, cookies are set for that domain
- **NextAuth works** — VPS has `NEXTAUTH_URL=https://imobintel.ro`
- **OAuth callbacks work** — Google Console callback is `https://imobintel.ro/api/auth/callback/google`
- **Stripe webhooks work** — Stripe sends to `https://imobintel.ro/api/webhook` (proxied to VPS)

---

## Prerequisites

- Hetzner Cloud account
- Ubuntu 22.04 or 24.04 (recommended: **CX22** — 2 vCPU, 4 GB RAM, ~€4/mo)
- Domain DNS configured per table above

---

## 1. Server Setup

### Create server on Hetzner

1. [console.hetzner.cloud](https://console.hetzner.cloud) → Add Server
2. Location: **Falkenstein** or **Helsinki** (EU)
3. Image: **Ubuntu 22.04**
4. Type: **CX22** (2 vCPU / 4 GB / 40 GB SSD)
5. Add your SSH public key

### Initial hardening

```bash
ssh root@YOUR_VPS_IP

apt update && apt upgrade -y
apt install -y fail2ban unattended-upgrades curl git

# Non-root user
adduser deploy
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh

# Disable root + password SSH
sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd
```

### Firewall

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
# Do NOT open 5432 or 6379 — they are private
sudo ufw enable
```

### Install Docker

```bash
ssh deploy@YOUR_VPS_IP

curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker deploy
exit && ssh deploy@YOUR_VPS_IP

docker --version
docker compose version
```

---

## 2. Deploy

```bash
git clone git@github.com:ppgamedevs/imob.git
cd imob/infra

cp .env.example .env
nano .env    # Fill in ALL passwords and secrets

mkdir -p backups
chmod +x scripts/*.sh

# Build and start
docker compose up -d --build

# Verify
docker compose ps
docker compose logs -f --tail=50
```

### Run migrations

Migrations use the admin user (superuser) since they may ALTER tables:

```bash
docker compose exec imobintel-api npx prisma migrate deploy
```

### Enable monitoring (optional)

```bash
docker compose --profile monitoring up -d
```

Visit `https://status.imobintel.ro` to set up Uptime Kuma.

---

## 3. Configure Vercel

In your Vercel project settings → **Environment Variables**:

| Variable | Value | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_API_BASE_URL` | `https://api.imobintel.ro` | Enables `/api/*` rewrite to VPS |
| `NEXTAUTH_SECRET` | Same as VPS `.env` | Must match for cookie verification |
| `NEXTAUTH_URL` | `https://imobintel.ro` | Frontend domain |

**Do NOT set `DATABASE_URL` on Vercel.** Vercel has no direct DB access.

### Google OAuth

In Google Cloud Console → Credentials → OAuth 2.0 Client:
- Authorized redirect URI: `https://imobintel.ro/api/auth/callback/google`

### Stripe Webhook

In Stripe Dashboard → Webhooks:
- Endpoint URL: `https://imobintel.ro/api/webhook`
- Events: `checkout.session.completed`, `customer.subscription.*`

---

## 4. Cron Jobs

All crons run on the VPS via crontab, calling the API with `CRON_SECRET`:

```bash
crontab scripts/crontab.example
# Edit to replace YOUR_CRON_SECRET with actual value from .env
crontab -e
```

Middleware on `/api/cron/*` rejects requests without a valid `x-cron-secret`
header (or `Authorization: Bearer <secret>`). In local dev with no
`CRON_SECRET` set, auth is skipped.

---

## 5. Backups

### Manual

```bash
docker compose --profile backup run --rm backup
```

### Automated

Included in `crontab.example` — runs daily at 4:30 AM.

### Restore

```bash
docker compose exec -T postgres psql -U imobintel_admin -d postgres \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='imobintel' AND pid<>pg_backend_pid();" \
  -c "DROP DATABASE IF EXISTS imobintel;" \
  -c "CREATE DATABASE imobintel OWNER imobintel;"

gunzip -c backups/imobintel_YYYYMMDD_HHMMSS.sql.gz | \
  docker compose exec -T postgres psql -U imobintel_admin -d imobintel
```

---

## 6. Updating the API

```bash
cd ~/imob && git pull
cd infra && docker compose up -d --build imobintel-api

# Run migrations if schema changed
docker compose exec imobintel-api npx prisma migrate deploy
```

---

## 7. Database Access (for development)

Since Postgres has no public port, use `docker compose exec`:

```bash
# Interactive psql
docker compose exec postgres psql -U imobintel_admin -d imobintel

# Or from your laptop via SSH tunnel
ssh -N -L 5432:localhost:5432 deploy@YOUR_VPS_IP
# Then in another terminal, forward to Docker:
# (Actually, just use docker exec — it's simpler and safer)
```

---

## 8. Multi-Project Setup

Uncomment and set passwords in `.env`:

```env
ROMARKETCAP_DB_USER=romarketcap
ROMARKETCAP_DB_PASSWORD=<strong-password>
```

On first boot, `init-db.sh` creates the databases with least-privilege
users (NOSUPERUSER, NOCREATEDB, NOCREATEROLE, only SELECT/INSERT/UPDATE/DELETE).

For existing databases, create manually:

```bash
docker compose exec postgres psql -U imobintel_admin -d postgres -c "
  CREATE ROLE romarketcap WITH LOGIN PASSWORD 'password' NOSUPERUSER NOCREATEDB NOCREATEROLE;
  CREATE DATABASE romarketcap OWNER romarketcap;
"
```

---

## 9. Security Checklist

- [x] Postgres has no public port
- [x] Redis has no public port
- [x] `pg_hba.conf` rejects all non-Docker connections
- [x] App uses least-privilege DB user (not superuser)
- [x] Redis requires password, dangerous commands renamed to ""
- [x] UFW firewall: only 22, 80, 443
- [x] Root SSH disabled, password SSH disabled
- [x] Caddy auto-TLS with security headers + HSTS
- [x] CORS locked to `imobintel.ro`
- [x] Cron endpoints protected by `CRON_SECRET`
- [x] Fail2ban + unattended upgrades installed
- [x] Container runs as non-root user (nextjs:1001)
- [ ] Set up Uptime Kuma monitors
- [ ] Test backup + restore cycle
- [ ] Set up off-site backup (rsync to S3/B2)

---

## File Structure

```
infra/
├── docker-compose.yml          # Postgres + Redis + API + Caddy + Uptime Kuma
├── Dockerfile                  # Multi-stage Next.js standalone build
├── Caddyfile                   # Reverse proxy: api + status domains
├── .env.example                # All secrets with clear comments
├── .gitignore
├── postgres/
│   ├── postgresql.conf         # PG tuning for 4 GB, private network
│   └── pg_hba.conf             # Docker-only, rejects public
├── redis/
│   └── redis.conf              # Auth, memory limits, disabled commands
├── scripts/
│   ├── init-db.sh              # Multi-project DBs with least-privilege users
│   ├── backup.sh               # pg_dump + gzip + rotation
│   ├── restore.sh              # Restore from .sql.gz
│   ├── healthcheck.sh          # PG, Redis, API, disk checks
│   └── crontab.example         # All cron schedules with CRON_SECRET
└── README.md
```
