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
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-lg font-bold">
              imob.ro
            </Link>
            <p className="text-sm text-muted-foreground hidden sm:block">
              © {currentYear} imob.ro
            </p>
          </div>

          <nav aria-label="Footer" className="order-last md:order-none">
            <ul className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <li>
                <Link href="/how-we-estimate" className="hover:text-foreground hover:underline">
                  Cum estimăm
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-foreground hover:underline">
                  Termeni
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-foreground hover:underline">
                  Confidențialitate
                </Link>
              </li>
            </ul>
          </nav>

          <div className="hidden sm:block text-sm text-muted-foreground">
            Made with ♥ in Romania
          </div>
        </div>
      </div>
    </footer>
  );
}
