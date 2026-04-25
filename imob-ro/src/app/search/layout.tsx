import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cauta apartamente in Bucuresti - ImobIntel",
  description:
    "Cauta si compara apartamente din Bucuresti. Filtreaza dupa zona, pret, camere si suprafata. Date actualizate zilnic.",
  /** UI demonstrativ: nu indexăm până la un feed real de listări. */
  robots: { index: false, follow: true },
  openGraph: {
    title: "Cauta apartamente in Bucuresti",
    description: "Cauta si compara apartamente din Bucuresti cu date actualizate zilnic.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cauta apartamente in Bucuresti",
    description: "Filtreaza dupa zona, pret, camere si suprafata.",
  },
  alternates: { canonical: "/search" },
};

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
