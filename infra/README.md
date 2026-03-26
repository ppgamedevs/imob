# ImobIntel — VPS Infrastructure

Production infrastructure for ImobIntel and future projects.

- **Stack on the VPS** — Next.js (pages + `/api/*`), Postgres, Redis; **Caddy inclus e opțional** (`--profile edge`) dacă ai deja un reverse proxy pe 80/443
- **Single origin** — `https://imobintel.ro` serves UI and API; optional `api.imobintel.ro` is the same app for direct API access / CORS

## Architecture

```
  Browser
    │
    ▼
┌──────────────────────────────────────────────────────────────┐
│   Hetzner VPS — DNS: imobintel.ro, www, api → same machine    │
│                                                               │
│   ┌─────────┐                                                 │
│   │  Caddy  │ :443 auto-TLS                                   │
│   └────┬────┘                                                 │
│        │                                                      │
│   ┌────▼──────────────┐                                       │
│   │  imobintel-api    │  Next.js standalone :3000             │
│   │  (pages + /api/*) │                                       │
│   └────┬──────────┬───┘                                       │
│        │          │                                           │
│   ┌────▼────┐ ┌───▼────┐                                      │
│   │Postgres │ │ Redis  │  private Docker network only        │
│   │ :5432   │ │ :6379  │                                      │
│   └─────────┘ └────────┘                                      │
└──────────────────────────────────────────────────────────────┘

  Postgres and Redis have NO public ports.
  Only Caddy exposes 80/443 to the internet.
```

## Domain Routing

| Domain | Points to | Purpose |
|--------|-----------|---------|
| `imobintel.ro` | **VPS IP** (Caddy) | Canonical site — Next.js UI + `/api/*` |
| `www.imobintel.ro` | **VPS IP** (Caddy) | Redirect to apex |
| `api.imobintel.ro` | **VPS IP** (Caddy) | Same Next.js app (optional; widgets / programmatic clients, CORS) |
| `status.imobintel.ro` | **VPS IP** (Caddy) | Uptime Kuma (optional) |

### DNS migration (if you used Vercel before)

Point **apex** and **`www`** A/AAAA records at your **VPS IP** (not Vercel). Remove or disable the Vercel project so it does not compete for the domain.

### Same-origin API

1. Browser requests `https://imobintel.ro/api/...`
2. Caddy → `imobintel-api:3000` → Next.js handles the route (no proxy to another host).

This means:

- **Cookies / NextAuth** — set `NEXTAUTH_URL=https://imobintel.ro` (and matching `NEXT_PUBLIC_*_URL` in `.env`).
- **OAuth** — redirect URI: `https://imobintel.ro/api/auth/callback/google`
- **Stripe webhooks** — `https://imobintel.ro/api/webhook` (or your chosen public hostname)

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

# Build and start (fără Caddy Imob — typical dacă TLS + 80/443 le are alt Caddy pe același VPS)
docker compose up -d --build

# SAU: VPS dedicat doar ImobIntel — pornește și Caddy-ul din infra (TLS pe imobintel.ro)
# docker compose --profile edge up -d --build

# Verify
docker compose ps
docker compose logs -f --tail=50
```

**Notă:** `docker compose up` implicit **nu** mai pornește `infra-caddy` (profile `edge`), ca să nu crape cu `Bind for 0.0.0.0:80 failed` când alt proiect ocupă deja porturile. Dacă tocmai ai încercat să pornești vechiul container Caddy și a rămas creat dar oprit: `docker compose rm -sf caddy` apoi `docker compose up -d --build`.

### Optional: systemd unit (boot + explicit stack start)

Containerele au `restart: unless-stopped`, deci după reboot Docker le repornește de obicei singur. Dacă vrei același model ca un `.service` dedicat (ex. `artemisrx.service`) — **pornește `docker compose up -d` la boot** și poți folosi `systemctl start|stop imobintel-stack` — folosește șablonul din repo:

```bash
sudo cp systemd/imobintel-stack.service /etc/systemd/system/
# Înlocuiește @@WORKDIR@@ cu calea la infra (ex. /home/deploy/imob/infra) și @@USER@@ cu userul de deploy
sudo sed -i 's|@@WORKDIR@@|/home/deploy/imob/infra|g; s|@@USER@@|deploy|g' /etc/systemd/system/imobintel-stack.service
sudo systemctl daemon-reload
sudo systemctl enable --now imobintel-stack.service
```

Fișierul sursă: [`infra/systemd/imobintel-stack.service`](systemd/imobintel-stack.service). Separat de acesta există doar timer-ele `imob-crawl-*.service` / `*.timer` pentru pipeline-ul de crawl (vezi `install-timers.sh`).

### Run migrations

Migrations use the admin user (superuser) since they may ALTER tables:

```bash
docker compose exec imobintel-api prisma migrate deploy
```

### Enable monitoring (optional)

```bash
docker compose --profile monitoring up -d
```

Visit `https://status.imobintel.ro` to set up Uptime Kuma.

---

## 3. OAuth, Stripe, and third parties

All secrets live in **`infra/.env`** (loaded by Docker). There is no separate “edge” host.

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
docker compose exec imobintel-api prisma migrate deploy
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

