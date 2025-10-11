/**
 * Copilot: Build <SiteFooter> minimal:
 * - Links: How we estimate (stub /how-we-estimate), Terms, Privacy
 * - Small text © {year} imob.ro
 */
import Link from "next/link";

export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/40 bg-background">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/how-we-estimate" className="hover:text-foreground hover:underline">
              Cum estimăm
            </Link>
            <Link href="/terms" className="hover:text-foreground hover:underline">
              Termeni
            </Link>
            <Link href="/privacy" className="hover:text-foreground hover:underline">
              Confidențialitate
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">© {currentYear} imob.ro</p>
        </div>
      </div>
    </footer>
  );
}
