import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact - ImobIntel",
  description:
    "Contacteaza echipa ImobIntel pentru intrebari, sugestii sau colaborari. Suntem aici sa te ajutam.",
  openGraph: {
    title: "Contact - ImobIntel",
    description: "Contacteaza echipa ImobIntel.",
    type: "website",
  },
  alternates: { canonical: "/contact" },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
