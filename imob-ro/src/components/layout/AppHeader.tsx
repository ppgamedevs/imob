import * as React from "react";
import Link from "next/link";
import { Menu, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Container } from "./Container";

/**
 * AppHeader - Main navigation header
 *
 * Features:
 * - Sticky positioning with backdrop blur
 * - Search input (prominent)
 * - City selector
 * - Auth state (sign in / profile)
 * - Mobile-responsive with sheet navigation
 */

export interface AppHeaderProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * User authentication state
   */
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
}

const navLinks = [
  { href: "/", label: "Acasă" },
  { href: "/discover", label: "Descoperă" },
  { href: "/me/buyer", label: "Cumpără" },
  { href: "/vinde", label: "Vinde" },
];

const AppHeader = React.forwardRef<HTMLElement, AppHeaderProps>(
  ({ className, user, ...props }, ref) => {
    return (
      <header
        ref={ref}
        className={cn(
          "sticky top-0 z-50 w-full",
          "border-b border-border",
          "bg-bg/95 backdrop-blur-sm",
          "supports-[backdrop-filter]:bg-bg/80",
          className,
        )}
        {...props}
      >
        <Container>
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0 focus-ring rounded-md">
              <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold text-sm">iR</span>
              </div>
              <span className="font-bold text-lg hidden sm:inline">imob.ro</span>
            </Link>

            {/* Search Bar (Desktop) */}
            <div className="hidden md:flex flex-1 max-w-xl">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                <input
                  type="search"
                  placeholder="Caută locuințe..."
                  className={cn(
                    "w-full h-10 pl-10 pr-4",
                    "bg-surface border border-border rounded-lg",
                    "text-sm text-text placeholder:text-muted",
                    "focus:outline-none focus:ring-2 focus:ring-primary",
                    "transition-shadow duration-fast",
                  )}
                />
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-md",
                    "text-text hover:bg-muted",
                    "transition-colors duration-fast",
                    "focus-ring",
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Auth / Profile */}
            <div className="flex items-center gap-2">
              {user ? (
                <Button variant="ghost" size="sm" className="hidden md:flex">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                    {user.name?.[0] || user.email?.[0] || "U"}
                  </div>
                </Button>
              ) : (
                <Button variant="default" size="sm" className="hidden md:flex" asChild>
                  <Link href="/auth/signin">Autentificare</Link>
                </Button>
              )}

              {/* Mobile Menu */}
              <Sheet>
                <SheetTrigger asChild className="md:hidden">
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Deschide meniu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80">
                  <SheetHeader>
                    <SheetTitle>Navigare</SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col gap-2 mt-6">
                    {navLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={cn(
                          "px-4 py-3 text-sm font-medium rounded-md",
                          "text-text hover:bg-muted",
                          "transition-colors duration-fast",
                        )}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Mobile Search */}
          <div className="md:hidden pb-3">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                type="search"
                placeholder="Caută locuințe..."
                className={cn(
                  "w-full h-10 pl-10 pr-4",
                  "bg-surface border border-border rounded-lg",
                  "text-sm text-text placeholder:text-muted",
                  "focus:outline-none focus:ring-2 focus:ring-primary",
                  "transition-shadow duration-fast",
                )}
              />
            </div>
          </div>
        </Container>
      </header>
    );
  },
);

AppHeader.displayName = "AppHeader";

export { AppHeader };
