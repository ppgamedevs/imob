import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Container } from "./Container";

/**
 * AppFooter - Site footer with links and legal info
 *
 * Features:
 * - Multi-column link groups
 * - Legal links (terms, privacy, cookies)
 * - Social links
 * - Copyright notice
 */

export interface AppFooterProps extends React.HTMLAttributes<HTMLElement> {}

const footerLinks = {
  product: {
    title: "Produs",
    links: [
      { href: "/discover", label: "Descoperă" },
      { href: "/how-we-estimate", label: "Cum estimăm" },
      { href: "/me/buyer", label: "Portal Cumpărător" },
      { href: "/vinde", label: "Vinde locuința" },
    ],
  },
  company: {
    title: "Companie",
    links: [
      { href: "/about", label: "Despre" },
      { href: "/contact", label: "Contact" },
      { href: "/careers", label: "Cariere" },
    ],
  },
  legal: {
    title: "Legal",
    links: [
      { href: "/termeni", label: "Termeni și condiții" },
      { href: "/confidentialitate", label: "Confidențialitate" },
      { href: "/cookies", label: "Cookie-uri" },
    ],
  },
};

const AppFooter = React.forwardRef<HTMLElement, AppFooterProps>(({ className, ...props }, ref) => {
  return (
    <footer
      ref={ref}
      className={cn("border-t border-border bg-surface", "py-12 md:py-16", className)}
      {...props}
    >
      <Container>
        {/* Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {/* Logo Column */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4 focus-ring rounded-md w-fit">
              <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold">iR</span>
              </div>
              <span className="font-bold text-xl">imob.ro</span>
            </Link>
            <p className="text-sm text-muted leading-relaxed">
              Platforma românească de analiză a pieței imobiliare. Estimări AVM, TTS, hărți termice.
            </p>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([key, section]) => (
            <div key={key}>
              <h3 className="font-semibold text-sm mb-3">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={cn(
                        "text-sm text-muted hover:text-text",
                        "transition-colors duration-fast",
                        "focus-ring rounded-sm",
                      )}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted">
            © {new Date().getFullYear()} imob.ro. Toate drepturile rezervate.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/ppgamedevs/imob"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted hover:text-text transition-colors focus-ring rounded-sm"
              aria-label="GitHub"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"
                />
              </svg>
            </a>
          </div>
        </div>
      </Container>
    </footer>
  );
});

AppFooter.displayName = "AppFooter";

export { AppFooter };
