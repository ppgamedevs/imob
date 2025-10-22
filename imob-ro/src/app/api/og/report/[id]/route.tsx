import { ImageResponse } from "next/og";

import { prisma } from "@/lib/db";

export const runtime = "edge";

export default async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const a = await prisma.analysis.findUnique({
      where: { id: resolvedParams.id },
      include: {
        extractedListing: true,
        featureSnapshot: true,
        scoreSnapshot: true,
        trustSnapshot: true,
      },
    });

    if (!a) {
      return new Response("Not found", { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const f: any = a.featureSnapshot?.features ?? {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s: any = a.scoreSnapshot ?? {};

    const title = a.extractedListing?.title ?? "Analiză ImobIntel";
    const price = f.priceEur ? `${f.priceEur.toLocaleString("ro-RO")} €` : "—";
    const badge = s.priceBadge ?? "";
    const tts = s.ttsBucket ? `~${s.ttsBucket} zile` : "—";
    const yieldVal = s.yieldNet ? `${(s.yieldNet * 100).toFixed(1)}%` : "—";
    const trust = a.trustSnapshot?.badge ?? s.trust ?? "—";

    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            width: "1200px",
            height: "630px",
            background: "linear-gradient(135deg,#0f172a 0%,#111827 100%)",
            color: "white",
            padding: "48px",
            fontSize: 36,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", flex: 1 }}>
            <div style={{ fontSize: 20, opacity: 0.7 }}>ImobIntel • Analiză</div>
            <div style={{ fontWeight: 700, fontSize: 44, maxWidth: 900, lineHeight: 1.2 }}>
              {title}
            </div>
            <div style={{ fontSize: 28 }}>
              Preț: {price} {badge && `· ${badge}`}
            </div>
            <div style={{ fontSize: 24, opacity: 0.8, display: "flex", gap: "24px" }}>
              <span>TTS: {tts}</span>
              <span>Yield: {yieldVal}</span>
              <span>Trust: {trust}</span>
            </div>
            <div
              style={{
                marginTop: "auto",
                fontSize: 14,
                opacity: 0.6,
              }}
            >
              estimări automate • nu constituie consultanță
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (err) {
    console.error(err);
    return new Response("Error", { status: 500 });
  }
}
