# ImobIntel - Analiza Imobiliara Inteligenta

Platforma de analiza imobiliara pentru apartamente din Bucuresti. Un utilizator lipeste un URL de anunt (imobiliare.ro) si primeste un raport cu: pret estimat vs. pret cerut, comparabile, timp estimat pana la vanzare, indicator seismic si argumente de negociere.

## Stack

- **Frontend:** Next.js 15 (App Router) + React 19 + Tailwind CSS v4
- **Backend:** Next.js API routes + Prisma ORM
- **Database:** PostgreSQL 16
- **Auth:** NextAuth (email magic link + Google OAuth)
- **Billing:** Stripe (subscriptie 9 EUR/luna)
- **Email:** Resend (productie) / Mailhog (dev)
- **Monitoring:** Sentry + Pino structured logging

## Setup local

### Cerinte

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- Docker (pentru PostgreSQL)

### 1. Porneste baza de date

```bash
docker compose up -d
```

Aceasta porneste PostgreSQL pe `localhost:5432`.
Optional, cu profil dev porneste si Mailhog:
```bash
docker compose --profile dev up -d
```

### 2. Configureaza variabilele de mediu

```bash
cp .env.example .env.local
```

Editeaza `.env.local` si completeaza valorile necesare (cel putin `DATABASE_URL` si `NEXTAUTH_SECRET`).

### 3. Instaleaza dependentele

```bash
pnpm install
```

### 4. Ruleaza migrarile Prisma

```bash
pnpm prisma migrate dev
```

### 5. Seed (optional)

```bash
pnpm seed              # Date de baza (planuri)
pnpm seed:demo         # Date demo (analize + zone)
pnpm scrape:seed       # 20 URL-uri de test
```

### 6. Porneste serverul de dezvoltare

```bash
pnpm dev
```

Aplicatia ruleaza pe `http://localhost:3000`.

## Setup Stripe (pentru billing)

1. Creeaza un cont Stripe (test mode)
2. Creeaza un produs "ImobIntel Pro" cu pret recurent 9 EUR/luna
3. Copiaza Price ID-ul in `STRIPE_PRICE_PRO`
4. Configureaza webhook-ul catre `/api/webhook` cu evenimentele:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copiaza Webhook Secret in `STRIPE_WEBHOOK_SECRET`

## Scripturi disponibile

| Script | Descriere |
|--------|-----------|
| `pnpm dev` | Server de dezvoltare (Turbopack) |
| `pnpm build` | Build de productie |
| `pnpm test` | Ruleaza testele (Vitest) |
| `pnpm typecheck` | Verifica tipurile TypeScript |
| `pnpm lint` | Verifica linting (ESLint) |
| `pnpm scrape:seed` | Adauga 20 URL-uri de test in coada de crawl |
| `pnpm scrape:recent` | Re-scrapeaza analizele recente |
| `pnpm area:aggregate` | Recalculeaza statisticile pe zone |
| `pnpm seed` | Seed date de baza |
| `pnpm seed:demo` | Seed date demo |

## Arhitectura

```
src/
  app/                  # Next.js App Router
    page.tsx            # Landing page
    analyze/            # URL input + submit
    report/[id]/        # Raport complet cu sectiuni
      sections/         # Componente sectiune (Verdict, TTS, Seismic, etc.)
    subscribe/          # Pagina de abonament
    support/            # FAQ si contact
    pricing/            # Planuri si preturi
    account/            # Contul utilizatorului
    admin/              # Dashboard admin
    api/
      analyze/          # POST - incepe analiza
      checkout/         # POST - Stripe Checkout
      webhook/          # POST - Stripe webhook
      health/           # GET - Deep health check
  lib/
    analysis.ts         # Pipeline orchestrator
    constants.ts        # Toate constantele numerice
    math.ts             # clamp, median, IQR filtering
    geo.ts              # haversine, slugify, metro
    flags.ts            # Feature flags MVP
    types/pipeline.ts   # Tipuri shared pentru pipeline
    ml/
      avm.ts            # Estimare pret (AVM)
      tts.ts            # Timp pana la vanzare
    risk/
      seismic.ts        # Indicator seismic
    comps/
      apply-comps.ts    # Comparabile cu IQR filtering
    scoring/
      confidence.ts     # Scor de incredere per raport
    billing/
      entitlements.ts   # Verificare plan si utilizare
      sync-subscription.ts  # Sync Stripe -> DB
    crawl/              # Adapters, queue, fetcher
    obs/
      logger.ts         # Pino structured logger
```

## Feature Flags

Toate features non-MVP sunt dezactivate implicit. Activeaza-le in `.env.local`:

- `NEXT_PUBLIC_FEATURE_DISCOVER` - Pagina de cautare/discover
- `NEXT_PUBLIC_FEATURE_PDF` - Export PDF raport
- `NEXT_PUBLIC_FEATURE_EXTENSION` - Chrome extension
- `NEXT_PUBLIC_FEATURE_PUBLIC_API` - API public
- `NEXT_PUBLIC_FEATURE_WIDGETS` - Widget-uri embeddable
- `NEXT_PUBLIC_FEATURE_VISION` - Model vizual (TensorFlow)
- `NEXT_PUBLIC_FEATURE_OWNERS` - Sectiunea proprietari
- `NEXT_PUBLIC_FEATURE_AGENTS` - Workspace agenti

## Variabile de mediu

Vezi `.env.example` pentru lista completa cu descrieri.

## Disclaimer

Toate estimarile au caracter orientativ si nu constituie evaluari imobiliare oficiale. Rezultatele pot diferi de preturile reale de tranzactie. Indicatorul seismic este bazat pe surse publice disponibile si anul constructiei, nu pe expertize tehnice.
