import Link from "next/link";

const productLinks = [
  { href: "/analyze", label: "Analizeaza" },
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
    color: "#1877F2",
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
    ),
  },
  {
    href: "https://www.instagram.com/imobintel",
    label: "Instagram",
    color: "#E4405F",
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
    ),
  },
  {
    href: "https://www.tiktok.com/@imobintel",
    label: "TikTok",
    color: "#000000",
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" /></svg>
    ),
  },
  {
    href: "https://www.linkedin.com/company/imobintel",
    label: "LinkedIn",
    color: "#0A66C2",
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
    ),
  },
  {
    href: "https://www.youtube.com/@imobintel",
    label: "YouTube",
    color: "#FF0000",
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
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
              Platforma de analiza imobiliara pentru investitori si cumparatori din Romania.
            </p>
            {/* Social icons - real brand colors */}
            <div className="mt-4 flex items-center gap-2.5">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-white transition-transform hover:scale-110 hover:shadow-md"
                  style={{ backgroundColor: s.color }}
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
