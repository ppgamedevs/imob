"use client";

import { REPORT_DISCLAIMER_FULL } from "@/components/common/ReportDisclaimer";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), {
  ssr: false,
  loading: () => (
    <div className="h-[220px] rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
    </div>
  ),
});

const NeighborhoodIntelV2Lazy = dynamic(
  () => import("@/components/geo/NeighborhoodIntelV2"),
  { ssr: false },
);

import AddressAutocomplete from "@/components/AddressAutocomplete";
import ApartmentScoreCard from "@/components/score/ApartmentScoreCard";
import PhotoUpload from "@/components/PhotoUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { computeApartmentScore, type ApartmentScoreInput } from "@/lib/score/apartmentScore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// ===================================================================
// Types
// ===================================================================

interface FormData {
  address: string;
  zona: string;
  sector: string;
  suprafata: string;
  camere: string;
  etaj: string;
  etajTotal: string;
  anConstructie: string;
  stare: string;
  parcare: string;
}

interface ApiComp {
  id: string;
  url?: string;
  priceEur: number;
  pricePerSqm: number;
  distanceMeters: number;
  similarityScore: number;
  source?: string;
}

interface ApiAdjustment {
  name: string;
  deltaPct: number;
  reason: string;
}

interface ApiResult {
  fairLikely: number;
  range80: { min: number; max: number };
  range95: { min: number; max: number };
  confidence: number;
  confidenceWhy?: string[];
  comps: ApiComp[];
  adjustments: ApiAdjustment[];
  liquidity: { daysMin?: number; daysMax?: number; label: string; why?: string };
  recommendations: { title: string; impactEurMin: number; impactEurMax: number; why: string }[];
  risks: { type: string; severity: string; details: string }[];
  tightenTips: { field: string; tip: string }[];
  meta: {
    compsCount: number;
    dispersion: number;
    usedRadiusMeters?: number;
    limits?: {
      freeCompsReturned: number;
      proCompsReturned: number;
      totalCompsAvailable: number;
      paywallActive: boolean;
    };
  };
  visionAnalysis?: {
    condition: string;
    furnishing: string;
    brightness: number;
    layoutQuality: string | null;
    visibleIssues: string[];
    confidence: number;
    evidence: string;
  };
}

// ===================================================================
// Zone config (with approximate center coordinates for API)
// ===================================================================

const INITIAL_FORM: FormData = {
  address: "",
  zona: "",
  sector: "",
  suprafata: "",
  camere: "2",
  etaj: "",
  etajTotal: "",
  anConstructie: "",
  stare: "locuibil",
  parcare: "nu",
};

const SECTORS = ["1", "2", "3", "4", "5", "6"];

interface ZoneConfig {
  lat: number;
  lng: number;
}

const ZONE_MAP: Record<string, ZoneConfig> = {
  Militari: { lat: 44.43, lng: 26.01 },
  "Drumul Taberei": { lat: 44.42, lng: 26.03 },
  "Titan / Berceni": { lat: 44.41, lng: 26.15 },
  "Dristor / Vitan": { lat: 44.42, lng: 26.13 },
  "Rahova / 13 Septembrie": { lat: 44.42, lng: 26.08 },
  "Colentina / Obor": { lat: 44.46, lng: 26.13 },
  "Pajura / Bucurestii Noi": { lat: 44.48, lng: 26.07 },
  "Floreasca / Dorobanti": { lat: 44.46, lng: 26.09 },
  "Aviatorilor / Primaverii": { lat: 44.46, lng: 26.08 },
  "Pipera / Aviatiei": { lat: 44.48, lng: 26.1 },
  "Tineretului / Brancoveanu": { lat: 44.41, lng: 26.1 },
  "Unirii / Universitate": { lat: 44.43, lng: 26.1 },
  "Iancului / Pantelimon": { lat: 44.44, lng: 26.14 },
  "Crangasi / Giulesti": { lat: 44.45, lng: 26.04 },
  "Aparatorii Patriei": { lat: 44.39, lng: 26.13 },
  "Prelungirea Ghencea": { lat: 44.41, lng: 26.03 },
  "Alta zona": { lat: 44.43, lng: 26.1 },
};

const ZONE_NAMES = Object.keys(ZONE_MAP);

// ===================================================================
// Helpers
// ===================================================================

function fmt(n: number) {
  return n.toLocaleString("ro-RO");
}

