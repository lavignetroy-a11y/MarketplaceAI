'use client';

import Link from 'next/link';
import { ArrowRight, Lock, PencilOff, Smartphone, Sparkles, Upload } from 'lucide-react';
import { Accent, PhotoCard, SectionTitle, gradientStroke } from './primitives';
import { VariantSwitcher, useVariant } from './VariantSwitcher';

const FAN = [
  { slot: 1, label: 'Lifestyle shot', rotate: -14, y: 34, z: 10 },
  { slot: 2, label: 'Detail close-up', rotate: -7, y: 14, z: 20 },
  { slot: 3, label: 'Hero image', rotate: 0, y: 0, z: 30 },
  { slot: 4, label: 'Room context', rotate: 7, y: 14, z: 20 },
  { slot: 5, label: 'Alternate angle', rotate: 14, y: 34, z: 10 },
];

/**
 * The close. Deliberately the most cinematic moment on the page -- the finished set rising out
 * of the upload surface is the whole product in one image, so the copy can stay short.
 */
export function FinalCta() {
  const { variant, step } = useVariant();
  return (
    <section className="section relative overflow-hidden bg-marketplace-midnight">
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-[620px] w-[900px] -translate-x-1/2 rounded-full bg-marketplace-violet/25 blur-[130px]"
        aria-hidden="true"
      />

      <div className="page-shell relative mx-auto max-w-page text-center">
        <SectionTitle dark className="mx-auto max-w-[820px]">
          Your next buyer will see the photos <Accent>first.</Accent>
        </SectionTitle>
        <p className="mx-auto mt-6 max-w-[560px] text-[1.0625rem] leading-[1.62] text-white/60">
          Start with the pictures you already have. We turn them into a polished listing set
          designed to attract attention, build confidence, and help your item stand out.
        </p>

        <div className="mt-8 flex justify-center">
          <VariantSwitcher variant={variant} step={step} dark label="item" />
        </div>

        {/* the finished set fanning above the upload surface */}
        <div className="relative mx-auto mt-16 h-[300px] w-full max-w-[860px] sm:h-[340px]">
          <div className="absolute inset-x-0 top-0 flex items-end justify-center">
            {FAN.map((card) => (
              <div
                key={card.slot}
                className="relative -mx-3 sm:-mx-2"
                style={{
                  transform: `rotate(${card.rotate}deg) translateY(${card.y}px)`,
                  zIndex: card.z,
                }}
              >
                <PhotoCard
                  src={`/images/cta/v${variant}/card-${card.slot}.webp`}
                  alt={card.label}
                  className="h-[150px] w-[104px] sm:h-[210px] sm:w-[148px]"
                  radius={14}
                  pad={4}
                />
                <span className="mt-2 hidden justify-center gap-1.5 text-[0.6875rem] text-white/50 sm:flex">
                  <Sparkles className="h-3 w-3" {...gradientStroke} strokeWidth={2} />
                  {card.label}
                </span>
              </div>
            ))}
          </div>

          {/* upload surface the set rises from */}
          <div
            className="absolute bottom-0 left-1/2 h-[86px] w-[min(560px,92%)] -translate-x-1/2 rounded-[28px] border border-violet-400/30 bg-violet-500/10 backdrop-blur"
            style={{ boxShadow: '0 -10px 60px rgba(122,92,255,0.35), 0 20px 60px rgba(9,11,24,0.6)' }}
          >
            <div className="flex h-full flex-col items-center justify-center gap-1">
              <Upload className="h-5 w-5 text-white/80" strokeWidth={2} aria-hidden="true" />
              <p className="text-[0.875rem] font-medium text-white/85">Drop your photos here</p>
              <p className="font-mono text-[0.6875rem] text-white/45">
                JPG, PNG · one item per set
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/upload"
            className="inline-flex min-h-[54px] items-center gap-2.5 rounded-[16px] bg-violet-blue px-8 text-[1rem] font-semibold text-white shadow-[0_14px_34px_rgba(122,92,255,0.45)] transition-transform hover:-translate-y-px"
          >
            Upload your listing photos
            <ArrowRight className="h-4.5 w-4.5" aria-hidden="true" />
          </Link>
          <a
            href="#examples"
            className="inline-flex min-h-[54px] items-center rounded-[16px] border border-white/20 px-8 text-[1rem] font-semibold text-white/90 transition-colors hover:border-white/40 hover:bg-white/[0.05]"
          >
            See example sets
          </a>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[0.875rem] text-white/55">
          {[
            { icon: Smartphone, text: 'Works with phone photos' },
            { icon: Lock, text: 'Private uploads' },
            { icon: Sparkles, text: 'One image free before you pay' },
            { icon: PencilOff, text: 'No prompt writing' },
          ].map(({ icon: Icon, text }) => (
            <span key={text} className="inline-flex items-center gap-2">
              <Icon className="h-4 w-4 text-marketplace-violet" strokeWidth={2} />
              {text}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
