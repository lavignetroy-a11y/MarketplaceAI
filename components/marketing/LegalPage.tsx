import Link from 'next/link';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { Logo } from './Logo';
import { Footer } from './Footer';

/**
 * Shared shell for policy pages. The draft banner is deliberately prominent: these are
 * plain-English starting points written to be readable, not reviewed legal instruments, and
 * shipping them silently as if they were would be worse than having no page at all.
 */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-marketplace-paper">
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

      <article className="page-shell mx-auto max-w-[760px] py-14">
        <h1 className="text-[clamp(2rem,4vw,2.75rem)] font-[650] leading-[1.05] tracking-[-0.04em] text-marketplace-ink">
          {title}
        </h1>
        <p className="mt-3 font-mono text-[0.8125rem] text-marketplace-muted-light">
          Last updated {updated}
        </p>

        <div className="mt-8 flex items-start gap-3 rounded-brand border border-marketplace-warning/30 bg-marketplace-warning/[0.07] p-4">
          <AlertTriangle
            className="mt-0.5 h-4.5 w-4.5 shrink-0 text-marketplace-warning"
            aria-hidden="true"
          />
          <p className="text-[0.8375rem] leading-[1.55] text-marketplace-muted">
            <span className="font-medium text-marketplace-ink">Draft — not yet legally reviewed.</span>{' '}
            This is a plain-English starting point written to be understandable. Have a lawyer
            review and adapt it for your jurisdiction before you take real payments.
          </p>
        </div>

        <div className="legal-prose mt-10">{children}</div>
      </article>

      <Footer />
    </main>
  );
}
