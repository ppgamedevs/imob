import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * One-liner; full disclaimer is in ReportDisclaimer (report, PDF, pricing, metodologie).
 */
type Props = { variant?: "default" | "compact"; className?: string };

const DEFAULT =
  "ImobIntel oferă o estimare orientativă și semnale de piață, nu o evaluare autorizată sau consiliere juridică. Rezultatele depind de anunțuri și de datele disponibile; folosește raportul la negociere și filtrare, alături de verificări la notar, cadastru sau specialist când e cazul.";

const COMPACT =
  "Analiză orientativă, nu evaluare ANEVAR, expertiză sau verificare juridică. Baza: anunțuri și surse publice.";

export function BuyerReportTrustNote({ variant = "default", className = "" }: Props) {
  const text = variant === "compact" ? COMPACT : DEFAULT;
  return (
    <div className={cn("text-[12px] leading-relaxed text-gray-500", className)} role="note">
      <p>{text}</p>
      <p className="mt-1.5">
        <Link href="/date-si-metodologie" className="text-blue-600/90 hover:underline">
          De unde vin datele?
        </Link>
      </p>
    </div>
  );
}
