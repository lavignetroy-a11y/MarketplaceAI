'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  Download,
  ImagePlus,
  Loader2,
  Lock,
  Minus,
  Plus,
  Sparkles,
  X,
} from 'lucide-react';
import { Logo } from '@/components/marketing/Logo';
import { useAuth } from '@/components/auth/AuthProvider';
import {
  DEFAULT_IMAGES,
  MAX_IMAGES,
  MAX_SOURCE_PHOTOS,
  MIN_IMAGES,
  coverageFor,
  formatPrice,
  priceCents,
} from '@/lib/config/pricing';

const POLL_MS = 3000;

type ShotResult = {
  sequenceNumber: number;
  imageRole: string;
  imageJob: string;
  status: 'done' | 'error';
  image?: string;
  isPreview?: boolean;
  error?: string;
};

type CampaignState = {
  id: string;
  status: string;
  statusLabel: string;
  statusMessage?: string;
  paid: boolean;
  priceCents: number;
  requestedCount: number;
  productSummary: { category: string; itemType: string; quantity: number } | null;
  minimumAdditionalEvidenceNeeded: string[];
  results: ShotResult[];
  listingTitle: string | null;
  listingDescription: string | null;
  error: string | null;
};

const TERMINAL = ['needs_more_evidence', 'preview_ready', 'completed', 'incomplete', 'failed'];

/** The funnel: choose coverage -> upload -> free watermarked preview -> pay -> full set. */
export default function UploadPage() {
  return (
    <Suspense fallback={null}>
      <UploadFlow />
    </Suspense>
  );
}

