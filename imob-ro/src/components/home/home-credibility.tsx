const items = [
  "Anunțuri publice agregate din piață",
  "Comparabile și semnale din aceeași zonă",
  "Context de risc și lichiditate, acolo unde e disponibil",
  "Algoritmi proprii de evaluare (AVM), calibrați continuu",
] as const;

export function HomeCredibility() {
  return (
    <section className="border-t border-gray-100 py-16 md:py-20">
      <div className="mx-auto max-w-[900px] px-5 text-center">
        <h2 className="text-[20px] font-bold tracking-tight text-gray-950 md:text-[26px]">
          Construit pe date reale, nu pe intuiție
        </h2>
        <p className="mx-auto mt-3 max-w-[560px] text-[13px] leading-relaxed text-gray-500 md:text-[14px]">
          Estimările și rapoartele se bazează pe informații disponibile public și pe modele interne.
          Nu înlocuiesc expertiza unui evaluator sau a unui consilier juridic.
        </p>
        <ul className="mx-auto mt-10 grid max-w-[640px] gap-3 text-left sm:mx-auto sm:max-w-none sm:grid-cols-2 sm:gap-x-10 sm:gap-y-3">
          {items.map((t) => (
            <li
              key={t}
              className="flex items-start gap-2.5 text-[13px] leading-snug text-gray-700 md:text-[14px]"
            >
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gray-400" aria-hidden />
              {t}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
