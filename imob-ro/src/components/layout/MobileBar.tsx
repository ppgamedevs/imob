"use client";

import { Bookmark, Home, Link2, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { flags } from "@/lib/flags";
import { cn } from "@/lib/utils";

/**
 * Bottom bar: buyer core only. Discover is opt-in via flags (hidden for MVP).
 */
export default function MobileBar() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", icon: Home, label: "Acasă" },
    ...(flags.discover
      ? ([{ href: "/discover", icon: Link2, label: "Descoperă" }] as const)
      : ([{ href: "/analyze", icon: Link2, label: "Analiză" }] as const)),
    { href: "/profile", icon: Bookmark, label: "Rapoarte" },
    { href: "/account", icon: User, label: "Cont" },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border h-16 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-full px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/" &&
              item.href !== "/analyze" &&
              pathname?.startsWith(item.href)) ||
            (item.href === "/analyze" &&
              (pathname?.startsWith("/analyze") || pathname?.startsWith("/report"))) ||
            (item.href === "/discover" && pathname?.startsWith("/discover"));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-lg transition-colors min-h-[44px] max-w-[25%] flex-1",
                "hover:bg-accent focus:bg-accent focus:outline-none",
                isActive && "text-primary bg-accent",
              )}
            >
              <Icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted")} />
              <span
                className={cn(
                  "text-[10px] font-medium truncate w-full text-center",
                  isActive ? "text-primary" : "text-muted",
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
