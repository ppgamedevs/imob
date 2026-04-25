/**
 * Verifică variabilele de mediu minime pentru fluxul de plată per raport.
 *
 *   pnpm run smoke:env
 *   pnpm exec tsx scripts/smoke-check-env.ts
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const required: { key: string; why: string }[] = [
  { key: "DATABASE_URL", why: "Prisma, checkout, webhooks" },
  { key: "STRIPE_SECRET_KEY", why: "Checkout session + server Stripe API" },
  { key: "STRIPE_WEBHOOK_SECRET", why: "Semnătură webhook /api/webhook" },
];

const atLeastOneUrl: { keys: [string, string]; why: string } = {
  keys: ["NEXT_PUBLIC_BASE_URL", "NEXT_PUBLIC_SITE_URL"],
  why: "Redirect success/cancel către aplicația ta",
};

const recommended: { key: string; why: string }[] = [
  { key: "NEXTAUTH_SECRET", why: "Sesiuni; recomandat în producție" },
  { key: "RESEND_API_KEY", why: "Email (opțional, raport/leaduri)" },
];

let failed = false;

for (const { key, why } of required) {
  if (!process.env[key]?.trim()) {
    console.error(`Lipsește: ${key} — ${why}`);
    failed = true;
  }
}

const [a, b] = atLeastOneUrl.keys;
if (!process.env[a]?.trim() && !process.env[b]?.trim()) {
  console.error(`Lipsește fie ${a} fie ${b} — ${atLeastOneUrl.why}`);
  failed = true;
}

if (!failed) {
  console.log("=== Variabile obligatorii: OK");
  for (const { key, why } of required) {
    console.log(`  ✓ ${key} (${why})`);
  }
  const url = process.env[a] || process.env[b];
  console.log(`  ✓ ${a} sau ${b}: set (${url?.slice(0, 32)}...)`);
}

console.log("\n=== Recomandate (nu blochează):");
for (const { key, why } of recommended) {
  const ok = !!process.env[key]?.trim();
  console.log(`  ${ok ? "✓" : "·"} ${key} — ${why}`);
}

if (failed) {
  process.exit(1);
}

process.exit(0);
