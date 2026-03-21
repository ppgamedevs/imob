const proofItems = [
  {
    value: "95%",
    label: "Acuratețe estimări",
    hint: "bazat pe modele și comparabile locale",
  },
  {
    value: "10.000+",
    label: "Analize efectuate",
    hint: "de utilizatori care au verificat anunțuri reale",
  },
  {
    value: "500+",
    label: "Zone acoperite",
    hint: "București și extindere continuă",
  },
] as const;

export function HomeSocialProof() {
  return (
    <section className="border-y border-gray-100 bg-gray-50/70">
      <div className="mx-auto max-w-[1100px] px-5 py-10 md:py-12">
        <div className="grid gap-10 md:grid-cols-3 md:gap-6 md:divide-x md:divide-gray-200/90">
          {proofItems.map((item) => (
            <div
              key={item.label}
              className="text-center md:px-8 md:text-left first:md:pl-0 last:md:pr-0"
            >
              <p className="text-[28px] font-bold tabular-nums tracking-tight text-gray-950 md:text-[30px]">
                {item.value}
              </p>
              <p className="mt-1 text-[14px] font-semibold text-gray-900">{item.label}</p>
              <p className="mx-auto mt-2 max-w-[260px] text-[12px] leading-relaxed text-gray-500 md:mx-0 md:max-w-[280px]">
                {item.hint}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
