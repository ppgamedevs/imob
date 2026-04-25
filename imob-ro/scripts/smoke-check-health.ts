/**
 * Apelează GET /api/health pe aplicația pornită.
 *
 *   pnpm run smoke:health
 *   SMOKE_BASE_URL=https://staging.exemplu.ro pnpm run smoke:health
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const base = (
  process.env.SMOKE_BASE_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "http://localhost:3000"
).replace(/\/$/, "");

async function main() {
  const url = `${base}/api/health`;
  console.log("GET", url);
  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    console.error("Răspuns non-JSON:", text.slice(0, 200));
    process.exit(1);
  }
  const b = body as {
    ok?: boolean;
    checks?: {
      database?: { ok: boolean; error?: string };
      stripe?: { ok: boolean; error?: string };
      resend?: { ok: boolean; error?: string };
      baseUrl?: { ok: boolean; error?: string };
      crons?: { name: string; lastRun?: string | null; status?: string; error?: string }[];
    };
  };
  console.log("status HTTP:", res.status, "| ok:", b.ok);
  if (b.checks) {
    for (const key of ["database", "stripe", "resend", "baseUrl"] as const) {
      const c = b.checks[key];
      if (c) {
        const good = c.ok;
        const err = "error" in c ? c.error : undefined;
        console.log(`  ${good ? "✓" : "✗"} ${key}${err ? ` — ${err}` : ""}`);
      }
    }
    if (b.checks.crons?.length) {
      console.log("  crons (info):");
      for (const row of b.checks.crons) {
        console.log(`    · ${row.name}: ${row.status ?? "—"} (last: ${row.lastRun ?? "—"})`);
      }
    }
  } else {
    console.log("checks:", b);
  }
  if (!b.ok) {
    console.error("Health: ok=false (DB e obligatoriu pentru 200; vezi răspunsul de mai sus).");
    process.exit(1);
  }
  if (!res.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
