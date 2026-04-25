# Pre-launch QA: rapoarte pe portaluri reale

Acest runbook descrie cum rulezi o verificare **controlată** fără a comita URL-uri de anunțuri.

## Cerințe

- Aplicația rulează local (sau acces `QA_BASE_URL` către un mediu unde ai voie să testezi).
- `DATABASE_URL` setat (pentru polling și snapshot-uri; același DB pe care îl lovește API-ul la analiză).
- URL-uri: într-un fișier **ignorat de git** sau prin variabilă de mediu (vezi mai jos).

## 1) Ultimele 20 de rapoarte (fără POST nou)

Afișează câmpuri de calitate ca în tabelul QA (status, sellability, paywall, comp, conf, link).

```bash
cd imob-ro
pnpm qa:reports:recent
```

Opțional: `QA_RECENT_N=30` pentru alt număr.

## 2) Câte un anunț per portal (flow real `/api/analyze`)

1. Copiază `private-report-qa-urls.example.txt` la `private-report-qa-urls.txt` (fișierul `private-report-qa-urls.txt` este în `.gitignore`).
2. Pune **câte un URL complet pe linie** (anunț de vânzare, fiecare portal țintă: imobiliare, storia, olx, publi24, lajumate, homezz).
3. Pornește aplicația pe `http://127.0.0.1:3000` sau setează `QA_BASE_URL`.
4. Rulează:

```bash
pnpm qa:portal:run
```

Alternativ, fără fișier:

```bash
export QA_REPORT_URLS="https://...,https://..."
export QA_BASE_URL="http://127.0.0.1:3000"
pnpm qa:portal:run
```

Ieșire:

- `docs/private-report-qa.md` (același nume, **gitignored**), cu tabel markdown și observații automate.
- Rezumat în consolă.

Dacă preferi doar consola, șterge `docs/private-report-qa.md` după run sau comentează scrierea din script (rămâne doar `console`).

## Comportament

- **POST** real la `POST {QA_BASE_URL}/api/analyze` cu `{ "url": "..." }`, același contract ca formularul.
- Așteaptă status terminal (`done`, `erori`, respinge încreieri etc.) apoi citește datele prin același strat ca produsele (sellability din `buildReportSellability` etc.).
- Nu forțează sellability și nu ocolește validările aplicației.
- Timp maxim de așteptare per analiză: ~12 minute (vezi `scripts/qa-real-portal-reports.ts`).

## Recomandări din fișier

Recomandările `promote` / `support_quietly` / `hide_from_ui` sunt **euristice** (script), nu decizie de business. Le revizuiește omul după conținutul raportului.
