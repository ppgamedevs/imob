import Link from "next/link";
import { AlertTriangle, FileWarning, LineChart, Search } from "lucide-react";

const pains = [
  {
    icon: LineChart,
    text: "Prețul poate fi peste anunțurile similare.",
  },
  {
    icon: FileWarning,
    text: "Datele importante pot lipsi.",
  },
  {
    icon: Search,
    text: "Comparabilele sunt greu de verificat manual.",
  },
  {
    icon: AlertTriangle,
    text: "Negocierea fără argumente te poate costa mii de euro.",
  },
] as const;

export function HomeBuyerPainSection() {
  return (
    <section className="border-t border-gray-100 bg-white py-20 md:py-28">
      <div className="mx-auto max-w-[1100px] px-5">
        <div className="mx-auto max-w-[640px] text-center">
          <h2 className="text-[26px] font-bold tracking-tight text-gray-950 md:text-[36px]">
            De ce să verifici anunțul înainte să suni agentul
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-gray-600 md:text-[16px]">
            Fără un reper, riști să plătești mai mult decât ar cere piața sau să negociezi în orb.
          </p>
        </div>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 sm:gap-5">
          {pains.map((p) => {
            const Icon = p.icon;
            return (
              <li
                key={p.text}
                className="flex gap-4 rounded-2xl border border-slate-200/90 bg-slate-50/50 p-5 md:p-6"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
                </span>
                <p className="text-left text-[14px] font-medium leading-relaxed text-slate-800 md:text-[15px]">
                  {p.text}
                </p>
              </li>
            );
          })}
        </ul>

        <div className="mt-10 flex justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center justify-center rounded-full bg-gray-900 px-8 py-3.5 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
          >
            Verifică un anunț
          </Link>
        </div>
      </div>
    </section>
  );
}
