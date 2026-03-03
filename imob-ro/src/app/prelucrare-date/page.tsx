import Link from "next/link";

export const metadata = {
  title: "Prelucrare date cu caracter personal - ImobIntel",
  description: "Informatii privind prelucrarea datelor cu caracter personal de catre ImobIntel / OnlyTips SRL",
};

export default function PrelucrareDate() {
  return (
    <div className="mx-auto max-w-[800px] px-5 py-16 md:py-24">
      <h1 className="text-[28px] md:text-[36px] font-bold tracking-tight text-gray-950 mb-8">
        Prelucrarea datelor cu caracter personal
      </h1>

      <div className="prose prose-gray max-w-none text-[14px] leading-relaxed space-y-6">
        <section>
          <h2 className="text-[18px] font-semibold text-gray-900 mb-2">1. Operatorul de date</h2>
          <p className="text-gray-600">
            Operatorul datelor cu caracter personal este <strong>OnlyTips SRL</strong>, CUI 43414871,
            email: <a href="mailto:contact@imobintel.ro" className="text-blue-600 hover:underline">contact@imobintel.ro</a>.
          </p>
        </section>

        <section>
          <h2 className="text-[18px] font-semibold text-gray-900 mb-2">2. Ce date colectam</h2>
          <ul className="list-disc pl-5 text-gray-600 space-y-1">
            <li>Adresa de email - pentru autentificare si comunicari legate de cont</li>
            <li>Adresa IP - pentru securitate si prevenirea abuzului</li>
            <li>Istoricul cautarilor - URL-urile analizate de utilizator</li>
            <li>Date de plata - procesate exclusiv prin Stripe, nu stocam date de card</li>
          </ul>
        </section>

        <section>
          <h2 className="text-[18px] font-semibold text-gray-900 mb-2">3. Scopul prelucrarii</h2>
          <ul className="list-disc pl-5 text-gray-600 space-y-1">
            <li>Furnizarea serviciilor platformei ImobIntel</li>
            <li>Gestionarea contului si abonamentului</li>
            <li>Asigurarea securitatii si prevenirea fraudei</li>
            <li>Respectarea obligatiilor legale</li>
          </ul>
        </section>

        <section>
          <h2 className="text-[18px] font-semibold text-gray-900 mb-2">4. Temeiul juridic</h2>
          <p className="text-gray-600">
            Prelucrarea datelor se bazeaza pe: executarea contractului (Termeni si conditii),
            consimtamantul utilizatorului, si interesul legitim al operatorului de a asigura
            securitatea platformei.
          </p>
        </section>

        <section>
          <h2 className="text-[18px] font-semibold text-gray-900 mb-2">5. Durata stocarii</h2>
          <p className="text-gray-600">
            Datele sunt stocate pe durata existentei contului. Dupa stergerea contului,
            datele sunt anonimizate sau sterse in termen de 30 de zile, cu exceptia celor
            necesare pentru respectarea obligatiilor legale (facturi, etc.).
          </p>
        </section>

        <section>
          <h2 className="text-[18px] font-semibold text-gray-900 mb-2">6. Drepturile tale</h2>
          <p className="text-gray-600 mb-2">Conform GDPR, ai dreptul la:</p>
          <ul className="list-disc pl-5 text-gray-600 space-y-1">
            <li>Acces la datele tale personale</li>
            <li>Rectificarea datelor incorecte</li>
            <li>Stergerea datelor (&ldquo;dreptul de a fi uitat&rdquo;)</li>
            <li>Restrictionarea prelucrarii</li>
            <li>Portabilitatea datelor</li>
            <li>Opozitie la prelucrare</li>
            <li>Depunerea unei plangeri la ANSPDCP (Autoritatea Nationala de Supraveghere)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-[18px] font-semibold text-gray-900 mb-2">7. Procesatori de date</h2>
          <ul className="list-disc pl-5 text-gray-600 space-y-1">
            <li><strong>Stripe</strong> - procesare plati</li>
            <li><strong>Vercel</strong> - hosting si infrastructura</li>
            <li><strong>OpenAI</strong> - analiza AI a anunturilor (text anonim, fara date personale)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-[18px] font-semibold text-gray-900 mb-2">8. Contact</h2>
          <p className="text-gray-600">
            Pentru orice solicitare privind datele tale personale, scrie-ne la{" "}
            <a href="mailto:contact@imobintel.ro" className="text-blue-600 hover:underline">contact@imobintel.ro</a>.
          </p>
        </section>

        <p className="text-[12px] text-gray-400 pt-4 border-t border-gray-100">
          Ultima actualizare: Martie 2026
        </p>
      </div>
    </div>
  );
}
