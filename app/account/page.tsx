'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Download,
  ImageIcon,
  Loader2,
  LogOut,
  Plus,
  Settings,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Logo } from '@/components/marketing/Logo';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { formatPrice } from '@/lib/config/pricing';

type CampaignRow = {
  id: string;
  status: string;
  requested_count: number;
  paid: boolean;
  price_cents: number;
  listing_title: string | null;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  queued: 'Preparing',
  analyzing: 'Understanding your item',
  generating_preview: 'Creating preview',
  preview_ready: 'Preview ready',
  generating: 'Creating your set',
  packaging: 'Almost ready',
  completed: 'Ready',
  incomplete: 'Partially complete',
  needs_more_evidence: 'Needs one more photo',
  failed: 'Could not complete',
};

export default function AccountPage() {
  const { user, loading, configured, signOut } = useAuth();
  const [campaigns, setCampaigns] = useState<CampaignRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !user) return;

    supabase
      .from('campaigns')
      .select('id,status,requested_count,paid,price_cents,listing_title,created_at')
      .order('created_at', { ascending: false })
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setCampaigns((data as CampaignRow[]) ?? []);
      });
  }, [user]);

  return (
    <main className="min-h-screen bg-marketplace-paper">
      <header className="border-b border-marketplace-line/70 bg-white/70 backdrop-blur">
        <div className="page-shell mx-auto flex max-w-page items-center justify-between py-5">
          <Link href="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/upload"
              className="inline-flex min-h-[42px] items-center gap-2 rounded-full bg-marketplace-ink px-5 text-[0.875rem] font-semibold text-white transition-colors hover:bg-marketplace-charcoal"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              New set
            </Link>
            {user && (
              <button
                type="button"
                onClick={() => signOut()}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-full border border-marketplace-line px-4 text-[0.875rem] font-medium text-marketplace-muted transition-colors hover:border-marketplace-ink hover:text-marketplace-ink"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="page-shell mx-auto max-w-page py-12">
        {loading ? (
          <div className="flex items-center gap-3 text-marketplace-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading your account…
          </div>
        ) : !configured ? (
          <NotConfigured />
        ) : !user ? (
          <SignedOut />
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-[2rem] font-[650] leading-[1.05] tracking-[-0.04em] text-marketplace-ink">
                  Your sets
                </h1>
                <p className="mt-2 text-[0.9375rem] text-marketplace-muted">
                  Signed in as <span className="font-medium text-marketplace-ink">{user.email}</span>
                </p>
              </div>
              <Link
                href="/account/settings"
                className="inline-flex items-center gap-2 text-[0.875rem] font-medium text-marketplace-muted transition-colors hover:text-marketplace-ink"
              >
                <Settings className="h-4 w-4" aria-hidden="true" />
                Settings
              </Link>
            </div>

            {error && (
              <p className="mt-6 text-[0.875rem] text-marketplace-error">
                Couldn&rsquo;t load your sets: {error}
              </p>
            )}

            {campaigns === null && !error ? (
              <div className="mt-10 flex items-center gap-3 text-marketplace-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : campaigns && campaigns.length === 0 ? (
              <EmptyState />
            ) : (
              <ul className="mt-10 grid gap-4">
                {campaigns?.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center gap-5 rounded-brand-lg border border-marketplace-line/60 bg-white/80 p-5 shadow-soft backdrop-blur"
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-marketplace-violet/[0.13] to-marketplace-blue/[0.13]">
                      <ImageIcon className="h-5 w-5 text-marketplace-violet" strokeWidth={2} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.9375rem] font-semibold tracking-[-0.015em] text-marketplace-ink">
                        {c.listing_title ?? 'Untitled set'}
                      </p>
                      <p className="mt-0.5 text-[0.8125rem] text-marketplace-muted">
                        {c.requested_count} images ·{' '}
                        {new Date(c.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <span className="rounded-full border border-marketplace-line/70 bg-white px-3 py-1.5 text-[0.75rem] font-medium text-marketplace-muted">
                      {STATUS_LABEL[c.status] ?? c.status}
                    </span>
                    <span className="font-mono text-[0.875rem] text-marketplace-ink">
                      {c.paid ? formatPrice(c.price_cents) : 'Unpaid'}
                    </span>
                    <Link
                      href={`/upload?campaign=${c.id}`}
                      className="inline-flex min-h-[42px] items-center gap-2 rounded-full border border-marketplace-line px-4 text-[0.875rem] font-medium text-marketplace-ink transition-colors hover:border-marketplace-ink"
                    >
                      <Download className="h-4 w-4" aria-hidden="true" />
                      Open
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function NotConfigured() {
  return (
    <div className="rounded-brand-lg border border-marketplace-warning/30 bg-marketplace-warning/[0.06] p-7">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-marketplace-warning" />
        <div>
          <h1 className="text-[1.25rem] font-semibold tracking-[-0.02em] text-marketplace-ink">
            Accounts aren&rsquo;t configured yet
          </h1>
          <p className="mt-2 max-w-[560px] text-[0.9375rem] leading-[1.6] text-marketplace-muted">
            Add <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code>,{' '}
            <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> and{' '}
            <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> to{' '}
            <code className="font-mono">.env.local</code>, then run{' '}
            <code className="font-mono">supabase/migrations/0001_init.sql</code> in your Supabase
            project&rsquo;s SQL editor and restart the dev server.
          </p>
          <Link
            href="/upload"
            className="mt-5 inline-flex min-h-[46px] items-center gap-2 rounded-[14px] bg-marketplace-ink px-5 text-[0.9375rem] font-semibold text-white"
          >
            Create a set without an account
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function SignedOut() {
  return (
    <div className="mx-auto max-w-[440px] py-16 text-center">
      <Sparkles className="mx-auto h-8 w-8 text-marketplace-violet" strokeWidth={1.75} />
      <h1 className="mt-5 text-[1.75rem] font-[650] tracking-[-0.035em] text-marketplace-ink">
        Sign in to see your sets
      </h1>
      <p className="mt-3 text-[0.9375rem] leading-[1.6] text-marketplace-muted">
        Your finished sets, ready to download again any time.
      </p>
      <div className="mt-7 flex justify-center gap-3">
        <Link
          href="/signin"
          className="inline-flex min-h-[48px] items-center rounded-[14px] bg-violet-blue px-6 text-[0.9375rem] font-semibold text-white shadow-[0_10px_26px_rgba(122,92,255,0.3)]"
        >
          Sign in
        </Link>
        <Link
          href="/signup"
          className="inline-flex min-h-[48px] items-center rounded-[14px] border border-marketplace-line px-6 text-[0.9375rem] font-semibold text-marketplace-ink"
        >
          Create account
        </Link>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-10 rounded-brand-lg border border-dashed border-marketplace-line bg-white/60 py-16 text-center">
      <ImageIcon className="mx-auto h-8 w-8 text-marketplace-muted-light" strokeWidth={1.5} />
      <p className="mt-4 text-[1.0625rem] font-semibold tracking-[-0.02em] text-marketplace-ink">
        No sets yet
      </p>
      <p className="mx-auto mt-2 max-w-[380px] text-[0.9375rem] text-marketplace-muted">
        Upload photos of something you&rsquo;re selling and we&rsquo;ll show you a finished image
        free.
      </p>
      <Link
        href="/upload"
        className="mt-6 inline-flex min-h-[48px] items-center gap-2 rounded-[14px] bg-violet-blue px-6 text-[0.9375rem] font-semibold text-white shadow-[0_10px_26px_rgba(122,92,255,0.3)]"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Create your first set
      </Link>
    </div>
  );
}
