"use client";

import { Link2, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback, useEffect, useId, useState } from "react";

import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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

function ImobIntelBrand({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-3", className)}>
      <span
        className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-950 text-[10px] font-bold tracking-tight text-white shadow-[0_2px_12px_-3px_rgba(15,23,42,0.45),inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-slate-950/60"
        aria-hidden
      >
        <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.14)_0%,transparent_45%,rgba(15,23,42,0.2)_100%)]" />
        <span className="relative font-[system-ui] tracking-[-0.04em]">iI</span>
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-[1.05rem] font-semibold leading-none tracking-[-0.04em] text-slate-950 sm:text-[1.125rem]">
          Imob<span className="font-semibold text-slate-800">Intel</span>
        </span>
        <span className="mt-0.5 hidden text-[0.6rem] font-medium uppercase leading-none tracking-[0.2em] text-slate-400 min-[400px]:block">
          Rezultate clare, înainte de vizionare
        </span>
      </span>
    </span>
  );
}

function NavPillLink({
  href,
  children,
  active,
  onClick,
}: {
  href: string;
  children: ReactNode;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative inline-flex min-h-10 min-w-0 items-center justify-center rounded-full px-3.5 py-2 text-[13px] font-medium tracking-[-0.01em] transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 focus-visible:ring-offset-2",
        active
          ? "bg-slate-900 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
          : "text-slate-600 hover:bg-slate-100/90 hover:text-slate-900",
      )}
    >
      {children}
    </Link>
  );
}

function SecondaryTextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-10 min-w-0 items-center rounded-lg px-2.5 py-2 text-[13px] font-medium text-slate-600 transition-colors",
        "hover:bg-slate-100/60 hover:text-slate-900",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 focus-visible:ring-offset-2",
      )}
    >
      {children}
    </Link>
  );
}

