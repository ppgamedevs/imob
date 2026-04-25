import Link from "next/link";
import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";

import { BuyerReportTrustNote } from "@/components/common/buyer-report-trust-note";
import { flags } from "@/lib/flags";

/** Core navigation (no duplicate legal index pages; those sit under „Legal”). */
const primaryNavLinks = [
  { href: "/analyze", label: "Verifică anunț" },
  { href: "/cum-functioneaza", label: "Cum funcționează" },
  { href: "/pricing", label: "Prețuri" },
  { href: "/date-si-metodologie", label: "Metodologie" },
  { href: "/ghid", label: "Ghiduri" },
  { href: "/contact", label: "Contact" },
] as const;

const legalPageLinks = [
  { href: "/termeni", label: "Termeni" },
  { href: "/confidentialitate", label: "Confidențialitate" },
  { href: "/cookies", label: "Cookie-uri" },
  { href: "/prelucrare-date", label: "Prelucrare date" },
] as const;

/** External legal trust destinations (unchanged URLs). */
const legalTrustRail = [
  {
    href: "https://anpc.ro/ce-este-sal/",
    badge: "ANPC",
    title: "Soluționarea alternativă a litigiilor",
    subtitle: "Cadrul național și informații oficiale pentru consumatori",
  },
  {
    href: "https://ec.europa.eu/consumers/odr",
    badge: "SOL",
    title: "Soluționarea online a litigiilor",
    subtitle: "Platforma europeană ODR, Comisia Europeană",
  },
  {
    href: "https://www.anaf.ro/anaf/internet/ANAF/servicii_online/verificare_informatii",
    badge: "ANAF",
    title: "Verificare ANAF",
    subtitle: "Servicii online ANAF, verificări oficiale",
  },
  {
    href: "https://consumer-redress.ec.europa.eu/site-relocation_en?event=main.home2.show&lng=RO",
    badge: "UE",
    title: "Litigii consumatori UE",
    subtitle: "Redresare transfrontalieră, Comisia Europeană",
  },
] as const;

function optionalProductLinks() {
  const out: { href: string; label: string }[] = [];
  if (flags.secondaryProductNav) {
    out.push({ href: "/estimare", label: "Estimare rapidă" });
  }
  if (flags.navSearch) {
    out.push({ href: "/search", label: "Căutare" });
  }
  if (flags.discover) {
    out.push({ href: "/discover", label: "Descoperă anunțuri" });
  }
  if (flags.navBucharestZones) {
    out.push({ href: "/bucuresti", label: "Zone București" });
  }
  if (flags.devProjects) {
    out.push({ href: "/developments", label: "Proiecte" });
  }
  return out;
}