function validate(form: FormData, pinLat: number | null): Record<string, string> {
  const errs: Record<string, string> = {};
  if (!form.zona && pinLat == null) errs.zona = "Selecteaza zona sau introdu adresa";
  const area = parseFloat(form.suprafata);
  if (!form.suprafata) errs.suprafata = "Introdu suprafata";
  else if (isNaN(area) || area < 10) errs.suprafata = "Minim 10 mp";
  else if (area > 500) errs.suprafata = "Maxim 500 mp";
  return errs;
}

function buildApiPayload(form: FormData, pinLat: number | null, pinLng: number | null, photos: string[]) {
  const zone = ZONE_MAP[form.zona];
  const floor = parseInt(form.etaj, 10);
  const totalFloors = parseInt(form.etajTotal, 10);
  const year = parseInt(form.anConstructie, 10);

  return {
    lat: pinLat ?? zone?.lat,
    lng: pinLng ?? zone?.lng,
    zoneSlug: form.zona,
    rooms: parseInt(form.camere, 10) || 2,
    usableAreaM2: parseFloat(form.suprafata),
    floor: isNaN(floor) ? undefined : floor,
    totalFloors: isNaN(totalFloors) || totalFloors < 1 ? undefined : totalFloors,
    yearBuilt: isNaN(year) || year < 1800 ? undefined : year,
    condition: form.stare as "nou" | "renovat" | "locuibil" | "necesita_renovare" | "de_renovat",
    hasParking: form.parcare === "da" ? true : form.parcare === "nu" ? false : undefined,
    photos: photos.length > 0 ? photos : undefined,
  };
}

// ===================================================================
// Result sections
// ===================================================================

function LoadingSkeleton() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4 text-center">
        <p className="text-sm font-semibold text-gray-700">Analizam apartamentul tau...</p>
        <p className="text-xs text-gray-400">
          Cautam comparabile in zona si calculam intervalul de pret.
        </p>
        <Skeleton className="h-14 w-48 mx-auto" />
        <Skeleton className="h-3 w-full" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-3">
        <Skeleton className="h-5 w-40" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
      <Skeleton className="h-24 rounded-2xl" />
    </div>
  );
}

function ErrorMessage({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center space-y-3">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
        <svg
          className="h-6 w-6 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      </div>
      <p className="text-sm font-medium text-red-800">{message}</p>
      <Button
        variant="outline"
        size="sm"
        onClick={onRetry}
        className="text-red-700 border-red-300 hover:bg-red-100"
      >
        Incearca din nou
      </Button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[420px] rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-8 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
        <svg
          className="h-7 w-7 text-blue-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 7.5h.008v.008h-.008v-.008z"
          />
        </svg>
      </div>
      <h3 className="text-[15px] font-semibold text-gray-700">Completeaza formularul</h3>
      <p className="mt-1.5 text-sm text-gray-400 max-w-[280px]">
        Aceste informatii sunt suficiente pentru o estimare initiala. Cu cat adaugi mai multe
        detalii, cu atat rezultatul este mai precis.
      </p>
    </div>
  );
}

// -- Section 1: Executive cards --

