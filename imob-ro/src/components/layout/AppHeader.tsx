"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/pricing", label: "Preturi" },
  { href: "/how-we-estimate", label: "Metodologie" },
];

export default function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto max-w-[1200px] px-5">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 text-[18px] font-bold tracking-tight text-gray-900 transition-opacity hover:opacity-80"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 text-[11px] font-extrabold text-white">
              iI
            </span>
            ImobIntel
          </Link>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full px-4 py-2 text-[13px] font-medium transition-all duration-200",
                  pathname === link.href
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* CTA */}
          <Link
            href="/analyze"
            className="inline-flex items-center rounded-full bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-2 text-[13px] font-semibold text-white shadow-sm hover:shadow-md hover:brightness-110 active:scale-[0.97] transition-all duration-200"
          >
            Analizeaza acum
          </Link>
        </div>
      </div>

      {/* Subtle bottom separator */}
      <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
    </header>
  );
}
