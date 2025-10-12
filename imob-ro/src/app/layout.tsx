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

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://imob-three.vercel.app'),
  title: "imob.ro - Caută, compară și vinde în București",
  description: "Preț estimat, timp până la vânzare, zone pe înțelesul tău.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
