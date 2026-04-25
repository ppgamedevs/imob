import type { SVGProps } from "react";

import { cn } from "@/lib/utils";

/**
 * Stea cu 5 vârfuri, centrată lângă origine; galben-aur ofițial pentru drapelul UE: #FFCC00.
 * (Baza geometrică: steagul european / manual CEC)
 */
/** Contur (Lucide) scalat pe 24×24 — stea umplută, centru ~ 12,12. */
const EU_STAR_PATH_24 =
  "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";

type LogoProps = SVGProps<SVGSVGElement> & { title?: string };

/**
 * ANPC (Autoritatea Națională pentru Protecția Consumatorilor) — dungi tricolor + siglă.
 * Nu e reproducere exactă a mărcii, dar e aliniat vizual pe materialele publice.
 */
export function AnpcLogo({ className, title = "ANPC", ...p }: LogoProps) {
  return (
    <svg
      className={cn("shrink-0", className)}
      viewBox="0 0 120 32"
      role="img"
      aria-label={title}
      {...p}
    >
      <title>{title}</title>
      <rect x="0" y="2" width="3.5" height="28" fill="#002B7F" />
      <rect x="3.5" y="2" width="3.5" height="28" fill="#FCD116" />
      <rect x="7" y="2" width="3.5" height="28" fill="#CE1126" />
      <text
        x="16"
        y="23"
        fill="#0d4f2d"
        fontFamily="system-ui, Segoe UI, Roboto, sans-serif"
        fontSize="20"
        fontWeight="800"
        letterSpacing="-0.5"
      >
        ANPC
      </text>
    </svg>
  );
}

/**
 * ODR (Online Dispute Resolution) — prezență vizuală tip „Comisia Europeană” (steag UE) + ODR
 */
export function OdrLogo({ className, title = "ODR", ...p }: LogoProps) {
  return (
    <svg
      className={cn("shrink-0", className)}
      viewBox="0 0 140 32"
      role="img"
      aria-label={title}
      {...p}
    >
      <title>{title}</title>
      <rect x="0" y="0" width="32" height="32" fill="#003399" rx="2" />
      {Array.from({ length: 12 }, (_, i) => (
        <g
          key={i}
          transform={`translate(16,16) rotate(${i * 30 - 90}) translate(0,-8.1) scale(0.36) translate(-12,-12)`}
        >
          <path d={EU_STAR_PATH_24} fill="#FFCC00" />
        </g>
      ))}
      <text
        x="38"
        y="20.5"
        fill="#003399"
        fontFamily="system-ui, Segoe UI, Roboto, sans-serif"
        fontSize="15"
        fontWeight="800"
        letterSpacing="0.1em"
      >
        ODR
      </text>
    </svg>
  );
}

/**
 * ANAF — aproximare a siglei albastre (culoare apropiată de #0c4a8e / #0052a5) folosită pe anaf.ro
 */
export function AnafLogo({ className, title = "ANAF", ...p }: LogoProps) {
  return (
    <svg
      className={cn("shrink-0", className)}
      viewBox="0 0 100 32"
      role="img"
      aria-label={title}
      {...p}
    >
      <title>{title}</title>
      <rect x="0" y="2" width="100" height="28" fill="#0c4a8e" rx="3" />
      <text
        x="50"
        y="22.5"
        textAnchor="middle"
        fill="white"
        fontFamily="system-ui, Segoe UI, Roboto, sans-serif"
        fontSize="16"
        fontWeight="800"
        letterSpacing="0.1em"
      >
        ANAF
      </text>
    </svg>
  );
}

/**
 * UE / instituții comunitare — drapelul UE (12 stele pe fundal albastru) + etichetă scurtă
 */
export function EuInstitutionsLogo({ className, title = "Uniunea Europeană", ...p }: LogoProps) {
  return (
    <svg
      className={cn("shrink-0", className)}
      viewBox="0 0 72 32"
      role="img"
      aria-label={title}
      {...p}
    >
      <title>{title}</title>
      <rect x="0" y="0" width="32" height="32" fill="#003399" rx="2" />
      {Array.from({ length: 12 }, (_, i) => (
        <g
          key={i}
          transform={`translate(16,16) rotate(${i * 30 - 90}) translate(0,-8.1) scale(0.36) translate(-12,-12)`}
        >
          <path d={EU_STAR_PATH_24} fill="#FFCC00" />
        </g>
      ))}
      <text
        x="40"
        y="21"
        fill="#003399"
        fontFamily="system-ui, Segoe UI, Roboto, sans-serif"
        fontSize="16"
        fontWeight="800"
        letterSpacing="0.1em"
      >
        UE
      </text>
    </svg>
  );
}

export const complianceLogoById = {
  anpc: AnpcLogo,
  odr: OdrLogo,
  anaf: AnafLogo,
  eu: EuInstitutionsLogo,
} as const;
