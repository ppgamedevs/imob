import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Prețuri - ImobIntel",
  description:
    "Deblocare o singură dată pentru raportul complet, pachet în curând, abonament Pro opțional. Fără evaluare oficială. Date publice, analiză orientativă.",
  openGraph: {
    title: "Prețuri - ImobIntel",
    description: "Raport complet per plată, abonament Pro pentru utilizare intensă, dezvoltare transparentă a pachetului pe mai multe rapoarte.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Prețuri ImobIntel",
    description: "Deblocare per raport și abonament Pro, afișate clar.",
  },
  alternates: { canonical: "/pricing" },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
