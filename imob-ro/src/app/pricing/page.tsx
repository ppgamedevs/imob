import { BuyerReportTrustNote } from "@/components/common/buyer-report-trust-note";
import { ReportDisclaimer } from "@/components/common/ReportDisclaimer";
import { getReportUnlockPriceRon } from "@/lib/billing/report-unlock";
import { getLaunchPriceBadgeRo } from "@/lib/copy/launch-pricing-ro";
import { flags } from "@/lib/flags";
import {
  pricingFaqRefunds,
  REPORT_UNLOCK_NO_REFUND_FOR_DISAGREEMENT_RO,
  REPORT_UNLOCK_REFUND_POLICY_RO,
} from "@/lib/copy/report-unlock-refund-ro";
import { RAPORT_EXEMPLU_PATH } from "@/lib/report/sample-public-report";
import { Check } from "lucide-react";
import Link from "next/link";

const BUNDLE_RON = 75;
const proDisplayRon = process.env.NEXT_PUBLIC_SUBSCRIPTION_PRO_RON?.trim() || "499";

const faqItems: { q: string; a: string }[] = [
  {
    q: "Este evaluare oficială?",
    a: "Nu. ImobIntel nu oferă evaluare autorizată ANEVAR, expertiză juridică sau certificat notarial. Primești o analiză orientativă pe baza anunțurilor publice și a unor modele interne, ca să compari și să negociezi cu mai mult context.",
  },
  {
    q: "De unde vin datele?",
    a: "Din surse publice: anunțuri (de exemplu de pe imobiliare.ro, storia.ro, olx și altele, în funcție de integrări) și ceea ce reiese din conținutul introdus. Nu avem acces la contracte reale, dosare sau informații nepublicate despre fiecare apartament.",
  },
  {
    q: "Ce este „referința fiscală notarială” din raport?",
    a: "Reper fiscal folosit în contexte notariale, ca să te poziționezi față de preț, nu preț de piață complet și nu estimare a onorariului notarului. Detaliile fiscale concrete le stabilește notarul la cazul tău.",
  },
  ...pricingFaqRefunds,
  {
    q: "Pot folosi raportul la negociere?",
    a: "Da, ca reper și punct de plecare, împreună cu alte verificări. Nu e o dovadă de valoare recunoscută instituțional în fața terților; folosește-l ca un brief, nu ca evaluare certificată.",
  },
];

