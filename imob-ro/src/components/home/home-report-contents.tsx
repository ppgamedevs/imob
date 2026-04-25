import Link from "next/link";
import {
  AlertOctagon,
  FileText,
  GitCompareArrows,
  MessageCircleQuestion,
  Scale,
  TrendingUp,
} from "lucide-react";

import { RAPORT_EXEMPLU_PATH } from "@/lib/report/sample-public-report";

const blocks = [
  {
    icon: TrendingUp,
    title: "Estimare orientativă de preț",
    text: "Reper din model și zonă, ca orientare înainte de ofertă, nu certitudine.",
  },
  {
    icon: GitCompareArrows,
    title: "Comparabile",
    text: "Proprietăți apropiate ca profil, acolo unde există date publice utile.",
  },
  {
    icon: AlertOctagon,
    title: "Riscuri și date lipsă",
    text: "Semnale care pot influența decizia, plus limitele când anunțul e subțire.",
  },
  {
    icon: MessageCircleQuestion,
    title: "Întrebări pentru agent",
    text: "Formulări utile la vizionare, legate de ce apare în anunț sau în raport.",
  },
  {
    icon: Scale,
    title: "Argumente de negociere",
    text: "Puncte ancorate în date, nu replici generice de pe internet.",
  },
  {
    icon: FileText,
    title: "PDF",
    text: "Export după deblocare, ca să ai totul la un loc când compari oferte.",
  },
] as const;

export function HomeReportContents() {
  return (
    <section className="border-t border-gray-100 bg-white py-20 md:py-28">
      <div className="mx-auto max-w-[1100px] px-5">
        <div className="mx-auto max-w-[580px] text-center">
          <h2 className="text-[26px] font-bold tracking-tight text-gray-950 md:text-[36px]">
            Ce primești în raportul complet
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-gray-600">
            O previzualizare îți arată direcția; deblocarea aduce conținutul de mai jos, acolo unde
            datele permit o explicație utilă cumpărătorului.
          </p>
          <p className="mt-3 text-[14px] text-gray-600">
            <Link
              href={RAPORT_EXEMPLU_PATH}
              className="font-medium text-blue-600 underline decoration-blue-600/30 underline-offset-2 hover:text-blue-800"
            >
              Raport complet exemplu
            </Link>{" "}
            (demonstrativ, fără plată): aranjarea reală a secțiunilor.
          </p>
        </div>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {blocks.map((b) => {
            const Icon = b.icon;
            return (
              <li
                key={b.title}
                className="flex gap-3 rounded-2xl border border-gray-100 bg-gray-50/50 p-5 md:p-6"
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

        <div className="mt-12 flex justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center justify-center rounded-full border-2 border-gray-900 bg-white px-8 py-3.5 text-[15px] font-semibold text-gray-900 shadow-sm transition-colors hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
          >
            Verifică un anunț
          </Link>
        </div>
      </div>
    </section>
  );
}
