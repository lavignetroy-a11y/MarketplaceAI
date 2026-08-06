'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { ArrowRight, Lock, Plus, ShieldCheck, Sparkles, Upload } from 'lucide-react';
import { HeroVisual } from './HeroVisual';
import { SupportStrip } from './SupportStrip';
import { HERO_STATS, TRUST_BADGE } from '@/lib/config/claims';
import { MAX_SOURCE_PHOTOS } from '@/lib/config/pricing';

export function Hero() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  function goToUpload() {
    router.push('/upload');
  }

  return (
    <section className="section-compact relative overflow-hidden">
      <div className="page-shell mx-auto grid max-w-page items-center gap-14 px-1 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:gap-4">
        <div className="max-w-[540px]">
          <span className="inline-flex items-center gap-2 rounded-full border border-marketplace-line/70 bg-white/80 px-3.5 py-1.5 text-[0.7rem] font-[650] uppercase tracking-[0.14em] text-marketplace-violet shadow-soft backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            {TRUST_BADGE}
          </span>

          <h1 className="mt-6 text-[clamp(2.6rem,5.3vw,4.25rem)] font-[650] leading-[0.98] tracking-[-0.058em] text-marketplace-ink">
            Make your listing
            <br />
            <span className="bg-violet-blue bg-clip-text text-transparent">worth clicking.</span>
          </h1>

          <p className="mt-6 max-w-[440px] text-[1.0625rem] leading-[1.62] tracking-[-0.014em] text-marketplace-muted">
            Better photos get more attention, build trust, and help your item{' '}
            <span className="font-medium text-marketplace-violet">sell for what it's worth</span> —
            faster.
          </p>

          <dl className="mt-7 flex max-w-[470px] items-stretch gap-0 rounded-brand border border-marketplace-line/60 bg-white/70 py-4 shadow-soft backdrop-blur">
            {HERO_STATS.map((stat, i) => (
              <div
                key={stat.label}
                className={`flex-1 px-4 text-center ${
                  i > 0 ? 'border-l border-marketplace-line/70' : ''
                }`}
              >
                <dt className="text-[0.6875rem] leading-tight text-marketplace-muted-light">
                  {stat.label}
                </dt>
                <dd className="mt-1 text-[1.0625rem] font-[650] tracking-[-0.03em] text-marketplace-violet">
                  {stat.value}
                </dd>
                <dd className="text-[0.625rem] leading-tight text-marketplace-muted-light">
                  {stat.note}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/upload"
              className="inline-flex min-h-[48px] items-center gap-2 rounded-[14px] border border-marketplace-ink bg-marketplace-ink px-[22px] text-[0.9375rem] font-semibold tracking-[-0.012em] text-white transition-transform hover:-translate-y-px hover:bg-marketplace-charcoal"
            >
              Upload your photos
              <Upload className="h-4 w-4" aria-hidden="true" />
            </Link>
            <a
              href="#examples"
              className="inline-flex min-h-[48px] items-center gap-2 rounded-[14px] border border-marketplace-line px-[22px] text-[0.9375rem] font-semibold tracking-[-0.012em] text-marketplace-ink transition-colors hover:border-marketplace-ink hover:bg-marketplace-ink/[0.035]"
            >
              See transformations
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>

          <p className="mt-5 flex items-center gap-2 text-[0.8125rem] text-marketplace-muted">
            <ShieldCheck
              className="h-4 w-4 shrink-0 text-marketplace-muted-light"
              aria-hidden="true"
            />
            No editing experience needed. Works with photos from your phone.
          </p>

          <div
            role="button"
            tabIndex={0}
            onClick={goToUpload}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && goToUpload()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              goToUpload();
            }}
            // Outer surface: a plain light card. The dashed drop target is nested inside it,
            // sitting on a slightly cooler grey so the droppable area reads as its own region.
            className="mt-7 max-w-[470px] cursor-pointer rounded-brand-lg border border-marketplace-line/60 bg-white/70 p-2 text-left shadow-[0_10px_30px_rgba(12,13,18,0.05)] transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={goToUpload}
            />
            <div
              className={`flex items-center gap-4 rounded-[22px] border border-dashed px-5 py-[18px] transition-colors ${
                dragActive
                  ? 'border-marketplace-violet bg-marketplace-violet/[0.06]'
                  : 'border-marketplace-line bg-marketplace-canvas/55'
              }`}
            >
              <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-violet-blue text-white shadow-[0_6px_16px_rgba(122,92,255,0.35)]">
                <Plus className="h-[22px] w-[22px]" strokeWidth={2.25} aria-hidden="true" />
              </span>
              <div>
                <p className="text-[1rem] font-semibold leading-[1.35] tracking-[-0.015em] text-marketplace-ink">
                  Drop your listing photos here
                </p>
                <p className="text-[0.9375rem] font-medium leading-[1.35] text-marketplace-violet">
                  or choose files
                </p>
                <p className="mt-1.5 flex items-center gap-1.5 text-[0.8125rem] text-marketplace-muted">
                  <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                  Up to {MAX_SOURCE_PHOTOS} photos of one item. Your photos stay private.
                </p>
              </div>
            </div>
          </div>
        </div>

        <HeroVisual />
      </div>

      <div className="page-shell mx-auto mt-4 max-w-page px-1 md:mt-6">
        <SupportStrip />
      </div>

      <div className="mt-8 flex justify-center">
        <a
          href="#why"
          className="flex flex-col items-center gap-1 text-[0.8125rem] font-medium text-marketplace-muted transition-colors hover:text-marketplace-ink"
        >
          See how it works
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
      </div>
    </section>
  );
}
