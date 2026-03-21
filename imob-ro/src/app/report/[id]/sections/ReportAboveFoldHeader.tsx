import ApartmentScoreCard from "@/components/score/ApartmentScoreCard";
import type { ApartmentScore } from "@/lib/score/apartmentScore";
import type { ExecutiveVerdict } from "@/lib/report/verdict";

import ReportDecisionBlock from "./ReportDecisionBlock";
import ReportProsConsSection from "./ReportProsConsSection";
import ReportTldrStrip from "./ReportTldrStrip";

export interface ReportAboveFoldHeaderProps {
  verdict: ExecutiveVerdict;
  propertyTitle: string | null;
  askingPrice: number | null;
  currency: string;
  priceSecondaryLine?: string | null;
  hasPlusTVA?: boolean;
  priceTrustLine: string;
  riskImpactLine: string;
  apartmentScore: ApartmentScore;
  scoreLabel: string;
  tldrLines: string[];
  pros: string[];
  cons: string[];
}

/**
 * Above-the-fold decision layer: verdict (dominant) + score, then TLDR + pro/contra full width.
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
  apartmentScore,
  scoreLabel,
  tldrLines,
  pros,
  cons,
}: ReportAboveFoldHeaderProps) {
  return (
    <div className="space-y-5 md:space-y-6">
      <div className="grid gap-5 lg:grid-cols-12 lg:gap-8 lg:items-stretch">
        <div className="lg:col-span-7 min-w-0">
          <ReportDecisionBlock
            verdict={verdict}
            propertyTitle={propertyTitle}
            askingPrice={askingPrice}
            currency={currency}
            priceSecondaryLine={priceSecondaryLine}
            hasPlusTVA={hasPlusTVA}
            priceTrustLine={priceTrustLine}
            riskImpactLine={riskImpactLine}
          />
        </div>
        <div className="lg:col-span-5 min-w-0 flex">
          <div className="w-full min-h-[min(100%,320px)]">
            <ApartmentScoreCard
              score={apartmentScore}
              variant="reportHeader"
              showActions={false}
              scoreLabel={scoreLabel}
            />
          </div>
        </div>
      </div>

      <ReportTldrStrip lines={tldrLines} maxLines={4} />
      <ReportProsConsSection pros={pros} cons={cons} maxEach={5} />
    </div>
  );
}
