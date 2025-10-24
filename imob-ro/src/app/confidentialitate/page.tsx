import Link from "next/link";

export const metadata = {
  title: "Politica de Confidențialitate",
  description: "Cum prelucrăm și protejăm datele personale pe imob.ro",
};

export default function ConfidentialitatePage() {
  return (
    <div className="container mx-auto max-w-4xl p-6 py-12 space-y-8">
      <h1 className="text-4xl font-bold">Politica de Confidențialitate</h1>
      <p className="text-muted-foreground">Ultima actualizare: 24 octombrie 2025</p>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">1. Introducere</h2>
        <p>
          imob.ro (&quot;noi&quot;, &quot;platforma&quot;) respectă confidențialitatea datelor
          personale și se angajează să le protejeze în conformitate cu Regulamentul General privind
          Protecția Datelor (GDPR - Regulamentul UE 2016/679).
        </p>
        <p>
          Această politică explică ce date colectăm, de ce, cum le folosim și ce drepturi aveți.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">2. Operator de Date</h2>
        <div className="bg-muted p-4 rounded">
          <p>
            <strong>Denumire:</strong> imob.ro
          </p>
          <p>
            <strong>Email contact:</strong> contact@imob.ro
          </p>
          <p>
            <strong>Email DPO:</strong> privacy@imob.ro
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">3. Ce Date Colectăm</h2>

        <h3 className="text-xl font-semibold mt-4">3.1 Date de Identificare</h3>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>
            <strong>Email:</strong> Pentru autentificare și comunicare
          </li>
          <li>
            <strong>Nume (opțional):</strong> Pentru personalizare
          </li>
          <li>
            <strong>Imagine profil (opțional):</strong> Via Google OAuth
          </li>
        </ul>

        <h3 className="text-xl font-semibold mt-4">3.2 Date de Utilizare</h3>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>
            <strong>Istoric căutări:</strong> Pentru recomandări personalizate
          </li>
          <li>
            <strong>Proprietăți favorite:</strong> Salvate în contul dvs.
          </li>
          <li>
            <strong>Alerte de preț:</strong> Configurate de dvs.
          </li>
          <li>
            <strong>Preferințe:</strong> Setări cont și notificări
          </li>
        </ul>

        <h3 className="text-xl font-semibold mt-4">3.3 Date Tehnice</h3>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>
            <strong>Adresă IP:</strong> Pentru securitate și analiză
          </li>
          <li>
            <strong>User Agent:</strong> Browser și dispozitiv
          </li>
          <li>
            <strong>Cookie-uri:</strong> Sesiune autentificare (vezi{" "}
            <Link href="/cookies" className="text-primary hover:underline">
              Politica Cookie-uri
            </Link>
            )
          </li>
          <li>
            <strong>Metrici agregați:</strong> Via Vercel Analytics (anonim)
          </li>
        </ul>

        <h3 className="text-xl font-semibold mt-4">3.4 Date Proprietari (pentru vânzători)</h3>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>
            <strong>Adresă proprietate:</strong> Pentru evaluare
          </li>
          <li>
            <strong>Telefon:</strong> Pentru contact agenți
          </li>
          <li>
            <strong>Detalii proprietate:</strong> Suprafață, camere, caracteristici
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">4. De Ce Colectăm Datele (Temei Legal)</h2>

        <table className="w-full border-collapse border">
          <thead>
            <tr className="bg-muted">
              <th className="border p-2 text-left">Date</th>
              <th className="border p-2 text-left">Scop</th>
              <th className="border p-2 text-left">Temei Legal</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border p-2">Email, parolă</td>
              <td className="border p-2">Autentificare, cont utilizator</td>
              <td className="border p-2">Contract (Art. 6.1.b GDPR)</td>
            </tr>
            <tr>
              <td className="border p-2">Istoric căutări, preferințe</td>
              <td className="border p-2">Recomandări personalizate</td>
              <td className="border p-2">Interes legitim (Art. 6.1.f GDPR)</td>
            </tr>
            <tr>
              <td className="border p-2">Date proprietari</td>
              <td className="border p-2">Evaluare și matchmaking agenți</td>
              <td className="border p-2">Consimțământ explicit (Art. 6.1.a GDPR)</td>
            </tr>
            <tr>
              <td className="border p-2">IP, logs securitate</td>
              <td className="border p-2">Prevenire fraudă, securitate</td>
              <td className="border p-2">Interes legitim (Art. 6.1.f GDPR)</td>
            </tr>
            <tr>
              <td className="border p-2">Metrici agregați</td>
              <td className="border p-2">Îmbunătățire serviciu</td>
              <td className="border p-2">Interes legitim (Art. 6.1.f GDPR)</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">5. Cum Folosim Datele</h2>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>
            <strong>Furnizare serviciu:</strong> Estimări preț, analiză piață, salvare preferințe
          </li>
          <li>
            <strong>Comunicare:</strong> Alerte preț, newsletter (cu opt-in), suport tehnic
          </li>
          <li>
            <strong>Îmbunătățiri:</strong> Analiza comportamentului agregat pentru optimizare
          </li>
          <li>
            <strong>Securitate:</strong> Detectare fraudă, backup date, conformitate legală
          </li>
          <li>
            <strong>Marketing:</strong> Doar cu consimțământ explicit (checkbox-uri opt-in)
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">6. Cu Cine Partajăm Datele</h2>

        <h3 className="text-xl font-semibold mt-4">6.1 Procesatori de Date (Subcontractori)</h3>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>
            <strong>Vercel (SUA):</strong> Hosting platformă, analytics anonim (DPA semnat)
          </li>
          <li>
            <strong>Neon (SUA):</strong> Bază de date PostgreSQL (DPA semnat, criptat)
          </li>
          <li>
            <strong>Stripe (UE):</strong> Procesare plăți (PCI-DSS certified)
          </li>
          <li>
            <strong>Resend (UE):</strong> Trimitere email-uri tranzacționale
          </li>
          <li>
            <strong>Sentry (SUA):</strong> Monitorizare erori (date anonimizate, DPA semnat)
          </li>
        </ul>
        <p className="text-sm text-muted-foreground mt-2">
          Toți procesatorii au DPA (Data Processing Agreements) și respectă GDPR.
        </p>

        <h3 className="text-xl font-semibold mt-4">6.2 Transferuri Internaționale</h3>
        <p>Unele servicii sunt în SUA (Vercel, Neon, Sentry). Transferurile se fac conform:</p>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>
            <strong>Standard Contractual Clauses (SCC):</strong> Clauzele standard UE
          </li>
          <li>
            <strong>Criptare în tranzit și repaus</strong>
          </li>
          <li>
            <strong>DPA semnate:</strong> Obligații contractuale de conformitate GDPR
          </li>
        </ul>

        <h3 className="text-xl font-semibold mt-4">6.3 Nu Vindem Datele</h3>
        <p className="font-semibold">
          ❌ Nu vindem, nu închiriem, nu comercializăm datele personale către terți.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">7. Retenție Date</h2>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>
            <strong>Conturi active:</strong> Păstrate cât timp aveți cont
          </li>
          <li>
            <strong>După ștergere cont:</strong> Date personale anonimizate în 30 zile
          </li>
          <li>
            <strong>Date agregate/analize:</strong> Păstrate indefinit (fără identificare)
          </li>
          <li>
            <strong>Logs securitate:</strong> Maxim 90 zile
          </li>
          <li>
            <strong>Backup-uri:</strong> Maxim 30 zile (apoi șterse automat)
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">8. Securitatea Datelor</h2>
        <p>Măsuri tehnice și organizatorice:</p>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>
            <strong>Criptare:</strong> TLS 1.3 pentru transmisie, AES-256 pentru stocare
          </li>
          <li>
            <strong>Autentificare:</strong> Email magic link (fără parole), OAuth Google
          </li>
          <li>
            <strong>Access control:</strong> Role-based (user/admin), sesiuni securizate
          </li>
          <li>
            <strong>Monitorizare:</strong> Alerte automate pentru activități suspecte
          </li>
          <li>
            <strong>Backup:</strong> Zilnic, criptat, testat regulat
          </li>
          <li>
            <strong>Audit logs:</strong> Toate acțiunile admin sunt loggate
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">9. Drepturile Dvs. (GDPR)</h2>
        <p>Aveți următoarele drepturi:</p>

        <div className="space-y-3">
          <div className="border-l-4 border-primary pl-4">
            <h4 className="font-semibold">✅ Dreptul de Acces (Art. 15)</h4>
            <p className="text-sm">
              Puteți descărca toate datele din <strong>Contul Meu → Export Date</strong>
            </p>
          </div>

          <div className="border-l-4 border-primary pl-4">
            <h4 className="font-semibold">✏️ Dreptul de Rectificare (Art. 16)</h4>
            <p className="text-sm">
              Modificați datele din <strong>Contul Meu → Setări</strong>
            </p>
          </div>

          <div className="border-l-4 border-primary pl-4">
            <h4 className="font-semibold">🗑️ Dreptul de Ștergere (Art. 17)</h4>
            <p className="text-sm">
              Ștergeți contul din <strong>Contul Meu → Șterge Contul</strong>
            </p>
          </div>

          <div className="border-l-4 border-primary pl-4">
            <h4 className="font-semibold">🔒 Dreptul de Restricționare (Art. 18)</h4>
            <p className="text-sm">Contactați-ne la privacy@imob.ro</p>
          </div>

          <div className="border-l-4 border-primary pl-4">
            <h4 className="font-semibold">📦 Dreptul la Portabilitate (Art. 20)</h4>
            <p className="text-sm">
              Exportați date în format JSON din <strong>Contul Meu</strong>
            </p>
          </div>

          <div className="border-l-4 border-primary pl-4">
            <h4 className="font-semibold">⛔ Dreptul de Opoziție (Art. 21)</h4>
            <p className="text-sm">
              Dezactivați notificări și marketing din <strong>Preferințe</strong>
            </p>
          </div>

          <div className="border-l-4 border-primary pl-4">
            <h4 className="font-semibold">📧 Plângere la ANSPDCP</h4>
            <p className="text-sm">
              Puteți depune plângere la Autoritatea Națională de Supraveghere (
              <a
                href="https://www.dataprotection.ro"
                className="text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                www.dataprotection.ro
              </a>
              )
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">10. Cookie-uri și Tracking</h2>
        <p>
          Folosim doar cookie-uri esențiale pentru autentificare. Pentru detalii, consultați{" "}
          <Link href="/cookies" className="text-primary hover:underline">
            Politica Cookie-uri
          </Link>
          .
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">11. Minori</h2>
        <p>
          Serviciul este destinat persoanelor peste 18 ani. Nu colectăm intenționat date de la
          minori. Dacă descoperiți că un minor și-a creat cont, contactați-ne imediat.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">12. Modificări Politică</h2>
        <p>
          Ne rezervăm dreptul de a actualiza această politică. Modificările majore vor fi comunicate
          prin email cu 30 zile înainte. Data ultimei actualizări este afișată sus.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">13. Contact și Întrebări</h2>
        <div className="bg-muted p-4 rounded space-y-2">
          <p>
            <strong>Email general:</strong> contact@imob.ro
          </p>
          <p>
            <strong>Email confidențialitate:</strong> privacy@imob.ro
          </p>
          <p>
            <strong>Răspuns:</strong> Maxim 30 zile (conform Art. 12 GDPR)
          </p>
        </div>
      </section>

      <div className="pt-8 border-t">
        <p className="text-sm text-muted-foreground">
          Consultați și:{" "}
          <Link href="/termeni" className="text-primary hover:underline">
            Termeni și Condiții
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
