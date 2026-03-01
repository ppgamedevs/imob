# ImobIntel — VPS Infrastructure

Production database infrastructure for ImobIntel.
Frontend runs on **Vercel**; Postgres + Redis run on a **Hetzner VPS**.

## Architecture

```
┌──────────────┐         ┌─────────────────────────────────┐
│   Vercel     │  SSL    │   Hetzner VPS (Ubuntu 22.04)    │
│  (Next.js)   ├────────►│                                 │
│              │  :5432   │  ┌───────────┐  ┌───────────┐  │
└──────────────┘         │  │ Postgres  │  │  Redis    │  │
                          │  │  16       │  │  7        │  │
                          │  └───────────┘  └───────────┘  │
                          │  ┌───────────┐                 │
                          │  │  Caddy    │ ← health/TLS    │
                          │  └───────────┘                 │
                          └─────────────────────────────────┘
```

## Prerequisites

- Hetzner Cloud account
- Ubuntu 22.04 or 24.04 server (recommended: CX22 — 2 vCPU, 4 GB RAM, ~€4/mo)
- A domain pointed to the VPS IP (optional, for Caddy TLS)

---

## 1. Provision the Server

### Create the server on Hetzner

1. Go to [console.hetzner.cloud](https://console.hetzner.cloud)
2. Create a new project or select existing
3. **Add Server:**
   - Location: `Falkenstein` or `Helsinki` (EU, low latency)
   - Image: **Ubuntu 22.04**
   - Type: **CX22** (2 vCPU / 4 GB RAM / 40 GB SSD)
   - SSH Key: add your public key
4. Note the server IP

### Initial server setup

```bash
ssh root@YOUR_VPS_IP

# Update system
apt update && apt upgrade -y

# Create a non-root user
adduser deploy
usermod -aG sudo deploy

# Copy SSH key to new user
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh

# Disable root SSH login
sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl restart sshd
```

### Install Docker

```bash
# Log in as deploy
ssh deploy@YOUR_VPS_IP

# Install Docker (official method)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker deploy

# Log out and back in for group to take effect
exit
ssh deploy@YOUR_VPS_IP

# Verify
docker --version
docker compose version
```

---

## 2. Configure Firewall

```bash
# UFW firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp      # Caddy HTTP (for ACME challenge)
sudo ufw allow 443/tcp     # Caddy HTTPS
sudo ufw allow 5432/tcp    # Postgres (from Vercel)
sudo ufw enable
```

> **Security note:** Ideally restrict port 5432 to Vercel's IP ranges.
> Vercel egress IPs change, so at minimum enforce SSL + strong password.
> For extra security, consider Tailscale/WireGuard VPN instead of exposing 5432.

---

## 3. Deploy the Stack

```bash
# Clone the repo (or copy just the infra/ folder)
git clone git@github.com:ppgamedevs/imob.git
cd imob/infra

# Create .env from example
cp .env.example .env
nano .env
# Fill in:
#   POSTGRES_PASSWORD  — strong random password (use: openssl rand -base64 32)
#   REDIS_PASSWORD     — strong random password
#   DOMAIN             — your domain (or remove Caddy if not needed)

# Create backup directory
mkdir -p backups

# Make scripts executable
chmod +x scripts/*.sh

# Start the stack
docker compose up -d
```

### Verify services

```bash
# Check all containers are healthy
docker compose ps

# Test Postgres
docker compose exec postgres pg_isready -U imobintel

# Test Redis
docker compose exec redis redis-cli -a YOUR_REDIS_PASSWORD ping

# Check logs
docker compose logs -f --tail=50
```

---

## 4. Run Prisma Migrations

From your local machine (or CI), point at the VPS database:

```bash
# In imob-ro/ folder
DATABASE_URL="postgresql://imobintel:YOUR_PASSWORD@YOUR_VPS_IP:5432/imobintel?sslmode=require" \
  pnpm prisma migrate deploy
```

---

## 5. Configure Vercel

In your Vercel project settings → **Environment Variables**, set:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `postgresql://imobintel:YOUR_PASSWORD@YOUR_VPS_IP:5432/imobintel?sslmode=require` |

All other env vars (`NEXTAUTH_SECRET`, `STRIPE_*`, etc.) remain the same as before.

---

## 6. Backups

### Manual backup

```bash
docker compose --profile backup run --rm backup
```

### Automated daily backup (cron)

```bash
crontab -e
```

Add:

```
0 3 * * * cd /home/deploy/imob/infra && docker compose --profile backup run --rm backup >> /var/log/imob-backup.log 2>&1
```

### Restore from backup

```bash
docker compose exec -e PGPASSWORD=YOUR_PASSWORD postgres \
  bash /scripts/restore.sh /backups/imobintel_20260301_030000.sql.gz
```

---

## 7. Maintenance

### Update containers

```bash
cd ~/imob/infra
docker compose pull
docker compose up -d
```

### View logs

```bash
docker compose logs postgres --tail=100
docker compose logs redis --tail=100
docker compose logs caddy --tail=100
```

### Postgres shell

```bash
docker compose exec postgres psql -U imobintel -d imobintel
```

### Monitor disk usage

```bash
df -h
docker system df
```

---

## 8. Security Checklist

- [x] Non-root user for SSH
- [x] Root SSH login disabled
- [x] UFW firewall enabled
- [x] Postgres requires SSL for remote connections
- [x] Strong passwords for Postgres and Redis
- [x] Redis dangerous commands disabled (FLUSHDB, FLUSHALL, DEBUG)
- [ ] Set up Fail2ban: `sudo apt install fail2ban`
- [ ] Set up unattended upgrades: `sudo apt install unattended-upgrades`
- [ ] Consider WireGuard/Tailscale instead of exposing port 5432
- [ ] Set up monitoring (Uptime Kuma, Netdata, or similar)

---

## File Structure

```
infra/
├── docker-compose.yml     # Postgres + Redis + Caddy + backup
├── Caddyfile              # Reverse proxy / health endpoint
├── .env.example           # Template for secrets
├── .gitignore             # Excludes .env and backups
├── postgres/
│   ├── postgresql.conf    # PG tuning for 4 GB RAM
│   └── pg_hba.conf        # Authentication rules (SSL required for remote)
├── redis/
│   └── redis.conf         # Redis tuning + auth
├── scripts/
│   ├── init-db.sh         # Auto-generates SSL cert on first run
│   ├── backup.sh          # pg_dump + gzip + rotation
│   └── restore.sh         # Restore from .sql.gz backup
└── README.md              # This file
```
