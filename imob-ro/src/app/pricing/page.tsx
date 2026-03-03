"use client";

import { Check, Minus } from "lucide-react";
import Link from "next/link";

const plans = [
  {
    code: "free",
    name: "Free",
    price: "0",
    period: "/luna",
    subtitle: "Pentru explorare",
    cta: "Incepe gratuit",
    ctaHref: "/analyze",
    highlight: false,
    badge: null,
  },
  {
    code: "standard",
    name: "Standard",
    price: "49",
    period: "RON/luna",
    subtitle: "Pentru cumparatori activi",
    cta: "Alege Standard",
    ctaHref: "/subscribe?plan=standard",
    highlight: true,
    badge: "Popular",
  },
  {
    code: "pro",
    name: "Pro",
    price: "99",
    period: "RON/luna",
    subtitle: "Pentru profesionisti",
    cta: "Alege Pro",
    ctaHref: "/subscribe?plan=pro",
    highlight: false,
    badge: null,
  },
  {
    code: "enterprise",
    name: "Enterprise",
    price: "249",
    period: "RON/luna",
    subtitle: "Agentii si investitori",
    cta: "Contacteaza-ne",
    ctaHref: "/contact",
    highlight: false,
    badge: "Nelimitat",
  },
] as const;

type FeatureValue = boolean | string;

interface FeatureRow {
  label: string;
  free: FeatureValue;
  standard: FeatureValue;
  pro: FeatureValue;
  enterprise: FeatureValue;
}

const features: FeatureRow[] = [
  { label: "Cautari/luna", free: "10", standard: "50", pro: "300", enterprise: "Nelimitat" },
  { label: "Verdict (subevaluat/corect/supraevaluat)", free: true, standard: true, pro: true, enterprise: true },
  { label: "Comparabile", free: "3 preview", standard: "Complete", pro: "Complete cu harta", enterprise: "Complete cu harta" },
  { label: "Rapoarte PDF", free: "1/luna", standard: "10/luna", pro: "30/luna", enterprise: "Nelimitat" },
  { label: "Scor detaliat (AVM, TTS, Yield, Risk)", free: false, standard: true, pro: true, enterprise: true },
  { label: "Analiza AI (text)", free: true, standard: true, pro: true, enterprise: true },
  { label: "Analiza AI (fotografii)", free: false, standard: false, pro: true, enterprise: true },
  { label: "Ancore pret (grila notariala)", free: false, standard: true, pro: true, enterprise: true },
  { label: "Istoric cautari", free: false, standard: "30 zile", pro: "90 zile", enterprise: "Nelimitat" },
  { label: "Export CSV", free: false, standard: false, pro: true, enterprise: true },
  { label: "Alerte salvate", free: false, standard: "5", pro: "20", enterprise: "Nelimitat" },
  { label: "Link-uri share", free: false, standard: "10/luna", pro: "50/luna", enterprise: "Nelimitat" },
  { label: "Suport", free: "Help center", standard: "Email", pro: "Prioritar", enterprise: "Dedicat" },
];

function FeatureCell({ value }: { value: FeatureValue }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-emerald-50 text-emerald-600">
        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-gray-50 text-gray-300">
        <Minus className="h-3.5 w-3.5" strokeWidth={2} />
      </span>
    );
  }
  return <span className="text-[13px] font-medium text-gray-700">{value}</span>;
}

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-5 py-16 md:py-24">
      {/* Header */}
      <div className="text-center mb-14">
        <h1 className="text-[32px] md:text-[48px] font-bold tracking-tight text-gray-950">
          Pricing simplu, transparent
        </h1>
        <p className="mt-3 text-[16px] md:text-[18px] text-gray-500 max-w-[560px] mx-auto">
          Analizeaza proprietati din imobiliare.ro, storia.ro, olx.ro, publi24.ro, lajumate.ro si homezz.ro. Fara angajament, anulezi oricand.
        </p>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {plans.map((plan) => (
          <div
            key={plan.code}
            className={`relative rounded-2xl border p-6 flex flex-col transition-all duration-300 ${
              plan.highlight
                ? "border-blue-200 bg-white shadow-xl shadow-blue-100/50 ring-1 ring-blue-100 scale-[1.02]"
                : "border-gray-200 bg-white hover:shadow-md hover:border-gray-300"
            }`}
          >
            {plan.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span
                  className={`inline-flex items-center rounded-full px-3.5 py-1 text-[11px] font-semibold tracking-wide uppercase ${
                    plan.highlight
                      ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-sm"
                      : "bg-gray-900 text-white"
                  }`}
                >
                  {plan.badge}
                </span>
              </div>
            )}

            <div className="mb-5">
              <h3 className="text-[18px] font-semibold text-gray-900">{plan.name}</h3>
              <p className="mt-0.5 text-[13px] text-gray-500">{plan.subtitle}</p>
            </div>

            <div className="mb-6">
              <span className="text-[40px] font-bold tracking-tight text-gray-950">{plan.price}</span>
              <span className="ml-1 text-[14px] font-medium text-gray-400">{plan.period}</span>
            </div>

            <Link
              href={plan.ctaHref}
              className={`block w-full rounded-xl py-3 text-center text-[14px] font-semibold transition-all duration-200 active:scale-[0.97] ${
                plan.highlight
                  ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-sm hover:shadow-md hover:brightness-110"
                  : plan.code === "enterprise"
                    ? "bg-gray-900 text-white hover:bg-gray-800"
                    : plan.code === "pro"
                      ? "bg-gray-800 text-white hover:bg-gray-700"
                      : "border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
              }`}
            >
              {plan.cta}
            </Link>

            {/* Inline features for mobile */}
            <ul className="mt-6 space-y-2.5 lg:hidden">
              {features.map((f) => {
                const val = f[plan.code as keyof Pick<FeatureRow, "free" | "standard" | "pro" | "enterprise">];
                if (val === false) return null;
                return (
                  <li key={f.label} className="flex items-center gap-2 text-[13px] text-gray-600">
                    <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" strokeWidth={2.5} />
                    <span>
                      {f.label}
                      {typeof val === "string" ? `: ${val}` : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Feature Comparison Table (desktop) */}
      <div className="mt-16 hidden lg:block">
        <h2 className="text-[20px] font-semibold text-gray-900 mb-6">
          Comparatie detaliata
        </h2>
        <div className="rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                <th className="text-left text-[13px] font-medium text-gray-500 py-3.5 px-5 w-[30%]">
                  Functionalitate
                </th>
                {plans.map((p) => (
                  <th
                    key={p.code}
                    className={`text-center text-[13px] font-semibold py-3.5 px-3 ${
                      p.highlight ? "text-blue-600" : "text-gray-900"
                    }`}
                  >
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {features.map((f, i) => (
                <tr
                  key={f.label}
                  className={`border-b border-gray-50 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}
                >
                  <td className="text-[13px] text-gray-700 py-3 px-5">{f.label}</td>
                  {(["free", "standard", "pro", "enterprise"] as const).map((code) => (
                    <td key={code} className="text-center py-3 px-3">
                      <div className="flex justify-center">
                        <FeatureCell value={f[code]} />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer note */}
      <div className="mt-10 text-center">
        <p className="text-[13px] text-gray-500">
          Platile procesate securizat prin Stripe. Poti anula oricand din contul tau.
        </p>
        <p className="mt-2 text-[13px] text-gray-400">
          Analizam date de pe imobiliare.ro, storia.ro, olx.ro, publi24.ro, lajumate.ro si homezz.ro
        </p>
      </div>
    </div>
  );
}
