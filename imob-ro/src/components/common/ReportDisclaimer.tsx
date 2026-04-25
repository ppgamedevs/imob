import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * ImobIntel standard legal/accuracy disclaimer (Romanian, buyer report).
 * Core sentence set by product; supplement clarifies scope without scaring off users.
 */
export const REPORT_DISCLAIMER_RO =
  "ImobIntel oferă o analiză orientativă pe baza datelor disponibile din anunțuri, comparabile și surse publice. Raportul nu este evaluare ANEVAR, expertiză tehnică, verificare juridică sau garanție privind prețul final de tranzacționare.";

const REPORT_DISCLAIMER_SUPPLEMENT =
  " Nu înlocuiește o evaluare autorizată, verificarea juridică la dosar sau confirmarea situației din cadastru. Folosește raportul ca instrument de negociere și filtrare, pe lângă alte verificări.";

/** Full text for web and PDF. */
export const REPORT_DISCLAIMER_FULL = REPORT_DISCLAIMER_RO + REPORT_DISCLAIMER_SUPPLEMENT;

type Props = {
  /** default: body text; legal: same with slightly more emphasis; pdfPlain: for react-pdf Text children */
  variant?: "default" | "legal" | "pdfPlain";
  className?: string;
};

export function ReportDisclaimer({ variant = "default", className }: Props) {
  if (variant === "pdfPlain") {
    return <>{REPORT_DISCLAIMER_FULL}</>;
  }
  if (variant === "legal") {
    return (
      <div
        className={cn(
          "rounded-lg border border-slate-200/90 bg-slate-50/80 px-4 py-3 text-[12px] leading-relaxed text-slate-800",
          className,
        )}
        role="note"
      >
        <p>{REPORT_DISCLAIMER_FULL}</p>
        <p className="mt-2 text-[12px]">
          <Link
            href="/date-si-metodologie"
            className="font-medium text-blue-600 hover:underline"
          >
            De unde vin datele? (transparență surse și limite)
          </Link>
        </p>
      </div>
    );
  }
  return (
    <div
      className={cn("text-[12px] leading-relaxed text-slate-600", className)}
      role="note"
    >
      <p>{REPORT_DISCLAIMER_FULL}</p>
      <p className="mt-2">
        <Link
          href="/date-si-metodologie"
          className="font-medium text-blue-600 hover:underline"
        >
          De unde vin datele? (transparență surse și limite)
        </Link>
      </p>
    </div>
  );
}
