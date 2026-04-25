/**
 * Controlled pre-launch QA: one URL per supported portal, via real POST /api/analyze.
 *
 * URLs never go in git. Provide them via:
 *   - file `private-report-qa-urls.txt` in project root (one URL per line, # comments allowed), or
 *   - env `QA_REPORT_URLS` (comma-separated)
 *
 * Requires: app reachable at QA_BASE_URL (default http://127.0.0.1:3000), DATABASE_URL for polling.
 *
 *   pnpm qa:portal:run
 *   (sau: pnpm exec tsx scripts/qa-real-portal-reports.ts)
 *
 * Output: `docs/private-report-qa.md` (gitignored) + console summary.
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { config } from "dotenv";

import { prisma } from "@/lib/db";
import { getReportQaSnapshot, type ReportQaSnapshot } from "@/lib/qa/report-qa-snapshot";

config({ path: ".env.local" });
config({ path: ".env" });

const DEFAULT_BASE = "http://127.0.0.1:3000";
const POLL_MS = 2500;
const MAX_WAIT_MS = 12 * 60 * 1000;

const TERMINAL = new Set([
  "done",
  "error",
  "failed",
  "rejected_rental",
  "rejected_not_realestate",
]);

function loadUrls(): string[] {
  const fromEnv = process.env.QA_REPORT_URLS?.trim();
  if (fromEnv) {
    return fromEnv
      .split(",")
      .map((u) => u.trim())
      .filter(Boolean);
  }
  const path = "private-report-qa-urls.txt";
  if (!existsSync(path)) {
    console.error(
      `Lipsește sursa de URL-uri: setează QA_REPORT_URLS sau creează ${path} (un URL pe linie).`,
    );
    process.exit(1);
  }
  const raw = readFileSync(path, "utf-8");
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
}

async function waitForTerminal(analysisId: string): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < MAX_WAIT_MS) {
    const row = await prisma.analysis.findUnique({
      where: { id: analysisId },
      select: { status: true },
    });
    if (row && TERMINAL.has(row.status)) return;
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  throw new Error(`Timeout așteptând status terminal pentru ${analysisId}`);
}

function recommend(s: ReportQaSnapshot): "promote" | "support_quietly" | "hide_from_ui" {
  if (s.status !== "done") return "support_quietly";
  if (s.sellability === "do_not_sell") return "hide_from_ui";
  if (s.sellability === "weak" || s.confidenceLevel === "low") return "support_quietly";
  if (s.sellability === "strong" || s.sellability === "okay") return "promote";
  return "support_quietly";
}

function rowToMarkdownLine(s: ReportQaSnapshot, rec: string): string {
  const esc = (x: string | null | undefined) =>
    String(x ?? "")
      .replace(/\|/g, "\\|")
      .replace(/\n/g, " ");
  return `| ${esc(s.portal)} | ${esc(s.sourceHost)} | \`${s.analysisId}\` | [raport](${s.reportUrl}) | ${esc(s.status)} | ${esc(s.extractedTitle)} | ${esc(s.price)} | ${esc(s.area)} | ${esc(s.rooms)} | ${esc(s.location)} | ${s.photoCount} | ${s.compCount} | ${esc(s.confidenceLevel)} | ${esc(s.sellability)} | ${s.paywallShown ? "da" : "nu"} | ${esc(s.failureReason)} | ${rec} |`;
}

async function startAnalyze(base: string, url: string): Promise<{ id: string; reused: boolean } | { error: string }> {
  const res = await fetch(`${base.replace(/\/$/, "")}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = (await res.json().catch(() => ({}))) as { id?: string; reused?: boolean; error?: string };
  if (!res.ok) {
    return { error: `${res.status} ${data?.error ?? "unknown"}` };
  }
  if (!data.id) return { error: "fără id în răspuns" };
  return { id: data.id, reused: data.reused === true };
}

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL este necesar pentru polling.");
    process.exit(1);
  }
  const base = (process.env.QA_BASE_URL ?? DEFAULT_BASE).replace(/\/$/, "");
  const urls = loadUrls();
  if (urls.length === 0) {
    console.error("Niciun URL de procesat.");
    process.exit(1);
  }

  const results: { url: string; snap: ReportQaSnapshot | null; err?: string; reused?: boolean }[] = [];

  for (const url of urls) {
    console.log(`\n→ POST analyze: ${url.slice(0, 80)}...`);
    const started = await startAnalyze(base, url);
    if ("error" in started) {
      results.push({ url, snap: null, err: started.error });
      continue;
    }
    console.log(`  analysisId=${started.id} reused=${started.reused}`);
    try {
      await waitForTerminal(started.id);
    } catch (e) {
      results.push({ url, snap: null, err: (e as Error).message });
      continue;
    }
    const snap = await getReportQaSnapshot(started.id, base);
    results.push({ url, snap, reused: started.reused });
  }

  const siteBase = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? base;
  const lines: string[] = [];
  lines.push(`# Raport QA privat (generat local)`);
  lines.push(``);
  lines.push(`- **Generat:** ${new Date().toISOString()}`);
  lines.push(`- **App:** ${base}`);
  lines.push(`- **Nu comita acest fișier.** Heuristica „recomandare” este orientativă.`);
  lines.push(``);
  lines.push(
    `| portal | host | analysisId | raport | status | title | preț | mp | camere | locație | poze | comp | conf | sellability | paywall | eșec | recomandare |`,
  );
  lines.push(
    `| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |`,
  );

  const issues: string[] = [];

  for (const r of results) {
    if (r.err || !r.snap) {
      const msg = r.err ?? "fără snapshot";
      lines.push(`| — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | ${msg.replace(/\|/g, " ")} | — |`);
      issues.push(`URL: ${r.url} → ${msg}`);
      continue;
    }
    const s = r.snap;
    const rec = recommend(s);
    lines.push(rowToMarkdownLine(s, rec));
    if (s.status !== "done") {
      issues.push(`${s.portal}: status=${s.status} ${s.failureReason ?? ""}`.trim());
    }
    if (s.status === "done" && s.sellability === "do_not_sell") {
      issues.push(`${s.portal}: sellability do_not_sell (raport fără paywall rezonabil).`);
    }
  }

  lines.push(``);
  lines.push(`## Probleme (automat)`);
  lines.push(issues.length ? issues.map((x) => `- ${x}`).join("\n") : "- (niciuna detectată automat)");
  lines.push(``);
  lines.push(`## Recomandări pe portal`);
  lines.push(``);
  const byPortal = new Map<string, ReportQaSnapshot[]>();
  for (const r of results) {
    if (!r.snap) continue;
    const k = r.snap.portal;
    if (!byPortal.has(k)) byPortal.set(k, []);
    byPortal.get(k)!.push(r.snap);
  }
  for (const [p, snaps] of byPortal) {
    const s = snaps[0];
    lines.push(`- **${p}:** \`${recommend(s)}\` (${s.status}, ${s.sellability}, conf=${s.confidenceLevel ?? "—"})`);
  }

  const outPath = "docs/private-report-qa.md";
  writeFileSync(outPath, lines.join("\n"), "utf-8");
  console.log(`\nScrie: ${outPath}`);

  console.log("\n--- Rezumat console ---\n");
  for (const r of results) {
    if (r.snap) {
      console.log(
        `${r.snap.portal} | ${r.snap.analysisId} | ${r.snap.status} | ${r.snap.sellability} | paywall ${r.snap.paywallShown} | ${recommend(r.snap)}`,
      );
    } else {
      console.log(`EROARE | ${r.url} | ${r.err}`);
    }
  }
  console.log(`\nBaza pentru linkuri raport: ${siteBase}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  void prisma.$disconnect();
  process.exit(1);
});
