"use client";
import Link from "next/link";

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-[color:var(--color-bg)/.7] backdrop-blur supports-[backdrop-filter]:bg-[color:var(--color-bg)/.5]">
      <div className="mx-auto max-w-[1200px] px-3 h-14 flex items-center gap-3">
        <Link href="/" className="text-[15px] font-semibold tracking-tight focus-ring">
          iR
        </Link>
        <nav className="ml-auto hidden md:flex items-center gap-6 text-sm text-[color:var(--color-text)]/80">
          <Link className="hover:opacity-100 opacity-80 transition-opacity" href="/discover">
            Caută
          </Link>
          <Link className="hover:opacity-100 opacity-80 transition-opacity" href="/area">
            Zone
          </Link>
          <Link className="hover:opacity-100 opacity-80 transition-opacity" href="/owners">
            Pentru proprietari
          </Link>
        </nav>
        <Link
          href="/discover"
          className="ml-auto md:ml-4 rounded-lg px-3 py-1.5 text-sm bg-primary text-primaryFg focus-ring transition-colors hover:bg-primary/90"
        >
          Caută acum
        </Link>
      </div>
    </header>
  );
}
