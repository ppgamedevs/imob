"use client";

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Bookmark, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MobileBar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', icon: Home, label: 'Acasă' },
    { href: '/discover', icon: Search, label: 'Descoperă' },
    { href: '/saved', icon: Bookmark, label: 'Salvate' },
    { href: '/account', icon: User, label: 'Cont' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border h-16 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-full px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors min-h-[44px]',
                'hover:bg-accent focus:bg-accent focus:outline-none',
                isActive && 'text-primary bg-accent'
              )}
            >
              <Icon className={cn('h-5 w-5', isActive ? 'text-primary' : 'text-muted')} />
              <span className={cn('text-[10px] font-medium', isActive ? 'text-primary' : 'text-muted')}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
