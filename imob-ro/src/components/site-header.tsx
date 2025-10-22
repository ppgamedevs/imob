import { Menu } from "lucide-react";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { auth, signOut } from "@/lib/auth";
import { getSubscription } from "@/lib/billing/entitlements";

const navLinks = [
  { href: "/", label: "Acasă" },
  { href: "/search", label: "Căutare" },
  { href: "/dashboard", label: "Dashboard" },
];

export async function SiteHeader() {
  const session = await auth();
  const subscription = session?.user?.id ? await getSubscription(session.user.id) : null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 text-lg font-semibold sm:text-2xl">
          <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center text-primary font-bold">
            iR
          </div>
          <span className="hidden sm:inline">imob.ro</span>
        </Link>

        {/* Desktop Navigation */}
        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList>
            {navLinks.map((link) => (
              <NavigationMenuItem key={link.href}>
                <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                  <Link href={link.href}>{link.label}</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        {/* Right side - Auth + Theme Toggle + Mobile Menu */}
        <div className="flex items-center gap-3">
          {session?.user ? (
            <div className="hidden items-center gap-2 md:flex">
              {/* Day 23 - Plan Badge */}
              {subscription && (
                <Badge variant={subscription.planCode === "pro" ? "default" : "secondary"}>
                  {subscription.planCode.toUpperCase()}
                </Badge>
              )}
              <Button variant="ghost" size="sm" asChild>
                <Link href="/account">Cont</Link>
              </Button>
              <form
                action={async () => {
                  "use server";
                  await signOut();
                }}
              >
                <Button variant="outline" size="sm" type="submit">
                  Ieșire
                </Button>
              </form>
            </div>
          ) : (
            <Button variant="default" size="sm" asChild className="hidden md:flex">
              <Link href="/auth/signin">Conectare</Link>
            </Button>
          )}

          <ThemeToggle />
          {subscription?.planCode !== "pro" && (
            <Button variant="ghost" size="sm" asChild className="hidden md:inline-flex">
              <Link href="/pricing">Upgrade</Link>
            </Button>
          )}

          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-lg font-medium hover:underline"
                  >
                    {link.label}
                  </Link>
                ))}
                {session?.user ? (
                  <>
                    <div className="border-t pt-4">
                      <p className="mb-2 text-sm text-muted-foreground">{session.user.email}</p>
                      <form
                        action={async () => {
                          "use server";
                          await signOut();
                        }}
                      >
                        <Button variant="outline" size="sm" type="submit" className="w-full">
                          Ieșire
                        </Button>
                      </form>
                    </div>
                  </>
                ) : (
                  <Button variant="default" asChild>
                    <Link href="/auth/signin">Conectare</Link>
                  </Button>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
