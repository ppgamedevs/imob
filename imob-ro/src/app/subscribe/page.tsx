"use client";

import { Check } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

const tiers = [
  {
    code: "standard",
    name: "Standard",
    price: "49",
    features: [
      "50 cautari/luna",
      "Comparabile complete",
      "10 rapoarte PDF/luna",
      "Scor detaliat (AVM, TTS, Yield, Risk)",
      "Ancore pret (grila notariala)",
      "Istoric cautari 30 zile",
      "5 alerte salvate",
      "10 link-uri share/luna",
      "Suport email",
    ],
  },
  {
    code: "pro",
    name: "Pro",
    price: "99",
    features: [
      "200 cautari/luna",
      "Comparabile complete cu harta",
      "30 rapoarte PDF/luna",
      "Scor detaliat complet",
      "Analiza AI (text + fotografii)",
      "Ancore pret (grila notariala)",
      "Istoric cautari 90 zile",
      "Export CSV",
      "20 alerte salvate",
      "50 link-uri share/luna",
      "Suport prioritar",
    ],
  },
  {
    code: "enterprise",
    name: "Enterprise",
    price: "249",
    features: [
      "Cautari nelimitate",
      "Rapoarte PDF nelimitate",
      "Toate functionalitatile Pro",
      "Istoric nelimitat",
      "Alerte nelimitate",
      "Link-uri share nelimitate",
      "Suport dedicat",
    ],
  },
];

function SubscribeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan");
  const initialPlan = tiers.find((t) => t.code === planParam)?.code ?? "standard";
  const [selected, setSelected] = useState(initialPlan);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTier = tiers.find((t) => t.code === selected)!;

  async function handleSubscribe() {
    if (selected === "enterprise") {
      router.push("/contact");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selected }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error === "unauthenticated") {
        router.push("/auth/signin?callbackUrl=/subscribe");
      } else {
        setError(data.error || "Eroare la procesare");
      }
    } catch {
      setError("Eroare de conexiune");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-[900px] w-full">
        <div className="text-center mb-10">
          <h1 className="text-[28px] md:text-[36px] font-bold tracking-tight text-gray-950">
            Alege planul potrivit
          </h1>
          <p className="mt-3 text-[15px] text-gray-500 max-w-[460px] mx-auto">
            Comparabile avansate, rapoarte PDF, scor detaliat si multe altele. Fara angajament, anulezi oricand.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tiers.map((tier) => (
            <button
              key={tier.code}
              type="button"
              onClick={() => setSelected(tier.code)}
              className={`relative rounded-2xl border p-5 text-left transition-all duration-200 ${
                selected === tier.code
                  ? "border-blue-300 bg-blue-50/40 ring-2 ring-blue-200 shadow-md"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[16px] font-semibold text-gray-900">{tier.name}</h3>
                <div
                  className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    selected === tier.code ? "border-blue-600 bg-blue-600" : "border-gray-300"
                  }`}
                >
                  {selected === tier.code && (
                    <div className="h-2 w-2 rounded-full bg-white" />
                  )}
                </div>
              </div>

              <div className="mb-4">
                <span className="text-[32px] font-bold tracking-tight text-gray-950">{tier.price}</span>
                <span className="ml-1 text-[13px] font-medium text-gray-400">RON/luna</span>
              </div>

              <ul className="space-y-2">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-[13px] text-gray-600">
                    <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" strokeWidth={2.5} />
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>

        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="mt-6 w-full rounded-xl px-6 py-3.5 bg-gray-900 text-white text-[14px] font-semibold shadow-sm hover:bg-gray-800 active:scale-[0.97] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? "Se proceseaza..."
            : selected === "enterprise"
              ? "Contacteaza-ne pentru Enterprise"
              : `Aboneaza-te la ${selectedTier.name} - ${selectedTier.price} RON/luna`}
        </button>

        {error && (
          <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-[13px] text-red-700 text-center">
            {error}
          </div>
        )}

        <p className="mt-4 text-center text-[13px] text-gray-400">
          Plata securizata prin Stripe. Fara angajament, anulezi oricand.
        </p>
      </div>
    </div>
  );
}

export default function SubscribePage() {
  return (
    <Suspense fallback={<div className="min-h-[80vh] flex items-center justify-center">Se incarca...</div>}>
      <SubscribeContent />
    </Suspense>
  );
}
