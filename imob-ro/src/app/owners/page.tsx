"use client";

import { useActionState } from "react";
import { createOwnerDraft } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

export default function OwnersLandingPage() {
  const [state, formAction, pending] = useActionState(createOwnerDraft, null);

  return (
    <main className="min-h-[100dvh]">
      <section className="relative overflow-hidden">
        {/* backdrop gradient */}
        <div
          className="pointer-events-none absolute inset-0
          bg-[radial-gradient(90%_60%_at_50%_0%,rgba(99,102,241,.25),transparent)]
          md:bg-[radial-gradient(70%_60%_at_50%_-20%,rgba(99,102,241,.28),transparent)]"
        />

        <div className="mx-auto max-w-[1040px] px-4 pt-16 md:pt-24 pb-12 text-center relative">
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight">
            Estimează-ți proprietatea – <span className="text-primary">Gratis</span>, în 60s
          </h1>
          <p className="mt-3 text-[15px] md:text-lg text-white/70 max-w-[720px] mx-auto">
            Află valoarea de piață, timpul de vânzare și descoperă îmbunătățiri rapide care îți
            cresc prețul cu până la 3%.
          </p>

          {/* Form */}
          <div className="mx-auto mt-8 max-w-[860px]">
            <form action={formAction} className="space-y-3">
              <div className="flex flex-col md:flex-row gap-3">
                <Input
                  name="input"
                  placeholder="Adresă (ex: Floreasca, București) sau link de anunț..."
                  className="flex-1 h-12 text-[15px] bg-surface/90 border-border"
                  required
                  disabled={pending}
                />
                <Input
                  name="areaM2"
                  type="number"
                  placeholder="m² (opțional)"
                  className="w-full md:w-32 h-12 text-[15px] bg-surface/90 border-border"
                  disabled={pending}
                />
              </div>

              {state?.error && (
                <div className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
                  {state.error}
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full md:w-auto md:min-w-[200px] h-12 text-[15px]"
                disabled={pending}
              >
                {pending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesare...
                  </>
                ) : (
                  "Vezi estimarea"
                )}
              </Button>
            </form>

            <p className="mt-4 text-xs text-white/50">
              Fără cont necesar. Primești un link privat pe care îl poți partaja cu agenți sau
              cumpărători.
            </p>
          </div>

          {/* Value Props */}
          <div className="mx-auto mt-12 grid grid-cols-1 md:grid-cols-4 gap-4 max-w-[1000px]">
            <ValuePropCard
              icon="💰"
              title="Valoare AVM"
              desc="Interval de preț bazat pe 1000+ comparabile din zonă"
            />
            <ValuePropCard
              icon="⏱️"
              title="Viteza vânzării"
              desc="Estimare în zile + factori care accelerează/încetinesc"
            />
            <ValuePropCard
              icon="🔧"
              title="ROI Fixes"
              desc="Îmbunătățiri cu cost/impact clar: foto, zugrăvit, staging"
            />
            <ValuePropCard
              icon="📊"
              title="Pre-Market Score"
              desc="Scor 0-100 care arată cât de pregătit e anunțul pentru piață"
            />
          </div>
        </div>
      </section>

      {/* Below Fold - FAQ Preview */}
      <section className="mx-auto max-w-[1040px] px-4 py-14">
        <h2 className="text-2xl font-semibold mb-6">De ce iR pentru proprietari?</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <FaqItem
            q="Cât de acurate sunt estimările?"
            a="Modelul nostru AVM are o eroare medie de ~8% pe București. Intervalul afișat acoperă 80% din prețurile reale de vânzare."
          />
          <FaqItem
            q="Ce înseamnă Pre-Market Score?"
            a="Un scor 0-100 care combină: alinierea prețului la piață, calitatea fotografiilor, completitudinea descrierii și îmbunătățirile aplicate."
          />
          <FaqItem
            q="Cine vede datele mele?"
            a="Dashboard-ul tău e privat. Poți genera un Owner Link (read-only) pe care să-l trimiți agenților. Nu expunem datele de contact public."
          />
          <FaqItem
            q="Cât costă?"
            a="Estimarea și dashboard-ul sunt 100% gratuite. Plătești doar dacă vrei să angajezi un profesionist din marketplace-ul nostru (disponibil curând)."
          />
        </div>
      </section>
    </main>
  );
}

function ValuePropCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/90 shadow-elev1 p-5 text-left">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-sm font-semibold mb-1.5">{title}</div>
      <div className="text-xs text-white/70">{desc}</div>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface/50 p-5">
      <div className="text-[15px] font-semibold mb-2">{q}</div>
      <div className="text-sm text-white/70">{a}</div>
    </div>
  );
}
