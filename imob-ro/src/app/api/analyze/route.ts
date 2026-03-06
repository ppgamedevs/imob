import { NextResponse } from "next/server";

import { startAnalysis } from "@/lib/analysis";
import { auth } from "@/lib/auth";
import { canUse, incUsage } from "@/lib/billing/entitlements";
import { ANALYSIS_DEDUP_WINDOW_MS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/obs/logger";
import { allowRequest } from "@/lib/rateLimiter";

const SUPPORTED_HOSTS = new Set([
  "imobiliare.ro",
  "storia.ro",
  "olx.ro",
  "publi24.ro",
  "lajumate.ro",
  "homezz.ro",
]);

const MAX_URL_LENGTH = 2048;

function sanitizeUrl(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (trimmed.length > MAX_URL_LENGTH) return null;
  if (/[<>"'`{}()|\\]/.test(trimmed)) return null;
  try {
    const url = new URL(trimmed);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    url.hash = "";
    url.searchParams.forEach((_, key) => {
      if (key.startsWith("utm_") || key === "fbclid") url.searchParams.delete(key);
    });
    return url.toString();
  } catch {
    return null;
  }
}

type UrlCheckResult =
  | { ok: true }
  | { ok: false; error: string };

function checkListingUrl(urlStr: string): UrlCheckResult {
  try {
    const u = new URL(urlStr);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    const path = u.pathname.toLowerCase();

    if (!SUPPORTED_HOSTS.has(host)) {
      return {
        ok: false,
        error: `Site-ul ${host} nu este suportat. Acceptam linkuri de pe: ${[...SUPPORTED_HOSTS].join(", ")}.`,
      };
    }

    if (host === "imobiliare.ro") {
      if (/\/inchirieri?[/-]/.test(path)) {
        return { ok: false, error: "ImobIntel analizeaza doar anunturi de vanzare. Suportul pentru chirii este in constructie." };
      }
      const NON_RESIDENTIAL_PATH_RE = /\/(vanzare-)?(spatii?-comercial|terenuri|birouri|hale|afaceri|spatii?-industriale)/;
      const NON_RESIDENTIAL_OFERTA_RE = /\/oferta\/(spatiu-comercial|teren|birou|hala|afacere|spatiu-industrial)-de-vanzare/;
      if (NON_RESIDENTIAL_PATH_RE.test(path) || NON_RESIDENTIAL_OFERTA_RE.test(path)) {
        return { ok: false, error: "ImobIntel analizeaza doar proprietati rezidentiale (apartamente, case, vile, garsoniere). Spatiile comerciale, terenurile si birourile nu sunt suportate." };
      }
      if (path.startsWith("/oferta/")) return { ok: true };
      if (/\/[a-z0-9-]+-\d{4,}$/.test(path)) return { ok: true };
      if (/^\/vanzare-[^/]+\/[^/]+(\/[^/]+)?$/.test(path) && !/-\d{4,}$/.test(path)) {
        return { ok: false, error: "Acest link pare sa fie o pagina de cautare, nu un anunt individual. Lipeste linkul unui anunt specific (ex: imobiliare.ro/oferta/garsoniera-de-vanzare-...)." };
      }
      return { ok: true };
    }

    if (host === "storia.ro") {
      if (/\/inchirieri?[/-]/.test(path) || /\/de-inchiriat\b/.test(path)) {
        return { ok: false, error: "ImobIntel analizeaza doar anunturi de vanzare. Suportul pentru chirii este in constructie." };
      }
      if (/\/(spatii?-comercial|terenuri|birouri|hale|afaceri)/.test(path)) {
        return { ok: false, error: "ImobIntel analizeaza doar proprietati rezidentiale (apartamente, case, vile, garsoniere). Spatiile comerciale, terenurile si birourile nu sunt suportate." };
      }
      if (path.includes("/oferta/")) return { ok: true };
      if (path.includes("/rezultate/")) {
        return { ok: false, error: "Acest link pare sa fie o pagina de cautare, nu un anunt individual." };
      }
      return { ok: true };
    }

    if (host === "olx.ro") {
      if (!path.includes("/d/oferta/")) {
        if (path.includes("/imobiliare/") || path === "/" || /^\/[a-z-]+\/?$/.test(path)) {
          return { ok: false, error: "Acest link pare sa fie o pagina de cautare, nu un anunt individual." };
        }
      }
      // Detect non-real-estate OLX categories from the slug
      const NON_REALESTATE_SLUGS = [
        "auto-moto", "electronice", "moda", "casa-gradina", "animale",
        "agro-industrie", "sport-hobby", "piese-auto", "servicii",
        "locuri-de-munca", "mama-copilul",
      ];
      for (const slug of NON_REALESTATE_SLUGS) {
        if (path.includes(`/${slug}/`)) {
          return { ok: false, error: "Acest link nu este un anunt imobiliar. ImobIntel analizeaza doar apartamente, case si alte proprietati imobiliare." };
        }
      }
      return { ok: true };
    }

    if (host === "publi24.ro") {
      if (/\/de-inchiriat\b|\/inchirieri?\b/.test(path)) {
        return { ok: false, error: "ImobIntel analizeaza doar anunturi de vanzare. Suportul pentru chirii este in constructie." };
      }
      const PUBLI24_NON_RES = /\/(?:terenuri|spatii-comerciale|birouri|hale|afaceri|spatii-industriale)\//;
      if (PUBLI24_NON_RES.test(path)) {
        return { ok: false, error: "ImobIntel analizeaza doar proprietati rezidentiale (apartamente, case, vile, garsoniere). Spatiile comerciale, terenurile si birourile nu sunt suportate." };
      }
      if (path.includes("/anunt/")) return { ok: true };
      if (/\/\d+$/.test(path)) return { ok: true };
      if (path.includes("/anunturi/") && !path.includes("/anunt/")) {
        return { ok: false, error: "Acest link pare sa fie o pagina de cautare, nu un anunt individual." };
      }
      return { ok: true };
    }

    if (host === "lajumate.ro") {
      if (path.includes("/ad/")) return { ok: true };
      if (/\d{5,}/.test(path)) return { ok: true };
      if (/^\/[a-z-]+\/[a-z-]+$/.test(path) && !path.includes("/ad/")) {
        return { ok: false, error: "Acest link pare sa fie o pagina de cautare, nu un anunt individual." };
      }
      return { ok: true };
    }

    if (host === "homezz.ro") {
      if (/\d{4,}\.html$/.test(path)) return { ok: true };
      if (path.includes("/anunt/") || path.includes("/oferta/") || path.includes("/proprietate/")) return { ok: true };
      if (path === "/" || /^\/[a-z-]+\/?$/.test(path)) {
        return { ok: false, error: "Acest link pare sa fie o pagina de cautare, nu un anunt individual." };
      }
      return { ok: true };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "URL invalid." };
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const session = await auth();

  if (session?.user?.id) {
    const check = await canUse(session.user.id, "analyze");
    if (!check.allowed) {
      return NextResponse.json(
        {
          error: "limit_reached",
          plan: check.plan,
          used: check.used,
          max: check.max,
          message: `Limita de analize atinsa: ${check.used}/${check.max} in aceasta luna`,
        },
        { status: 402 },
      );
    }
  }

  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

  if (!allowRequest(`analyze:${ip}`)) {
    logger.warn({ ip }, "Rate limited on /api/analyze");
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const rawUrl = sanitizeUrl(body?.url);
  if (!rawUrl) return NextResponse.json({ error: "URL invalid sau nesigur. Verifica linkul si incearca din nou." }, { status: 400 });

  const urlCheck = checkListingUrl(rawUrl);
  if (!urlCheck.ok) {
    return NextResponse.json({ error: urlCheck.error }, { status: 400 });
  }

  const dedupCutoff = new Date(Date.now() - ANALYSIS_DEDUP_WINDOW_MS);
  const existing = await prisma.analysis.findFirst({
    where: {
      sourceUrl: rawUrl,
      createdAt: { gte: dedupCutoff },
      status: { notIn: ["error", "failed"] },
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing) return NextResponse.json({ id: existing.id, reused: true });

  const analysis = await prisma.analysis.create({
    data: {
      sourceUrl: rawUrl,
      status: "queued",
      userId: session?.user?.id || null,
    },
  });

  if (session?.user?.id) {
    await incUsage(session.user.id, "analyze", 1);
  }

  void startAnalysis(analysis.id, rawUrl).catch((err) => {
    logger.error({ analysisId: analysis.id, err }, "Background analysis failed");
  });

  return NextResponse.json({ id: analysis.id, reused: false });
}
