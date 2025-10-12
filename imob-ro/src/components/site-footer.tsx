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
      <div className="container mx-auto max-w-7xl px-4 py-6 md:py-8">
        <div className="flex flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">
          <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground sm:gap-6">
            <Link href="#" className="hover:text-foreground hover:underline">
              Cum estimăm
            </Link>
            <Link href="#" className="hover:text-foreground hover:underline">
              Termeni
            </Link>
            <Link href="#" className="hover:text-foreground hover:underline">
              Confidențialitate
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">© {currentYear} imob.ro</p>
        </div>
      </div>
    </footer>
  );
}
