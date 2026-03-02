import Link from "next/link";

const productLinks = [
  { href: "/analyze", label: "Analizeaza" },
  { href: "/pricing", label: "Preturi" },
  { href: "/cum-estimam", label: "Cum estimam" },
];

const legalLinks = [
  { href: "/termeni", label: "Termeni si conditii" },
  { href: "/confidentialitate", label: "Confidentialitate" },
];

export default function AppFooter() {
  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="mx-auto max-w-[1200px] px-5 py-14 md:py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="text-[17px] font-bold tracking-tight text-gray-900">
              ImobIntel
            </Link>
            <p className="mt-3 max-w-[240px] text-[13px] leading-relaxed text-gray-500">
              Platforma de analiza imobiliara pentru investitori si cumparatori din Romania.
            </p>
          </div>

          {/* Produs */}
          <div>
            <h4 className="text-[13px] font-semibold uppercase tracking-wider text-gray-400">
              Produs
            </h4>
            <ul className="mt-4 space-y-3">
              {productLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-[14px] text-gray-600 hover:text-gray-900 transition-colors duration-200"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-[13px] font-semibold uppercase tracking-wider text-gray-400">
              Legal
            </h4>
            <ul className="mt-4 space-y-3">
              {legalLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-[14px] text-gray-600 hover:text-gray-900 transition-colors duration-200"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-[13px] font-semibold uppercase tracking-wider text-gray-400">
              Contact
            </h4>
            <ul className="mt-4 space-y-3">
              <li>
                <a
                  href="mailto:contact@imobintel.ro"
                  className="text-[14px] text-gray-600 hover:text-gray-900 transition-colors duration-200"
                >
                  contact@imobintel.ro
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-gray-100 pt-8">
          <span className="text-[13px] text-gray-400">
            &copy; {new Date().getFullYear()} ImobIntel. Toate drepturile rezervate.
          </span>
        </div>
      </div>
    </footer>
  );
}
