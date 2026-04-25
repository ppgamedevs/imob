# ImobIntel — money flow (paid report) smoke tests

Run this checklist **before production deploys** and after changes to checkout, webhooks, `ReportUnlock`, or report gating.

**Prerequisites**

- Staging or local app with real env: `DATABASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and public base URL (`NEXT_PUBLIC_BASE_URL` or `NEXT_PUBLIC_SITE_URL`) so Stripe success/cancel URLs are correct.
- **Stripe test mode** for test payments: use [test card](https://docs.stripe.com/testing) e.g. `4242 4242 4242 4242`.
- Webhook delivery in dev: [Stripe CLI](https://docs.stripe.com/stripe-cli) `stripe listen --forward-to https://<host>/api/webhook` or a tunnel to the same path.

---

## Stripe CLI — ReportUnlock (local / staging)

Use this to exercise **`checkout.session.completed`** (and related events) end-to-end without deploying.

1. **Log in to Stripe CLI** (one-time / when the token expires):

   ```bash
   stripe login
   ```

   This opens a browser to authorize the CLI for your Stripe account. Use a **test mode** key / account if you are testing with test mode keys in `.env` (`STRIPE_SECRET_KEY` is `sk_test_…`).

2. **Forward webhooks to your app** (local example on port 3000):

   ```bash
   stripe listen --forward-to localhost:3000/api/webhook
   ```

   For staging, replace the host, e.g. `https://staging.example.com/api/webhook` (only if that URL is reachable; otherwise keep forwarding to local and use a tunnel, or use staging’s public URL with a reverse proxy).

3. **Set `STRIPE_WEBHOOK_SECRET` from the CLI output**  
   The first time you run `stripe listen`, the CLI prints a **signing secret** (starts with `whsec_…`). Add it to your environment as **`STRIPE_WEBHOOK_SECRET`** and restart the Next.js process so `POST /api/webhook` can verify signatures. Each `stripe listen` run may show a *new* secret; use the one the CLI is currently using for the session you are testing.

4. **Create a test checkout from a report**  
   Run the app, complete steps 1–4 of the manual checklist (analysis `done`, open `/report/{id}` locked preview), then click the unlock CTA. You should get a Stripe Checkout **test** session URL (from `POST /api/report/[id]/unlock/checkout`).

5. **Pay with the test card** `4242 4242 4242 4242` (any future expiry, any CVC, any billing details Stripe accepts in test mode).

6. **Verify `ReportUnlock` is `paid`**  
   - After redirect, the success handler may also mark the row paid; **`checkout.session.completed` via the CLI** should still call `markReportUnlockPaidFromStripe` idempotently.  
   - In the database, the row for this unlock should have `status = "paid"` and `stripeSessionId` (and often `stripePaymentIntentId`) set.

7. **Verify full report access**  
   Reload `/report/{id}` with the same session/cookie as the payment. **Pass:** full report body, not only preview (same checks as section 10 / 11).

8. **Verify duplicate webhooks do not double-count revenue**  
   - In the **Stripe Dashboard** (Developers → Events), open the `checkout.session.completed` event for the test and use **Resend** (or your Stripe CLI’s equivalent for resending a delivered event to the same endpoint).  
   - **Pass:** the `ReportUnlock` row stays a **single** `paid` row; `markReportUnlockPaidFromStripe` returns `already_paid` and must **not** insert a second `checkout_completed` funnel event that would double-count revenue (see `src/lib/billing/report-unlock.ts`).

9. **Verify refund (if implemented)** — already covered in checklist §16. **Pass:** `charge.refunded` (or equivalent) sets `ReportUnlock.status` to `refunded` and revokes access; replays of refund events should remain idempotent for that row.

### Admin / debug: look up a row by Checkout Session id

- **API (admin only):** `GET /api/admin/report-unlocks/lookup?q=<id>` with an admin session cookie. Use the full **`cs_…`** (or `cs_test_…`) session id from Stripe as `q` — the handler matches `stripeSessionId` exactly, among other fields. Response lists matches (newest `updatedAt` first).

- **SQL (any DB client):** useful when you have `DATABASE_URL` locally:

  ```sql
  SELECT * FROM "ReportUnlock"
  WHERE "stripeSessionId" = 'cs_test_…'
  ORDER BY "updatedAt" DESC
  LIMIT 5;
  ```

**Automated helpers (optional, fast)**

```bash
pnpm run smoke:env
pnpm run smoke:health
pnpm run smoke:unlocks
pnpm run smoke:sitemap
```

