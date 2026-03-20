/**
 * Copilot: Create a global layout with:
 * - <html lang="ro" suppressHydrationWarning>
 * - ThemeProvider (next-themes) with system/light/dark
 * - Header with logo (text), nav links: Acasă(/), Căutare(/search), Dashboard(/dashboard)
 * - <Analytics /> from @vercel/analytics
 * - Container max-w-7xl, responsive paddings
 * - Include Tailwind classes and shadcn/ui <NavigationMenu> for desktop; a <Sheet> menu for mobile
 */
import "./globals.css";
import "./print.css";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";

import CookieBanner from "@/components/CookieBanner";
import AppFooter from "@/components/layout/AppFooter";
import AppHeader from "@/components/layout/AppHeader";
import MobileBar from "@/components/layout/MobileBar";
import NewsletterSync from "@/components/NewsletterSync";
import Tour from "@/components/onboarding/Tour";
import WhatsNew from "@/components/system/WhatsNew";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/ui/toaster";
import { flags } from "@/lib/flags";
import { initSentry } from "@/lib/obs/sentry";

// Initialize Sentry for error tracking
if (typeof window === "undefined") {
  // Server-side only
  initSentry();
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "https://imobintel.ro";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ImobIntel - Analiza imobiliara inteligenta pentru Bucuresti",
    template: "%s | ImobIntel",
  },
  description:
    "Pret estimat, comparabile, viteza de vanzare si risc seismic pentru apartamente din Bucuresti. Analiza gratuita bazata pe date reale.",
  keywords: [
    "imobiliare",
    "Bucuresti",
    "apartamente",
    "pret estimat",
    "AVM",
    "evaluare proprietate",
    "imobintel",
    "analiza imobiliara",
    "pret apartament bucuresti",
    "comparabile imobiliare",
  ],
  authors: [{ name: "ImobIntel" }],
  creator: "ImobIntel",
  publisher: "ImobIntel",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "ro_RO",
    url: SITE_URL,
    siteName: "ImobIntel",
    title: "ImobIntel - Analiza imobiliara inteligenta pentru Bucuresti",
    description:
      "Pret estimat, comparabile, viteza de vanzare si risc seismic pentru apartamente din Bucuresti.",
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "ImobIntel - Analiza imobiliara inteligenta",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ImobIntel - Analiza imobiliara inteligenta pentru Bucuresti",
    description:
      "Pret estimat, comparabile, viteza de vanzare si risc seismic pentru apartamente din Bucuresti.",
    images: [`${SITE_URL}/og-image.png`],
  },
  alternates: {
    canonical: "/",
  },
  other: {
    "theme-color": "#6A7DFF",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "ImobIntel",
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description: "Platforma de analiza imobiliara inteligenta pentru Bucuresti",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Service",
      availableLanguage: "Romanian",
    },
    sameAs: [],
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "ImobIntel",
    url: SITE_URL,
    description: "Analiza imobiliara inteligenta pentru Bucuresti",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/analyze?url={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html lang="ro" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#6A7DFF" />
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="manifest" href="/manifest.json" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-Q40GJ9B2H8" strategy="lazyOnload" />
        <Script id="gtag-init" strategy="lazyOnload">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-Q40GJ9B2H8');`}
        </Script>
        <ThemeProvider>
          <ToastProvider>
            <div className="flex min-h-screen flex-col pb-16 md:pb-0">
              <AppHeader />
              <main className="flex-1">{children}</main>
              <AppFooter />
              <MobileBar />
            </div>
            <CookieBanner />
            <NewsletterSync />
            {flags.tour && <Tour />}
            {flags.whatsNew && <WhatsNew />}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
