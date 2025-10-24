import Link from "next/link";

export const metadata = {
  title: "Termeni și Condiții",
  description: "Termenii și condițiile de utilizare ale platformei imob.ro",
};

export default function TermeniPage() {
  return (
    <div className="container mx-auto max-w-4xl p-6 py-12 space-y-8">
      <h1 className="text-4xl font-bold">Termeni și Condiții</h1>
      <p className="text-muted-foreground">Ultima actualizare: 24 octombrie 2025</p>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">1. Acceptarea Termenilor</h2>
        <p>
          Prin accesarea și utilizarea platformei imob.ro (&quot;Platforma&quot;), sunteți de acord
          să respectați acești Termeni și Condiții. Dacă nu sunteți de acord cu aceștii termeni, vă
          rugăm să nu utilizați Platforma.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">2. Despre Serviciu</h2>
        <p>imob.ro este o platformă de analiză imobiliară pentru București care oferă:</p>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>Estimări de preț automate (AVM - Automated Valuation Model)</li>
          <li>Timp estimat până la vânzare (TTS - Time to Sale)</li>
          <li>Analiză randament chirii (Yield)</li>
          <li>Comparații proprietăți similare</li>
          <li>Informații despre zone și cartiere</li>
        </ul>
        <p className="text-sm text-muted-foreground mt-4">
          <strong>Important:</strong> Estimările furnizate sunt orientative și generate prin
          algoritmi de machine learning. Nu constituie evaluări oficiale și nu înlocuiesc serviciile
          unui evaluator autorizat ANEVAR.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">3. Utilizarea Platformei</h2>
        <h3 className="text-xl font-semibold mt-4">3.1 Conturi Utilizator</h3>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>Contul este personal și nu poate fi transferat</li>
          <li>Sunteți responsabil pentru confidențialitatea credențialelor</li>
          <li>Vă angajați să furnizați informații corecte la înregistrare</li>
        </ul>

        <h3 className="text-xl font-semibold mt-4">3.2 Utilizare Acceptabilă</h3>
        <p>Vă angajați să NU:</p>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>Utilizați Platforma pentru activități ilegale</li>
          <li>Încercați să obțineți acces neautorizat la sistemele noastre</li>
          <li>Efectuați scraping automat sau colectare masivă de date</li>
          <li>Redistribuiți conținutul fără permisiune</li>
          <li>Încărcați malware sau cod rău intenționat</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">4. Proprietate Intelectuală</h2>
        <p>
          Tot conținutul, design-ul, logo-urile și codul sursă al Platformei sunt protejate de
          drepturi de autor și aparțin imob.ro. Nu aveți dreptul să copiați, modificați sau
          distribuiți conținutul fără permisiune scrisă.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">5. Date cu Caracter Personal</h2>
        <p>
          Prelucrarea datelor personale este reglementată de{" "}
          <Link href="/confidentialitate" className="text-primary hover:underline">
            Politica de Confidențialitate
          </Link>
          , în conformitate cu GDPR.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">6. Limitarea Răspunderii</h2>
        <p>
          <strong>Estimările și analizele furnizate sunt orientative.</strong> imob.ro nu garantează
          acuratețea absolută a prețurilor estimate, a timpului de vânzare sau a altor metrici.
        </p>
        <p>Nu suntem responsabili pentru:</p>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>Decizii de investiție luate pe baza informațiilor din Platformă</li>
          <li>Pierderi financiare rezultate din utilizarea serviciului</li>
          <li>Întreruperi temporare ale serviciului</li>
          <li>Inexactități în datele furnizate de terți</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">7. Abonamente și Plăți</h2>
        <h3 className="text-xl font-semibold mt-4">7.1 Planuri Disponibile</h3>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>
            <strong>Free:</strong> Acces limitat la funcționalități de bază
          </li>
          <li>
            <strong>Pro:</strong> Acces complet cu funcționalități avansate
          </li>
        </ul>

        <h3 className="text-xl font-semibold mt-4">7.2 Facturare</h3>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>Plățile sunt procesate prin Stripe (provider extern securizat)</li>
          <li>Abonamentele se reînnoiesc automat lunar</li>
          <li>Puteți anula oricând din contul dvs.</li>
          <li>Nu oferim rambursări pentru luni parțiale</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">8. Încetarea Serviciului</h2>
        <p>Ne rezervăm dreptul de a suspenda sau închide conturi care:</p>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>Încalcă acești Termeni</li>
          <li>Generează trafic abuziv</li>
          <li>Utilizează serviciul în mod fraudulos</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">9. Modificări ale Termenilor</h2>
        <p>
          Ne rezervăm dreptul de a modifica acești Termeni oricând. Modificările majore vor fi
          comunicate prin email sau notificare în Platformă. Utilizarea continuă a serviciului după
          modificări constituie acceptarea noilor termeni.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">10. Legea Aplicabilă</h2>
        <p>
          Acești Termeni sunt guvernați de legile României. Orice dispute vor fi soluționate de
          instanțele competente din București, România.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">11. Contact</h2>
        <p>
          Pentru întrebări despre acești Termeni, contactați-ne la:{" "}
          <a href="mailto:contact@imob.ro" className="text-primary hover:underline">
            contact@imob.ro
          </a>
        </p>
      </section>

      <div className="pt-8 border-t">
        <p className="text-sm text-muted-foreground">
          Consultați și:{" "}
          <Link href="/confidentialitate" className="text-primary hover:underline">
            Politica de Confidențialitate
          </Link>
          {" • "}
          <Link href="/cookies" className="text-primary hover:underline">
            Politica Cookie-uri
          </Link>
        </p>
      </div>
    </div>
  );
}
