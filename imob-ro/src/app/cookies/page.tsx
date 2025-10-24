import Link from "next/link";

export const metadata = {
  title: "Politica Cookie-uri",
  description: "Cum folosim cookie-urile pe platforma imob.ro",
};

export default function CookiesPage() {
  return (
    <div className="container mx-auto max-w-4xl p-6 py-12 space-y-8">
      <h1 className="text-4xl font-bold">Politica Cookie-uri</h1>
      <p className="text-muted-foreground">Ultima actualizare: 24 octombrie 2025</p>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">1. Ce Sunt Cookie-urile?</h2>
        <p>
          Cookie-urile sunt fișiere text mici stocate pe dispozitivul dvs. când vizitați un site
          web. Ele ajută site-ul să vă &quot;recunoască&quot; la următoarele vizite și să
          funcționeze corect.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">2. Ce Cookie-uri Folosim</h2>

        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4 rounded">
          <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
            ✅ Veste Bună: Folosim Doar Cookie-uri Esențiale
          </h3>
          <p className="text-green-700 dark:text-green-300">
            imob.ro folosește <strong>doar cookie-uri strict necesare</strong> pentru funcționarea
            platformei. Nu folosim cookie-uri de marketing, publicitate sau tracking terț.
          </p>
        </div>

        <h3 className="text-xl font-semibold mt-6">2.1 Cookie-uri Esențiale (Obligatorii)</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Aceste cookie-uri sunt necesare pentru funcționarea de bază a site-ului și nu pot fi
          dezactivate. Conform GDPR, nu este necesar consimțământul pentru cookie-uri strict
          necesare.
        </p>

        <table className="w-full border-collapse border">
          <thead>
            <tr className="bg-muted">
              <th className="border p-2 text-left">Cookie</th>
              <th className="border p-2 text-left">Scop</th>
              <th className="border p-2 text-left">Durată</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border p-2 font-mono text-sm">
                authjs.session-token
                <br />
                __Secure-authjs.session-token
              </td>
              <td className="border p-2">
                <strong>Autentificare utilizator</strong>
                <br />
                Memorează sesiunea după login
              </td>
              <td className="border p-2">30 zile</td>
            </tr>
            <tr>
              <td className="border p-2 font-mono text-sm">
                authjs.csrf-token
                <br />
                __Host-authjs.csrf-token
              </td>
              <td className="border p-2">
                <strong>Securitate CSRF</strong>
                <br />
                Protecție împotriva atacurilor cross-site
              </td>
              <td className="border p-2">Sesiune</td>
            </tr>
            <tr>
              <td className="border p-2 font-mono text-sm">authjs.callback-url</td>
              <td className="border p-2">
                <strong>Redirect după login</strong>
                <br />
                Revenire la pagina de unde v-ați autentificat
              </td>
              <td className="border p-2">Sesiune</td>
            </tr>
            <tr>
              <td className="border p-2 font-mono text-sm">imob_cookie_accept</td>
              <td className="border p-2">
                <strong>Confirmare banner</strong>
                <br />
                Memorează că ați citit politica cookie-uri
              </td>
              <td className="border p-2">1 an</td>
            </tr>
          </tbody>
        </table>

        <h3 className="text-xl font-semibold mt-6">2.2 Local Storage</h3>
        <p>
          Pe lângă cookie-uri, folosim <strong>Local Storage</strong> (tehnologie browserului)
          pentru:
        </p>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>
            <strong>Preferințe UI:</strong> Temă dark/light, setări afișare
          </li>
          <li>
            <strong>Cache temporar:</strong> Optimizare performanță (date publice, nu personale)
          </li>
        </ul>
        <p className="text-sm text-muted-foreground mt-2">
          Aceste date rămân pe dispozitivul dvs. și nu sunt transmise către noi.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">3. Ce NU Folosim</h2>
        <div className="bg-muted p-4 rounded space-y-2">
          <p>
            ❌ <strong>Cookie-uri de Marketing:</strong> Nu folosim Google Ads, Facebook Pixel, etc.
          </p>
          <p>
            ❌ <strong>Cookie-uri de Tracking Terț:</strong> Nu avem Google Analytics sau alte
            trackere
          </p>
          <p>
            ❌ <strong>Cookie-uri de Publicitate:</strong> Nu afișăm reclame terțe
          </p>
          <p>
            ❌ <strong>Cookie-uri de Rețele Sociale:</strong> Nu folosim butoane Like/Share cu
            tracking
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">4. Analytics (Vercel Analytics)</h2>
        <p>
          Folosim <strong>Vercel Analytics</strong> pentru metrici agregate (ex: număr vizitatori,
          pagini populare). Important:
        </p>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>
            ✅ <strong>Privacy-first:</strong> Nu folosește cookie-uri
          </li>
          <li>
            ✅ <strong>Date anonime:</strong> Nu colectează IP-uri sau identificatori personali
          </li>
          <li>
            ✅ <strong>Conform GDPR:</strong> Nu necesită consimțământ (Art. 6.1.f - interes
            legitim)
          </li>
          <li>
            ✅ <strong>Agregare server-side:</strong> Datele sunt procesate pe server, nu în browser
          </li>
        </ul>
        <p className="text-sm text-muted-foreground mt-2">
          Vercel Analytics este considerat &quot;privacy-friendly&quot; și nu intră sub incidența
          consimțământului cookie-uri conform interpretării CNIL și EDPB.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">5. Cum Gestionați Cookie-urile</h2>

        <h3 className="text-xl font-semibold mt-4">5.1 În Browser</h3>
        <p>Puteți șterge cookie-urile din setările browserului:</p>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>
            <strong>Chrome:</strong> Settings → Privacy and security → Clear browsing data
          </li>
          <li>
            <strong>Firefox:</strong> Settings → Privacy & Security → Cookies and Site Data
          </li>
          <li>
            <strong>Safari:</strong> Preferences → Privacy → Manage Website Data
          </li>
          <li>
            <strong>Edge:</strong> Settings → Privacy → Clear browsing data
          </li>
        </ul>
        <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2">
          ⚠️ <strong>Atenție:</strong> Ștergerea cookie-urilor de autentificare vă va deloga din
          cont.
        </p>

        <h3 className="text-xl font-semibold mt-4">5.2 Dezactivare Totală</h3>
        <p>Puteți bloca toate cookie-urile din setările browserului, dar:</p>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>❌ Nu veți putea să vă autentificați</li>
          <li>❌ Unele funcționalități vor fi indisponibile</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">6. Cookie-uri de la Terți</h2>
        <p>
          Când folosiți autentificarea cu Google, Google poate seta propriile cookie-uri conform
          politicii lor. Consultați{" "}
          <a
            href="https://policies.google.com/technologies/cookies"
            className="text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Politica Cookie-uri Google
          </a>
          .
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">7. Modificări Politică</h2>
        <p>
          Dacă adăugăm noi tipuri de cookie-uri (ex: marketing cu opt-in), vom actualiza această
          pagină și vom notifica utilizatorii. Data ultimei actualizări este afișată sus.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">8. Întrebări?</h2>
        <p>
          Pentru întrebări despre cookie-uri sau confidențialitate, contactați-ne la:{" "}
          <a href="mailto:privacy@imob.ro" className="text-primary hover:underline">
            privacy@imob.ro
          </a>
        </p>
      </section>

      <div className="pt-8 border-t">
        <p className="text-sm text-muted-foreground">
          Consultați și:{" "}
          <Link href="/termeni" className="text-primary hover:underline">
            Termeni și Condiții
          </Link>
          {" • "}
          <Link href="/confidentialitate" className="text-primary hover:underline">
            Politica de Confidențialitate
          </Link>
        </p>
      </div>
    </div>
  );
}
