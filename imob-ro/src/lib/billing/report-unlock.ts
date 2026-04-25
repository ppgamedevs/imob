/**
 * Guest per-report access uses an **httpOnly** HMAC cookie (`report-unlock-cookie.ts`).
 * The optional `unlock_token` query param is the **same secret as the cookie value** and behaves like a
 * bearer credential: suitable for smoke tests, support, or when the client cannot store cookies. Do not
 * ship it in marketing links, log lines, or analytics; see `redactSensitiveUrlParams`.
 */
import { cookies } from "next/headers";

import { prisma } from "@/lib/db";

import { trackFunnelEvent } from "@/lib/tracking/funnel";

import { canAccess } from "./entitlements";
import { reportUnlockCookieName, signReportUnlockCookie, verifyGuestUnlockCookie } from "./report-unlock-cookie";

const LIMITS_DISABLED = () => process.env.BILLING_LIMITS_DISABLED === "true";

function normEmail(e: string | null | undefined): string | null {
  if (e == null || e === "") return null;
  return e.trim().toLowerCase();
}

const DEFAULT_UNLOCK_RON = 49;

function reportUnlockPriceRonFromEnvOrDefault(): number {
  const ron = process.env.REPORT_UNLOCK_PRICE_RON;
  if (ron != null && ron !== "") {
    const n = Number.parseFloat(ron.replace(",", "."));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return DEFAULT_UNLOCK_RON;
}

/**
 * Display and Stripe use the same source: `REPORT_UNLOCK_AMOUNT_CENTS` when set, else `REPORT_UNLOCK_PRICE_RON` (default 49).
 * Default 49 RON. Override with REPORT_UNLOCK_PRICE_RON=49 (or use REPORT_UNLOCK_AMOUNT_CENTS for exact bani).
 */
export function getReportUnlockPriceRon(): number {
  const fromCents = process.env.REPORT_UNLOCK_AMOUNT_CENTS;
  if (fromCents != null && fromCents !== "") {
    const c = Number.parseInt(fromCents, 10);
    if (Number.isFinite(c) && c > 0) return c / 100;
  }
  return reportUnlockPriceRonFromEnvOrDefault();
}

/** Amount in bani (minor units) for Stripe. */
export function getReportUnlockAmountCents(): number {
  const fromCents = process.env.REPORT_UNLOCK_AMOUNT_CENTS;
  if (fromCents != null && fromCents !== "") {
    const c = Number.parseInt(fromCents, 10);
    if (Number.isFinite(c) && c > 0) return c;
  }
  return Math.round(reportUnlockPriceRonFromEnvOrDefault() * 100);
}

export function formatReportUnlockPrice(): string {
  const ron = getReportUnlockPriceRon();
  return `${ron.toLocaleString("ro-RO", { maximumFractionDigits: 2, minimumFractionDigits: Number.isInteger(ron) ? 0 : 2 })} RON`;
}

export function formatUnlockButtonLabel(): string {
  return `Deblochează raportul complet - ${formatReportUnlockPrice()}`;
}

export async function hasPaidPerReportUnlock(
  userId: string,
  analysisId: string,
): Promise<boolean> {
  const row = await prisma.reportUnlock.findFirst({
    where: { analysisId, userId, status: "paid" },
    select: { id: true },
  });
  return !!row;
}

/**
 * Full report: limits off, subscription / pro, logged-in one-time paid, or valid guest cookie + DB.
 * Does not trust `?unlocked=1` alone (cookie + DB is checked).
 */
export async function canViewFullReport(opts: {
  analysisId: string;
  userId: string | null | undefined;
}): Promise<boolean> {
  if (LIMITS_DISABLED()) return true;
  const { analysisId, userId } = opts;
  const cookieStore = await cookies();
  const guestToken = cookieStore.get(reportUnlockCookieName(analysisId))?.value;
  if (guestToken && (await verifyGuestUnlockCookie(analysisId, guestToken))) {
    return true;
  }

  if (!userId) {
    return false;
  }

  const [unlock, detailed, user] = await Promise.all([
    hasPaidPerReportUnlock(userId, analysisId),
    canAccess(userId, "detailedScore"),
    prisma.user.findUnique({ where: { id: userId }, select: { proTier: true } }),
  ]);

  if (unlock) return true;
  if (detailed.allowed) return true;
  if (user?.proTier) return true;
  return false;
}

/**
 * For API routes: pass Request cookies header into manual cookie parse if not in next/headers context.
 * `unlockToken` = same HMAC value as the guest cookie (optional; for links, tests, când browserul nu trimite cookie).
 * Prefer canViewFullReport for App Router. For edge cases use cookie header with verifyGuestUnlockCookie.
 */
export async function canViewFullReportFromRequest(
  analysisId: string,
  userId: string | null | undefined,
  cookieHeader: string | null,
  unlockToken: string | null = null,
): Promise<boolean> {
  if (LIMITS_DISABLED()) return true;
  const t = unlockToken?.trim() || null;
  if (t && (await verifyGuestUnlockCookie(analysisId, t))) {
    return true;
  }
  if (cookieHeader) {
    const name = reportUnlockCookieName(analysisId) + "=";
    const part = cookieHeader.split(";").map((c) => c.trim()).find((c) => c.startsWith(name));
    if (part) {
      const raw = decodeURIComponent(part.slice(name.length));
      if (await verifyGuestUnlockCookie(analysisId, raw)) return true;
    }
  }
  if (!userId) return false;
  const [unlock, detailed, user] = await Promise.all([
    hasPaidPerReportUnlock(userId, analysisId),
    canAccess(userId, "detailedScore"),
    prisma.user.findUnique({ where: { id: userId }, select: { proTier: true } }),
  ]);
  if (unlock) return true;
  if (detailed.allowed) return true;
  if (user?.proTier) return true;
  return false;
}

/**
 * Inserts `ReportUnlock` with `status: "pending"` before Stripe Checkout.
 * `stripeSessionId` is set in the checkout route after `sessions.create`.
 * Webhook / success redirect marks `paid`. Replaces prior pending for same analysis+user scope.
 */
export async function createPendingReportUnlock(opts: {
  analysisId: string;
  userId: string | null;
  email?: string | null;
}): Promise<{ id: string; amountCents: number; currency: string }> {
  const amountCents = getReportUnlockAmountCents();
  if (opts.userId) {
    await prisma.reportUnlock.deleteMany({
      where: { analysisId: opts.analysisId, userId: opts.userId, status: "pending" },
    });
  } else {
    await prisma.reportUnlock.deleteMany({
      where: { analysisId: opts.analysisId, userId: null, status: "pending" },
    });
  }
  const row = await prisma.reportUnlock.create({
    data: {
      analysisId: opts.analysisId,
      userId: opts.userId,
      email: normEmail(opts.email),
      amountCents,
      currency: "RON",
      status: "pending",
    },
  });
  return { id: row.id, amountCents, currency: row.currency };
}

/**
 * PDF monthly quota: exempt when access comes from a one-time per-report purchase
 * (plata pe user în DB, cookie guest valid, sau același token HMAC ca la cookie).
 * Verificăm cookie și pentru utilizatori autentificati (ex.: plată anonomă, apoi login).
 */
export async function isPerReportUnlockPdfQuotaExempt(
  analysisId: string,
  userId: string | null,
  cookieHeader: string | null,
  unlockToken: string | null = null,
): Promise<boolean> {
  const t = unlockToken?.trim() || null;
  if (t && (await verifyGuestUnlockCookie(analysisId, t))) {
    return true;
  }
  if (cookieHeader) {
    const name = `${reportUnlockCookieName(analysisId)}=`;
    const part = cookieHeader
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(name));
    if (part) {
      const raw = decodeURIComponent(part.slice(name.length));
      if (await verifyGuestUnlockCookie(analysisId, raw)) {
        return true;
      }
    }
  }
  if (userId && (await hasPaidPerReportUnlock(userId, analysisId))) {
    return true;
  }
  return false;
}

