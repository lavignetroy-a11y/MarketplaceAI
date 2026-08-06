import Link from 'next/link';
import { Logo } from './Logo';

const GROUPS = [
  {
    title: 'Product',
    links: [
      { label: 'How it works', href: '#how-it-works' },
      { label: 'Examples', href: '#examples' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Why it works', href: '#why' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '/legal/privacy' },
      { label: 'Terms', href: '/legal/terms' },
      { label: 'Refund policy', href: '/legal/refunds' },
      { label: 'Acceptable use', href: '/legal/acceptable-use' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Contact', href: '/contact' },
      { label: 'Sign in', href: '/signin' },
      { label: 'Your campaigns', href: '/account' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-marketplace-line/70 bg-marketplace-paper">
      <div className="page-shell mx-auto max-w-page py-14">
        <div className="grid gap-10 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
          <div>
            <Logo />
            <p className="mt-4 max-w-[280px] text-[0.875rem] leading-[1.55] text-marketplace-muted">
              Turn the photos you already have into a polished listing set — without changing
              what you&rsquo;re actually selling.
            </p>
          </div>

          {GROUPS.map((group) => (
            <div key={group.title}>
              <p className="text-[0.75rem] font-[650] uppercase tracking-[0.14em] text-marketplace-muted-light">
                {group.title}
              </p>
              <ul className="mt-4 flex flex-col gap-2.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[0.875rem] text-marketplace-muted transition-colors hover:text-marketplace-ink"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-marketplace-line/70 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[0.8125rem] text-marketplace-muted-light">
            © {new Date().getFullYear()} Marketplace / AI. All rights reserved.
          </p>
          <p className="text-[0.8125rem] text-marketplace-muted-light">
            Better presented. Still the same item.
          </p>
        </div>
      </div>
    </footer>
  );
}
