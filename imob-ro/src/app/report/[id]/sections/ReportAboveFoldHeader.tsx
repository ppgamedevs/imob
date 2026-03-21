import type { ExecutiveVerdict } from "@/lib/report/verdict";

import ReportDecisionBlock from "./ReportDecisionBlock";
import ReportProsConsSection from "./ReportProsConsSection";
import ReportTldrStrip, { type TldrItem } from "./ReportTldrStrip";

export interface ReportAboveFoldHeaderProps {
  verdict: ExecutiveVerdict;
  propertyTitle: string | null;
  askingPrice: number | null;
  currency: string;
  priceSecondaryLine?: string | null;
  hasPlusTVA?: boolean;
  priceTrustLine: string;
  riskImpactLine: string;
  confidenceNarrative: string;
  tldrItems: TldrItem[];
  pros: string[];
  cons: string[];
}

/**
 * Layer 1–3: decision header (full width) → Pe scurt → pro / contra.
 * Price blocks + score sit below this band (page).
 */
export default function ReportAboveFoldHeader({
  verdict,
  propertyTitle,
  askingPrice,
  currency,
  priceSecondaryLine,
  hasPlusTVA,
  priceTrustLine,
  riskImpactLine,
  confidenceNarrative,
  tldrItems,
  pros,
  cons,
}: ReportAboveFoldHeaderProps) {
  return (
    <div className="space-y-6 md:space-y-7">
      <ReportDecisionBlock
        verdict={verdict}
        propertyTitle={propertyTitle}
        askingPrice={askingPrice}
        currency={currency}
        priceSecondaryLine={priceSecondaryLine}
        hasPlusTVA={hasPlusTVA}
        priceTrustLine={priceTrustLine}
        riskImpactLine={riskImpactLine}
        confidenceNarrative={confidenceNarrative}
      />
      <ReportTldrStrip items={tldrItems} maxItems={4} />
      <ReportProsConsSection pros={pros} cons={cons} maxEach={5} />
    </div>
  );
}
