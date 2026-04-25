import Link from "next/link";

import { ReportDisclaimer } from "@/components/common/ReportDisclaimer";
import {
  REPORT_UNLOCK_NO_REFUND_FOR_DISAGREEMENT_RO,
  REPORT_UNLOCK_REFUND_POLICY_RO,
} from "@/lib/copy/report-unlock-refund-ro";
import {
  FunnelTrackPaidUnlockSuppressed,
  FunnelTrackReportPreview,
} from "@/components/tracking/FunnelReportViews";
import { RAPORT_EXEMPLU_PATH } from "@/lib/report/sample-public-report";

import { ReportEmailCapture } from "./ReportEmailCapture";
import { UnlockReportButton } from "./UnlockReportButton";

export type PreviewTeaserKind = "above" | "inline" | "below" | "unknown";

function teaserLabel(kind: PreviewTeaserKind): string {
  switch (kind) {
    case "above":
      return "Față de semnalele disponibile, prețul pare peste zona pieței pentru acest profil.";
    case "below":
      return "Față de semnalele disponibile, prețul pare sub zona pieței pentru acest profil (ofertă sau date incomplete).";
    case "inline":
      return "Față de semnalele disponibile, prețul pare în zona pieței pentru acest profil.";
    default:
      return "Avem nevoie de mai multe date sau de o potrivire mai bună a comparabilelor pentru a poziționa concludent acest preț.";
  }
}

export function buildPreviewTeaser(opts: {
  askingEur: number | null;
  rangeLow: number | null;
  rangeMid: number | null;
  rangeHigh: number | null;
  compsCount: number;
  confidenceLevel: string | null | undefined;
  /** When false, never imply clear above/below market (data-quality gate). */
  canShowPriceVerdict?: boolean;
  canShowStrongPricePositionLanguage?: boolean;
}): { kind: PreviewTeaserKind; line: string } {
  const {
    askingEur,
    rangeLow,
    rangeHigh,
    rangeMid,
    compsCount,
    confidenceLevel,
    canShowPriceVerdict = true,
    canShowStrongPricePositionLanguage = true,
  } = opts;
  if (
    !canShowPriceVerdict ||
    !canShowStrongPricePositionLanguage ||
    confidenceLevel === "low" ||
    compsCount < 2 ||
    !askingEur ||
    !rangeMid ||
    rangeMid <= 0
  ) {
    return { kind: "unknown", line: teaserLabel("unknown") };
  }
  const spread =
    rangeLow != null && rangeHigh != null && rangeHigh > rangeLow
      ? (rangeHigh - rangeLow) / rangeMid
      : 0.12;
  const tol = Math.max(0.02, spread * 0.35);
  const ratio = askingEur / rangeMid;
  if (ratio > 1 + tol) return { kind: "above", line: teaserLabel("above") };
  if (ratio < 1 - tol) return { kind: "below", line: teaserLabel("below") };
  return { kind: "inline", line: teaserLabel("inline") };
}

export function buildPreliminarySignal(opts: {
  compsCount: number;
  confidenceLevel: string | null | undefined;
  canShowFirmAnalysis?: boolean;
}): string {
  const ok =
    (opts.canShowFirmAnalysis ?? true) &&
    opts.compsCount >= 3 &&
    (opts.confidenceLevel === "high" || opts.confidenceLevel === "medium");
  if (ok) {
    return "Avem suficiente date pentru o analiză mai utilă: comparabile și model pe zonă.";
  }
  return "Datele sunt limitate; concluziile de preț și risc au încredere redusă până deblochezi detaliile complete.";
}

type Props = {
  analysisId: string;
  title: string | null;
  askingPrice: string;
  areaLine: string;
  roomsLine: string;
  locationLine: string;
  sourcePortal: string;
  preliminarySignal: string;
  teaser: { kind: PreviewTeaserKind; line: string };
  /** Server-computed: "Deblochează raportul complet - 49 RON" */
  unlockButtonLabel: string;
  /** One line: încredere + scurt, fără certitudine statistică. */
  confidenceLine?: string;
  /** Off when `NEXT_PUBLIC_REPORT_UNLOCK_GUEST_CHECKOUT=0` and user is not signed in. */
  canUseStripeForUnlock: boolean;
  /** Commercial gate: hide 49 RON CTA when false. */
  canShowPaywall: boolean;
  /** Shown when `!canShowPaywall` (do_not_sell or weak). */
  paywallBlockMessageRo: string | null;
  /** Extra nuance for refund policy when selling "okay" tier. */
  shouldShowRefundFriendlyCopy: boolean;
  /** For analytics (suppressed funnel). */
  sellabilityTier: "strong" | "okay" | "weak" | "do_not_sell";
  /** When `NEXT_PUBLIC_LAUNCH_MODE=1`, e.g. "Preț de lansare" above the pay CTA. */
  launchPriceBadgeRo?: string | null;
};

