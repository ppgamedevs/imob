import { Activity, GitCompareArrows, ShieldAlert, TrendingUp } from "lucide-react";

const blocks = [
  {
    icon: TrendingUp,
    title: "Preț estimat și interval corect",
    text: "Vezi unde se poziționează anunțul față de ce arată comparabilele și modelul.",
  },
  {
    icon: GitCompareArrows,
    title: "Comparabile reale din zonă",
    text: "Proprietăți apropiate ca suprafață, camere și zonă — nu agregări vagi.",
  },
  {
    icon: Activity,
    title: "Timp estimat până la vânzare",
    text: "Perspectivă asupra cât de lichidă e piața pentru profilul respectiv.",
  },
  {
    icon: ShieldAlert,
    title: "Riscuri care pot afecta decizia",
    text: "De la seismic la semnale de piață — context, nu alarmism.",
  },
] as const;

export function HomeReportContents() {
  return (
    <section className="border-t border-gray-100 bg-white py-20 md:py-28">
      <div className="mx-auto max-w-[1100px] px-5">
        <div className="mx-auto max-w-[560px] text-center">
          <h2 className="text-[26px] font-bold tracking-tight text-gray-950 md:text-[38px]">
            Ce primești în raport
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-gray-600">
            Patru zone pe care le vezi structurate, ușor de citit și de folosit într-o discuție cu
            agentul sau banca.
          </p>
        </div>

        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:gap-8">
          {blocks.map((b) => {
            const Icon = b.icon;
            return (
              <li
                key={b.title}
                className="flex gap-4 rounded-2xl border border-gray-100 bg-gray-50/40 p-5 md:p-6"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 shadow-sm">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold text-gray-900">{b.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-gray-600">{b.text}</p>
                </div>
              </li>
            );
          })}
        </ul>

        <p className="mx-auto mt-10 max-w-[520px] text-center text-[13px] leading-relaxed text-gray-500">
          Trei pași simpli: lipești linkul, analizăm anunțul, primești raportul. Fără cont
          obligatoriu pentru prima verificare.
        </p>
      </div>
    </section>
  );
}
