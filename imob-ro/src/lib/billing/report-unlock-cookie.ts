import { createHmac, timingSafeEqual } from "crypto";

import { prisma } from "@/lib/db";

const PREFIX = "v1";

function secret(): string {
  return process.env.REPORT_UNLOCK_COOKIE_SECRET ?? process.env.NEXTAUTH_SECRET ?? "dev-insecure";
}

/**
 * HMAC-SHA256 hex for report unlock cookie (guest access after payment).
 * Format: v1.<reportUnlockId>.<hmac of reportUnlockId|analysisId>
 */
export function signReportUnlockCookie(reportUnlockId: string, analysisId: string): string {
  const h = createHmac("sha256", secret());
  h.update(`${reportUnlockId}|${analysisId}`);
  return `${PREFIX}.${reportUnlockId}.${h.digest("hex")}`;
}

/** Verifies HMAC; checks DB row is paid and analysisId matches. */
export async function verifyGuestUnlockCookie(
  analysisId: string,
  token: string | undefined,
): Promise<boolean> {
  if (!token?.startsWith(`${PREFIX}.`)) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const reportUnlockId = parts[1]!;
  const mac = parts[2]!;

  const h = createHmac("sha256", secret());
  h.update(`${reportUnlockId}|${analysisId}`);
  const expected = h.digest("hex");
  let ok = false;
  try {
    ok =
      expected.length === mac.length &&
      timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(mac, "utf8"));
  } catch {
    ok = false;
  }
  if (!ok) return false;

  const row = await prisma.reportUnlock.findFirst({
    where: { id: reportUnlockId, analysisId, status: "paid" },
    select: { id: true },
  });
  return !!row;
}

export function reportUnlockCookieName(analysisId: string): string {
  return `imob_ru_${analysisId.replace(/[^a-zA-Z0-9_\-]/g, "_")}`;
}
