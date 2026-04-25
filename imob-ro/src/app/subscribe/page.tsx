"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const proDisplayRon = process.env.NEXT_PUBLIC_SUBSCRIPTION_PRO_RON?.trim() || "99";

const proFeatures = [
  "Cote mai mari: până la 300 de analize și 30 de PDF pe lună (conform planului Pro activ în cont).",
  "Comparabile avansate și scor detaliat (AVM, risc, yield: în funcție de conținutul raportului).",
  "Istoric până la 90 de zile, alerte, partajare link, export CSV, conform cotelor planului Pro.",
  "Un singur flux de plată: Stripe, același preț; nu alegi între abonamente Standard și Pro aici, există o singură ofertă activă de abonament.",
];

export default function SubscribePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubscribe() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error === "unauthenticated") {
        router.push("/auth/signin?callbackUrl=/subscribe");
      } else {
        setError(
          data.error === "stripe_not_configured"
            ? "Plata prin abonament nu e configurată momentan. Încearcă deblocarea per raport sau contactează-ne."
            : data.error || "Eroare la procesare",
        );
      }
    } catch {
      setError("Eroare de conexiune");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-[520px]">
        <div className="text-center mb-8">
          <h1 className="text-[28px] font-bold tracking-tight text-gray-950 md:text-[34px]">Abonament Pro</h1>
          <p className="mt-3 text-[15px] text-gray-500">
            Pentru investitori, agenți sau oricine are multe analize. Dacă îți trebuie un singur
            raport, folosește deblocarea o singură dată de pe pagina de preț.
          </p>
        </div>

        <div className="rounded-2xl border-2 border-blue-200 bg-white p-6 shadow-sm ring-1 ring-blue-100">
          <h2 className="text-[16px] font-semibold text-gray-900">Planul activ în aplicație</h2>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-[32px] font-bold tracking-tight text-gray-950">{proDisplayRon}</span>
            <span className="text-[14px] font-medium text-gray-400">RON/lună</span>
          </div>
          <p className="mt-0.5 text-[12px] text-gray-400">Sumă afișată e orientativă. Confirmi suma finală la Stripe.</p>
          <ul className="mt-5 space-y-2.5">
            {proFeatures.map((f) => (
              <li key={f} className="flex items-start gap-2 text-[13px] text-gray-600">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" strokeWidth={2.5} />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          onClick={handleSubscribe}
          disabled={loading}
          className="mt-5 w-full rounded-xl bg-gray-900 px-6 py-3.5 text-[14px] font-semibold text-white shadow-sm transition hover:bg-gray-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Se deschide plata…" : "Continuă spre plată (Stripe)"}
        </button>

        {error && (
          <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-center text-[13px] text-red-700">
            {error}
          </div>
        )}

        <p className="mt-4 text-center text-[13px] text-gray-500">
          <a href="/pricing" className="font-medium text-blue-600 hover:underline">
            Înapoi la prețuri
          </a>
          <span className="mx-2 text-gray-300">|</span>
          <a href="/contact" className="text-gray-600 hover:underline">
            Volume, echipe, integrări: contactează-ne
          </a>
        </p>
      </div>
    </div>
  );
}