const socialPlatformIcons: {
  key: string;
  label: string;
  icon: ReactNode;
}[] = [
  {
    key: "fb",
    label: "Facebook",
    icon: (
      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    key: "ig",
    label: "Instagram",
    icon: (
      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227a3.81 3.81 0 0 1-.899 1.382 3.744 3.744 0 0 1-1.38.896c-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421a3.716 3.716 0 0 1-1.379-.899 3.644 3.644 0 0 1-.9-1.38c-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 1 1-2.882 0 1.441 1.441 0 0 1 2.882 0z" />
      </svg>
    ),
  },
  {
    key: "tt",
    label: "TikTok",
    icon: (
      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
  },
  {
    key: "in",
    label: "LinkedIn",
    icon: (
      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 0 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    key: "yt",
    label: "YouTube",
    icon: (
      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
];

const SOCIAL_HREFS: Record<string, string> = {
  fb: "https://www.facebook.com/imobintel",
  ig: "https://www.instagram.com/imobintel",
  tt: "https://www.tiktok.com/@imobintel",
  in: "https://www.linkedin.com/company/imobintel",
  yt: "https://www.youtube.com/@imobintel",
};

function isValidSocialUrl(href: string): boolean {
  const t = href.trim();
  if (!t || t === "#") return false;
  if (/placeholder|example\.com|your-|changeme|TODO/i.test(t)) return false;
  try {
    const u = new URL(t);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

const columnHeading = "text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500";

export default function AppFooter() {
  const opt = optionalProductLinks();
  const socialEntries = socialPlatformIcons
    .map((p) => ({ ...p, href: SOCIAL_HREFS[p.key] ?? "" }))
    .filter((p) => isValidSocialUrl(p.href));

  return (
    <footer className="border-t border-zinc-200/90 bg-zinc-50/50">
      <div className="mx-auto max-w-[1200px] px-5 py-16 md:py-20">
        <div className="grid grid-cols-1 gap-10 sm:gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <Link href="/" className="inline-flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-[10px] font-extrabold text-white shadow-sm">
                iI
              </span>
              <span className="text-base font-bold tracking-tight text-zinc-900">ImobIntel</span>
            </Link>
            <p className="mt-4 max-w-[300px] text-[13px] leading-relaxed text-zinc-600">
              Raport pentru cumpărători: lipești un anunț, vezi o previzualizare, apoi deblochezi
              detaliile când ești gata.
            </p>
            <div className="mt-4 max-w-[300px]">
              <BuyerReportTrustNote variant="compact" className="text-[11px] text-zinc-500" />
            </div>
            {socialEntries.length > 0 ? (
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {socialEntries.map((s) => (
                  <a
                    key={s.key}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200/90 bg-white text-zinc-500 shadow-sm transition-all hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-800"
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          {/* Navigare */}
          <div>
            <h4 className={columnHeading}>Navigare</h4>
            <ul className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-x-4 md:grid-cols-1">
              {primaryNavLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-[13px] text-zinc-600 transition-colors hover:text-zinc-900"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            {opt.length > 0 && (
              <div className="mt-6">
                <h4 className={columnHeading}>Mai multe (opțional)</h4>
                <ul className="mt-3 space-y-2">
                  {opt.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className="text-[13px] text-zinc-500 transition-colors hover:text-zinc-800"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Cont */}
          <div>
            <h4 className={columnHeading}>Cont</h4>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link
                  href="/profile"
                  className="text-[13px] text-zinc-600 transition-colors hover:text-zinc-900"
                >
                  Rapoartele mele
                </Link>
              </li>
              <li>
                <Link
                  href="/account"
                  className="text-[13px] text-zinc-600 transition-colors hover:text-zinc-900"
                >
                  Setări cont
                </Link>
              </li>
            </ul>
            <div className="mt-6 text-[12px] text-zinc-500">
              <a href="mailto:contact@imobintel.ro" className="hover:text-zinc-800">
                contact@imobintel.ro
              </a>
            </div>
            {flags.agents && (
              <p className="mt-1 text-[11px] text-zinc-400">
                <Link href="/a/signin" className="underline hover:text-zinc-600">
                  Spațiu agenți
                </Link>
              </p>
            )}
            {flags.owners && (
              <p className="mt-1 text-[11px] text-zinc-400">
                <Link href="/vinde" className="underline hover:text-zinc-600">
                  Pentru proprietari
                </Link>
              </p>
            )}
          </div>

          {/* Legal (internal pages) */}
          <div>
            <h4 className={columnHeading}>Legal</h4>
            <ul className="mt-4 space-y-2.5">
              {legalPageLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-[13px] text-zinc-600 transition-colors hover:text-zinc-900"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Legal trust rail: external official links */}
        <div
          className="mt-14 border-t border-zinc-200/80 pt-10"
          aria-label="Resurse oficiale consumatori"
        >
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
            Conformare și resurse oficiale
          </p>
          <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
            {legalTrustRail.map((item) => (
              <li key={item.href} className="flex min-h-0 sm:min-h-[132px]">
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex h-full w-full min-h-[120px] flex-col rounded-2xl border border-zinc-200/80 bg-white/80 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-white hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-lg bg-zinc-100/90 text-[10px] font-semibold tabular-nums text-zinc-600 ring-1 ring-zinc-200/80">
                      {item.badge}
                    </span>
                    <ExternalLink
                      className="h-3.5 w-3.5 shrink-0 text-zinc-300 transition-colors group-hover:text-zinc-500"
                      aria-hidden
                    />
                  </div>
                  <p className="mt-3 text-[13px] font-semibold leading-snug text-zinc-900">
                    {item.title}
                  </p>
                  <p className="mt-1 flex-1 text-[11px] leading-relaxed text-zinc-500">{item.subtitle}</p>
                  <span className="mt-2 text-[10px] font-medium text-zinc-400">Site extern</span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 border-t border-zinc-200/80 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row md:items-start">
            <div className="flex max-w-2xl flex-col flex-wrap items-center gap-x-2 gap-y-1 text-center text-[12px] text-zinc-400 sm:flex-row sm:justify-center md:justify-start md:text-left">
              <span>Copyright © {new Date().getFullYear()} OnlyTips SRL</span>
              <span className="hidden sm:inline" aria-hidden>
                ·
              </span>
              <span>CUI: 43414871</span>
              <span className="hidden sm:inline" aria-hidden>
                ·
              </span>
              <span>Toate drepturile rezervate</span>
            </div>
            <nav
              className="flex max-w-md flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-zinc-400 md:justify-end"
              aria-label="Linkuri legale scurte"
            >
              <a
                href="https://anpc.ro/ce-este-sal/"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-zinc-600"
              >
                SAL (ANPC)
              </a>
              <a
                href="https://ec.europa.eu/consumers/odr"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-zinc-600"
              >
                ODR
              </a>
              <a
                href="https://www.anaf.ro/anaf/internet/ANAF/servicii_online/verificare_informatii"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-zinc-600"
              >
                Verificare ANAF
              </a>
              <a
                href="https://consumer-redress.ec.europa.eu/site-relocation_en?event=main.home2.show&lng=RO"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-zinc-600"
              >
                Litigii consumatori UE
              </a>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
