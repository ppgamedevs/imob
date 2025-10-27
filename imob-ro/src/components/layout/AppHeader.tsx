"use client";
import Link from "next/link";

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto max-w-[1200px] px-4 h-14 flex items-center gap-4">
        <Link
          href="/"
          className="text-[15px] font-semibold tracking-tight text-[color:var(--color-text)]"
        >
          iR
        </Link>

        <nav className="ml-auto hidden md:flex items-center gap-6 text-sm text-[color:var(--color-text)]/70">
          <Link className="hover:text-[color:var(--color-text)] transition-colors" href="/discover">
            Caută
          </Link>
          {/** Route '/areas' does not exist; send to București zones overview */}
          <Link
            className="hover:text-[color:var(--color-text)] transition-colors"
            href="/bucuresti"
          >
            Zone
          </Link>
          <Link className="hover:text-[color:var(--color-text)] transition-colors" href="/owners">
            Proprietari
          </Link>
        </nav>
        <Link
          href="/discover"
          className="ml-auto md:ml-2 rounded-lg px-3 py-1.5 text-sm bg-[rgb(var(--primary))] text-[rgb(var(--primary-contrast))] hover:opacity-95 transition-opacity"
        >
          Caută acum
        </Link>
      </div>
    </header>
  );
}
