"use client";

import Link from "next/link";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-[720px] px-4 py-16 text-center">
      <h1 className="text-3xl md:text-4xl font-semibold">A apărut o problemă.</h1>
      <p className="mt-2 text-sm md:text-base text-muted">
        Am înregistrat eroarea și lucrăm la remediere.
      </p>
      <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
        <button
          className="inline-flex items-center justify-center rounded-xl bg-primary text-primaryFg px-4 py-3 text-sm font-medium hover:opacity-90 transition-opacity"
          onClick={() => reset()}
        >
          Reîncearcă
        </button>
        <Link
          className="inline-flex items-center justify-center rounded-xl border border-border bg-transparent px-4 py-3 text-sm font-medium hover:bg-surface-2 transition-colors"
          href="/"
        >
          Acasă
        </Link>
      </div>
    </main>
  );
}
