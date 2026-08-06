'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { ArrowRight, Lock, Plus, ShieldCheck, Upload } from 'lucide-react';
import { HeroVisual } from './HeroVisual';
import { SupportStrip } from './SupportStrip';

export function Hero() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  function goToUpload() {
    router.push('/upload');
  }

  return (
    <section className="section-compact relative overflow-hidden">
      <div className="page-shell mx-auto grid max-w-page items-center gap-16 px-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8">
        <div className="max-w-[560px]">
          <h1 className="max-w-[8.5ch] text-[3.5rem] font-[650] leading-[0.94] tracking-[-0.058em] text-marketplace-ink [text-wrap:balance] md:text-[4.5rem] lg:text-hero">
            Make your
            <br />
            listing look
            <br />
            worth
            <br />
            <span className="bg-violet-blue bg-clip-text text-transparent">clicking.</span>
          </h1>

          <p className="mt-7 max-w-copy text-[1.0625rem] leading-[1.6] tracking-[-0.014em] text-marketplace-muted md:text-body-large">
            Turn the photos you already have into polished marketplace images that attract more
            buyers, build confidence, and help your item stand out.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
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
            <ShieldCheck className="h-4 w-4 shrink-0 text-marketplace-muted-light" aria-hidden="true" />
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
            className={`mt-8 flex cursor-pointer items-center gap-4 rounded-brand-lg border border-dashed p-5 text-left transition-colors ${
              dragActive
                ? 'border-marketplace-violet bg-marketplace-violet/5'
                : 'border-marketplace-line bg-white/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={goToUpload}
            />
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-blue text-white">
              <Plus className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[1rem] font-semibold tracking-[-0.015em] text-marketplace-ink">
                Drop your listing photos here
                <span className="ml-1 font-semibold text-marketplace-violet">or choose files</span>
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-[0.8125rem] text-marketplace-muted">
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                Your photos stay private.
              </p>
            </div>
          </div>
        </div>

        <HeroVisual />
      </div>

      <div className="page-shell mx-auto mt-16 max-w-page px-1 md:mt-20">
        <SupportStrip />
      </div>

      <div className="mt-8 flex justify-center">
        <a
          href="#marketplace-feed"
          className="flex flex-col items-center gap-1 text-[0.8125rem] font-medium text-marketplace-muted transition-colors hover:text-marketplace-ink"
        >
          See how it works
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </div>
    </section>
  );
}