const FULL_INCLUDES = [
  "Verdict pentru cumpărător (nu sfat juridic) și explicație pe scurt",
  "Interval de preț estimat pe modelul nostru (AVM) și pe comparabile, fără valoare oficială",
  "Listă comparabile și semnale de piață",
  "Scor de încredere al estimării, cu explicații oneste",
  "Riscuri (seismic, mediu, zonă) acolo unde există date",
  "Puncte de negociere și scrisoare scurtă pentru agent",
  "Întrebări de pus la vizionare / agent",
  "Istoric preț / duplicate, când există date",
  "Export PDF, după deblocare (cu același acces ca în raport)",
] as const;

export function ReportPreviewPanel(props: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50/90 to-white p-5 md:p-8 shadow-sm">
      <FunnelTrackReportPreview analysisId={props.analysisId} />
      <FunnelTrackPaidUnlockSuppressed
        analysisId={props.analysisId}
        sellability={props.sellabilityTier}
        active={!props.canShowPaywall}
      />
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        Previzualizare gratuită
      </p>
      <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
        {props.title || "Anunț analizat"}
      </h2>

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">Preț cerut</dt>
          <dd className="font-semibold text-slate-900">{props.askingPrice}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Suprafață</dt>
          <dd className="font-semibold text-slate-900">{props.areaLine}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Camere</dt>
          <dd className="font-semibold text-slate-900">{props.roomsLine}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Zonă / locație</dt>
          <dd className="font-semibold text-slate-900">{props.locationLine}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-slate-500">Portal sursă</dt>
          <dd className="font-semibold text-slate-900">{props.sourcePortal}</dd>
        </div>
      </dl>

      <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-blue-950">
        <p className="font-medium">Semnal preliminar</p>
        <p className="mt-1 text-blue-900/90">{props.preliminarySignal}</p>
      </div>

      <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/50 px-4 py-3 text-sm text-amber-950">
        <p className="font-medium">Direcție de preț (fără cifre complete)</p>
        <p className="mt-1 text-amber-900/90">{props.teaser.line}</p>
      </div>

      {props.confidenceLine ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-3 text-sm text-slate-800">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Calitatea datelor
          </p>
          <p className="mt-1 leading-relaxed">{props.confidenceLine}</p>
        </div>
      ) : null}

      <div className="mt-6">
        <p className="text-sm font-semibold text-slate-900">Raportul complet îți arată estimarea de preț, comparabilele, riscurile și argumentele de negociere.</p>
        <div className="mt-2 text-sm text-slate-600">
          <ReportDisclaimer className="!text-sm !text-slate-600" />
        </div>
        <ul className="mt-4 list-inside list-disc space-y-1.5 text-sm text-slate-700">
          {FULL_INCLUDES.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-slate-600">
          <Link
            href={RAPORT_EXEMPLU_PATH}
            className="font-medium text-primary underline underline-offset-4"
          >
            Vezi un raport complet exemplu
          </Link>{" "}
          (demonstrativ, fără plată), ca să știi cum arată layoutul după deblocare.
        </p>
      </div>

      <div className="mt-8 border-t border-slate-200 pt-6">
        {props.canShowPaywall ? (
          <>
            <p className="mb-4 text-xs leading-relaxed text-slate-600">
              {REPORT_UNLOCK_REFUND_POLICY_RO} {REPORT_UNLOCK_NO_REFUND_FOR_DISAGREEMENT_RO} Mai multe
              detalii la{" "}
              <Link href="/pricing" className="font-medium text-primary underline underline-offset-2">
                prețuri și întrebări frecvente
              </Link>
              .
            </p>
            {props.shouldShowRefundFriendlyCopy ? (
              <p className="mb-4 text-xs leading-relaxed text-amber-900/90 rounded-lg border border-amber-100 bg-amber-50/80 px-3 py-2">
                Datele pentru acest anunț sunt limitate: raportul plătit rămâne util ca reper, dar
                precizia absolută nu e realistă. Citește politica de rambursare de mai sus înainte de
                plată.
              </p>
            ) : null}
            {props.launchPriceBadgeRo ? (
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                {props.launchPriceBadgeRo}
              </p>
            ) : null}
            <UnlockReportButton
              analysisId={props.analysisId}
              buttonLabel={props.unlockButtonLabel}
              canUseStripeForUnlock={props.canUseStripeForUnlock}
            />
          </>
        ) : (
          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50/90 px-4 py-3 text-sm text-slate-800">
            <p className="font-medium text-slate-900">Raport complet plătit indisponibil</p>
            <p className="mt-1.5 leading-relaxed text-slate-700">
              {props.paywallBlockMessageRo ??
                "Nu avem suficiente date pentru un raport complet plătit pe acest anunț."}
            </p>
          </div>
        )}
        <div className="mt-8 rounded-xl border border-slate-200/90 bg-slate-50/60 p-4 md:p-5">
          <ReportEmailCapture analysisId={props.analysisId} />
        </div>
      </div>
    </div>
  );
}
