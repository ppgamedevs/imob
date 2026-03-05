import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Preturi si abonamente - ImobIntel",
  description:
    "Alege planul potrivit pentru tine: gratuit, Pro sau Agent. Analiza imobiliara completa, rapoarte PDF, comparabile si estimari de pret.",
  openGraph: {
    title: "Preturi si abonamente - ImobIntel",
    description:
      "Alege planul potrivit: gratuit, Pro sau Agent. Rapoarte complete de analiza imobiliara.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Preturi ImobIntel",
    description: "Planuri gratuite si Pro pentru analiza imobiliara.",
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
