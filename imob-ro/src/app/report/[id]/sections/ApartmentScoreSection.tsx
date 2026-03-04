"use client";

import ApartmentScoreCard from "@/components/score/ApartmentScoreCard";
import type { ApartmentScore } from "@/lib/score/apartmentScore";

interface Props {
  score: ApartmentScore;
  variant?: "compact" | "full";
  showActions?: boolean;
}

export default function ApartmentScoreSection({
  score,
  variant = "full",
  showActions = true,
}: Props) {
  return <ApartmentScoreCard score={score} variant={variant} showActions={showActions} />;
}
