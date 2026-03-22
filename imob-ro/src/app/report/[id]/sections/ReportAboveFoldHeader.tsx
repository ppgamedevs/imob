import type { ExecutiveVerdict } from "@/lib/report/verdict";

import ReportDecisionBlock from "./ReportDecisionBlock";
import ReportProsConsSection from "./ReportProsConsSection";
import ReportQuickMetricsStrip, { type QuickMetricItem } from "./ReportQuickMetricsStrip";

export interface ReportAboveFoldHeaderProps {
  verdict: ExecutiveVerdict;
  /** Location + typology (decision title) */
  propertyTitle: string | null;
  askingPrice: number | null;
  currency: string;
  priceSecondaryLine?: string | null;
  hasPlusTVA?: boolean;
  eurPerM2?: number | null;
  areaM2?: number | null;
  sellerType?: string | null;
  pricePositionLabel?: string | null;
  quickMetrics: QuickMetricItem[];
  pros: string[];
  cons: string[];
}

/**
 * Layer 1: decision header + quick metrics + pro / contra (max bullets capped in section).
 */
export default function ReportAboveFoldHeader({
  verdict,
  propertyTitle,
  askingPrice,
  currency,
  priceSecondaryLine,
  hasPlusTVA,
  eurPerM2,
  areaM2,
  sellerType,
  pricePositionLabel,
  quickMetrics,
  pros,
  cons,
}: ReportAboveFoldHeaderProps) {
  return (
    <div className="space-y-4 md:space-y-5">
      <ReportDecisionBlock
        verdict={verdict}
        propertyTitle={propertyTitle}
        askingPrice={askingPrice}
        currency={currency}
        priceSecondaryLine={priceSecondaryLine}
        hasPlusTVA={hasPlusTVA}
        eurPerM2={eurPerM2}
        areaM2={areaM2}
        sellerType={sellerType}
        pricePositionLabel={pricePositionLabel}
      />
      <ReportQuickMetricsStrip items={quickMetrics} />
      <ReportProsConsSection pros={pros} cons={cons} maxEach={3} />
    </div>
  );
}
