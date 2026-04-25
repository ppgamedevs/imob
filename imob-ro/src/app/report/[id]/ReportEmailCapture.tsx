"use client";

import { useCallback, useState } from "react";

type Props = { analysisId: string };

export function ReportEmailCapture({ analysisId }: Props) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [lastConsent, setLastConsent] = useState(false);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErrMsg(null);
      setState("loading");
      const form = e.currentTarget as HTMLFormElement;
      const hp = (form.elements.namedItem("website") as HTMLInputElement | null)?.value ?? "";
      setLastConsent(consent);
      try {
        const res = await fetch(`/api/report/${analysisId}/report-lead`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            consent,
            website: hp,
          }),
        });
        if (res.status === 429) {
          setErrMsg("Prea multe trimiteri. Încearcă din nou într-un minut.");
          setState("err");
          return;
        }
        if (!res.ok) {
          setErrMsg("Nu am putut salva. Verifică adresa de email.");
          setState("err");
          return;
        }
        setState("ok");
        setEmail("");
        setConsent(false);
      } catch {
        setErrMsg("A apărut o eroare. Încearcă din nou.");
        setState("err");
      }
    },
    [analysisId, email, consent],
  );

  if (state === "ok") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900">
        <p className="font-medium">Mulțumim!</p>
        <p className="mt-0.5 text-emerald-800/90">
          {lastConsent
            ? "Am înregistrat adresa. Dacă am putut, ți-am trimis un email cu linkul spre raport. Nu trimitem mesaje în exces."
            : "Interesul tău a fost notat. Poți oricând bifa acordul și trimite din nou pentru a primi materialul pe email."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <p className="text-sm font-medium text-slate-800">
        Vrei să primești raportul și checklistul de vizionare pe email?
      </p>
      <p className="text-xs text-slate-500">
        Complet opțional. Deblocarea rămâne butonul principal de mai sus.
      </p>
      <div className="sr-only" aria-hidden>
        <label htmlFor={`website-${analysisId}`}>Do not fill</label>
        <input
          type="text"
          id={`website-${analysisId}`}
          name="website"
          tabIndex={-1}
          autoComplete="off"
          className="hidden"
        />
      </div>
      <div>
        <label htmlFor={`email-${analysisId}`} className="sr-only">
          Email
        </label>
        <input
          id={`email-${analysisId}`}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="Adresa ta de email"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
        />
      </div>
      <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-snug text-slate-600">
        <input
          type="checkbox"
          name="consent"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300"
        />
        <span>
          Sunt de acord să primesc raportul și informații utile despre verificarea apartamentelor. Poți
          renunța oricând; nu vinde adresa ta.
        </span>
      </label>
      <div>
        <button
          type="submit"
          disabled={state === "loading"}
          className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          {state === "loading" ? "Se salvează…" : "Trimite"}
        </button>
      </div>
      {errMsg && <p className="text-sm text-red-600">{errMsg}</p>}
    </form>
  );
}