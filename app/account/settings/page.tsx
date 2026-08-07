'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AlertCircle, ArrowLeft, Check, Loader2, LogOut, Trash2 } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Logo } from '@/components/marketing/Logo';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading, configured, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function sendPasswordReset() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !user?.email) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(user.email);
      if (err) throw err;
      setNotice('Password reset link sent — check your email.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the reset email.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteEverything() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !user) return;
    setBusy(true);
    setError(null);
    try {
      // Row-level security scopes this to the signed-in user; cascade removes their images.
      const { error: err } = await supabase.from('campaigns').delete().eq('user_id', user.id);
      if (err) throw err;
      setNotice('All of your sets have been deleted.');
      setConfirmDelete(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete your sets.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-marketplace-paper">
      <header className="border-b border-marketplace-line/70 bg-white/70 backdrop-blur">
        <div className="page-shell mx-auto flex max-w-page items-center justify-between py-5">
          <Link href="/">
            <Logo />
          </Link>
          <Link
            href="/account"
            className="inline-flex items-center gap-2 text-[0.875rem] font-medium text-marketplace-muted transition-colors hover:text-marketplace-ink"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Your sets
          </Link>
        </div>
      </header>

      <div className="page-shell mx-auto max-w-[680px] py-14">
        <h1 className="text-[2rem] font-[650] leading-[1.05] tracking-[-0.04em] text-marketplace-ink">
          Settings
        </h1>

        {loading ? (
          <div className="mt-8 flex items-center gap-3 text-marketplace-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : !configured || !user ? (
          <div className="mt-8 flex items-start gap-3 rounded-brand border border-marketplace-warning/30 bg-marketplace-warning/[0.07] p-5">
            <AlertCircle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-marketplace-warning" />
            <p className="text-[0.9375rem] leading-[1.55] text-marketplace-muted">
              {configured ? (
                <>
                  You need to{' '}
                  <Link href="/signin" className="font-medium text-marketplace-violet underline">
                    sign in
                  </Link>{' '}
                  to change your settings.
                </>
              ) : (
                <>Accounts aren&rsquo;t configured on this deployment yet.</>
              )}
            </p>
          </div>
        ) : (
          <div className="mt-10 flex flex-col gap-5">
            <Card title="Account">
              <Row label="Email" value={user.email ?? '—'} />
              <Row
                label="Member since"
                value={new Date(user.created_at).toLocaleDateString(undefined, {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              />
            </Card>

            <Card title="Password">
              <p className="text-[0.9375rem] leading-[1.55] text-marketplace-muted">
                We&rsquo;ll email you a link to set a new password.
              </p>
              <button
                type="button"
                onClick={sendPasswordReset}
                disabled={busy}
                className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-[12px] border border-marketplace-line bg-white px-5 text-[0.875rem] font-medium text-marketplace-ink transition-colors hover:border-marketplace-ink disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Send reset link
              </button>
            </Card>

            <Card title="Sign out">
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  router.push('/');
                }}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-[12px] border border-marketplace-line bg-white px-5 text-[0.875rem] font-medium text-marketplace-ink transition-colors hover:border-marketplace-ink"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </button>
            </Card>

            <Card title="Delete your sets" danger>
              <p className="text-[0.9375rem] leading-[1.55] text-marketplace-muted">
                Permanently removes every set on your account, including the generated images.
                This can&rsquo;t be undone — download anything you want to keep first.
              </p>
              {confirmDelete ? (
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={deleteEverything}
                    disabled={busy}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-[12px] bg-marketplace-error px-5 text-[0.875rem] font-semibold text-white disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Yes, delete everything
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="inline-flex min-h-[44px] items-center rounded-[12px] border border-marketplace-line bg-white px-5 text-[0.875rem] font-medium text-marketplace-ink"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-[12px] border border-marketplace-error/40 bg-white px-5 text-[0.875rem] font-medium text-marketplace-error transition-colors hover:bg-marketplace-error/[0.04]"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Delete all my sets
                </button>
              )}
            </Card>

            {notice && (
              <p className="flex items-center gap-2 text-[0.875rem] text-marketplace-success">
                <Check className="h-4 w-4" aria-hidden="true" />
                {notice}
              </p>
            )}
            {error && <p className="text-[0.875rem] text-marketplace-error">{error}</p>}
          </div>
        )}
      </div>
    </main>
  );
}

function Card({
  title,
  children,
  danger,
}: {
  title: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <section
      className={`rounded-brand-lg border bg-white/80 p-6 shadow-soft backdrop-blur ${
        danger ? 'border-marketplace-error/25' : 'border-marketplace-line/60'
      }`}
    >
      <h2
        className={`text-[1.0625rem] font-semibold tracking-[-0.02em] ${
          danger ? 'text-marketplace-error' : 'text-marketplace-ink'
        }`}
      >
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-marketplace-line/60 py-3 last:border-0">
      <span className="text-[0.875rem] text-marketplace-muted">{label}</span>
      <span className="text-[0.875rem] font-medium text-marketplace-ink">{value}</span>
    </div>
  );
}
