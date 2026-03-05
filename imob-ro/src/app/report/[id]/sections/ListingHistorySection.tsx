import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ---- Types ----

interface SnapshotPoint {
  capturedAt: string; // ISO string (serializable from server)
  priceEur: number | null;
  status: "ACTIVE" | "REMOVED" | "UNKNOWN";
}

interface DuplicateRow {
  id: string;
  analysisId: string;
  reason: "TEXT_HASH" | "IMAGES_HASH" | "ADDRESS_NEAR";
  confidence: number;
  sourceUrl: string | null;
  title: string | null;
}

interface Props {
  snapshots: SnapshotPoint[];
  duplicates: DuplicateRow[];
  currency?: string;
}

// ---- Helpers ----

const REASON_LABELS: Record<string, string> = {
  TEXT_HASH: "Acelasi text",
  IMAGES_HASH: "Aceleasi fotografii",
  ADDRESS_NEAR: "Adresa similara",
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtPrice(n: number | null, cur = "EUR"): string {
  if (n == null) return "-";
  return `${Intl.NumberFormat("ro-RO", { maximumFractionDigits: 0 }).format(n)} ${cur}`;
}

function domainFromUrl(url: string | null): string {
  if (!url) return "-";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// ---- Chart ----

function MiniPriceChart({ points, currency }: { points: { date: string; price: number }[]; currency: string }) {
  if (points.length < 2) return null;

  const prices = points.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const W = 100;
  const H = 40;
  const padY = 2;

  const xs = points.map((_, i) => (i / (points.length - 1)) * W);
  const ys = points.map((p) => H - padY - ((p.price - min) / range) * (H - 2 * padY));

  const pathD = xs
    .map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`)
    .join(" ");

  const areaD = `${pathD} L${W},${H} L0,${H} Z`;

  const first = points[0];
  const last = points[points.length - 1];
  const trending = last.price < first.price ? "down" : last.price > first.price ? "up" : "flat";
  const strokeColor = trending === "down" ? "#16a34a" : trending === "up" ? "#dc2626" : "#6b7280";
  const fillColor = trending === "down" ? "#dcfce7" : trending === "up" ? "#fee2e2" : "#f3f4f6";

  return (
    <div className="space-y-1.5">
      <div className="flex items-end justify-between text-[10px] text-muted-foreground">
        <span>{fmtDate(first.date)}</span>
        <span>{fmtDate(last.date)}</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-16"
        preserveAspectRatio="none"
        aria-label="Grafic evolutie pret"
      >
        <path d={areaD} fill={fillColor} opacity={0.5} />
        <path d={pathD} fill="none" stroke={strokeColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        {xs.map((x, i) => (
          <circle key={i} cx={x} cy={ys[i]} r={2} fill={strokeColor} />
        ))}
      </svg>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{fmtPrice(first.price, currency)}</span>
        <span className={`font-medium ${trending === "down" ? "text-emerald-600" : trending === "up" ? "text-red-600" : "text-gray-500"}`}>
          {trending === "down"
            ? `↓ ${fmtPrice(first.price - last.price, currency)}`
            : trending === "up"
              ? `↑ ${fmtPrice(last.price - first.price, currency)}`
              : "Stabil"}
        </span>
        <span>{fmtPrice(last.price, currency)}</span>
      </div>
    </div>
  );
}

// ---- Integrity flags logic ----

function computeFlags(snapshots: SnapshotPoint[]) {
  const flags: { key: string; label: string; detail: string; severity: "info" | "warn" | "error" }[] = [];

  if (snapshots.length === 0) return flags;

  const statuses = snapshots.map((s) => s.status);

  // "Anunt instabil" - removed then reappeared
  const removedThenActive =
    statuses.includes("REMOVED") &&
    statuses.indexOf("REMOVED") < statuses.lastIndexOf("ACTIVE");
  if (removedThenActive) {
    flags.push({
      key: "unstable",
      label: "Anunt instabil",
      detail: "Anuntul a fost sters si apoi republicat. Poate indica repostare pentru a parea nou.",
      severity: "warn",
    });
  }

  // "Repostari detectate" - large time gaps (>7 days) between consecutive ACTIVE snapshots
  const activeSnapshots = snapshots.filter((s) => s.status === "ACTIVE");
  if (activeSnapshots.length >= 2) {
    let gapCount = 0;
    for (let i = 1; i < activeSnapshots.length; i++) {
      const prev = new Date(activeSnapshots[i - 1].capturedAt).getTime();
      const curr = new Date(activeSnapshots[i].capturedAt).getTime();
      if (curr - prev > 7 * 24 * 60 * 60 * 1000) gapCount++;
    }
    if (gapCount > 0) {
      flags.push({
        key: "reposts",
        label: "Repostari detectate",
        detail: `${gapCount} pauze de peste 7 zile intre aparitii. Anuntul pare repostat periodic.`,
        severity: "warn",
      });
    }
  }

  // Price drops
  const pricePoints = snapshots
    .filter((s) => s.priceEur != null)
    .map((s) => s.priceEur as number);
  if (pricePoints.length >= 2) {
    let drops = 0;
    for (let i = 1; i < pricePoints.length; i++) {
      if (pricePoints[i] < pricePoints[i - 1]) drops++;
    }
    if (drops >= 3) {
      flags.push({
        key: "many_drops",
        label: "Scaderi repetate de pret",
        detail: `${drops} reduceri de pret inregistrate. Proprietatea se vinde mai greu decat se astepta.`,
        severity: "info",
      });
    }
  }

  return flags;
}

// ---- Component ----

export default function ListingHistorySection({ snapshots, duplicates, currency = "EUR" }: Props) {
  if (snapshots.length === 0 && duplicates.length === 0) return null;

  // Compute stats from snapshots
  const firstSeen = snapshots.length > 0 ? snapshots[0].capturedAt : null;
  const lastSeen = snapshots.length > 0 ? snapshots[snapshots.length - 1].capturedAt : null;

  const pricePoints = snapshots.filter((s) => s.priceEur != null);
  const priceChanges = (() => {
    let count = 0;
    for (let i = 1; i < pricePoints.length; i++) {
      if (pricePoints[i].priceEur !== pricePoints[i - 1].priceEur) count++;
    }
    return count;
  })();

  const drops = (() => {
    let count = 0;
    let maxDrop = 0;
    for (let i = 1; i < pricePoints.length; i++) {
      const prev = pricePoints[i - 1].priceEur!;
      const curr = pricePoints[i].priceEur!;
      if (curr < prev) {
        count++;
        maxDrop = Math.max(maxDrop, prev - curr);
      }
    }
    return { count, maxDrop };
  })();

  const chartData = pricePoints
    .filter((p) => p.priceEur != null)
    .map((p) => ({ date: p.capturedAt, price: p.priceEur as number }));

  const flags = computeFlags(snapshots);
  if (duplicates.length > 0) {
    flags.push({
      key: "duplicates",
      label: "Posibile duplicate",
      detail: `${duplicates.length} anunturi similare gasite pe alte surse.`,
      severity: "info",
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Istoric anunt</CardTitle>
          {snapshots.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {snapshots.length} observatii
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Stats row */}
        {snapshots.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <div className="text-muted-foreground text-xs">Prima aparitie</div>
              <div className="font-medium">{firstSeen ? fmtDate(firstSeen) : "-"}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Ultima observatie</div>
              <div className="font-medium">{lastSeen ? fmtDate(lastSeen) : "-"}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Schimbari de pret</div>
              <div className="font-medium">{priceChanges}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Scaderi de pret</div>
              <div className="font-medium">
                {drops.count > 0 ? (
                  <span>
                    {drops.count}
                    <span className="text-muted-foreground font-normal"> (max {fmtPrice(drops.maxDrop, currency)})</span>
                  </span>
                ) : (
                  "0"
                )}
              </div>
            </div>
          </div>
        )}

        {/* Price chart */}
        {chartData.length >= 2 && (
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2">Evolutie pret</div>
            <MiniPriceChart points={chartData} currency={currency} />
          </div>
        )}

        {/* Integrity flags */}
        {flags.length > 0 && (
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2">Semnale integritate</div>
            <div className="space-y-2">
              {flags.map((f) => (
                <div
                  key={f.key}
                  className={`flex items-start gap-2.5 rounded-lg px-3 py-2 text-sm ${
                    f.severity === "error"
                      ? "bg-red-50 text-red-800"
                      : f.severity === "warn"
                        ? "bg-amber-50 text-amber-800"
                        : "bg-blue-50 text-blue-800"
                  }`}
                >
                  <span className="mt-0.5 shrink-0 text-base">
                    {f.severity === "error" ? "⛔" : f.severity === "warn" ? "⚠️" : "ℹ️"}
                  </span>
                  <div className="min-w-0">
                    <div className="font-medium text-xs">{f.label}</div>
                    <div className="text-[11px] opacity-80 mt-0.5">{f.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Duplicates list */}
        {duplicates.length > 0 && (
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2">Anunturi similare detectate</div>
            <div className="space-y-1.5">
              {duplicates.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {d.sourceUrl ? (
                        <a
                          href={d.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-xs font-medium truncate max-w-[200px]"
                        >
                          {d.title || domainFromUrl(d.sourceUrl)}
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {d.title || "Anunt fara URL"}
                        </span>
                      )}
                      <span className="inline-flex items-center rounded-full bg-white border border-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                        {REASON_LABELS[d.reason] ?? d.reason}
                      </span>
                    </div>
                    {d.sourceUrl && (
                      <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                        {domainFromUrl(d.sourceUrl)}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <div
                      className={`text-xs font-semibold ${
                        d.confidence >= 80
                          ? "text-red-600"
                          : d.confidence >= 50
                            ? "text-amber-600"
                            : "text-gray-500"
                      }`}
                    >
                      {d.confidence}%
                    </div>
                    <div className="text-[10px] text-muted-foreground">incredere</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {snapshots.length === 0 && duplicates.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Nu exista inca observatii de pret pentru acest anunt.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