function UploadFlow() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialCount = Number(searchParams.get('count'));
  const [count, setCount] = useState(
    Number.isInteger(initialCount) && initialCount >= MIN_IMAGES && initialCount <= MAX_IMAGES
      ? initialCount
      : DEFAULT_IMAGES,
  );
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<CampaignState | null>(null);
  const [restoring, setRestoring] = useState(Boolean(searchParams.get('campaign')));

  const isProcessing = campaign !== null && !TERMINAL.includes(campaign.status);

  // Arriving from account history (or a bookmarked link) with ?campaign=<id>: load that set
  // rather than showing an empty upload form.
  const campaignParam = searchParams.get('campaign');
  useEffect(() => {
    if (!campaignParam) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/campaigns/${campaignParam}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || 'That set could not be found.');
        setCampaign(data as CampaignState);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'That set could not be found.');
      } finally {
        if (!cancelled) setRestoring(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [campaignParam]);

  useEffect(() => {
    if (!campaign || !isProcessing) return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/campaigns/${campaign.id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to check status.');
        setCampaign(data as CampaignState);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to check status.');
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [campaign, isProcessing]);

  // Object URLs for local thumbnails must be revoked or they leak for the page's lifetime.
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  const addFiles = useCallback(
    (selected: FileList | null) => {
      if (!selected) return;
      const combined = [...files, ...Array.from(selected)];
      if (combined.length > MAX_SOURCE_PHOTOS) {
        setError(`Up to ${MAX_SOURCE_PHOTOS} photos of one item. Extra photos were not added.`);
      } else {
        setError(null);
      }
      const next = combined.slice(0, MAX_SOURCE_PHOTOS);
      setFiles(next);
      setPreviews((old) => {
        old.forEach((u) => URL.revokeObjectURL(u));
        return next.map((f) => URL.createObjectURL(f));
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [files],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0) {
      setError('Add at least one photo of the item.');
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const form = new FormData();
      files.forEach((f) => form.append('photos', f));
      form.append('count', String(count));
      if (notes.trim()) form.append('notes', notes.trim());
      if (user?.id) form.append('userId', user.id);

      const res = await fetch('/api/campaigns', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');

      setCampaign({
        id: data.jobId,
        status: 'queued',
        statusLabel: 'Preparing your set',
        paid: false,
        priceCents: data.priceCents,
        requestedCount: count,
        productSummary: null,
        minimumAdditionalEvidenceNeeded: [],
        results: [],
        listingTitle: null,
        listingDescription: null,
        error: null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePay() {
    if (!campaign) return;
    setError(null);
    setSubmitting(true);
    try {
      // Try Stripe first. The server decides the price and creates the session; the browser only
      // follows the URL it gets back.
      const res = await fetch(`/api/campaigns/${campaign.id}/checkout`, { method: 'POST' });
      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
        return;
      }
      // 503 means this machine has no Stripe keys, so fall back to the development bypass. That
      // route refuses to exist in production or whenever Stripe IS configured.
      if (res.status === 503) {
        const dev = await fetch(`/api/campaigns/${campaign.id}/pay`, { method: 'POST' });
        if (!dev.ok) throw new Error((await dev.json()).error || 'Checkout failed.');
        return;
      }
      throw new Error((await res.json()).error || 'Checkout failed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed.');
    } finally {
      setSubmitting(false);
    }
  }

  const preview = campaign?.results.find((r) => r.isPreview) ?? campaign?.results[0];
  const coverage = coverageFor(count);

  return (
    <main className="min-h-screen bg-marketplace-paper">
      <header className="border-b border-marketplace-line/70 bg-white/70 backdrop-blur">
        <div className="page-shell mx-auto flex max-w-page items-center justify-between py-5">
          <Link href="/">
            <Logo />
          </Link>
          <Link
            href={user ? '/account' : '/signin'}
            className="text-[0.875rem] font-medium text-marketplace-muted transition-colors hover:text-marketplace-ink"
          >
            {user ? 'Your sets' : 'Sign in'}
          </Link>
        </div>
      </header>

      <div className="page-shell mx-auto max-w-[1120px] py-9">
        <Steps
          current={
            !campaign ? 1 : campaign.status === 'preview_ready' ? 3 : campaign.paid ? 4 : 2
          }
        />

        {restoring ? (
          <div className="mt-16 flex items-center justify-center gap-3 text-marketplace-muted">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading your set…
          </div>
        ) : !campaign ? (
          <form onSubmit={handleSubmit} className="mt-8">
            <h1 className="text-[2rem] font-[650] leading-[1.05] tracking-[-0.04em] text-marketplace-ink">
              Upload your photos
            </h1>
            <p className="mt-3 max-w-[560px] text-[0.9375rem] leading-[1.6] text-marketplace-muted">
              Add every angle you have of <span className="font-medium">one item</span>. Ordinary
              phone photos are exactly right — we&rsquo;ll handle the rest.
            </p>

            {/* Two columns from lg. As one stack the dropzone, the counter, the notes and the
                button queued up vertically and the call to action sat a full screen below the
                fold -- so the thing the page exists to get clicked was the one thing never on
                screen. Choosing what you get belongs beside choosing what you send, not after
                scrolling past it. */}
            <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.82fr)] lg:gap-8">
            <div className="min-w-0">

            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                addFiles(e.dataTransfer.files);
              }}
              className="mt-6 cursor-pointer rounded-brand-lg border border-marketplace-line/60 bg-white/70 p-2 shadow-soft"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />
              <div className="rounded-[22px] border border-dashed border-marketplace-line bg-marketplace-canvas/55 px-6 py-10 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-violet-blue shadow-[0_8px_20px_rgba(122,92,255,0.32)]">
                  <ImagePlus className="h-6 w-6 text-white" strokeWidth={2} />
                </span>
                <p className="mt-4 text-[1rem] font-semibold text-marketplace-ink">
                  Drop your photos here
                </p>
                <p className="text-[0.9375rem] font-medium text-marketplace-violet">
                  or choose files
                </p>
                <p className="mt-2 flex items-center justify-center gap-1.5 text-[0.8125rem] text-marketplace-muted">
                  <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                  Up to {MAX_SOURCE_PHOTOS} photos of one item. Your photos stay private.
                </p>
              </div>
            </div>

            {previews.length > 0 && (
              <div className="mt-5 grid grid-cols-4 gap-3 sm:grid-cols-6">
                {previews.map((url, i) => (
                  <div key={url} className="group relative aspect-square">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={files[i]?.name ?? ''}
                      className="h-full w-full rounded-[10px] border border-marketplace-line/70 object-cover"
                    />
                    <button
                      type="button"
                      aria-label={`Remove ${files[i]?.name ?? 'photo'}`}
                      onClick={() => {
                        URL.revokeObjectURL(url);
                        setFiles((f) => f.filter((_, idx) => idx !== i));
                        setPreviews((p) => p.filter((_, idx) => idx !== i));
                      }}
                      className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-marketplace-ink text-white opacity-0 shadow-soft transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            </div>

            <div className="min-w-0 lg:sticky lg:top-6">
            <div className="rounded-brand-lg border border-marketplace-line/60 bg-white/80 p-6 shadow-soft">
              <h2 className="text-[1.0625rem] font-semibold tracking-[-0.02em] text-marketplace-ink">
                How many finished images?
              </h2>
              <div className="mt-5 flex flex-wrap items-center gap-4 sm:flex-nowrap sm:gap-5">
                <button
                  type="button"
                  onClick={() => setCount((c) => Math.max(MIN_IMAGES, c - 1))}
                  disabled={count <= MIN_IMAGES}
                  aria-label="One fewer image"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-marketplace-line bg-white transition-colors hover:border-marketplace-ink disabled:opacity-35"
                >
                  <Minus className="h-4 w-4" strokeWidth={2.25} />
                </button>
                <input
                  type="range"
                  min={MIN_IMAGES}
                  max={MAX_IMAGES}
                  value={count}
                  aria-label="Number of finished images"
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="min-w-0 flex-1 accent-marketplace-violet"
                />
                <button
                  type="button"
                  onClick={() => setCount((c) => Math.min(MAX_IMAGES, c + 1))}
                  disabled={count >= MAX_IMAGES}
                  aria-label="One more image"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-marketplace-line bg-white transition-colors hover:border-marketplace-ink disabled:opacity-35"
                >
                  <Plus className="h-4 w-4" strokeWidth={2.25} />
                </button>
                <div className="w-20 shrink-0 text-right sm:w-24">
                  <span className="block font-mono text-[1.75rem] font-semibold leading-none text-marketplace-ink">
                    {count}
                  </span>
                  <span className="text-[0.75rem] text-marketplace-muted">images</span>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-marketplace-line/70 pt-5">
                <div>
                  <p className="text-[0.875rem] font-semibold text-marketplace-violet">
                    {coverage.label}
                  </p>
                  <p className="text-[0.8375rem] text-marketplace-muted">{coverage.blurb}</p>
                </div>
                <p className="font-mono text-[1.5rem] font-semibold tracking-[-0.03em] text-marketplace-ink">
                  {formatPrice(priceCents(count))}
                </p>
              </div>
            </div>

            <div className="mt-5">
              <label
                htmlFor="notes"
                className="mb-1.5 block text-[0.875rem] font-medium text-marketplace-ink"
              >
                Anything we should know? <span className="text-marketplace-muted">(optional)</span>
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Brand, model, known damage, what's included…"
                className="w-full rounded-[12px] border border-marketplace-line bg-white p-3.5 text-[0.9375rem] outline-none transition-colors focus:border-marketplace-violet"
                rows={3}
              />
            </div>

            {error && (
              <p role="alert" className="mt-4 text-[0.875rem] text-marketplace-error">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || files.length === 0}
              className="mt-6 inline-flex min-h-[54px] w-full items-center justify-center gap-2.5 rounded-[16px] bg-violet-blue text-[1rem] font-semibold text-white shadow-[0_12px_30px_rgba(122,92,255,0.32)] transition-transform hover:-translate-y-px disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Sparkles className="h-4.5 w-4.5" aria-hidden="true" />
                  See one image free
                </>
              )}
            </button>
            <p className="mt-3 text-center text-[0.8125rem] text-marketplace-muted">
              No payment yet. You&rsquo;ll see a finished image from your own photos first.
            </p>
            </div>
            </div>
          </form>
        ) : (
          <div className="mt-10">
            <ProgressPanel campaign={campaign} isProcessing={isProcessing} />

            {campaign.status === 'preview_ready' && preview?.image && (
              <PreviewGate
                preview={preview}
                campaign={campaign}
                count={count}
                paying={paying}
                onPay={handlePay}
              />
            )}

            {campaign.paid && campaign.results.length > 0 && (
              <ResultsGrid campaign={campaign} />
            )}

            {campaign.status === 'needs_more_evidence' && (
              <div className="mt-8 rounded-brand-lg border border-marketplace-warning/30 bg-marketplace-warning/[0.06] p-6">
                <p className="text-[1rem] font-semibold text-marketplace-ink">
                  One more photo would help
                </p>
                <ul className="mt-3 list-inside list-disc text-[0.9375rem] text-marketplace-muted">
                  {campaign.minimumAdditionalEvidenceNeeded.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </div>
            )}

            {campaign.status === 'failed' && campaign.error && (
              <p className="mt-6 text-[0.9375rem] text-marketplace-error">{campaign.error}</p>
            )}

            {error && <p className="mt-4 text-[0.875rem] text-marketplace-error">{error}</p>}
          </div>
        )}
      </div>
    </main>
  );
}

function Steps({ current }: { current: number }) {
  const steps = ['Upload', 'Preview', 'Checkout', 'Your set'];
  return (
    <ol className="flex items-center gap-3">
      {steps.map((label, i) => {
        const n = i + 1;
        const done = current > n;
        const active = current === n;
        return (
          <li key={label} className="flex flex-1 items-center gap-3">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[0.8125rem] font-semibold transition-colors ${
                done
                  ? 'bg-violet-blue text-white'
                  : active
                    ? 'border-2 border-marketplace-violet bg-white text-marketplace-violet'
                    : 'border border-marketplace-line bg-white text-marketplace-muted-light'
              }`}
            >
              {done ? <Check className="h-4 w-4" strokeWidth={3} /> : n}
            </span>
            <span
              className={`hidden text-[0.875rem] font-medium sm:block ${
                active ? 'text-marketplace-ink' : 'text-marketplace-muted'
              }`}
            >
              {label}
            </span>
            {i < steps.length - 1 && (
              <span className="h-px flex-1 bg-marketplace-line" aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function ProgressPanel({
  campaign,
  isProcessing,
}: {
  campaign: CampaignState;
  isProcessing: boolean;
}) {
  return (
    <div className="rounded-brand-lg border border-marketplace-line/60 bg-white/80 p-6 shadow-soft">
      <div className="flex items-center gap-3">
        {isProcessing && (
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-marketplace-violet" />
        )}
        <div>
          <p className="text-[1.0625rem] font-semibold tracking-[-0.02em] text-marketplace-ink">
            {campaign.statusLabel}
          </p>
          {campaign.statusMessage && (
            <p className="mt-0.5 text-[0.875rem] text-marketplace-muted">
              {campaign.statusMessage}
            </p>
          )}
          {campaign.productSummary && (
            <p className="mt-1 text-[0.8375rem] text-marketplace-muted">
              Identified: {campaign.productSummary.itemType} ({campaign.productSummary.category})
            </p>
          )}
        </div>
      </div>
      {isProcessing && (
        <p className="mt-4 text-[0.8375rem] text-marketplace-muted">
          This usually takes a couple of minutes. You can leave this page open.
        </p>
      )}
    </div>
  );
}

function PreviewGate({
  preview,
  campaign,
  count,
  paying,
  onPay,
}: {
  preview: ShotResult;
  campaign: CampaignState;
  count: number;
  paying: boolean;
  onPay: () => void;
}) {
  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <figure>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preview.image}
          alt="Your free watermarked preview"
          className="w-full rounded-brand-lg border border-marketplace-line/60 shadow-lift"
        />
        <figcaption className="mt-3 text-center text-[0.8125rem] text-marketplace-muted">
          Your free preview, watermarked. The version you download has no watermark.
        </figcaption>
      </figure>

      <div className="rounded-brand-lg border border-marketplace-line/60 bg-white/85 p-7 shadow-soft">
        <p className="text-[0.75rem] font-[650] uppercase tracking-[0.14em] text-marketplace-violet">
          This is your item
        </p>
        <h2 className="mt-3 text-[1.5rem] font-[650] leading-[1.15] tracking-[-0.03em] text-marketplace-ink">
          Like it? Get the whole set.
        </h2>
        <p className="mt-3 text-[0.9375rem] leading-[1.6] text-marketplace-muted">
          Unlock this image without the watermark, plus {campaign.requestedCount - 1} more
          coordinated images covering every angle a buyer asks about.
        </p>

        <div className="mt-6 flex items-end justify-between border-t border-marketplace-line/70 pt-5">
          <div>
            <p className="text-[0.8125rem] text-marketplace-muted">
              {campaign.requestedCount} images × {formatPrice(priceCents(1))}
            </p>
            <p className="font-mono text-[2.25rem] font-semibold leading-none tracking-[-0.04em] text-marketplace-ink">
              {formatPrice(campaign.priceCents)}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onPay}
          disabled={paying}
          className="mt-6 inline-flex min-h-[54px] w-full items-center justify-center gap-2.5 rounded-[16px] bg-violet-blue text-[1rem] font-semibold text-white shadow-[0_12px_30px_rgba(122,92,255,0.32)] transition-transform hover:-translate-y-px disabled:opacity-50"
        >
          {paying ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              Unlock my full set
              <ArrowRight className="h-4.5 w-4.5" aria-hidden="true" />
            </>
          )}
        </button>
        <p className="mt-3 text-center text-[0.75rem] text-marketplace-muted-light">
          Demo checkout — no payment is taken and no card details are collected.
        </p>
      </div>
    </div>
  );
}

function ResultsGrid({ campaign }: { campaign: CampaignState }) {
  const done = campaign.results.filter((r) => r.status === 'done' && r.image);
  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-[1.5rem] font-[650] tracking-[-0.03em] text-marketplace-ink">
          Your finished set
        </h2>
        <p className="text-[0.875rem] text-marketplace-muted">
          {done.length} of {campaign.requestedCount} images ready
        </p>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {campaign.results.map((r) => (
          <div key={r.sequenceNumber}>
            {r.status === 'done' && r.image ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={r.image}
                  alt={r.imageJob}
                  className="w-full rounded-brand border border-marketplace-line/60 shadow-soft"
                />
                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-[0.75rem] text-marketplace-muted">
                    {String(r.sequenceNumber).padStart(2, '0')} · {r.imageRole}
                  </span>
                  <a
                    href={r.image}
                    download={`${String(r.sequenceNumber).padStart(2, '0')}-${r.imageRole}.png`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-marketplace-line px-3 py-1.5 text-[0.75rem] font-medium text-marketplace-ink transition-colors hover:border-marketplace-ink"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    Download
                  </a>
                </div>
              </>
            ) : (
              <div className="flex aspect-[4/5] items-center justify-center rounded-brand border border-dashed border-marketplace-line bg-white/50 p-5 text-center">
                <p className="text-[0.8125rem] text-marketplace-muted">
                  {r.error ?? 'Still working…'}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {campaign.listingTitle && (
        <div className="mt-10 rounded-brand-lg border border-marketplace-line/60 bg-white/80 p-7 shadow-soft">
          <h3 className="text-[1.0625rem] font-semibold tracking-[-0.02em] text-marketplace-ink">
            Listing copy
          </h3>
          <p className="mt-4 text-[0.75rem] font-[650] uppercase tracking-[0.14em] text-marketplace-muted-light">
            Title
          </p>
          <p className="mt-1.5 text-[0.9375rem] text-marketplace-ink">{campaign.listingTitle}</p>
          <p className="mt-5 text-[0.75rem] font-[650] uppercase tracking-[0.14em] text-marketplace-muted-light">
            Description
          </p>
          <p className="mt-1.5 whitespace-pre-wrap text-[0.9375rem] leading-[1.6] text-marketplace-muted">
            {campaign.listingDescription}
          </p>
        </div>
      )}
    </div>
  );
}
