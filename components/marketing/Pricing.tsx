'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Check, CreditCard, Lock, Minus, PencilOff, Plus, Smartphone, Sparkles } from 'lucide-react';
import { Accent, Eyebrow, Lede, PhotoCard, SectionTitle, gradientStroke } from './primitives';
import {
  DEFAULT_IMAGES,
  MAX_IMAGES,
  MIN_IMAGES,
  coverageFor,
  formatPrice,
  priceCents,
} from '@/lib/config/pricing';
import { VariantSwitcher, useVariant } from './VariantSwitcher';

/** How many sample tiles the coverage grid shows, regardless of how high the range goes. */
const GRID_TILES = 10;

const INCLUDED = [
  'A coordinated set, not one edited photo',
  'The strongest image chosen for your first photo',
  'Multiple buyer-ready angles and details',
  'Listing title and description written for you',
  'Real condition preserved — nothing invented',
];

/**
 * Pricing as a live counter rather than package cards. At $1/image the four "packages" would
 * differ only by a dollar or two, so cards would read as arbitrary and cheap; a counter that
 * shows coverage and price moving together makes the per-image model feel transparent instead.
 */
export function Pricing() {
  const { variant, step } = useVariant();
  const [count, setCount] = useState(DEFAULT_IMAGES);
  const coverage = coverageFor(count);
  const total = priceCents(count);

  const clamp = (n: number) => Math.min(MAX_IMAGES, Math.max(MIN_IMAGES, n));

  return (
    <section id="pricing" className="section relative overflow-hidden bg-marketplace-canvas/40">
      <div className="page-shell mx-auto max-w-page">
        <div className="mx-auto max-w-[720px] text-center">
          <Eyebrow>Pricing</Eyebrow>
          <SectionTitle className="mt-5">
            Choose the coverage that fits <Accent>your listing.</Accent>
          </SectionTitle>
          <Lede className="mx-auto mt-6 max-w-[560px]">
            {formatPrice(priceCents(1))} per finished image. No subscription, no bundles you
            don&rsquo;t need — you pick the number and pay for exactly that.
          </Lede>


        <div className="mt-7 flex justify-center">
          <VariantSwitcher variant={variant} step={step} label="item" />
        </div>
        </div>

        <div className="mt-10 grid items-stretch gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          {/* the counter */}
          <div className="rounded-brand-xl border border-marketplace-line/60 bg-white/85 p-8 shadow-lift backdrop-blur">
            <p className="text-[0.875rem] font-medium text-marketplace-muted">
              How many finished images?
            </p>

            <div className="mt-5 flex items-center gap-5">
              <button
                type="button"
                onClick={() => setCount((c) => clamp(c - 1))}
                disabled={count <= MIN_IMAGES}
                aria-label="One fewer image"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-marketplace-line bg-white text-marketplace-ink shadow-soft transition-colors hover:border-marketplace-ink disabled:opacity-35 disabled:hover:border-marketplace-line"
              >
                <Minus className="h-5 w-5" strokeWidth={2.25} />
              </button>

              <div className="flex-1 text-center">
                <span className="block font-mono text-[3.5rem] font-semibold leading-none tracking-[-0.04em] text-marketplace-ink">
                  {count}
                </span>
                <span className="mt-1 block text-[0.875rem] text-marketplace-muted">images</span>
              </div>

              <button
                type="button"
                onClick={() => setCount((c) => clamp(c + 1))}
                disabled={count >= MAX_IMAGES}
                aria-label="One more image"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-marketplace-line bg-white text-marketplace-ink shadow-soft transition-colors hover:border-marketplace-ink disabled:opacity-35 disabled:hover:border-marketplace-line"
              >
                <Plus className="h-5 w-5" strokeWidth={2.25} />
              </button>
            </div>

            <label className="sr-only" htmlFor="image-count">
              Number of finished images
            </label>
            <input
              id="image-count"
              type="range"
              min={MIN_IMAGES}
              max={MAX_IMAGES}
              step={1}
              value={count}
              onChange={(e) => setCount(clamp(Number(e.target.value)))}
              className="mt-6 w-full accent-marketplace-violet"
            />
            <div className="mt-1 flex justify-between font-mono text-[0.75rem] text-marketplace-muted-light">
              <span>{MIN_IMAGES}</span>
              <span>{MAX_IMAGES}</span>
            </div>

            <div className="mt-6 rounded-brand border border-marketplace-line/70 bg-marketplace-canvas/50 px-5 py-4">
              <p className="text-[0.875rem] font-semibold tracking-[-0.01em] text-marketplace-violet">
                {coverage.label}
              </p>
              <p className="mt-1 text-[0.875rem] leading-[1.5] text-marketplace-muted">
                {coverage.blurb}
              </p>
            </div>

            <div className="mt-7 flex items-end justify-between border-t border-marketplace-line/70 pt-6">
              <div>
                <p className="text-[0.8125rem] text-marketplace-muted">
                  {count} × {formatPrice(priceCents(1))}
                </p>
                <p className="font-mono text-[2.75rem] font-semibold leading-none tracking-[-0.05em] text-marketplace-ink">
                  {formatPrice(total)}
                </p>
                <p className="mt-1 text-[0.8125rem] text-marketplace-muted">
                  One-time. No subscription.
                </p>
              </div>
              <Link
                href={`/upload?count=${count}`}
                className="inline-flex min-h-[52px] items-center gap-2 rounded-[14px] bg-violet-blue px-7 text-[0.9375rem] font-semibold text-white shadow-[0_10px_26px_rgba(122,92,255,0.35)] transition-transform hover:-translate-y-px"
              >
                Start with your photos
              </Link>
            </div>

            <p className="mt-4 flex items-center justify-center gap-2 text-center text-[0.8125rem] text-marketplace-muted">
              <Sparkles className="h-4 w-4 shrink-0" {...gradientStroke} strokeWidth={2} />
              See one finished image free before you pay anything.
            </p>
          </div>

          {/* what's included, with a live preview of the set size */}
          <div className="flex flex-col gap-6">
            <div className="rounded-brand-xl border border-marketplace-line/60 bg-white/85 p-7 shadow-soft backdrop-blur">
              <p className="text-[0.9375rem] font-semibold tracking-[-0.015em] text-marketplace-ink">
                Every set includes
              </p>
              <ul className="mt-4 flex flex-col gap-3">
                {INCLUDED.map((line) => (
                  <li key={line} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-marketplace-violet/12">
                      <Check className="h-3 w-3" {...gradientStroke} strokeWidth={3} />
                    </span>
                    <span className="text-[0.875rem] leading-[1.5] text-marketplace-muted">
                      {line}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex-1 rounded-brand-xl border border-marketplace-line/60 bg-white/85 p-7 shadow-soft backdrop-blur">
              <p className="text-[0.9375rem] font-semibold tracking-[-0.015em] text-marketplace-ink">
                Your set at {count} images
              </p>
              {/* One tile per image stops working once the range runs to 30 -- it would turn a
                  two-row block into a six-row one and unbalance the whole section. The grid is a
                  sample of the set rather than an inventory of it, so it stays a fixed size and a
                  line underneath carries the overflow. */}
              <div className="mt-4 grid grid-cols-5 gap-2">
                {Array.from({ length: GRID_TILES }).map((_, i) => (
                  <PhotoCard
                    key={i}
                    src={`/images/pricing/v${variant}/tile-${(i % 5) + 1}.webp`}
                    alt=""
                    className={`aspect-square transition-opacity duration-200 ${
                      i < count ? 'opacity-100' : 'opacity-[0.18]'
                    }`}
                    radius={10}
                    pad={3}
                  />
                ))}
              </div>
              <p className="mt-3 text-[0.8125rem] text-marketplace-muted">
                {count > GRID_TILES
                  ? `Plus ${count - GRID_TILES} more images in your set.`
                  : 'Faded tiles show coverage you could add.'}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-5 rounded-brand-lg border border-marketplace-line/60 bg-white/75 p-6 shadow-soft backdrop-blur sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: CreditCard, t: 'One-time purchase', b: 'No subscription, ever.' },
            { icon: Smartphone, t: 'Works with phone photos', b: 'No camera gear needed.' },
            { icon: Lock, t: 'Private uploads', b: 'Your originals stay yours.' },
            { icon: PencilOff, t: 'No prompt writing', b: 'Upload and go.' },
          ].map(({ icon: Icon, t, b }) => (
            <div key={t} className="flex items-center gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-marketplace-violet/[0.13] to-marketplace-blue/[0.13]">
                <Icon className="h-[1.15rem] w-[1.15rem]" {...gradientStroke} strokeWidth={2} />
              </span>
              <div>
                <p className="text-[0.875rem] font-semibold tracking-[-0.015em] text-marketplace-ink">
                  {t}
                </p>
                <p className="text-[0.8125rem] text-marketplace-muted">{b}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
