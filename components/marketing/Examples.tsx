'use client';

import { useState } from 'react';
import { ArrowRight, Camera, Clock, Eye, Images, Quote, ShieldCheck, Tag } from 'lucide-react';
import { Accent, Eyebrow, Lede, PhotoCard, SectionTitle, gradientStroke } from './primitives';
import { TESTIMONIALS } from '@/lib/config/claims';
import {
  EXAMPLE_CATEGORIES,
  EXAMPLE_RESULT_COUNT,
  EXAMPLE_SOURCE_COUNT,
  type CategoryKey,
} from '@/lib/config/categories';

// Same shared list the reveal section and the image generator use -- these keys are the
// filename prefixes under public/images/examples/, so a local copy drifts into blank tiles.
const CATEGORIES = EXAMPLE_CATEGORIES;

const BENEFITS = [
  {
    icon: Eye,
    title: 'Stronger first impression',
    body: 'Professional visuals help your listing stand out and get noticed.',
  },
  {
    icon: ShieldCheck,
    title: 'Clearer buyer confidence',
    body: 'Better photos communicate condition and quality instantly.',
  },
  {
    icon: Camera,
    title: 'More complete coverage',
    body: 'Show every angle and detail buyers care about — without extra effort.',
  },
];

/**
 * Proof section, in dark for contrast against the luminous sections either side. Category tabs
 * let a visitor find their own kind of item, which is what turns "nice photos" into "this
 * would work for what I'm selling".
 */
export function Examples() {
  const [active, setActive] = useState<CategoryKey>('furniture');
  const current = CATEGORIES.find((c) => c.key === active) ?? CATEGORIES[0];

  return (
    <section id="examples" className="section relative overflow-hidden bg-marketplace-midnight">
      {/* soft violet bloom, kept well behind content */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-marketplace-violet/20 blur-[120px]"
        aria-hidden="true"
      />

      <div className="page-shell relative mx-auto max-w-page">
        <div className="mx-auto max-w-[720px] text-center">
          <Eyebrow dark>Examples / Transformations</Eyebrow>
          <SectionTitle dark className="mt-5">
            See what the same item
            <br />
            can <Accent>look like online.</Accent>
          </SectionTitle>
          <Lede dark className="mx-auto mt-6 max-w-[520px]">
            Original seller photos in. A polished, coordinated set out.
          </Lede>
        </div>

        <div className="mt-10 flex justify-center">
          <div
            role="tablist"
            aria-label="Example category"
            className="inline-flex flex-wrap gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1.5 backdrop-blur"
          >
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                role="tab"
                aria-selected={active === c.key}
                onClick={() => setActive(c.key)}
                className={`rounded-full px-5 py-2.5 text-[0.875rem] font-medium transition-colors ${
                  active === c.key
                    ? 'bg-violet-blue text-white shadow-[0_6px_18px_rgba(122,92,255,0.4)]'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 rounded-brand-xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.55fr)_auto_minmax(0,1.45fr)] lg:items-center">
            <div>
              <p className="text-[0.9375rem] font-medium text-white/80">Original seller photos</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((n) => (
                  <PhotoCard
                    key={n}
                    src={`/images/examples/${active}-source-${n}.webp`}
                    alt=""
                    className="aspect-square saturate-[0.8]"
                    radius={12}
                    pad={0}
                  />
                ))}
              </div>
            </div>

            <span className="mx-auto hidden h-11 w-11 items-center justify-center rounded-full bg-violet-blue shadow-[0_8px_22px_rgba(122,92,255,0.45)] lg:flex">
              <ArrowRight className="h-5 w-5 text-white" strokeWidth={2} />
            </span>

            <div>
              <p className="text-[0.9375rem] font-medium text-white/80">Campaign result</p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <PhotoCard
                  src={`/images/examples/${active}-result-hero.webp`}
                  alt="The finished hero image"
                  className="col-span-2 row-span-2 min-h-[220px]"
                  radius={14}
                  pad={0}
                />
                {[1, 2, 3, 4].map((n) => (
                  <PhotoCard
                    key={n}
                    src={`/images/examples/${active}-result-${n}.webp`}
                    alt=""
                    className="aspect-square"
                    radius={12}
                    pad={0}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            {[
              { icon: Tag, text: current.item },
              { icon: Camera, text: `${EXAMPLE_SOURCE_COUNT} source photos` },
              { icon: Images, text: `${EXAMPLE_RESULT_COUNT}-image set` },
              { icon: Clock, text: 'Finished in minutes' },
            ].map(({ icon: Icon, text }) => (
              <span
                key={text}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-[0.8125rem] text-white/75"
              >
                <Icon className="h-3.5 w-3.5" {...gradientStroke} strokeWidth={2} />
                {text}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-4">
          {BENEFITS.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-brand-lg border border-white/10 bg-white/[0.04] p-6 backdrop-blur"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-blue/20 ring-1 ring-violet-400/30">
                <Icon className="h-5 w-5 text-marketplace-violet" strokeWidth={2} />
              </span>
              <p className="mt-4 text-[0.9375rem] font-semibold tracking-[-0.015em] text-white">
                {title}
              </p>
              <p className="mt-1.5 text-[0.8375rem] leading-[1.5] text-white/55">{body}</p>
            </div>
          ))}

          {TESTIMONIALS.slice(0, 1).map((t) => (
            <figure
              key={t.name}
              className="rounded-brand-lg border border-white/10 bg-white/[0.04] p-6 backdrop-blur"
            >
              <Quote className="h-5 w-5 text-marketplace-violet" strokeWidth={2} />
              <blockquote className="mt-3 text-[0.9375rem] font-medium italic leading-snug text-white">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-4 flex items-center gap-3">
                <span className="h-9 w-9 shrink-0 rounded-full bg-white/10" aria-hidden="true" />
                <span>
                  <span className="block text-[0.875rem] font-medium text-white">{t.name}</span>
                  <span className="block text-[0.8125rem] text-white/50">{t.role}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