export type MarkReportUnlockPaidResult = {
  applied: boolean;
  reason?: "already_paid" | "not_found" | "blocked_refunded" | "not_pending";
};

/**
 * Transitions `pending` → `paid` only. Idempotent: replays and duplicate webhooks
 * do not re-emit `checkout_completed` or double-count. Refunded / non-pending rows are skipped.
 */
export async function markReportUnlockPaidFromStripe(opts: {
  reportUnlockId: string;
  stripeSessionId: string | null;
  stripePaymentIntentId: string | null;
  amountCents?: number;
  email?: string | null;
}): Promise<MarkReportUnlockPaidResult> {
  const existing = await prisma.reportUnlock.findUnique({
    where: { id: opts.reportUnlockId },
    select: { status: true, analysisId: true, userId: true, amountCents: true, currency: true },
  });
  if (!existing) {
    return { applied: false, reason: "not_found" };
  }
  if (existing.status === "paid") {
    return { applied: false, reason: "already_paid" };
  }
  if (existing.status === "refunded") {
    return { applied: false, reason: "blocked_refunded" };
  }
  if (existing.status !== "pending") {
    return { applied: false, reason: "not_pending" };
  }

  const data: {
    status: string;
    stripeSessionId?: string;
    stripePaymentIntentId?: string;
    amountCents?: number;
    email?: string | null;
  } = { status: "paid" };

  if (opts.stripeSessionId) data.stripeSessionId = opts.stripeSessionId;
  if (opts.stripePaymentIntentId) data.stripePaymentIntentId = opts.stripePaymentIntentId;
  if (opts.amountCents != null) data.amountCents = opts.amountCents;
  if (opts.email) data.email = normEmail(opts.email) ?? null;

  const result = await prisma.reportUnlock.updateMany({
    where: { id: opts.reportUnlockId, status: "pending" },
    data,
  });
  if (result.count === 0) {
    return { applied: false, reason: "already_paid" };
  }

  const amount = opts.amountCents ?? existing.amountCents;
  void trackFunnelEvent("checkout_completed", {
    analysisId: existing.analysisId,
    userId: existing.userId,
    path: "/webhook",
    metadata: { amountCents: amount, currency: existing.currency, source: "report_unlock" },
  });
  return { applied: true };
}

