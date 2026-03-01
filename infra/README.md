# ImobIntel — VPS Infrastructure

Production infrastructure for ImobIntel and future projects.

- **Frontend** runs on Vercel (fast, zero-ops)
- **API + DB + Redis + Workers** run on a Hetzner VPS (private, secure)

## Architecture

```
  Users
    │
    ▼
┌────────────────────┐           ┌────────────────────────────────────────┐
│    Vercel           │   HTTPS   │    Hetzner VPS (Ubuntu 22.04)          │
│   (Next.js SSR)     ├──────────►│                                        │
│   imobintel.ro      │           │   ┌─────────┐                         │
└────────────────────┘           │   │  Caddy   │ :443  (auto-TLS)       │
                                  │   └────┬────┘                         │
                                  │        │                               │
                                  │   ┌────▼─────────────┐                │
                                  │   │ imobintel-api     │                │
                                  │   │ (Next.js :3000)   │                │
                                  │   └────┬────────┬────┘                │
                                  │        │        │                      │
                                  │   ┌────▼───┐ ┌──▼────┐               │
                                  │   │Postgres│ │ Redis  │   ← private   │
                                  │   │  :5432 │ │ :6379  │     network   │
                                  │   └────────┘ └───────┘               │
                                  └────────────────────────────────────────┘

  Postgres and Redis have NO public ports.
  Only Caddy exposes 80/443 to the internet.
```

## Why this architecture

| Concern | Solution |
|---------|----------|
| DB security | Postgres is private, no public port, no Vercel IP allowlist drama |
| Latency | API lives next to DB on same Docker network |
| Serverless limits | No connection pool exhaustion from Vercel cold starts |
| Workers/crons | Scrapers and cron jobs run on VPS, close to data |
| Cost | One cheap VPS hosts DB + API for all projects |
| Frontend speed | Vercel edge CDN for static/SSR pages |

---

## Prerequisites

- Hetzner Cloud account
- Ubuntu 22.04 or 24.04 (recommended: **CX22** — 2 vCPU, 4 GB RAM, ~€4/mo)
- Domain DNS:
  - `api.imobintel.ro` → VPS IP
  - `status.imobintel.ro` → VPS IP (optional, for Uptime Kuma)

---

## 1. Server Setup

### Create server on Hetzner

