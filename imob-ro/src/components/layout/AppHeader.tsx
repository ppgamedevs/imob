"use client";
import Link from "next/link";

import { flags } from "@/lib/flags";

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto max-w-[1200px] px-5 h-16 flex items-center gap-6">
        <Link
          href="/"
          className="text-[17px] font-bold tracking-tight text-gray-900"
        >
          ImobIntel
        </Link>

        <nav className="ml-auto hidden md:flex items-center gap-7 text-[14px] font-medium text-gray-500">
          <Link className="hover:text-gray-900 transition-colors duration-200" href="/analyze">
            Analizeaza
          </Link>
          <Link className="hover:text-gray-900 transition-colors duration-200" href="/pricing">
            Preturi
          </Link>
          {flags.discover && (
            <Link className="hover:text-gray-900 transition-colors duration-200" href="/discover">
              Cauta
            </Link>
          )}
          {flags.owners && (
            <Link className="hover:text-gray-900 transition-colors duration-200" href="/owners">
              Proprietari
            </Link>
          )}
        </nav>

        <Link
          href="/analyze"
          className="ml-auto md:ml-0 inline-flex items-center rounded-full bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-2 text-[13px] font-semibold text-white shadow-sm hover:shadow-md hover:brightness-110 transition-all duration-200"
        >
          Analizeaza acum
        </Link>
      </div>
    </header>
  );
}
