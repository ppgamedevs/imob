import { BarChart3, Clock, MapPin, MessageSquare, Shield } from "lucide-react";
import Link from "next/link";

const primary = {
  icon: BarChart3,
  title: "Reper de preț față de piață",
  description:
    "Interval orientativ din modelul AVM și din comparabile apropiate, nu o evaluare autorizată. Un semnal de piață înainte de ofertă sau negociere.",
};

const secondary = [
  {
    icon: Clock,
    title: "Viteză la vânzare",
    description:
      "Estimare orientativă în luni, cu context de lichiditate în zonă (nu o dată la care se vinde neapărat).",
    tone: "text-blue-700 bg-blue-50/90 ring-blue-100/80",
  },
  {
    icon: Shield,
    title: "Risc seismic",
    description:
      "Reper pe baza anului construcției și localizării; nu acoperă toate scenariile, verifici la fața locului.",
    tone: "text-amber-800 bg-amber-50/90 ring-amber-100/80",
  },
  {
    icon: MapPin,
    title: "Comparabile din zonă",
    description: "Anunțuri și tranzacții apropiate ca profil și preț.",
    tone: "text-emerald-800 bg-emerald-50/90 ring-emerald-100/80",
  },
  {
    icon: MessageSquare,
    title: "Argumente de negociere",
    description: "Puncte concrete legate de piață, nu generic.",
    tone: "text-slate-700 bg-slate-50 ring-slate-200/80",
  },
] as const;

export function HomeFeatures() {
  const PrimaryIcon = primary.icon;
  return (
    <section id="cum-functioneaza" className="py-20 md:py-28 scroll-mt-[72px]">
      <div className="mx-auto max-w-[1100px] px-5">
        <div className="mx-auto max-w-[640px] text-center">
          <h2 className="text-[26px] font-bold tracking-tight text-gray-950 md:text-[38px]">
            Liniile esențiale, într-un singur raport
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-gray-600 md:text-[16px]">
            Nu o listă de funcții - o structură gândită pentru cumpărători care vor să înțeleagă
            prețul înainte să se angajeze.
          </p>
          <p className="mt-3 text-[14px]">
            <Link
              href="/cum-functioneaza"
              className="font-medium text-blue-600 hover:underline decoration-blue-500/30 underline-offset-2"
            >
              Cum funcționează pas cu pas (fluxul plătit)
            </Link>
          </p>
        </div>

        <div className="mt-12 space-y-5">
          <div className="rounded-2xl border border-gray-200 bg-gradient-to-b from-gray-50/80 to-white p-6 shadow-sm ring-1 ring-black/[0.02] md:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:gap-8">
              <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-900 text-white shadow-sm">
                <PrimaryIcon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                  Pilon central
                </p>
                <h3 className="mt-1 text-[20px] font-bold tracking-tight text-gray-950 md:text-[22px]">
                  {primary.title}
                </h3>
                <p className="mt-2 max-w-[640px] text-[15px] leading-relaxed text-gray-600">
                  {primary.description}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {secondary.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="rounded-2xl border border-gray-100 bg-white p-5 ring-1 ring-black/[0.02] transition-shadow duration-200 hover:shadow-md hover:shadow-gray-200/50"
                >
                  <div
                    className={`inline-flex items-center justify-center rounded-xl p-2.5 ring-1 ring-inset ${f.tone}`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
                  </div>
                  <h3 className="mt-4 text-[15px] font-semibold text-gray-900">{f.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-gray-600">
                    {f.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
