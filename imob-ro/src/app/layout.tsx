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

import { Analytics } from "@vercel/analytics/react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import CookieBanner from "@/components/CookieBanner";
import AppFooter from "@/components/layout/AppFooter";
import AppHeader from "@/components/layout/AppHeader";
import MobileBar from "@/components/layout/MobileBar";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/ui/toaster";
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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://imob-three.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "imob.ro - Caută, compară și vinde în București",
    template: "%s | imob.ro",
  },
  description: "Preț estimat, timp până la vânzare, zone pe înțelesul tău.",
  keywords: [
    "imobiliare",
    "București",
    "apartamente",
    "preț estimat",
    "AVM",
    "evaluare proprietate",
  ],
  authors: [{ name: "imob.ro" }],
  creator: "imob.ro",
  publisher: "imob.ro",
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
    siteName: "imob.ro",
    title: "imob.ro - Caută, compară și vinde în București",
    description: "Preț estimat, timp până la vânzare, zone pe înțelesul tău.",
    images: [
      {
        url: `${SITE_URL}/logo.png`,
        width: 1200,
        height: 630,
        alt: "imob.ro",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "imob.ro - Caută, compară și vinde în București",
    description: "Preț estimat, timp până la vânzare, zone pe înțelesul tău.",
    images: [`${SITE_URL}/logo.png`],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Organization JSON-LD for SEO
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "imob.ro",
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description: "Platformă de analiză imobiliară pentru București",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Service",
      availableLanguage: "Romanian",
    },
    sameAs: [
      // Add social media profiles when available
    ],
  };

  return (
    <html lang="ro" suppressHydrationWarning>
      <head>
        {/* Day 30: Performance - Font preconnect */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        {/* Organization JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <ToastProvider>
            <div className="flex min-h-screen flex-col pb-16 md:pb-0">
              <AppHeader />
              <main className="flex-1">{children}</main>
              <AppFooter />
              <MobileBar />
            </div>
            <Analytics />
            <CookieBanner />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
