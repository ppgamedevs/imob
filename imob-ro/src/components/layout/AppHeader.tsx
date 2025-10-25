"use client";
import Link from "next/link";

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-black/50 backdrop-blur">
      <div className="mx-auto max-w-[1200px] px-4 h-14 flex items-center gap-4">
        <Link href="/" className="text-[15px] font-semibold tracking-tight">
          iR
        </Link>

        <nav className="ml-auto hidden md:flex items-center gap-6 text-sm text-white/80">
          <Link className="hover:text-white transition-colors" href="/discover">
            Caută
          </Link>
          <Link className="hover:text-white transition-colors" href="/areas">
            Zone
          </Link>
          <Link className="hover:text-white transition-colors" href="/owners">
            Proprietari
          </Link>
        </nav>
        <Link
          href="/discover"
          className="ml-auto md:ml-2 rounded-lg px-3 py-1.5 text-sm bg-primary text-primaryFg hover:opacity-95 transition-opacity"
        >
          Caută acum
        </Link>
      </div>
    </header>
  );
}