export default function PricingPage() {
  const unlockRon = getReportUnlockPriceRon();
  const launchBadge = getLaunchPriceBadgeRo();
  const bundleIsLive = flags.reportBundle;
  const cardCount =
    1 + (flags.pricingShowBundleCard ? 1 : 0) + (flags.pricingShowSubscription ? 1 : 0);
  const gridCols =
    cardCount === 3
      ? "md:grid-cols-3"
      : cardCount === 2
        ? "md:grid-cols-2"
        : "md:max-w-md md:mx-auto";

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-16 md:py-24">
      <header className="mb-12 text-center">
        <h1 className="text-[32px] font-bold tracking-tight text-gray-950 md:text-[44px]">
          Plătești când vrei un raport complet
        </h1>
        <p className="mt-3 max-w-[600px] mx-auto text-[16px] leading-relaxed text-gray-600 md:text-[17px]">
          Oferta principală este deblocarea o singură dată, pentru un apartament. Abonamentul Pro rămâne
          opțional, pentru cine are multe analize.
        </p>
        <div className="mt-6 max-w-[640px] mx-auto text-left sm:text-center">
          <BuyerReportTrustNote variant="compact" className="text-gray-500" />
        </div>
        <p className="mt-6 text-center text-[14px] text-gray-600">
          <Link
            href={RAPORT_EXEMPLU_PATH}
            className="font-medium text-blue-600 underline decoration-blue-600/30 underline-offset-2 hover:text-blue-800"
          >
            Raport complet exemplu
          </Link>
          : vezi layoutul real (date demonstrative, fără plată).
        </p>
      </header>

      {/* Product ladder */}
      <div className={`grid grid-cols-1 gap-5 ${gridCols}`}>
        {/* 1) One-time unlock */}
        <div className="relative flex flex-col rounded-2xl border border-blue-200 bg-white p-6 shadow-xl shadow-blue-100/50 ring-1 ring-blue-100">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="inline-flex items-center rounded-full bg-gradient-to-r from-blue-600 to-blue-700 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm">
              Recomandat
            </span>
          </div>
          <h2 className="text-[18px] font-semibold text-gray-900">Raport complet</h2>
          <p className="mt-0.5 text-[13px] text-gray-500">O singură plată, un apartament</p>
          <div className="mb-1 mt-5">
            {launchBadge ? (
              <p className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-gray-500">
                {launchBadge}
              </p>
            ) : null}
            <span className="text-[40px] font-bold tracking-tight text-gray-950">
              {Number.isInteger(unlockRon) ? String(unlockRon) : unlockRon}
            </span>
            <span className="ml-1 text-[14px] font-medium text-gray-400">RON</span>
            <span className="ml-1 text-[14px] text-gray-500">(o singură dată)</span>
          </div>
          <p className="mb-5 text-[12px] text-gray-400">
            Prețul e configurat pe server; suma de mai sus e cea aplicată la deblocare.
          </p>
          <ul className="mb-6 flex-1 space-y-2.5 text-[13px] text-gray-600">
            {[
              "estimare de preț și semnale de piață (orientativ, nu ofertă de preț)",
              "comparabile din surse publice",
              "riscuri acolo unde există date",
              "puncte de negociere ca reper",
              "PDF (după deblocare)",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" strokeWidth={2.5} />
                {item}
              </li>
            ))}
          </ul>
          <Link
            href="/analyze"
            className="block w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 py-3 text-center text-[14px] font-semibold text-white shadow-sm transition active:scale-[0.98] hover:brightness-110"
          >
            Deblochează un raport
          </Link>
          <p className="mt-2 text-center text-[12px] text-gray-500">
            Începe cu o analiză; deblocarea o plătești când ești gata, din pagina de raport.
          </p>
          <p className="mt-3 text-center text-[12px] leading-relaxed text-gray-600">
            {REPORT_UNLOCK_REFUND_POLICY_RO} {REPORT_UNLOCK_NO_REFUND_FOR_DISAGREEMENT_RO}
          </p>
        </div>

        {flags.pricingShowBundleCard && (
          <div
            className={`relative flex flex-col rounded-2xl border p-6 ${
              bundleIsLive
                ? "border-gray-200 bg-white hover:shadow-md"
                : "border-dashed border-gray-300 bg-gray-50/80"
            }`}
          >
            <h2 className="text-[18px] font-semibold text-gray-900">Pachet cumpărător</h2>
            <p className="mt-0.5 text-[13px] text-gray-500">Pentru cine compară mai multe apartamente</p>
            <div className="mb-6 mt-5">
              <span className="text-[32px] font-bold tracking-tight text-gray-950">{BUNDLE_RON}</span>
              <span className="ml-1 text-[14px] font-medium text-gray-400">RON</span>
              {!bundleIsLive && (
                <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                  în curând
                </span>
              )}
            </div>
            <ul className="mb-6 flex-1 space-y-2.5 text-[13px] text-gray-600">
              {["5 rapoarte complete", "rapoarte salvate", "PDF", "comparație (suport)"].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check
                    className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${bundleIsLive ? "text-emerald-500" : "text-gray-300"}`}
                    strokeWidth={2.5}
                  />
                  {item}
                </li>
              ))}
            </ul>
            {bundleIsLive ? (
              <span className="block w-full rounded-xl border border-gray-300 py-3 text-center text-[14px] font-semibold text-gray-500">
                În pregătire
              </span>
            ) : (
              <span className="block w-full cursor-not-allowed rounded-xl border border-gray-200 bg-white py-3 text-center text-[14px] font-medium text-gray-400">
                Disponibil în curând
              </span>
            )}
          </div>
        )}

        {flags.pricingShowSubscription && (
          <div className="flex flex-col rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="text-[18px] font-semibold text-gray-900">Investitor / agent</h2>
            <p className="mt-0.5 text-[13px] text-gray-500">
              Rapoarte nelimitate în cont, acces prin API pentru integrări
            </p>
            <div className="mb-1 mt-5">
              <span className="text-[32px] font-bold tracking-tight text-gray-950">{proDisplayRon}</span>
              <span className="ml-1 text-[14px] font-medium text-gray-400">RON/lună</span>
            </div>
            <p className="mb-4 text-[12px] text-gray-400">Sumă indicativă, confirmi în Stripe</p>
            <ul className="mb-6 flex-1 space-y-2.5 text-[13px] text-gray-600">
              {[
                "analize (raport complet) nelimitate, în limita cotelor tehnice afișate în cont (plan Pro)",
                "acces prin API public (chei, rate limits și documentație din cont, după abonare)",
                "cote ridicate PDF, scor detaliat, comparații avansate, export CSV — conform planului Pro",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" strokeWidth={2.5} />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/subscribe"
              className="block w-full rounded-xl border border-gray-300 bg-white py-3 text-center text-[14px] font-semibold text-gray-800 transition hover:border-gray-400 hover:bg-gray-50"
            >
              Vezi abonamentul Pro
            </Link>
            <p className="mt-2 text-center text-[12px] text-gray-500">
              O singură opțiune de plată în aplicație (Stripe) pentru acest abonament.
            </p>
          </div>
        )}
      </div>

      {/* Live vs roadmap */}
      <section className="mt-14 rounded-2xl border border-gray-200 bg-gray-50/60 p-6 md:p-8">
        <h2 className="text-[18px] font-semibold text-gray-900">Ce e activ acum</h2>
        <ul className="mt-3 space-y-3 text-[14px] text-gray-600">
          <li className="sm:flex sm:gap-3">
            <span className="block shrink-0 font-medium text-gray-800 sm:min-w-[200px]">
              Deblocare o singură dată
            </span>
            <span>Live: plată Stripe, acces la raportul complet și PDF, după deblocare.</span>
          </li>
          <li className="sm:flex sm:gap-3">
            <span className="block shrink-0 font-medium text-gray-800 sm:min-w-[200px]">Abonament Pro</span>
            <span>
              Inclus: rapoarte nelimitate (în cotele contului) și acces API; un singur preț lunar în
              Stripe (afișat mai sus), fără variante deconectate.
            </span>
          </li>
          <li className="sm:flex sm:gap-3">
            <span className="block shrink-0 font-medium text-gray-400 sm:min-w-[200px]">Pachet 5 rapoarte</span>
            <span>
              Preț țintă {BUNDLE_RON} RON; încă nu e deschis la plată. Până atunci, deblocare per
              raport.
            </span>
          </li>
          <li className="sm:flex sm:gap-3">
            <span className="block shrink-0 font-medium text-gray-800 sm:min-w-[200px]">API public</span>
            <span>Inclus în abonamentul Pro: chei și documentație din cont, după activare.</span>
          </li>
        </ul>
      </section>

      <section className="mt-14">
        <h2 className="mb-4 text-center text-[18px] font-semibold text-gray-900">Notă legală (produse raport)</h2>
        <div className="mx-auto max-w-[720px]">
          <ReportDisclaimer variant="legal" className="text-[13px] leading-relaxed text-gray-700" />
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-14">
        <h2 className="mb-6 text-center text-[20px] font-semibold text-gray-900">Întrebări frecvente</h2>
        <div className="mx-auto max-w-[720px] space-y-2">
          {faqItems.map((item) => (
            <details
              key={item.q}
              className="group rounded-xl border border-gray-200 bg-white open:border-gray-300 open:shadow-sm"
            >
              <summary className="cursor-pointer px-4 py-3.5 text-left text-[14px] font-medium text-gray-900 marker:text-gray-400">
                {item.q}
              </summary>
              <p className="border-t border-gray-100 px-4 pb-4 pt-0 text-[13px] leading-relaxed text-gray-600">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      <div className="mt-10 text-center">
        <p className="text-[13px] text-gray-500">Plăți securizate prin Stripe unde este cazul.</p>
        <p className="mt-1 text-[12px] text-gray-400">
          Abonamentul poate fi gestionat din cont; deblocarea e per raport, nu o lunare obligatorie.
        </p>
      </div>
    </div>
  );
}