`SMOKE_BASE_URL` overrides the default `http://localhost:3000` for health/sitemap fetches (e.g. `https://staging.imobintel.ro`).

---

## Manual checklist

### 1. Homepage loads

- Open `/`.
- **Pass:** page renders without 5xx, main CTA to analyze is visible.

### 2. Paste supported listing URL

- On `/analyze` (or home flow), submit a **supported** listing URL (e.g. imobiliare / storia / olx) for a **sale** residential listing.

### 3. `/api/analyze` returns an analysis id

- From browser devtools or:  
  `POST /api/analyze` with JSON `{ "url": "<listing-url>" }`.  
- **Pass:** response JSON includes `id` (CUID) and not only errors.

### 4. User redirects to `/report/[id]`

- After submit, the UI should land on `/report/{id}` (or poll until ready).
- **Pass:** URL matches the returned `id`.

### 5. Locked preview for non-unlocked report

- In an incognito session **without** a prior unlock cookie and **without** a logged-in Pro/detailed entitlement for that report, open `/report/{id}` when the analysis is `done`.
- **Pass:** “Preview / previzualizare” (locked) content is shown, not the full private sections.

### 6. Unlock CTA and price

- **Pass:** CTA (e.g. “Deblochează…”) is visible; displayed price matches product config (e.g. `REPORT_UNLOCK_PRICE_RON` / `getReportUnlockAmountCents`).

### 7. Checkout session starts

- Click unlock; with Stripe configured, network shows `POST /api/report/[id]/unlock/checkout` **200** and JSON with `url` to Stripe Checkout.

### 8. Stripe test payment succeeds

- On Stripe’s page, pay with a **test** card.  
- **Pass:** success redirect to `/api/report/[id]/unlock/complete?...` and then to `/report/{id}` with access.

### 9. Webhook marks `ReportUnlock` as `paid`

- In Stripe Dashboard (test mode) or DB: the corresponding `ReportUnlock` row has `status = "paid"`, and Stripe ids populated when applicable.
- **Pass:** one successful payment matches one `paid` row (no duplicate “paid” confusion for the same scope).
- **Stripe → `/api/webhook`:** ensure the destination is subscribed at least to  
  `checkout.session.completed`, `payment_intent.succeeded`, `charge.refunded`, and `payment_intent.canceled` (last is logged only). Replays of the same event must not create extra `checkout_completed` funnel rows (idempotent `pending` → `paid` only).
- If the app returns **500** on a payment event, Stripe will retry — fix DB logs; do not treat 500 as “success” for failed updates.

### 10. Full report on return

- Open `/report/{id}` as the same user/session that paid (or with guest cookie set by success path).
- **Pass:** full report body (non-preview) is shown.

### 11. PDF only when unlocked (business model)

- **UI:** Pe `/report/{id}` în mod previzualizare (fără acces complet), secțiunea **Export / PDF** nu apare; butonul există doar când `canViewFullReport` e adevărat (plată per raport — implicit 19 RON, abonament, Pro, sau cookie guest după checkout).
- **Locked API:** `GET /api/report/{id}/pdf` fără cookie / fără sesiune / fără drept: **403** JSON (`error: unlock_required`) cu mesaj explicite (deblocare, același browser, cont la plată; login nu e obligatoriu cu cookie de guest).
- **Unlocked (plată per raport, utilizator conectat):** `hasPaidPerReportUnlock` + PDF reușește; **cota lunară de PDF a abonamentului nu se consumă** pentru acest caz (exempt `isPerReportUnlockPdfQuotaExempt`).
- **Unlocked (anonim, guest checkout):** după redirect, cookie `httpOnly` HMAC; același `GET` /pdf cu `credentials: same-origin` reușește. Utilizatorul neautentificat **nu** trece prin `canUse("pdf")` (blocat doar când e `userId` și **nu** e exempt deblocare per raport).
- **Query opțional (test / link):** `GET /api/report/{id}/pdf?unlock_token=<token>` același format ca valoarea cookie-ului (HMAC v1) → același drept ca cookie-ul, fără login obligatoriu.
- **Securitate:** tratați `unlock_token` ca **secret bearer** — același nivel ca valoarea cookie-ului. Fluxul normal = cookie **httpOnly** după checkout; `unlock_token` doar teste, suport, edge cases. Nu îl puneți în loguri, funnel, referrer sau linkuri de marketing. La analitică, URL-urile trec prin `redactSensitiveUrlParams` (funnel + server).
- **Pass:** 403 previzualizare / fără drept; 200 cu `Content-Type: application/pdf` când e deblocat; fără consum contor abonament pentru deblocare per raport (preț din `REPORT_UNLOCK_PRICE_RON` / default 19 RON).