export type MarkReportUnlockRefundedResult = {
  applied: boolean;
  reason?: "not_found" | "not_paid" | "already_refunded";
};

/** Sets `paid` → `refunded` only. Idempotent. Guest cookies stop working (DB check requires `status: paid`). */
export async function markReportUnlockRefundedFromStripe(
  reportUnlockId: string,
): Promise<MarkReportUnlockRefundedResult> {
  const result = await prisma.reportUnlock.updateMany({
    where: { id: reportUnlockId, status: "paid" },
    data: { status: "refunded" },
  });
  if (result.count > 0) {
    return { applied: true };
  }
  const row = await prisma.reportUnlock.findUnique({
    where: { id: reportUnlockId },
    select: { status: true },
  });
  if (!row) return { applied: false, reason: "not_found" };
  if (row.status === "refunded") {
    return { applied: false, reason: "already_refunded" };
  }
  return { applied: false, reason: "not_paid" };
}

export async function markReportUnlockRefunded(reportUnlockId: string): Promise<void> {
  await prisma.reportUnlock.updateMany({
    where: { id: reportUnlockId, status: "paid" },
    data: { status: "refunded" },
  });
}

export async function findReportUnlockById(id: string) {
  return prisma.reportUnlock.findUnique({ where: { id } });
}

export async function findReportUnlockByStripeSessionId(stripeSessionId: string) {
  return prisma.reportUnlock.findFirst({
    where: { stripeSessionId },
  });
}

export async function findReportUnlockByStripePaymentIntentId(stripePaymentIntentId: string) {
  return prisma.reportUnlock.findFirst({
    where: { stripePaymentIntentId },
  });
}