### Standalone ImobIntel (fără să depinzi de Caddy-ul altui proiect)

Stack-ul `infra/` **este** standalone: Postgres, Redis, Next.js și **Caddy-ul propriu** cu TLS pentru domeniile din `Caddyfile`.

**Constrângerea de la Linux:** pe **același IP public** pot exista **cel mult** ascultători pe **`:80`** și **`:443`**. Dacă `carintel-caddy` (sau orice alt Nginx/Caddy) este deja mapat pe `0.0.0.0:80` și `:443`, containerul `infra-caddy` fie **nu primește** aceste mapări, fie nu pornește corect — și traficul HTTP(S) nu mai intră pe configurația Imob.

Ca Imob să fie singurul „edge” pe acel IP:

1. **Eliberă 80/443** pe server (conștient că site-urile care treceau prin vechiul Caddy nu mai au TLS pe acest IP până le muți):
   ```bash
   # exemplu — folosește directorul real al celuilalt proiect
   cd ~/path/to/carintel && docker compose stop caddy
   # sau: docker stop carintel-caddy-1
   ```
2. Pornește Imob din `~/apps/imob/infra` **cu** Caddy-ul din infra:
   ```bash
   docker compose --profile edge up -d --build --force-recreate caddy imobintel-api
   ```
3. Verifică că **Imob** deține porturile și că Caddy are mapare pe host:
   ```bash
   docker ps --format 'table {{.Names}}\t{{.Ports}}' | grep -E 'caddy|80|443'
   ```
   Ar trebui să vezi ceva de forma `0.0.0.0:80->80/tcp` pe **`infra-caddy`** (sau numele echivalent), nu pe containerul CarIntel.

**Dacă deja folosești un Caddy unic pentru toate domeniile:** lasă `docker compose up` **fără** `--profile edge`; proiectul Imob rulează doar API + DB + Redis, iar `imobintel.ro` merge prin Caddy-ul mare.

**Alternativă dacă vrei ambele proiecte live pe același VPS și același IP:** nu există două „standalone” edge-uri; ai nevoie de **un singur** reverse proxy care să routeze toate domeniile (Imob + CarIntel) — sau de **al doilea IP public** (ex. IP suplimentar Hetzner), câte un stack pe IP-ul lui, fiecare cu `:80`/`:443`.

După ce `infra-caddy` chiar ascultă pe 80/443, erorile cu `lookup imobintel-api on 127.0.0.11:53: connection refused` dispar adesea după un **`docker compose --profile edge up -d --force-recreate`** al stack-ului Imob; dacă persistă, verifică `sudo systemctl restart docker` și firewall-ul `FORWARD` pentru bridge-ul Docker.

---

## 9. Troubleshooting

### `docker compose up -d --build` dar site-ul tot nu merge (mai ales cu mai multe proiecte pe același VPS)

Pe server, din `infra/`:

```bash
chmod +x scripts/diagnose-stack.sh && ./scripts/diagnose-stack.sh
```

Script-ul arată statusul serviciilor, **cine ocupă 80/443 pe host**, ultimele loguri API/Caddy și un health `wget` (din containerul Caddy Imob dacă rulează, altfel din `imobintel-api`). Dacă API-ul nu răspunde 200, citește stack trace-ul în loguri (Prisma, `DATABASE_URL`, variabile lipsă). Dacă migrările nu au rulat niciodată, folosește **Prisma din imagine** (versiunea pin-uită în Dockerfile), nu `npx prisma` (care poate instala Prisma 7+ și strică schema):

```bash
docker compose exec imobintel-api prisma migrate deploy
```

### `ERR_SSL_PROTOCOL_ERROR` or site down, but `docker compose ps` looks fine

1. **Only one thing can listen on host `80` and `443`.** If another stack (e.g. another project’s Caddy) already publishes those ports, either stop it or use **one** reverse proxy that routes all domains. Check:

   ```bash
   docker ps --format 'table {{.Names}}\t{{.Ports}}' | grep -E '80|443'
   sudo ss -tlnp | grep -E ':80|:443'
   ```

2. **`Bind for 0.0.0.0:80 failed: port is already allocated`** — alt reverse proxy folosește 80/443. Nu porni Caddy-ul din Imob: `docker compose up -d --build` (fără `--profile edge`). eventual `docker compose rm -sf caddy`.

2b. **Caddy Imob nu poate rezolva `imobintel-api` (logs: `lookup … on 127.0.0.11`)** — doar dacă folosești **`--profile edge`**. `docker-compose.yml` setează `dns: [127.0.0.11]` pe **caddy**. După modificări:

   ```bash
   docker compose --profile edge up -d --force-recreate caddy
   ```

3. **Let’s Encrypt also needs working DNS from the container** — same `127.0.0.53` issue breaks `acme-v02.api.letsencrypt.org` lookups. Fixing DNS on Caddy fixes renewals too.

---

## 10. Security Checklist

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
│   ├── diagnose-stack.sh       # VPS: ps, port 80/443, logs, wget health
│   └── crontab.example         # All cron schedules with CRON_SECRET
└── README.md
```