export default function AppHeader() {
  const pathname = usePathname() ?? "/";
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuTitleId = useId();

  const items = buildNavItems();
  const isHome = pathname === "/";

  const onScroll = useCallback(() => {
    setScrolled(typeof window !== "undefined" && window.scrollY > 10);
  }, []);

  useEffect(() => {
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full",
        "transition-[box-shadow,background-color,border-color,backdrop-filter] duration-500 ease-out motion-reduce:transition-none",
        scrolled
          ? "border-b border-slate-200/70 bg-white/[0.88] shadow-[0_8px_32px_-12px_rgba(15,23,42,0.12),0_1px_0_rgba(255,255,255,0.6)_inset] backdrop-blur-xl supports-[backdrop-filter]:bg-white/80"
          : isHome
            ? "border-b border-slate-200/40 bg-white/55 shadow-none backdrop-blur-md supports-[backdrop-filter]:bg-white/45"
            : "border-b border-slate-200/50 bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/70",
      )}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:shadow focus:ring-2 focus:ring-slate-900/15"
      >
        Sari la conținut
      </a>
      <div
        className={cn(
          "mx-auto max-w-[1200px] px-4 sm:px-5",
          "motion-safe:animate-fade-up motion-reduce:animate-none",
          "transition-[padding] duration-300 ease-out motion-reduce:transition-none",
          scrolled ? "py-2.5" : "py-3.5",
        )}
      >
        <div className="flex min-h-0 items-center gap-3">
          <div className="min-w-0 flex-1">
            <Link
              href="/"
              className="group flex w-fit max-w-full items-center justify-start rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 focus-visible:ring-offset-2"
            >
              <ImobIntelBrand className="transition duration-200 ease-out will-change-transform group-hover:translate-y-[-0.5px] motion-reduce:transform-none" />
            </Link>
          </div>

          <nav
            className="hidden min-w-0 flex-[1.15] items-center justify-center md:flex"
            aria-label="Navigare principală"
          >
            <div
              className={cn(
                "inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full border p-1",
                "border-slate-200/70 bg-slate-50/50 shadow-[0_1px_2px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.9)]",
                "backdrop-blur-sm supports-[backdrop-filter]:bg-white/30 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              )}
            >
              {items.map((link) => (
                <NavPillLink
                  key={link.href + link.label}
                  href={link.href}
                  active={isActive(pathname, link)}
                >
                  {link.label}
                </NavPillLink>
              ))}
            </div>
          </nav>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-0.5 sm:gap-1.5">
            <div className="hidden min-w-0 items-center sm:flex sm:gap-0.5">
              <SecondaryTextLink href="/profile">Rapoarte</SecondaryTextLink>
              <span className="hidden h-4 w-px shrink-0 bg-slate-200 sm:block" aria-hidden />
              <SecondaryTextLink href="/account">Cont</SecondaryTextLink>
            </div>
            <CtaButton className="hidden md:inline-flex" />
            <CtaButton className="min-w-0 md:hidden" shortLabel />
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white/80 text-slate-700 shadow-sm backdrop-blur-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 md:hidden"
              aria-expanded={mobileOpen}
              aria-controls={menuTitleId}
              aria-label="Deschide meniul de navigare"
            >
              <Menu className="h-5 w-5" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen} modal>
        <SheetContent
          side="right"
          className="flex w-full max-w-sm flex-col gap-0 border-l border-slate-200/80 bg-[linear-gradient(180deg,rgb(255,255,255)_0%,rgb(250,250,250)_100%)] p-0 sm:max-w-sm"
        >
          <SheetHeader className="space-y-0 border-b border-slate-100 px-5 pb-4 pt-5 text-left sm:px-6">
            <SheetTitle id={menuTitleId} className="text-left text-base text-slate-900">
              Meniu ImobIntel
            </SheetTitle>
            <div className="pt-2">
              <ImobIntelBrand />
            </div>
            <p className="pt-1 text-left text-sm font-normal leading-snug text-slate-500">
              Alege o secțiune sau continuă spre analiza unui anunț.
            </p>
          </SheetHeader>
          <nav
            className="flex-1 space-y-0.5 overflow-y-auto overscroll-contain px-3 py-4"
            aria-label="Navigare principală (mobil)"
          >
            {items.map((link) => {
              const active = isActive(pathname, link);
              return (
                <SheetClose asChild key={link.href + link.label + "m"}>
                  <Link
                    href={link.href}
                    className={cn(
                      "flex min-h-12 items-center rounded-xl px-4 text-[15px] font-medium tracking-[-0.01em] transition-colors",
                      active
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-800 hover:bg-slate-100/90",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    {link.label}
                  </Link>
                </SheetClose>
              );
            })}
            <div className="my-2 border-t border-slate-100" />
            <SheetClose asChild>
              <Link
                href="/profile"
                className="flex min-h-12 items-center rounded-xl px-4 text-[15px] font-medium text-slate-800 hover:bg-slate-100/90"
              >
                Rapoarte
              </Link>
            </SheetClose>
            <SheetClose asChild>
              <Link
                href="/account"
                className="flex min-h-12 items-center rounded-xl px-4 text-[15px] font-medium text-slate-800 hover:bg-slate-100/90"
              >
                Cont
              </Link>
            </SheetClose>
          </nav>
          <div className="border-t border-slate-200/80 bg-white/70 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm">
            <SheetClose asChild>
              <CtaButton className="w-full justify-center" fullWidth />
            </SheetClose>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}

function CtaButton({
  className,
  shortLabel,
  fullWidth,
}: {
  className?: string;
  shortLabel?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <Link
      href="/analyze"
      className={cn(
        "group inline-flex min-w-0 max-w-full items-center justify-center gap-2 rounded-full border border-slate-900/5 bg-slate-950 text-white",
        "shadow-[0_2px_12px_-2px_rgba(15,23,42,0.35),inset_0_1px_0_rgba(255,255,255,0.1)]",
        "transition duration-200 ease-out motion-reduce:transform-none",
        "hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-[0_8px_24px_-6px_rgba(15,23,42,0.45)]",
        "active:translate-y-0 active:scale-[0.99]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30 focus-visible:ring-offset-2",
        fullWidth
          ? "min-h-[3rem] px-5 text-[15px] font-semibold tracking-[-0.02em]"
          : "min-h-10 px-3.5 text-[12.5px] font-semibold tracking-[-0.02em] sm:min-h-11 sm:px-5 sm:text-[13px]",
        className,
      )}
    >
      <Link2
        className={cn(
          "shrink-0 text-white/90",
          fullWidth ? "h-4 w-4" : "h-3.5 w-3.5 sm:h-4 sm:w-4",
        )}
        strokeWidth={2.2}
        aria-hidden
      />
      {fullWidth ? (
        <span className="truncate">Verifică anunț</span>
      ) : shortLabel ? (
        <span className="truncate">Verifică</span>
      ) : (
        <>
          <span className="hidden sm:inline">Verifică anunț</span>
          <span className="sm:hidden">Verifică</span>
        </>
      )}
    </Link>
  );
}
