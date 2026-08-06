'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AlertCircle, ArrowRight, Loader2, Lock, Mail } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Logo } from '@/components/marketing/Logo';

type Mode = 'signin' | 'signup';

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isSignUp = mode === 'signup';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;

    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      if (isSignUp) {
        const { data, error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        // With email confirmation enabled there's no session yet -- say so rather than
        // bouncing to an account page that will look signed out.
        if (!data.session) {
          setNotice('Check your email to confirm your account, then sign in.');
          return;
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      }
      router.push('/account');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[420px]">
      <Link href="/" className="mb-10 inline-block">
        <Logo />
      </Link>

      <h1 className="text-[2rem] font-[650] leading-[1.05] tracking-[-0.04em] text-marketplace-ink">
        {isSignUp ? 'Create your account' : 'Welcome back'}
      </h1>
      <p className="mt-3 text-[0.9375rem] leading-[1.55] text-marketplace-muted">
        {isSignUp
          ? 'Keep every set you create, re-download it any time, and check out faster next time.'
          : 'Sign in to see your past sets, download them again, and pick up where you left off.'}
      </p>

      {!supabase && (
        <div className="mt-6 flex items-start gap-3 rounded-brand border border-marketplace-warning/30 bg-marketplace-warning/[0.07] p-4">
          <AlertCircle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-marketplace-warning" />
          <div className="text-[0.8375rem] leading-[1.5] text-marketplace-muted">
            <p className="font-medium text-marketplace-ink">Accounts aren&rsquo;t configured yet.</p>
            <p className="mt-1">
              Add your Supabase URL and anon key to <code className="font-mono">.env.local</code>,
              then run <code className="font-mono">supabase/migrations/0001_init.sql</code> in your
              project&rsquo;s SQL editor.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-[0.875rem] font-medium text-marketplace-ink"
          >
            Email
          </label>
          <div className="relative">
            <Mail
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-marketplace-muted-light"
              aria-hidden="true"
            />
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!supabase || busy}
              className="w-full rounded-[12px] border border-marketplace-line bg-white py-3 pl-10 pr-3.5 text-[0.9375rem] text-marketplace-ink outline-none transition-colors focus:border-marketplace-violet disabled:opacity-60"
              placeholder="you@example.com"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-[0.875rem] font-medium text-marketplace-ink"
          >
            Password
          </label>
          <div className="relative">
            <Lock
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-marketplace-muted-light"
              aria-hidden="true"
            />
            <input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!supabase || busy}
              className="w-full rounded-[12px] border border-marketplace-line bg-white py-3 pl-10 pr-3.5 text-[0.9375rem] text-marketplace-ink outline-none transition-colors focus:border-marketplace-violet disabled:opacity-60"
              placeholder={isSignUp ? 'At least 8 characters' : '••••••••'}
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="text-[0.875rem] text-marketplace-error">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="text-[0.875rem] text-marketplace-success">
            {notice}
          </p>
        )}

        <button
          type="submit"
          disabled={!supabase || busy}
          className="mt-2 inline-flex min-h-[50px] items-center justify-center gap-2 rounded-[14px] bg-violet-blue text-[0.9375rem] font-semibold text-white shadow-[0_10px_26px_rgba(122,92,255,0.32)] transition-transform hover:-translate-y-px disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <>
              {isSignUp ? 'Create account' : 'Sign in'}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-[0.875rem] text-marketplace-muted">
        {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
        <Link
          href={isSignUp ? '/signin' : '/signup'}
          className="font-medium text-marketplace-violet hover:underline"
        >
          {isSignUp ? 'Sign in' : 'Create one'}
        </Link>
      </p>

      <p className="mt-8 text-center text-[0.8125rem] text-marketplace-muted-light">
        You don&rsquo;t need an account to create a set —{' '}
        <Link href="/upload" className="underline hover:text-marketplace-muted">
          start without signing in
        </Link>
        .
      </p>
    </div>
  );
}
