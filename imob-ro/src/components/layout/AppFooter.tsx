import Link from "next/link";

const productLinks = [
  { href: "/analyze", label: "Analizeaza" },
  { href: "/estimare", label: "Estimare pret" },
  { href: "/pricing", label: "Preturi" },
  { href: "/how-we-estimate", label: "Metodologie" },
  { href: "/help", label: "Help Center" },
];

const legalLinks = [
  { href: "/termeni", label: "Termeni si conditii" },
  { href: "/confidentialitate", label: "Confidentialitate" },
  { href: "/cookies", label: "Politica cookie-uri" },
  { href: "/prelucrare-date", label: "Prelucrare date personale" },
];

const companyLinks = [
  { href: "/despre", label: "Despre ImobIntel" },
  { href: "/contact", label: "Contact" },
  { href: "/profile", label: "Rapoartele mele" },
  { href: "/account", label: "Contul meu" },
];

const socialLinks = [
  {
    href: "https://www.facebook.com/imobintel",
    label: "Facebook",
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 1.09.05 1.592.12v3.2h-1.209c-1.5 0-1.908.72-1.908 2.046v2.192h3.032l-.52 3.667h-2.512v7.98H9.101z" />
      </svg>
    ),
  },
  {
    href: "https://www.instagram.com/imobintel",
    label: "Instagram",
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2.982c2.937 0 3.285.011 4.445.064a6.087 6.087 0 0 1 2.042.379 3.408 3.408 0 0 1 1.265.823 3.408 3.408 0 0 1 .823 1.265 6.087 6.087 0 0 1 .379 2.042c.053 1.16.064 1.508.064 4.445s-.011 3.285-.064 4.445a6.087 6.087 0 0 1-.379 2.042 3.643 3.643 0 0 1-2.088 2.088 6.087 6.087 0 0 1-2.042.379c-1.16.053-1.508.064-4.445.064s-3.285-.011-4.445-.064a6.087 6.087 0 0 1-2.042-.379 3.408 3.408 0 0 1-1.265-.823 3.408 3.408 0 0 1-.823-1.265 6.087 6.087 0 0 1-.379-2.042c-.053-1.16-.064-1.508-.064-4.445s.011-3.285.064-4.445a6.087 6.087 0 0 1 .379-2.042 3.408 3.408 0 0 1 .823-1.265 3.408 3.408 0 0 1 1.265-.823 6.087 6.087 0 0 1 2.042-.379c1.16-.053 1.508-.064 4.445-.064M12 1c-2.987 0-3.362.013-4.535.066a8.074 8.074 0 0 0-2.67.511 5.392 5.392 0 0 0-1.949 1.27 5.392 5.392 0 0 0-1.269 1.948 8.074 8.074 0 0 0-.51 2.67C1.012 8.638 1 9.013 1 12s.013 3.362.066 4.535a8.074 8.074 0 0 0 .511 2.67 5.392 5.392 0 0 0 1.27 1.949 5.392 5.392 0 0 0 1.948 1.269 8.074 8.074 0 0 0 2.67.51C8.638 22.988 9.013 23 12 23s3.362-.013 4.535-.066a8.074 8.074 0 0 0 2.67-.511 5.625 5.625 0 0 0 3.218-3.218 8.074 8.074 0 0 0 .51-2.67C22.988 15.362 23 14.987 23 12s-.013-3.362-.066-4.535a8.074 8.074 0 0 0-.511-2.67 5.392 5.392 0 0 0-1.27-1.949 5.392 5.392 0 0 0-1.948-1.269 8.074 8.074 0 0 0-2.67-.51C15.362 1.012 14.987 1 12 1zm0 5.351A5.649 5.649 0 1 0 17.649 12 5.649 5.649 0 0 0 12 6.351zm0 9.316A3.667 3.667 0 1 1 15.667 12 3.667 3.667 0 0 1 12 15.667zm5.872-10.859a1.32 1.32 0 1 0 1.32 1.32 1.32 1.32 0 0 0-1.32-1.32z" />
      </svg>
    ),
  },
  {
    href: "https://www.tiktok.com/@imobintel",
    label: "TikTok",
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.51a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 10.86 4.43V12.8a8.2 8.2 0 0 0 4.79 1.53V10.9a4.84 4.84 0 0 1-.79.06 4.87 4.87 0 0 1-.42-4.27z" />
      </svg>
    ),
  },
  {
    href: "https://www.linkedin.com/company/imobintel",
    label: "LinkedIn",
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    href: "https://www.youtube.com/@imobintel",
    label: "YouTube",
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
];

