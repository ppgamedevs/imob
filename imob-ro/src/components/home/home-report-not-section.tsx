import { Ban } from "lucide-react";

const items = [
  "Nu este ANEVAR.",
  "Nu este verificare juridică.",
  "Nu este garanție de preț.",
] as const;

export function HomeReportNotSection() {
  return (
    <section className="border-t border-gray-200 bg-slate-50/80 py-16 md:py-20">
      <div className="mx-auto max-w-[720px] px-5">
        <h2 className="text-center text-[22px] font-bold tracking-tight text-gray-950 md:text-[28px]">
          Ce nu este raportul
        </h2>
        <p className="mx-auto mt-3 max-w-[520px] text-center text-[14px] leading-relaxed text-gray-600">
          Raportul e un reper de cumpărător, nu un act sau o expertiză oficiale.
        </p>
        <ul className="mx-auto mt-8 max-w-[560px] space-y-3">
          {items.map((line) => (
            <li
              key={line}
              className="flex items-start gap-3 rounded-xl border border-slate-200/90 bg-white px-4 py-3 text-left text-[14px] leading-relaxed text-slate-800 shadow-sm"
            >
              <Ban className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" strokeWidth={2} aria-hidden />
              {line}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
