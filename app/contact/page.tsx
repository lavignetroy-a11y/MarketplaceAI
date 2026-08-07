import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, HelpCircle, Mail, ShieldAlert } from 'lucide-react';
import { Logo } from '@/components/marketing/Logo';
import { Footer } from '@/components/marketing/Footer';
import { IconGradientDefs, gradientStroke } from '@/components/marketing/primitives';

export const metadata: Metadata = { title: 'Contact · Marketplace / AI' };

// TODO: replace with your real addresses before launch.
const SUPPORT_EMAIL = 'support@example.com';
const ABUSE_EMAIL = 'abuse@example.com';

const ROUTES = [
  {
    icon: HelpCircle,
    title: 'Something went wrong with a set',
    body: 'Send us the set and what looked off. If we got it wrong we will regenerate it or refund you.',
    action: { label: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}` },
  },
  {
    icon: Mail,
    title: 'A question before you buy',
    body: 'Ask anything the FAQ does not cover. If it is a question you have, it is one we should be answering on the site.',
    action: { label: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}` },
  },
  {
    icon: ShieldAlert,
    title: 'Report misuse',
    body: 'If you have seen our images used to misrepresent an item, tell us and we will act on it.',
    action: { label: ABUSE_EMAIL, href: `mailto:${ABUSE_EMAIL}` },
  },
];

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-marketplace-paper">
      <IconGradientDefs />
      <header className="border-b border-marketplace-line/70 bg-white/70 backdrop-blur">
        <div className="page-shell mx-auto flex max-w-page items-center justify-between py-5">
          <Link href="/">
            <Logo />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[0.875rem] font-medium text-marketplace-muted transition-colors hover:text-marketplace-ink"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to site
          </Link>
        </div>
      </header>

      <div className="page-shell mx-auto max-w-[760px] py-14">
        <h1 className="text-[clamp(2rem,4vw,2.75rem)] font-[650] leading-[1.05] tracking-[-0.04em] text-marketplace-ink">
          Get in touch
        </h1>
        <p className="mt-4 max-w-[520px] text-[1.0625rem] leading-[1.6] text-marketplace-muted">
          A real person reads these. Tell us what you need and we&rsquo;ll come back to you.
        </p>

        <div className="mt-10 flex flex-col gap-4">
          {ROUTES.map(({ icon: Icon, title, body, action }) => (
            <div
              key={title}
              className="flex flex-wrap items-start gap-5 rounded-brand-lg border border-marketplace-line/60 bg-white/80 p-6 shadow-soft backdrop-blur"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-marketplace-violet/[0.13] to-marketplace-blue/[0.13]">
                <Icon className="h-5 w-5" {...gradientStroke} strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-[1.0625rem] font-semibold tracking-[-0.02em] text-marketplace-ink">
                  {title}
                </h2>
                <p className="mt-1.5 text-[0.9375rem] leading-[1.55] text-marketplace-muted">
                  {body}
                </p>
                <a
                  href={action.href}
                  className="mt-3 inline-block font-mono text-[0.875rem] font-medium text-marketplace-violet hover:underline"
                >
                  {action.label}
                </a>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-brand border border-marketplace-line/60 bg-marketplace-canvas/40 p-5">
          <p className="text-[0.875rem] leading-[1.55] text-marketplace-muted">
            Looking for a set you already made?{' '}
            <Link href="/account" className="font-medium text-marketplace-violet hover:underline">
              It&rsquo;s in your account
            </Link>{' '}
            — you can re-download any set at any time.
          </p>
        </div>
      </div>

      <Footer />
    </main>
  );
}
