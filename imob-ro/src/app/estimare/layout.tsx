import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Estimare pret apartament Bucuresti - Calculator gratuit",
  description:
    "Estimeaza pretul apartamentului tau din Bucuresti in 30 de secunde. Bazat pe comparabile reale, ajustari si analiza de piata. Gratuit, fara cont.",
  keywords: [
    "estimare pret apartament",
    "calculator pret apartament",
    "cat costa apartamentul meu",
    "evaluare apartament bucuresti",
    "pret mp bucuresti",
  ],
  openGraph: {
    title: "Estimare pret apartament Bucuresti - Calculator gratuit",
    description:
      "Estimeaza pretul apartamentului tau din Bucuresti in 30 de secunde. Bazat pe comparabile reale.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Estimare pret apartament Bucuresti",
    description:
      "Calculator gratuit de estimare a pretului. Bazat pe comparabile reale din piata.",
  },
  alternates: { canonical: "/estimare" },
};

export default function EstimareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
