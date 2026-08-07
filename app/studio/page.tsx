'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Copy,
  Layers,
  Loader2,
  Play,
  RefreshCw,
  X,
} from 'lucide-react';
import { Logo } from '@/components/marketing/Logo';

type Row = {
  id: string;
  path: string;
  group: string;
  label: string;
  size: string;
  references: number;
  prompt: string;
  exists: boolean;
  bytes: number;
};

type Status = 'idle' | 'queued' | 'running' | 'done' | 'error';

// Sequential, not parallel: image generation is rate-limited and each call is expensive, so a
// burst of 117 concurrent requests would mostly turn into 429s and wasted spend.
const MAX_CONCURRENT = 1;

export default function StudioPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('high');
  const [running, setRunning] = useState(false);
  const [openPrompt, setOpenPrompt] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [bust, setBust] = useState(0);

  const load = useCallback(async () => {
    const res = await fetch('/api/studio/manifest');
    if (!res.ok) {
      setRows([]);
      return;
    }
    const data = await res.json();
    setRows(data.images as Row[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo(() => {
    if (!rows) return [];
    const map = new Map<string, Row[]>();
    for (const r of rows) {
      if (!map.has(r.group)) map.set(r.group, []);
      map.get(r.group)!.push(r);
    }
    return [...map.entries()];
  }, [rows]);

  const missing = rows?.filter((r) => !r.exists) ?? [];

  async function generateOne(id: string) {
    setStatus((s) => ({ ...s, [id]: 'running' }));
    setErrors((e) => ({ ...e, [id]: '' }));
    try {
      const res = await fetch('/api/studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, quality }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed.');
      setStatus((s) => ({ ...s, [id]: 'done' }));
      setRows((rs) =>
        rs ? rs.map((r) => (r.id === id ? { ...r, exists: true, bytes: data.bytes } : r)) : rs,
      );
      setBust((b) => b + 1);
    } catch (err) {
      setStatus((s) => ({ ...s, [id]: 'error' }));
      setErrors((e) => ({ ...e, [id]: err instanceof Error ? err.message : 'Failed.' }));
    }
  }

  async function runBatch(ids: string[]) {
    if (!ids.length || running) return;
    setRunning(true);
    setStatus((s) => ({ ...s, ...Object.fromEntries(ids.map((id) => [id, 'queued' as Status])) }));
    for (let i = 0; i < ids.length; i += MAX_CONCURRENT) {
      await Promise.all(ids.slice(i, i + MAX_CONCURRENT).map(generateOne));
    }
    setRunning(false);
  }

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (rows === null) {
    return (
      <Shell>
        <div className="flex items-center gap-3 text-marketplace-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading manifest…
        </div>
      </Shell>
    );
  }

  if (rows.length === 0) {
    return (
      <Shell>
        <p className="text-marketplace-muted">
          The studio is only available when running locally (<code>npm run dev</code>).
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-[2rem] font-[650] leading-[1.05] tracking-[-0.04em] text-marketplace-ink">
            Image studio
          </h1>
          <p className="mt-2 text-[0.9375rem] text-marketplace-muted">
            {rows.length - missing.length} of {rows.length} generated ·{' '}
            <span className="font-medium text-marketplace-ink">{missing.length} missing</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-[0.875rem] text-marketplace-muted">
            Quality
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value as typeof quality)}
              className="rounded-[10px] border border-marketplace-line bg-white px-3 py-2 text-[0.875rem] text-marketplace-ink"
            >
              <option value="low">low (cheapest)</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => runBatch(missing.map((r) => r.id))}
            disabled={running || missing.length === 0}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-[12px] bg-violet-blue px-5 text-[0.875rem] font-semibold text-white shadow-[0_8px_20px_rgba(122,92,255,0.3)] disabled:opacity-50"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Generate all missing ({missing.length})
          </button>
          <button
            type="button"
            onClick={() => runBatch([...selected])}
            disabled={running || selected.size === 0}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-[12px] border border-marketplace-line bg-white px-5 text-[0.875rem] font-medium text-marketplace-ink disabled:opacity-50"
          >
            <Layers className="h-4 w-4" />
            Selected ({selected.size})
          </button>
          <button
            type="button"
            onClick={load}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-[12px] border border-marketplace-line bg-white px-4 text-[0.875rem] font-medium text-marketplace-ink"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-brand border border-marketplace-warning/30 bg-marketplace-warning/[0.07] p-4">
        <AlertTriangle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-marketplace-warning" />
        <p className="text-[0.8375rem] leading-[1.55] text-marketplace-muted">
          <span className="font-medium text-marketplace-ink">Each generation costs money.</span>{' '}
          Generating all {missing.length} missing images makes {missing.length} API calls. Test a
          single image first, check the result, then run the batch. Files are written straight into{' '}
          <code className="font-mono">public/images/</code> — commit them when you&rsquo;re happy.
        </p>
      </div>

      <div className="mt-10 flex flex-col gap-10">
        {groups.map(([group, items]) => (
          <section key={group}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[1.0625rem] font-semibold tracking-[-0.02em] text-marketplace-ink">
                {group}
              </h2>
              <button
                type="button"
                onClick={() => runBatch(items.filter((i) => !i.exists).map((i) => i.id))}
                disabled={running || items.every((i) => i.exists)}
                className="text-[0.8125rem] font-medium text-marketplace-violet disabled:opacity-40"
              >
                Generate missing in this group
              </button>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {items.map((row) => {
                const st = status[row.id] ?? 'idle';
                return (
                  <div
                    key={row.id}
                    className={`overflow-hidden rounded-brand-lg border bg-white/80 shadow-soft ${
                      selected.has(row.id)
                        ? 'border-marketplace-violet'
                        : 'border-marketplace-line/60'
                    }`}
                  >
                    <div className="relative aspect-square bg-marketplace-canvas">
                      {row.exists ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`${row.path}?v=${bust}`}
                          alt={row.label}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[0.75rem] text-marketplace-muted-light">
                          not generated
                        </div>
                      )}
                      {st === 'running' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/75">
                          <Loader2 className="h-6 w-6 animate-spin text-marketplace-violet" />
                        </div>
                      )}
                      {st === 'queued' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/60 text-[0.75rem] text-marketplace-muted">
                          queued
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => toggle(row.id)}
                        aria-label={`Select ${row.label}`}
                        className={`absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border shadow-soft ${
                          selected.has(row.id)
                            ? 'border-marketplace-violet bg-violet-blue text-white'
                            : 'border-marketplace-line bg-white/90 text-transparent'
                        }`}
                      >
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      </button>
                    </div>

                    <div className="p-3.5">
                      <p className="truncate text-[0.875rem] font-medium text-marketplace-ink">
                        {row.label}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-[0.6875rem] text-marketplace-muted-light">
                        {row.path.replace('/images/', '')}
                      </p>
                      <p className="mt-1 font-mono text-[0.6875rem] text-marketplace-muted-light">
                        {row.size}
                        {row.references > 0 && ` · ${row.references} refs`}
                        {row.exists && ` · ${(row.bytes / 1024).toFixed(0)}KB`}
                      </p>

                      {st === 'error' && (
                        <p className="mt-2 text-[0.75rem] leading-snug text-marketplace-error">
                          {errors[row.id]}
                        </p>
                      )}

                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => generateOne(row.id)}
                          disabled={running || st === 'running'}
                          className="flex-1 rounded-[10px] bg-marketplace-ink px-3 py-2 text-[0.75rem] font-semibold text-white disabled:opacity-50"
                        >
                          {row.exists ? 'Regenerate' : 'Generate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpenPrompt(row.id)}
                          className="rounded-[10px] border border-marketplace-line px-3 py-2 text-[0.75rem] font-medium text-marketplace-ink"
                        >
                          Prompt
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {openPrompt && (
        <PromptModal
          row={rows.find((r) => r.id === openPrompt)!}
          onClose={() => setOpenPrompt(null)}
          onCopy={(text) => {
            navigator.clipboard.writeText(text);
            setCopied(openPrompt);
            setTimeout(() => setCopied(null), 1500);
          }}
          copied={copied === openPrompt}
        />
      )}
    </Shell>
  );
}

function PromptModal({
  row,
  onClose,
  onCopy,
  copied,
}: {
  row: Row;
  onClose: () => void;
  onCopy: (text: string) => void;
  copied: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-marketplace-ink/40 p-6 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[80vh] w-full max-w-[760px] overflow-auto rounded-brand-lg bg-white p-7 shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-[1.0625rem] font-semibold tracking-[-0.02em] text-marketplace-ink">
              {row.label}
            </h3>
            <p className="mt-1 font-mono text-[0.75rem] text-marketplace-muted">
              {row.path} · {row.size}
              {row.references > 0 && ` · ${row.references} reference images`}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onCopy(row.prompt)}
              className="inline-flex items-center gap-1.5 rounded-[10px] border border-marketplace-line px-3 py-2 text-[0.75rem] font-medium text-marketplace-ink"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-marketplace-line"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <pre className="mt-5 whitespace-pre-wrap font-mono text-[0.75rem] leading-[1.6] text-marketplace-muted">
          {row.prompt}
        </pre>
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-marketplace-paper">
      <header className="border-b border-marketplace-line/70 bg-white/70 backdrop-blur">
        <div className="page-shell mx-auto flex max-w-page items-center justify-between py-5">
          <Link href="/">
            <Logo />
          </Link>
          <span className="rounded-full bg-marketplace-ink px-3 py-1.5 font-mono text-[0.6875rem] uppercase tracking-wider text-white">
            internal · dev only
          </span>
        </div>
      </header>
      <div className="page-shell mx-auto max-w-page py-12">{children}</div>
    </main>
  );
}
