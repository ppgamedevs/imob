"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SubscribePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubscribe() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
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
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Deblocheaza rapoarte nelimitate</h1>
          <p className="mt-3 text-muted-foreground">
            Analizeaza oricat de multe proprietati si primeste rapoarte complete cu estimare de pret,
            comparabile, argumente de negociere si risc seismic.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="text-center">
            <div className="text-4xl font-bold">
              9 <span className="text-lg font-normal text-muted-foreground">EUR / luna</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Fara angajament, anulezi oricand</p>
          </div>

          <ul className="mt-6 space-y-3 text-sm">
            {[
              "Rapoarte nelimitate cu estimare de pret",
              "Comparabile din zona cu IQR filtering",
              "Timp estimat pana la vanzare",
              "Argumente de negociere generate automat",
              "Indicator seismic orientativ",
              "Checklist personalizat pentru cumparatori",
              "Acces prioritar la analize (procesare rapida)",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-primary">+</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="mt-6 w-full rounded-xl px-6 py-3 bg-primary text-white font-medium hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? "Se proceseaza..." : "Aboneaza-te acum"}
          </button>

          {error && (
            <p className="mt-3 text-sm text-destructive text-center">{error}</p>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Plata securizata prin Stripe. Poti anula oricand din contul tau.
        </p>
      </div>
    </div>
  );
}
