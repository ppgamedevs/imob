import RiskStackSection from "../sections/RiskStackSection";

export interface RiskCardProps {
  seismicClass: "RS1" | "RS2" | "RS3" | "none";
  confidence?: number; // 0-1
  source?: string; // e.g., "MDRAP 2023"
  sourceUrl?: string;
  yearBuilt?: number;
  hasConsolidation?: boolean;
  additionalInfo?: string;
}

export default function RiskCard({
  seismicClass,
  confidence,
  source = "MDRAP",
  sourceUrl,
  hasConsolidation,
  additionalInfo,
}: RiskCardProps) {
  const riskClass =
    seismicClass === "RS1"
      ? "RsI"
      : seismicClass === "RS2"
        ? "RsII"
        : seismicClass === "RS3"
          ? "RsIII"
          : "None";

  return (
    <RiskStackSection
      seismicExplain={{
        riskClass,
        confidence: confidence ?? null,
        source: source ?? null,
        sourceUrl: sourceUrl ?? null,
        intervention:
          hasConsolidation === true ? "consolidat" : hasConsolidation === false ? "neconfirmat" : null,
        note: additionalInfo ?? null,
      }}
    />
  );
}
