"use client";
import { Link2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { flags } from "@/lib/flags";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; match: "path" | "home" | "ghid" };

function buildNavItems(): NavItem[] {
  const items: NavItem[] = [
    { href: "/analyze", label: "Verifică anunț", match: "path" },
    { href: "/cum-functioneaza", label: "Cum funcționează", match: "path" },
    { href: "/pricing", label: "Prețuri", match: "path" },
    { href: "/ghid", label: "Ghiduri", match: "ghid" },
  ];
  if (flags.navBucharestZones) {
    items.push({ href: "/bucuresti", label: "Zone București", match: "path" });
  }
  return items;
}

function isActive(pathname: string, item: NavItem): boolean {
  if (item.match === "home") {
    return pathname === "/";
  }
  if (item.match === "ghid") {
    return pathname === "/ghid" || pathname.startsWith("/ghid/");
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export default function AppHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = buildNavItems();

  return (
    <header className="sticky top-0 z-50 bg-white/60 backdrop-blur-2xl supports-[backdrop-filter]:bg-white/50 border-b border-gray-100/80">
      <div className="mx-auto max-w-[1200px] px-5">
        <div className="flex h-[60px] items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2.5 group shrink-0 min-w-0">
            <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 via-blue-500 to-blue-700 text-[11px] font-extrabold text-white shadow-sm shadow-blue-500/25 group-hover:shadow-md group-hover:shadow-blue-500/30 transition-shadow">
              iI
            </span>
            <span className="text-[17px] font-bold tracking-tight text-gray-900">
              Imob
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-700">
                Intel
              </span>
            </span>
          </Link>

          <nav
            className="hidden md:flex items-center gap-0.5 bg-gray-50/80 rounded-full px-1.5 py-1 border border-gray-100/80 max-w-[min(100%,62vw)] overflow-x-auto"
            aria-label="Navigare principală"
          >
            {items.map((link) => (
              <Link
                key={link.href + link.label}
                href={link.href}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[12px] font-medium transition-all duration-200 whitespace-nowrap",
                  isActive(pathname, link)
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-900",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Link
              href="/profile"
              className="hidden sm:inline-flex text-[13px] font-medium text-gray-500 hover:text-gray-900 transition-colors px-2 py-1.5"
            >
              Rapoarte
            </Link>
            <Link
              href="/account"
              className="hidden sm:inline-flex text-[13px] font-medium text-gray-500 hover:text-gray-900 transition-colors px-2 py-1.5"
            >
              Cont
            </Link>
            <Link
              href="/analyze"
              className="inline-flex items-center gap-1.5 rounded-full bg-gray-900 px-3.5 sm:px-5 py-2 text-[12px] sm:text-[13px] font-semibold text-white shadow-sm hover:bg-gray-800 hover:shadow-md active:scale-[0.97] transition-all duration-200"
            >
              <Link2 className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
              <span className="hidden sm:inline">Verifică anunț</span>
              <span className="sm:hidden">Anunț</span>
            </Link>

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-gray-500 hover:text-gray-900 transition-colors"
              aria-label="Menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 9h16.5m-16.5 6.75h16.5"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white/95 backdrop-blur-xl">
          <div className="px-5 py-3 space-y-1">
            {items.map((link) => (
              <Link
                key={link.href + link.label + "m"}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "block rounded-lg px-3 py-2.5 text-[14px] font-medium transition-colors",
                  isActive(pathname, link)
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
