import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Suport - ImobIntel",
  description:
    "Ai nevoie de ajutor? Gaseste raspunsuri la intrebarile frecvente sau contacteaza echipa de suport ImobIntel.",
  alternates: { canonical: "/support" },
};

export default function SupportPage() {
  const faq = [
    {
      q: "Am platit dar raportul nu s-a deblocat",
      a: "Verifica ca plata a fost procesata in contul tau Stripe. Daca problema persista, contacteaza-ne la adresa de email de mai jos si rezolvam in cel mai scurt timp.",
    },
    {
      q: "Cum functioneaza estimarea de pret?",
      a: "Analizam comparabile din zona (proprietati similare ca suprafata, numar de camere si an de constructie) si calculam mediana EUR/mp cu ajustari pentru etaj, stare si distanta la metrou.",
    },
    {
      q: "Cat de precisa este estimarea?",
      a: "Estimarile noastre au caracter orientativ. Acuratetea depinde de numarul de comparabile disponibile in zona. Raportul include un indicator de incredere (ridicata/medie/scazuta).",
    },
    {
      q: "Pot anula abonamentul?",
      a: "Da, poti anula oricand din pagina de cont. Vei avea acces pana la sfarsitul perioadei platite.",
    },
    {
      q: "Ce surse de date folositi?",
      a: "Analizam anunturi de pe imobiliare.ro, storia.ro, olx.ro, publi24.ro si lajumate.ro. Nu garantam exhaustivitatea datelor si recomandam verificarea independenta.",
    },
  ];

  return (
    <div className="container mx-auto max-w-2xl py-12 px-4">
      <h1 className="text-2xl font-bold mb-2">Suport</h1>
      <p className="text-muted-foreground mb-8">
        Intrebari frecvente si modalitati de contact.
      </p>

      <div className="space-y-4 mb-8">
        {faq.map((item) => (
          <Card key={item.q}>
            <CardHeader>
              <CardTitle className="text-base">{item.q}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{item.a}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>
            Email: <a href="mailto:support@imobintel.ro" className="text-primary underline">support@imobintel.ro</a>
          </p>
          <p>Raspundem in maxim 24 de ore in zilele lucratoare.</p>
          <p className="mt-4">
            <Link href="/account" className="text-primary underline">
              Gestioneaza abonamentul
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
