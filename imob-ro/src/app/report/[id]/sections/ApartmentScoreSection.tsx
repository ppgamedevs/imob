"use client";

import ApartmentScoreCard from "@/components/score/ApartmentScoreCard";
import type { ApartmentScore } from "@/lib/score/apartmentScore";

interface Props {
  score: ApartmentScore;
  variant?: "compact" | "full" | "reportHeader";
  showActions?: boolean;
  scoreLabel?: string;
}

export default function ApartmentScoreSection({
  score,
  variant = "full",
  showActions = true,
  scoreLabel = "Scor apartament",
}: Props) {
  return <ApartmentScoreCard score={score} variant={variant} showActions={showActions} scoreLabel={scoreLabel} />;
}