export default function AppFooter() {
  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="mx-auto max-w-[1200px] px-5 py-14 md:py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5 md:gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-[10px] font-extrabold text-white">
                iI
              </span>
              <span className="text-[16px] font-bold tracking-tight text-gray-900">ImobIntel</span>
            </Link>
            <p className="mt-3 max-w-[220px] text-[13px] leading-relaxed text-gray-500">
              Platforma de analiza imobiliara pentru cumparatori si investitori din Romania.
            </p>
            {/* Social icons */}
            <div className="mt-5 flex items-center gap-2">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-400 transition-all hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Produs */}
          <div>
            <h4 className="text-[12px] font-semibold uppercase tracking-wider text-gray-400">
              Produs
            </h4>
            <ul className="mt-4 space-y-2.5">
              {productLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-[13px] text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Companie */}
          <div>
            <h4 className="text-[12px] font-semibold uppercase tracking-wider text-gray-400">
              Companie
            </h4>
            <ul className="mt-4 space-y-2.5">
              {companyLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-[13px] text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-[12px] font-semibold uppercase tracking-wider text-gray-400">
              Legal
            </h4>
            <ul className="mt-4 space-y-2.5">
              {legalLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-[13px] text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-[12px] font-semibold uppercase tracking-wider text-gray-400">
              Contact
            </h4>
            <ul className="mt-4 space-y-2.5">
              <li>
                <a
                  href="mailto:contact@imobintel.ro"
                  className="text-[13px] text-gray-600 hover:text-gray-900 transition-colors"
                >
                  contact@imobintel.ro
                </a>
              </li>
              <li>
                <Link href="/contact" className="text-[13px] text-gray-600 hover:text-gray-900 transition-colors">
                  Formular contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* ANPC / SOL badges */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a
            href="https://anpc.ro/ce-este-sal/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 rounded-lg border border-blue-100 bg-blue-50/50 px-4 py-2.5 text-[11px] font-medium text-gray-700 hover:border-blue-200 hover:shadow-sm transition-all"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white text-[9px] font-extrabold leading-none">
              ANPC
            </span>
            <span className="leading-tight">
              <span className="block font-semibold text-gray-900 text-[12px]">Solutionarea alternativa</span>
              a litigiilor
            </span>
          </a>
          <a
            href="https://ec.europa.eu/consumers/odr"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 rounded-lg border border-blue-100 bg-blue-50/50 px-4 py-2.5 text-[11px] font-medium text-gray-700 hover:border-blue-200 hover:shadow-sm transition-all"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-yellow-500 text-white text-[9px] font-extrabold leading-none">
              SOL
            </span>
            <span className="leading-tight">
              <span className="block font-semibold text-gray-900 text-[12px]">Solutionarea online</span>
              a litigiilor
            </span>
          </a>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 border-t border-gray-100 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-2 text-[12px] text-gray-400">
              <span>Copyright &copy; {new Date().getFullYear()} OnlyTips SRL</span>
              <span className="hidden sm:inline">&middot;</span>
              <span>CUI: 43414871</span>
              <span className="hidden sm:inline">&middot;</span>
              <span>Toate drepturile rezervate</span>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-gray-400">
              <a
                href="https://www.anaf.ro/anaf/internet/ANAF/servicii_online/verificare_informatii"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-500 transition-colors"
              >
                Verificare ANAF
              </a>
              <a
                href="https://consumer-redress.ec.europa.eu/site-relocation_en?event=main.home2.show&lng=RO"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-500 transition-colors"
              >
                Solutionare litigii EU
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
