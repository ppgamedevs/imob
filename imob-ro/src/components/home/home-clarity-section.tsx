const pains = [
  "Prețuri listate peste nivelul sugerat de piață pentru același profil.",
  "Anunțuri duplicate care creează impresia de cerere mai mare decât în realitate.",
  "Zone sau clădiri cu riscuri subestimate în titlul anunțului.",
  "Lipsa unui reper obiectiv când negociezi sau când compari două oferte.",
] as const;

export function HomeClaritySection() {
  return (
    <section className="border-t border-gray-200 bg-slate-50 py-20 md:py-28">
      <div className="mx-auto max-w-[720px] px-5 text-center">
        <h2 className="text-[22px] font-bold leading-snug tracking-tight text-gray-950 md:text-[30px]">
          Majoritatea cumpărătorilor nu pierd bani din negociere slabă.
          <span className="block text-gray-700 md:mt-1">
            Pierd bani pentru că nu văd imaginea completă.
          </span>
        </h2>
      </div>

      <div className="mx-auto mt-12 max-w-[640px] px-5">
        <ul className="space-y-4">
          {pains.map((line) => (
            <li
              key={line}
              className="flex gap-3 border-b border-slate-200/80 pb-4 text-left text-[14px] leading-relaxed text-slate-700 last:border-0 last:pb-0"
            >
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-400" aria-hidden />
              {line}
            </li>
          ))}
        </ul>
        <p className="mt-10 text-center text-[15px] font-medium leading-relaxed text-slate-800">
          ImobIntel îți oferă un reper obiectiv înainte să semnezi sau să negociezi.
        </p>
      </div>
    </section>
  );
}
