"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/pricing", label: "Preturi" },
  { href: "/how-we-estimate", label: "Metodologie" },
];

export default function AppHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/60 backdrop-blur-2xl supports-[backdrop-filter]:bg-white/50 border-b border-gray-100/80">
      <div className="mx-auto max-w-[1200px] px-5">
        <div className="flex h-[60px] items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 group"
          >
            <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 via-blue-500 to-violet-600 text-[11px] font-extrabold text-white shadow-sm shadow-blue-500/25 group-hover:shadow-md group-hover:shadow-blue-500/30 transition-shadow">
              iI
            </span>
            <span className="text-[17px] font-bold tracking-tight text-gray-900">
              Imob<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600">Intel</span>
            </span>
          </Link>

          {/* Center Nav - desktop */}
          <nav className="hidden md:flex items-center gap-0.5 bg-gray-50/80 rounded-full px-1.5 py-1 border border-gray-100/80">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full px-4 py-1.5 text-[13px] font-medium transition-all duration-200",
                  pathname === link.href
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-900",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="hidden md:inline-flex text-[13px] font-medium text-gray-500 hover:text-gray-900 transition-colors px-3 py-1.5"
            >
              Rapoarte
            </Link>
            <Link
              href="/account"
              className="hidden md:inline-flex text-[13px] font-medium text-gray-500 hover:text-gray-900 transition-colors px-3 py-1.5"
            >
              Cont
            </Link>
            <Link
              href="/analyze"
              className="inline-flex items-center gap-1.5 rounded-full bg-gray-900 px-5 py-2 text-[13px] font-semibold text-white shadow-sm hover:bg-gray-800 hover:shadow-md active:scale-[0.97] transition-all duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              Analizeaza
            </Link>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-gray-500 hover:text-gray-900 transition-colors"
              aria-label="Menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white/95 backdrop-blur-xl">
          <div className="px-5 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "block rounded-lg px-3 py-2.5 text-[14px] font-medium transition-colors",
                  pathname === link.href
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-50",
                )}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/profile"
              onClick={() => setMobileOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-[14px] font-medium text-gray-600 hover:bg-gray-50"
            >
              Rapoartele mele
            </Link>
            <Link
              href="/account"
              onClick={() => setMobileOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-[14px] font-medium text-gray-600 hover:bg-gray-50"
            >
              Contul meu
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
