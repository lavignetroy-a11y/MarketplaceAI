'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, Upload, X } from 'lucide-react';
import { Logo } from './Logo';
import { useAuth } from '@/components/auth/AuthProvider';

const LINKS = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Examples', href: '#examples' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Why it works', href: '#why' },
];

export function Nav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();

  return (
    <header className="sticky top-4 z-50 px-4">
      <div className="mx-auto flex max-w-page items-center justify-between rounded-full border border-marketplace-line/70 bg-white/80 px-3 py-2.5 shadow-soft backdrop-blur-md md:px-4">
        <Link href="/" className="pl-2">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[0.875rem] font-medium tracking-[-0.01em] text-marketplace-muted transition-colors hover:text-marketplace-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-5 md:flex">
          <Link
            href={user ? '/account' : '/signin'}
            className="text-[0.875rem] font-medium tracking-[-0.01em] text-marketplace-muted transition-colors hover:text-marketplace-ink"
          >
            {user ? 'Your sets' : 'Sign in'}
          </Link>
          <Link
            href="/upload"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-marketplace-ink px-5 text-[0.9375rem] font-semibold text-white transition-transform hover:-translate-y-px hover:bg-marketplace-charcoal"
          >
            Upload your photos
            <Upload className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-full text-marketplace-ink md:hidden"
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav-menu"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <nav
          id="mobile-nav-menu"
          aria-label="Mobile"
          className="mx-auto mt-2 flex max-w-page flex-col gap-1 rounded-brand-lg border border-marketplace-line/70 bg-white p-4 shadow-lift md:hidden"
        >
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="rounded-brand-sm px-3 py-3 text-[0.9375rem] font-medium text-marketplace-ink"
            >
              {link.label}
            </a>
          ))}
          <Link
            href={user ? '/account' : '/signin'}
            onClick={() => setMobileOpen(false)}
            className="rounded-brand-sm px-3 py-3 text-[0.9375rem] font-medium text-marketplace-ink"
          >
            {user ? 'Your sets' : 'Sign in'}
          </Link>
          <Link
            href="/upload"
            className="mt-2 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-marketplace-ink px-5 text-[0.9375rem] font-semibold text-white"
          >
            Upload your photos
            <Upload className="h-4 w-4" aria-hidden="true" />
          </Link>
        </nav>
      )}
    </header>
  );
}
