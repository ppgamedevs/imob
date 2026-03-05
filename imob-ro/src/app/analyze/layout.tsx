import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analizeaza un anunt imobiliar - ImobIntel",
  description:
    "Introdu linkul unui anunt de pe imobiliare.ro, OLX sau Storia si primesti instant: pret estimat, comparabile, risc seismic, viteza de vanzare si verdict.",
  openGraph: {
    title: "Analizeaza un anunt imobiliar - ImobIntel",
    description:
      "Introdu un link de anunt si primesti raport complet: pret estimat, comparabile, risc seismic.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Analizeaza un anunt imobiliar",
    description: "Raport complet instant pentru orice anunt imobiliar din Bucuresti.",
  },
  alternates: { canonical: "/analyze" },
};

export default function AnalyzeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