1. [console.hetzner.cloud](https://console.hetzner.cloud) → Add Server
2. Location: **Falkenstein** or **Helsinki** (EU)
3. Image: **Ubuntu 22.04**
4. Type: **CX22** (2 vCPU / 4 GB / 40 GB SSD)
5. Add your SSH public key
6. Note the IP

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

# Disable root SSH
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
# Do NOT open 5432 or 6379
sudo ufw enable
```

### Install Docker

```bash
ssh deploy@YOUR_VPS_IP

curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker deploy

# Re-login for group
exit && ssh deploy@YOUR_VPS_IP

docker --version
docker compose version
```

---

## 2. Deploy

```bash
# Clone repo
git clone git@github.com:ppgamedevs/imob.git
cd imob/infra

# Configure
cp .env.example .env
nano .env    # Fill in all passwords and secrets

# Create directories
mkdir -p backups

# Make scripts executable
chmod +x scripts/*.sh

# Build and start
docker compose up -d --build

# Verify
docker compose ps
docker compose logs -f --tail=50
```

### Enable monitoring (optional)

```bash
docker compose --profile monitoring up -d
```

Then visit `https://status.imobintel.ro` to set up Uptime Kuma.

---

## 3. Database Migrations (via SSH tunnel)

Since Postgres has no public port, use an SSH tunnel:

**Terminal 1 — open the tunnel:**

```bash
ssh -N -L 5432:localhost:5432 deploy@YOUR_VPS_IP \
  -o "ServerAliveInterval=60"
```

Wait — this won't work because Postgres isn't on localhost of the VPS either (it's in Docker). Use this instead:

```bash
ssh -N -L 5432:$(docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' infra-postgres-1):5432 deploy@YOUR_VPS_IP
```

Or simpler — exec into the API container:

```bash
ssh deploy@YOUR_VPS_IP

# Run migrations from the API container (it has Prisma + network access)
docker compose exec imobintel-api npx prisma migrate deploy
```

**This is the recommended approach.** No tunnel needed.

**Terminal 2 (local) — for ad-hoc psql access via tunnel:**

```bash
# First, temporarily expose PG on VPS localhost
ssh deploy@YOUR_VPS_IP
docker compose exec postgres psql -U imobintel -d imobintel
```

---

## 4. Configure Vercel

In your Vercel project settings → **Environment Variables**:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_BASE_URL` | `https://api.imobintel.ro` |
| `NEXTAUTH_SECRET` | Same as in VPS `.env` |
| `NEXTAUTH_URL` | `https://imobintel.ro` |

The frontend no longer needs `DATABASE_URL`. All DB access goes through the API.

---

## 5. Backups

### Manual

```bash
docker compose --profile backup run --rm backup
```

### Automated (daily at 3 AM)

```bash
crontab -e
```

```cron
0 3 * * * cd /home/deploy/imob/infra && docker compose --profile backup run --rm backup >> /var/log/imob-backup.log 2>&1
```

### Restore

```bash
docker compose exec -T postgres psql -U imobintel -d postgres \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'imobintel' AND pid <> pg_backend_pid();" \
  -c "DROP DATABASE IF EXISTS imobintel;" \
  -c "CREATE DATABASE imobintel OWNER imobintel;"

gunzip -c backups/imobintel_20260301_030000.sql.gz | \
  docker compose exec -T postgres psql -U imobintel -d imobintel
```

---

## 6. Updating the API

```bash
cd ~/imob
git pull

cd infra
docker compose up -d --build imobintel-api

# Run migrations if schema changed
docker compose exec imobintel-api npx prisma migrate deploy
```

---

## 7. Maintenance

```bash
# Logs
docker compose logs imobintel-api --tail=100 -f
docker compose logs postgres --tail=50
docker compose logs caddy --tail=50

# Postgres shell
docker compose exec postgres psql -U imobintel -d imobintel

# Healthcheck
./scripts/healthcheck.sh

# Disk usage
df -h && docker system df

# Prune old images
docker image prune -af --filter "until=168h"
```

---

## 8. Multi-Project Setup

To host additional projects on the same VPS, uncomment the relevant
variables in `.env`:

```env
ROMARKETCAP_DB_USER=romarketcap
ROMARKETCAP_DB_PASSWORD=<strong-password>

FLORISTMARKET_DB_USER=floristmarket
FLORISTMARKET_DB_PASSWORD=<strong-password>

FIVMATCH_DB_USER=fivmatch
FIVMATCH_DB_PASSWORD=<strong-password>
```

Then recreate Postgres (first run only creates the DBs):

```bash
docker compose down
docker volume rm infra_pg_data   # WARNING: destroys data. Backup first!
docker compose up -d
```

Or if DB is already running, create manually:

```bash
docker compose exec postgres psql -U imobintel -d postgres -c "
  CREATE ROLE romarketcap WITH LOGIN PASSWORD 'password';
  CREATE DATABASE romarketcap OWNER romarketcap;
"
```

---

## 9. Security Checklist

- [x] Postgres has no public port
- [x] Redis has no public port
- [x] `pg_hba.conf` rejects all non-Docker connections
- [x] Redis requires password, dangerous commands disabled
- [x] UFW firewall: only 22, 80, 443
- [x] Root SSH login disabled
- [x] Password SSH login disabled
- [x] Caddy auto-TLS with security headers
- [x] CORS locked to `imobintel.ro`
- [x] Fail2ban installed
- [x] Unattended upgrades enabled
- [ ] Set up Uptime Kuma monitors
- [ ] Test backup + restore cycle
- [ ] Set up off-site backup (optional: rsync to S3/B2)

---

## File Structure

```
infra/
├── docker-compose.yml          # Postgres + Redis + API + Caddy + Uptime Kuma
├── Dockerfile                  # Multi-stage Next.js standalone build
├── Caddyfile                   # Reverse proxy with auto-TLS, CORS, security headers
├── .env.example                # All secrets and config
├── .gitignore                  # Excludes .env, backups
├── postgres/
│   ├── postgresql.conf         # PG tuning for 4 GB RAM, private network
│   └── pg_hba.conf             # Docker-only access, reject public
├── redis/
│   └── redis.conf              # Auth, memory limits, persistence
├── scripts/
│   ├── init-db.sh              # Multi-project DB + user creation
│   ├── backup.sh               # pg_dump + gzip + rotation
│   ├── restore.sh              # Restore from .sql.gz
│   └── healthcheck.sh          # Verify PG, Redis, API, disk
└── README.md
```
