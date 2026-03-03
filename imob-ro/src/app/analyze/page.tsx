"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

export const dynamic = "force-dynamic";

const ANON_SEARCH_KEY = "imob_anon_searches";
const ANON_LIMIT = 3;

function getAnonSearchCount(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(ANON_SEARCH_KEY) || "0", 10);
}

function incrementAnonSearchCount(): number {
  const next = getAnonSearchCount() + 1;
  localStorage.setItem(ANON_SEARCH_KEY, String(next));
  return next;
}

function AnalyzePageContent() {
  const searchParams = useSearchParams();
  const urlParam = searchParams.get("url");
  const [url, setUrl] = useState(urlParam || "");
  const [status, setStatus] = useState<"idle" | "fetching" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [anonWall, setAnonWall] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (urlParam && status === "idle" && !anonWall) {
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlParam]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!url.trim()) return;

    // TODO: re-enable anon wall before going live
    // const limitsOff = process.env.NEXT_PUBLIC_LIMITS_DISABLED === "true";
    // if (!limitsOff) {
    //   const anonCount = getAnonSearchCount();
    //   if (anonCount >= ANON_LIMIT) {
    //     setAnonWall(true);
    //     return;
    //   }
    // }

    setError(null);
    setAnonWall(false);
    setStatus("fetching");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data?.id) {
        incrementAnonSearchCount();
        setStatus("done");
        router.push(`/report/${data.id}`);
      } else if (res.status === 402) {
        setStatus("idle");
        setError(`Limita atinsa: ${data.used ?? "?"}/${data.max ?? "?"} analize luna aceasta. Upgradeaza pentru mai multe.`);
      } else if (res.status === 429) {
        setStatus("idle");
        setError("Prea multe cereri. Incearca din nou in cateva secunde.");
      } else {
        setStatus("idle");
        setError(data?.error || "Analiza nu a putut fi pornita. Verifica URL-ul si incearca din nou.");
      }
    } catch {
      setStatus("idle");
      setError("Eroare de conexiune. Verifica conexiunea la internet si incearca din nou.");
    }
  }, [url, router]);

  return (
    <div className="mx-auto max-w-[680px] px-5 py-16 md:py-24">
      <h1 className="text-[28px] md:text-[36px] font-bold tracking-tight text-gray-950">
        Analizeaza un anunt
      </h1>
      <p className="mt-2 text-[15px] text-gray-500">
        Introdu un link de pe imobiliare.ro, storia.ro, olx.ro, publi24.ro, lajumate.ro sau homezz.ro si primesti estimare de pret, comparabile si analiza completa.
      </p>

      {/* TODO: re-enable anon wall before going live */}
      {/* {anonWall && (
        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/60 p-5 text-center">
          <p className="text-[15px] font-semibold text-gray-900">
            Creeaza un cont gratuit pentru a continua
          </p>
          <p className="mt-1.5 text-[13px] text-gray-500">
            Ai folosit {ANON_LIMIT} cautari gratuite. Creeaza un cont gratuit si primesti 10 cautari/luna.
          </p>
          <Link
            href="/auth/signin?callbackUrl=/analyze"
            className="mt-4 inline-flex items-center rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:shadow-md hover:brightness-110 active:scale-[0.97] transition-all duration-200"
          >
            Creeaza cont gratuit
          </Link>
        </div>
      )} */}

      <form onSubmit={handleSubmit} className="mt-8">
        <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm transition-shadow duration-300 focus-within:shadow-md focus-within:border-gray-300">
          <input
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(null); }}
            type="url"
            placeholder="https://www.imobiliare.ro/vanzare-apartamente/bucuresti/zona/apartament-de-vanzare-2-camere-XY12345"
            className="flex-1 bg-transparent text-[14px] text-gray-900 placeholder:text-gray-400 px-3 py-3 outline-none"
          />
          <button
            type="submit"
            disabled={status === "fetching"}
            className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 text-[13px] font-semibold text-white shadow-sm hover:shadow-md hover:brightness-110 active:scale-[0.97] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {status === "fetching" ? "Se analizeaza..." : "Analizeaza"}
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-[13px] text-red-700">
            {error}
          </div>
        )}

        {status === "fetching" && (
          <div className="mt-4 flex items-center gap-2.5 text-[13px] text-gray-500">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
            Se proceseaza analiza. Poate dura pana la 30 de secunde...
          </div>
        )}

        {status === "done" && (
          <div className="mt-4 text-[13px] text-green-600 font-medium">
            Analiza finalizata. Redirectionare catre raport...
          </div>
        )}
      </form>
    </div>
  );
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-[680px] px-5 py-16">Se incarca...</div>}>
      <AnalyzePageContent />
    </Suspense>
  );
}
