import Link from "next/link";

import { Button } from "@/components/ui/button";

type Props = {
  className?: string;
};

/**
 * CTA reutilizabil pe ghidurile de cumpărare: îndreptare spre /analyze + /pricing.
 */
export function GuideCtaBlock({ className }: Props) {
  return (
    <div
      className={`my-8 rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 to-slate-50/80 p-5 shadow-sm sm:p-7 ${className ?? ""}`}
    >
      <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
        Ai găsit un anunț? Verifică-l cu ImobIntel.
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
        Lipește URL-ul dintr-o platformă: primești un reper de preț, comparabile apropiate și
        avertismente utile, fără a pretinde o evaluare ANEVAR sau o expertiză juridică. Rezultatul
        rămâne orientativ până la verificările tale reale.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button asChild size="default" className="w-full sm:w-auto">
          <Link href="/analyze">Analizează anunțul</Link>
        </Button>
        <Button asChild size="default" variant="outline" className="w-full sm:w-auto">
          <Link href="/pricing">Prețuri și deblocare raport complet</Link>
        </Button>
      </div>
    </div>
  );
}