### 12. Failed / cancelled checkout does not unlock

- Start checkout again, then **back** or cancel in Stripe to `cancel_url` (or let payment fail in test if needed).
- **Pass:** return to `/report/{id}` still shows **locked** preview; `ReportUnlock` for that attempt remains **pending** or is not marked paid (no accidental full report).

### 13. Unsupported URL — helpful error

- `POST /api/analyze` with a clearly unsupported host or invalid listing pattern.
- **Pass:** 4xx and a **clear Romanian** message, not a generic 500 for normal validation failures.

### 14. Weak data — low confidence, not a fake strong verdict

- Use a listing with thin comps / low data if available, or a zone with poor coverage.
- **Pass:** UI shows **reduced / low confidence** where appropriate; no misleading “very strong” buyer verdict on empty data (product-specific wording).

### 15. Admin money dashboard

- As **admin**, open `/admin/money` (and optionally `/admin/report-unlocks` if you track abandon/checkout stats).
- **Pass:** today / 7d metrics reflect the test payment; no uncaught 500. If funnel events exist, they should align with “checkout started” / “paid” (when implemented).

### 16. Refund revokes access (optional, test mode)

- After a successful unlock, issue a **full refund** in Stripe (test mode) for that charge, or wait for `charge.refunded`.
- **Pass:** `ReportUnlock.status` becomes `refunded`, `/admin/report-unlocks` shows the row under rambursări / recent rambursat, and `/report/{id}` no longer grants full access (DB + guest cookie check).

### 17. Admin recovery: plată fără deblocare (optional)

- As **admin**, open `/admin/report-unlocks`, use **Recuperare** search with `cs_…` or `pi_…` or the unlock CUID, then **Verifică Stripe + marcat plătit** for a `pending` row that Stripe already shows as paid.
- **Pass:** row becomes `paid` without double-counting `checkout_completed` in funnel if the row was already paid (idempotent).

---

## What “done” means

- Core flow: steps 1–15 pass in **staging** with Stripe test mode, or a documented exception (e.g. “webhook not forwarded locally” = run steps 7–9 only on staging with CLI). With **Stripe CLI** forwarding, you can also validate the checkout → webhook path locally (see **Stripe CLI — ReportUnlock**). Steps 16–17 are **recommended** for billing hardening.

## Related code (for maintainers)

**Report unlock (one-time payment)** — use only this checkout endpoint:  
`POST /api/report/[analysisId]/unlock/checkout`  
(`[analysisId]` is the analysis CUID, same as in `/report/[id]`).  
Stripe **Checkout Session** and **PaymentIntent** metadata: `kind: "report_unlock"`, `reportUnlockId`, `analysisId`, and `userId` when the user is logged in. Legacy sessions may have `product: "report_unlock"` instead of `kind`; the webhook still accepts that. The webhook fulfills unlocks using **`reportUnlockId`** and verifies **`analysisId`** against the `ReportUnlock` row (no subscription-style branch on `userId` for this product).  
A deprecated `POST/GET` **`/api/checkout/report-unlock`** responds with **410** and a JSON `message` pointing to the path above.

| Area | Path |
|------|------|
| Analyze API | `src/app/api/analyze/route.ts` |
| Report unlock checkout | `src/app/api/report/[id]/unlock/checkout/route.ts` |
| Success redirect | `src/app/api/report/[id]/unlock/complete/route.ts` |
| Webhook | `src/app/api/webhook/route.ts` |
| Stripe metadata helpers | `src/lib/billing/report-unlock-stripe-metadata.ts` |
| `ReportUnlock` | `prisma/schema.prisma`, `src/lib/billing/report-unlock.ts` |
| Full report / PDF gate | `canViewFullReport*`, `src/app/api/report/[id]/pdf/route.tsx` |
| Admin | `src/app/admin/money/page.tsx` |
| Admin report unlocks & recovery | `src/app/admin/report-unlocks/page.tsx`, `src/app/api/admin/report-unlocks/lookup` (e.g. `?q=cs_test_…`), `reconcile` |

**Webhook events (report unlock):** `checkout.session.completed` (fulfills paid), `payment_intent.succeeded` (backup path), `charge.refunded` (sets `refunded`, revokes access), `payment_intent.canceled` (log only; row usually stays `pending`). Pro subscription events unchanged.