function ExecutiveCards({ data }: { data: ApiResult }) {
  const confColor =
    data.confidence >= 65
      ? "text-emerald-600"
      : data.confidence >= 35
        ? "text-amber-600"
        : "text-red-500";
  const confBg =
    data.confidence >= 65
      ? "bg-emerald-500"
      : data.confidence >= 35
        ? "bg-amber-500"
        : "bg-red-400";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-lg shadow-gray-100/80 overflow-hidden">
      {/* Section title */}
      <div className="px-6 pt-5 pb-0">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
          Estimare pret de vanzare
        </p>
      </div>

      {/* Main price */}
      <div className="p-6 pb-4 text-center bg-gradient-to-b from-blue-50/60 to-white">
        <div className="text-[11px] font-semibold text-blue-600 uppercase tracking-widest">
          Cel mai probabil
        </div>
        <div className="mt-1 text-[46px] leading-none font-extrabold tracking-tight text-gray-950">
          {fmt(data.fairLikely)}
          <span className="text-[20px] font-semibold text-gray-400 ml-1">EUR</span>
        </div>
        <p className="mt-1.5 text-[11px] text-gray-400 max-w-[320px] mx-auto">
          Pretul cel mai probabil la care s-ar putea vinde apartamentul tau in conditiile actuale de
          piata.
        </p>
        {data.meta.compsCount > 0 && data.meta.usedRadiusMeters ? (
          <div className="mt-2 text-xs font-medium text-blue-600/80">
            Se bazeaza pe {data.meta.compsCount} comparabile in raza de {data.meta.usedRadiusMeters}
            m
          </div>
        ) : data.meta.compsCount > 0 ? (
          <div className="mt-2 text-xs text-gray-400">
            Bazat pe {data.meta.compsCount} proprietati comparabile
          </div>
        ) : null}
      </div>

      {/* Negotiation closing price */}
      {data.confidence >= 50 && (
        <div className="mx-6 mb-4 rounded-lg border border-emerald-100 bg-emerald-50/60 px-4 py-2.5 text-center">
          <p className="text-[10px] font-semibold text-emerald-700/70 uppercase tracking-wide">
            Pret estimat de inchidere (dupa negociere)
          </p>
          <p className="text-lg font-extrabold text-emerald-700">
            {fmt(Math.round(data.fairLikely * 0.96))} EUR
          </p>
        </div>
      )}

      {/* Range 80% */}
      <div className="px-6 pb-5 pt-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 mb-2 cursor-help">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                Interval realist (80%)
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[260px]">
            In majoritatea cazurilor similare, apartamentele se vand in acest interval.
          </TooltipContent>
        </Tooltip>
        <div className="relative h-2.5 rounded-full bg-gray-100">
          <div
            className="absolute inset-y-0 rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
            style={{
              left: `${Math.max(0, ((data.range80.min - data.range95.min) / Math.max(1, data.range95.max - data.range95.min)) * 100)}%`,
              right: `${Math.max(0, ((data.range95.max - data.range80.max) / Math.max(1, data.range95.max - data.range95.min)) * 100)}%`,
            }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-xs">
          <span className="font-semibold text-gray-700">{fmt(data.range80.min)} EUR</span>
          <span className="font-semibold text-gray-700">{fmt(data.range80.max)} EUR</span>
        </div>
      </div>

      {/* Range 95% (conservative) */}
      <div className="px-6 pb-5 pt-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 mb-1.5 cursor-help">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                Interval conservator (95%)
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[260px]">
            Interval mai larg care acopera aproape toate scenariile posibile.
          </TooltipContent>
        </Tooltip>
        <div className="flex justify-between text-xs text-gray-500">
          <span>{fmt(data.range95.min)} EUR</span>
          <span>{fmt(data.range95.max)} EUR</span>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="px-6 pb-5 border-t border-gray-100 pt-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-between mb-2 cursor-help">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                Increderea estimarii
              </span>
              <span className={`text-sm font-bold ${confColor}`}>{data.confidence}%</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[280px]">
            Mai multe comparabile + informatii complete = estimare mai precisa.
          </TooltipContent>
        </Tooltip>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${confBg}`}
            style={{ width: `${data.confidence}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] text-gray-400 leading-snug">
          Scorul reflecta cate comparabile similare exista si cat de apropiate sunt de apartamentul
          tau.
        </p>
        {data.confidenceWhy && data.confidenceWhy.length > 0 && (
          <ul className="mt-2 space-y-1">
            {data.confidenceWhy.map((reason, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] text-gray-500">
                <span className="mt-0.5 h-1 w-1 flex-shrink-0 rounded-full bg-gray-300" />
                {reason}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// -- Section 2: Comps evidence --

function CompRow({ c, i }: { c: ApiComp; i: number }) {
  return (
    <div className="py-2.5 flex items-center gap-3 text-sm">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-[11px] font-bold text-blue-600">
        {i + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900">{fmt(c.priceEur)} EUR</span>
          <span className="text-xs text-gray-400">{fmt(c.pricePerSqm)} EUR/mp</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
          <span>{c.distanceMeters}m distanta</span>
          <span className="text-gray-300">·</span>
          <span>Scor: {c.similarityScore}%</span>
          {c.source && (
            <>
              <span className="text-gray-300">·</span>
              <span>{c.source}</span>
            </>
          )}
        </div>
      </div>
      {c.url && (
        <a
          href={c.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 text-blue-500 hover:text-blue-700 transition-colors"
          title="Vezi anunt"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      )}
    </div>
  );
}

function CompsSection({
  comps,
  limits,
}: {
  comps: ApiComp[];
  limits?: ApiResult["meta"]["limits"];
}) {
  if (comps.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/40 p-5 text-center space-y-2">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
          <svg
            className="h-5 w-5 text-amber-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>
        <p className="text-sm font-semibold text-amber-800">
          Pune pin pe harta pentru comparabile exacte
        </p>
        <p className="text-xs text-amber-600">
          Plaseaza un pin pe harta din formular ca sa gasim apartamente similare din zona si sa
          obtii o estimare mult mai precisa.
        </p>
      </div>
    );
  }

  const paywallActive = limits?.paywallActive ?? false;
  const totalAvailable = limits?.totalCompsAvailable ?? comps.length;
  const proCount = limits?.proCompsReturned ?? 20;
  const hiddenCount = paywallActive ? Math.max(0, totalAvailable - comps.length) : 0;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900">Apartamente similare din zona</h3>
          <span className="text-[11px] text-gray-400">
            {comps.length}
            {hiddenCount > 0 ? ` din ${totalAvailable}` : ""} proprietati
          </span>
        </div>
        <p className="text-[11px] text-gray-400 mt-0.5">
          Aceste anunturi au fost folosite pentru a calcula estimarea. Comparabilele sunt selectate
          dupa distanta, suprafata si configuratie.
        </p>
      </div>

      <div className="divide-y divide-gray-100">
        {comps.map((c, i) => (
          <CompRow key={c.id + i} c={c} i={i} />
        ))}
      </div>

      {paywallActive && hiddenCount > 0 && (
        <div className="relative mt-1">
          {/* Blurred placeholder rows */}
          <div className="space-y-1 select-none" aria-hidden>
            {Array.from({ length: Math.min(hiddenCount, 3) }).map((_, i) => (
              <div key={i} className="py-2.5 flex items-center gap-3 blur-[6px] opacity-50">
                <div className="w-7 h-7 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-1">
                  <div className="h-3.5 w-32 rounded bg-gray-200" />
                  <div className="h-2.5 w-48 rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>

          {/* Overlay CTA */}
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-white/40 via-white/80 to-white rounded-xl">
            <div className="text-center px-4">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
                <svg
                  className="h-5 w-5 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <p className="text-sm font-bold text-gray-900">
                Deblocheaza {proCount} comparabile + PDF
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Inca {hiddenCount} proprietati similare disponibile
              </p>
              <Link
                href="/analyze"
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-blue-200/50 hover:shadow-lg hover:brightness-110 transition-all"
              >
                Vezi raport complet
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// -- Section 3: Adjustments --

function AdjustmentsSection({ adjustments }: { adjustments: ApiAdjustment[] }) {
  if (adjustments.length === 0) return null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
      <div>
        <h3 className="text-sm font-bold text-gray-900">Cum am calculat estimarea</h3>
        <p className="text-[11px] text-gray-400 mt-0.5">
          Ajustari aplicate fata de media comparabilelor.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {adjustments.map((a, i) => {
          const positive = a.deltaPct > 0;
          const chipClass = positive
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : "bg-red-50 text-red-600 border-red-200";
          return (
            <Tooltip key={a.name + i}>
              <TooltipTrigger asChild>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium cursor-help ${chipClass}`}
                >
                  {a.name}
                  <span className="font-bold">
                    {positive ? "+" : ""}
                    {a.deltaPct}%
                  </span>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[240px]">
                {a.reason}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

// -- Section 4: Liquidity --

function LiquiditySection({ liquidity }: { liquidity: ApiResult["liquidity"] }) {
  const labelConfig: Record<string, { text: string; color: string }> = {
    ridicata: {
      text: "Cerere ridicata in zona",
      color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    },
    medie: {
      text: "Piata echilibrata",
      color: "text-amber-600 bg-amber-50 border-amber-200",
    },
    scazuta: {
      text: "Cerere scazuta momentan",
      color: "text-red-600 bg-red-50 border-red-200",
    },
    necunoscuta: {
      text: "Lichiditate necunoscuta",
      color: "text-gray-500 bg-gray-50 border-gray-200",
    },
  };
  const cfg = labelConfig[liquidity.label] ?? labelConfig.necunoscuta;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-bold text-gray-900 mb-3">
        Cat de repede se vand apartamentele similare
      </h3>
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${cfg.color}`}
        >
          {cfg.text}
        </span>
      </div>
      {liquidity.daysMin != null && liquidity.daysMax != null && (
        <p className="mt-2.5 text-sm text-gray-600">
          In aceasta zona, apartamentele similare se vand in medie in{" "}
          <span className="font-semibold">
            {liquidity.daysMin}–{liquidity.daysMax} zile
          </span>
          .
        </p>
      )}
      {liquidity.why && (
        <p className="mt-1.5 text-[11px] text-gray-400 leading-snug">{liquidity.why}</p>
      )}
    </div>
  );
}

// -- Section 5: Recommendations --

function RecommendationsSection({ recs }: { recs: ApiResult["recommendations"] }) {
  if (recs.length === 0) return null;
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
      <h3 className="text-sm font-bold text-gray-900">
        Ce poti face pentru a obtine un pret mai bun
      </h3>
      <div className="space-y-2">
        {recs.map((r, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-blue-50/50 to-transparent border border-blue-100/60"
          >
            <div className="flex-shrink-0 mt-0.5 h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
              <svg
                className="h-3.5 w-3.5 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-900">{r.title}</div>
              <div className="text-xs text-gray-500 mt-0.5">{r.why}</div>
              <div className="mt-1 text-xs font-semibold text-blue-600">
                +{fmt(r.impactEurMin)} – {fmt(r.impactEurMax)} EUR potential
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// -- Section 6: Risks --

function RisksSection({ risks }: { risks: ApiResult["risks"] }) {
  if (risks.length === 0) return null;

  const sevConfig: Record<string, string> = {
    high: "bg-red-50 text-red-700 border-red-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    low: "bg-gray-50 text-gray-600 border-gray-200",
  };
  const sevLabel: Record<string, string> = {
    high: "Ridicat",
    medium: "Mediu",
    low: "Scazut",
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
      <h3 className="text-sm font-bold text-gray-900">Factori care pot influenta pretul</h3>
      <div className="space-y-2">
        {risks.map((r, i) => (
          <div key={i} className="flex items-start gap-3 py-2">
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${sevConfig[r.severity] ?? sevConfig.low}`}
            >
              {sevLabel[r.severity] ?? r.severity}
            </span>
            <span className="text-sm text-gray-700">{r.details}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// -- Section 7: Tighten tips --

function TightenTipsSection({
  tips,
  confidence,
}: {
  tips: ApiResult["tightenTips"];
  confidence: number;
}) {
  if (confidence >= 75 || tips.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 space-y-2">
      <h3 className="text-sm font-bold text-amber-800">Cum poti obtine o estimare mai precisa</h3>
      <ul className="space-y-1.5">
        {tips.map((t, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-amber-800">
            <svg
              className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-amber-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <span>{t.tip}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// -- CTA Block --

function CtaBlock() {
  return (
    <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 text-center space-y-3">
      <div className="text-[15px] font-bold text-gray-900">Vrei analiza completa?</div>
      <p className="text-xs text-gray-500 max-w-[340px] mx-auto">
        Deblocheaza raportul complet cu mai multe comparabile, analiza detaliata si strategie de
        listare.
      </p>
      <Link
        href="/analyze"
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-blue-200/50 hover:shadow-lg hover:brightness-110 transition-all"
      >
        Vezi raportul complet
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </Link>
    </div>
  );
}

// -- Vision Analysis Card --

const CONDITION_LABELS: Record<string, string> = {
  nou: "Nou / finisaje noi",
  renovat: "Renovat recent",
  locuibil: "Locuibil",
  necesita_renovare: "Necesita renovare",
  de_renovat: "De renovat complet",
};

const FURNISHING_LABELS: Record<string, string> = {
  gol: "Nemobilat",
  partial_mobilat: "Partial mobilat",
  complet_mobilat: "Complet mobilat",
};

const BRIGHTNESS_LABELS: Record<number, string> = {
  0: "Foarte intuneric",
  1: "Intuneric",
  2: "Luminos",
  3: "Foarte luminos",
};

function VisionAnalysisCard({ vision }: { vision: NonNullable<ApiResult["visionAnalysis"]> }) {
  const condColor =
    vision.condition === "nou" || vision.condition === "renovat"
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : vision.condition === "locuibil"
        ? "text-gray-700 bg-gray-50 border-gray-200"
        : "text-amber-700 bg-amber-50 border-amber-200";

  const brightnessColor =
    vision.brightness >= 2
      ? "text-yellow-700 bg-yellow-50 border-yellow-200"
      : "text-gray-600 bg-gray-50 border-gray-200";

  return (
    <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50/60 to-white p-5 space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-100">
          <svg className="h-3.5 w-3.5 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-900">Analiza AI din fotografii</h3>
          <p className="text-[10px] text-gray-400">
            Incredere AI: {Math.round(vision.confidence * 100)}%
          </p>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5">
        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${condColor}`}>
          {CONDITION_LABELS[vision.condition] ?? vision.condition}
        </span>
        <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">
          {FURNISHING_LABELS[vision.furnishing] ?? vision.furnishing}
        </span>
        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${brightnessColor}`}>
          {BRIGHTNESS_LABELS[vision.brightness] ?? `Luminozitate: ${vision.brightness}`}
        </span>
        {vision.layoutQuality && (
          <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-600">
            Layout: {vision.layoutQuality}
          </span>
        )}
      </div>

      {/* Evidence */}
      {vision.evidence && (
        <p className="text-xs text-gray-600 leading-relaxed italic">
          &ldquo;{vision.evidence}&rdquo;
        </p>
      )}

      {/* Issues */}
      {vision.visibleIssues.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-amber-700">Probleme detectate:</p>
          <ul className="space-y-0.5">
            {vision.visibleIssues.map((issue, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] text-amber-700">
                <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-amber-400" />
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// -- Full results panel --

function buildScoreInput(data: ApiResult, form: FormData): ApartmentScoreInput {
  const year = parseInt(form.anConstructie, 10);
  let yearBucket: ApartmentScoreInput["yearBucket"];
  if (!isNaN(year)) {
    if (year < 1977) yearBucket = "<1977";
    else if (year <= 1990) yearBucket = "1978-1990";
    else if (year <= 2005) yearBucket = "1991-2005";
    else yearBucket = "2006+";
  }

  return {
    fairLikelyEur: data.fairLikely,
    range80: data.range80,
    range95: data.range95,
    confidence: data.confidence,
    yearBucket,
    condition: form.stare as ApartmentScoreInput["condition"],
    floor: form.etaj ? parseInt(form.etaj, 10) || undefined : undefined,
    totalFloors: form.etajTotal ? parseInt(form.etajTotal, 10) || undefined : undefined,
    hasElevator: undefined,
    liquidity: {
      daysMin: data.liquidity.daysMin,
      daysMax: data.liquidity.daysMax,
      label: data.liquidity.label,
    },
  };
}

function ResultsPanel({
  data,
  loading,
  error,
  onRetry,
  form,
}: {
  data: ApiResult | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  form: FormData;
}) {
  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorMessage message={error} onRetry={onRetry} />;
  if (!data) return <EmptyState />;

  const apartmentScore = computeApartmentScore(buildScoreInput(data, form));

  return (
    <div className="space-y-4">
      <ExecutiveCards data={data} />
      {data.visionAnalysis && <VisionAnalysisCard vision={data.visionAnalysis} />}
      <ApartmentScoreCard score={apartmentScore} variant="full" />
      <CompsSection comps={data.comps} limits={data.meta.limits} />
      <AdjustmentsSection adjustments={data.adjustments} />
      <LiquiditySection liquidity={data.liquidity} />
      <RecommendationsSection recs={data.recommendations} />
      <RisksSection risks={data.risks} />
      <TightenTipsSection tips={data.tightenTips} confidence={data.confidence} />

      {/* Disclaimer */}
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-[11px] text-gray-500 leading-relaxed">
        <span className="block font-medium text-gray-600">
          Estimare rapidă (formular), nu e același raport cumpărător din anunț.
        </span>
        <span className="mt-1 block">{REPORT_DISCLAIMER_FULL}</span>
      </div>

      <CtaBlock />
    </div>
  );
}

// ===================================================================
// Main page
// ===================================================================

export default function EstimarePage() {
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [pinLat, setPinLat] = useState<number | null>(null);
  const [pinLng, setPinLng] = useState<number | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handlePinChange = useCallback((lat: number, lng: number) => {
    setPinLat(lat);
    setPinLng(lng);
  }, []);

  const handlePinClear = useCallback(() => {
    setPinLat(null);
    setPinLng(null);
  }, []);

  const handleAddressSelect = useCallback(
    (lat: number, lng: number, displayName: string) => {
      setPinLat(lat);
      setPinLng(lng);
      setForm((prev) => ({ ...prev, address: displayName }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next.zona;
        return next;
      });
    },
    [],
  );

  const updateField = useCallback((field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const doEstimate = useCallback(async () => {
    const errs = validate(form, pinLat);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    setApiError(null);

    // Scroll to results on mobile
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);

    try {
      const payload = buildApiPayload(form, pinLat, pinLng, photos);
      const res = await fetch("/api/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Eroare server (${res.status})`);
      }

      const data: ApiResult = await res.json();
      setResult(data);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Eroare necunoscuta");
    } finally {
      setLoading(false);
    }
  }, [form, pinLat, pinLng, photos]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      doEstimate();
    },
    [doEstimate],
  );

  const handleReset = useCallback(() => {
    setForm(INITIAL_FORM);
    setResult(null);
    setErrors({});
    setApiError(null);
    setShowAdvanced(false);
    setPinLat(null);
    setPinLng(null);
    setPhotos([]);
  }, []);

  return (
    <main className="overflow-x-hidden">
      {/* Hero */}
      <section className="relative isolate">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10
            bg-[radial-gradient(80%_50%_at_50%_-10%,rgba(37,99,235,.12),transparent_70%)]"
        />
        <div className="mx-auto max-w-[980px] px-5 pt-16 pb-4 md:pt-24 md:pb-6 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-[13px] font-medium text-gray-600 shadow-sm">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />
            Gratuit, fara cont
          </div>
          <h1 className="text-[32px] leading-[1.1] md:text-[56px] md:leading-[1.08] font-extrabold tracking-[-0.04em] text-gray-950">
            Estimeaza pretul apartamentului
            <br className="hidden md:block" />
            <span className="text-gradient"> tau in 30 de secunde</span>
          </h1>
          <p className="mx-auto mt-4 max-w-[560px] text-[15px] md:text-[17px] leading-relaxed text-gray-500">
            Introdu cateva detalii si primesti o estimare bazata pe comparabile reale din zona,
            interval realist de pret si recomandari pentru a vinde mai bine.
          </p>
          <p className="mx-auto mt-2 max-w-[480px] text-[13px] leading-relaxed text-gray-400">
            Folosim anunturi reale si date de piata pentru a calcula valoarea probabila a
            apartamentului tau.
          </p>
        </div>
      </section>

      {/* Form + Results */}
      <section className="mx-auto max-w-[1060px] px-5 pb-20 pt-4 md:pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
          {/* Left: Form */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-lg shadow-gray-100/80 p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <h2 className="text-[17px] font-bold text-gray-900">Detalii principale</h2>
                <p className="text-[12px] text-gray-400 mt-0.5">
                  Cu cat introduci mai multe detalii, cu atat intervalul de pret devine mai precis.
                </p>
              </div>

              {/* Address autocomplete */}
              <div className="space-y-1.5">
                <Label>Adresa apartament</Label>
                <AddressAutocomplete
                  value={form.address}
                  onChange={(v) => updateField("address", v)}
                  onSelect={handleAddressSelect}
                  placeholder="ex: Bulevardul Mihai Bravu 13, Sector 2"
                />
                <p className="text-[10px] text-gray-400">
                  Introdu adresa si selecteaza din lista pentru a plasa automat pinul pe harta.
                </p>
              </div>

              {/* Zona fallback (if no address pin) */}
              {pinLat == null && (
                <div className="space-y-1.5">
                  <Label htmlFor="zona">Zona / Cartier {pinLat == null ? "*" : ""}</Label>
                  <Select value={form.zona} onValueChange={(v) => updateField("zona", v)}>
                    <SelectTrigger className={`w-full ${errors.zona ? "border-red-400" : ""}`}>
                      <SelectValue placeholder="Selecteaza zona" />
                    </SelectTrigger>
                    <SelectContent>
                      {ZONE_NAMES.map((z) => (
                        <SelectItem key={z} value={z}>
                          {z}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.zona && <p className="text-xs text-red-500">{errors.zona}</p>}
                  <p className="text-[10px] text-gray-400">
                    Foloseste zona ca alternativa daca nu ai adresa exacta.
                  </p>
                </div>
              )}

              {/* Map pin selector */}
              <div className="space-y-1.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Label className="cursor-help">Alege locatia apartamentului</Label>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[260px]">
                    Fara locatie exacta estimarea va folosi medii pe zona si intervalul va fi mai
                    larg.
                  </TooltipContent>
                </Tooltip>
                <p className="text-[11px] text-gray-400 -mt-0.5">
                  Pune pin pe harta sau introdu adresa mai sus. Poti muta pinul daca pozitia nu e exacta.
                </p>
                <LocationPicker
                  lat={pinLat}
                  lng={pinLng}
                  onChange={handlePinChange}
                  onClear={handlePinClear}
                />
              </div>

              {/* Photo upload */}
              <div className="space-y-1.5">
                <Label>Poze apartament (optional)</Label>
                <PhotoUpload photos={photos} onChange={setPhotos} maxPhotos={5} />
              </div>

              {/* Suprafata + Camere */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="suprafata">Suprafata utila (mp) *</Label>
                  <Input
                    id="suprafata"
                    type="number"
                    min={10}
                    max={500}
                    placeholder="ex: 55"
                    value={form.suprafata}
                    onChange={(e) => updateField("suprafata", e.target.value)}
                    aria-invalid={!!errors.suprafata}
                  />
                  <p className="text-[10px] text-gray-400">
                    Suprafata utila fara balcon sau terase.
                  </p>
                  {errors.suprafata && <p className="text-xs text-red-500">{errors.suprafata}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="camere">Camere</Label>
                  <Select value={form.camere} onValueChange={(v) => updateField("camere", v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 camera</SelectItem>
                      <SelectItem value="2">2 camere</SelectItem>
                      <SelectItem value="3">3 camere</SelectItem>
                      <SelectItem value="4">4+ camere</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Advanced toggle */}
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                <svg
                  className={`h-4 w-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                {showAdvanced ? "Ascunde detalii suplimentare" : "Detalii suplimentare (optional)"}
              </button>

              {/* Advanced fields */}
              {showAdvanced && (
                <div className="space-y-4 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                  <p className="text-[11px] text-gray-400 -mt-1">
                    Aceste informatii ne ajuta sa calculam o estimare mai precisa.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Etaj</Label>
                      <div className="flex items-center gap-1.5">
                        <Input
                          id="etaj"
                          type="number"
                          min={-1}
                          max={30}
                          placeholder="3"
                          value={form.etaj}
                          onChange={(e) => updateField("etaj", e.target.value)}
                          className="w-[72px]"
                        />
                        <span className="text-sm text-gray-400 shrink-0">din</span>
                        <Input
                          id="etajTotal"
                          type="number"
                          min={1}
                          max={50}
                          placeholder="8"
                          value={form.etajTotal}
                          onChange={(e) => updateField("etajTotal", e.target.value)}
                          className="w-[72px]"
                        />
                      </div>
                      <p className="text-[10px] text-gray-400">
                        Etajul apartamentului si nr. total de etaje al blocului.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="anConstructie">An constructie</Label>
                      <Input
                        id="anConstructie"
                        type="number"
                        min={1900}
                        max={2030}
                        placeholder="ex: 1985"
                        value={form.anConstructie}
                        onChange={(e) => updateField("anConstructie", e.target.value)}
                      />
                      <p className="text-[10px] text-gray-400">
                        Blocurile construite in perioade diferite au valori diferite pe piata.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Stare apartament</Label>
                      <Select value={form.stare} onValueChange={(v) => updateField("stare", v)}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nou">Nou / finisaje noi</SelectItem>
                          <SelectItem value="renovat">Renovat recent</SelectItem>
                          <SelectItem value="locuibil">Locuibil</SelectItem>
                          <SelectItem value="necesita_renovare">Necesita renovare</SelectItem>
                          <SelectItem value="de_renovat">De renovat complet</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-gray-400">
                        Alege varianta care descrie cel mai bine starea actuala.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Loc de parcare</Label>
                      <Select value={form.parcare} onValueChange={(v) => updateField("parcare", v)}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="da">Da</SelectItem>
                          <SelectItem value="nu">Nu</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-gray-400">
                        Apartamentele cu loc de parcare se vand de obicei cu 3–5% mai mult.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-xl h-11 text-[14px] font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:brightness-110 disabled:opacity-60"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Analizam...
                    </span>
                  ) : (
                    "Estimeaza pretul"
                  )}
                </Button>
                {(result || apiError) && (
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl h-11"
                    onClick={handleReset}
                  >
                    Reseteaza
                  </Button>
                )}
              </div>
            </form>
          </div>

          {/* Right: Results */}
          <div ref={resultsRef} className="lg:sticky lg:top-8">
            <ResultsPanel
              data={result}
              loading={loading}
              error={apiError}
              onRetry={doEstimate}
              form={form}
            />
          </div>
        </div>

        {/* Neighborhood Intel Map (shown after estimate result when we have coords) */}
        {result && pinLat != null && pinLng != null && (
          <div className="mx-auto max-w-[980px] px-5 mt-8">
            <NeighborhoodIntelV2Lazy
              lat={pinLat}
              lng={pinLng}
              initialRadiusM={1000}
              mode="estimate"
            />
          </div>
        )}
      </section>
    </main>
  );
}
