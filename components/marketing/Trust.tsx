'use client';

import { Ban, Eye, Lock, PencilOff, ShieldCheck, Sparkles, Sun, Crop, Layers } from 'lucide-react';
import { Accent, Eyebrow, IconChip, Lede, PhotoCard, SectionTitle, gradientStroke } from './primitives';
import { VariantSwitcher, useVariant } from './VariantSwitcher';

const IMPROVES = [
  { icon: Sun, title: 'Cleaner lighting', body: 'Balanced light and colour for true clarity.' },
  { icon: Crop, title: 'Stronger composition', body: "Better angles and framing show the item's best." },
  { icon: Layers, title: 'Clearer coverage', body: 'The full item, key details, and close-ups included.' },
];

const PINS = [
  { icon: Eye, text: 'Real condition stays visible', pos: 'left-[4%] top-[16%]' },
  { icon: ShieldCheck, text: 'Actual shape and materials preserved', pos: 'right-[4%] top-[30%]' },
  { icon: Ban, text: 'No fake accessories', pos: 'left-[4%] bottom-[22%]' },
  { icon: PencilOff, text: 'No invented details', pos: 'right-[6%] bottom-[12%]' },
];

const GUARANTEES = [
  {
    icon: Eye,
    title: 'Condition stays visible',
    body: 'Wear, marks, and imperfections are not erased.',
  },
  {
    icon: ShieldCheck,
    title: 'No unsupported details',
    body: 'We never invent features — your item stays based on your photos.',
  },
  { icon: Lock, title: 'Private uploads', body: 'Your originals stay secure. We never share them.' },
  {
    icon: Sparkles,
    title: 'No prompt work',
    body: 'Just upload and receive the finished set.',
  },
];

/**
 * The trust section -- the one that converts a skeptical seller. Its job is to kill the
 * assumption that "AI photos" means a dishonest listing, so the pins sit on the actual item
 * and the magnified crops prove real texture and wear survive the process.
 */
export function Trust() {
  const { variant, step } = useVariant();
  return (
    <section id="trust" className="section relative overflow-hidden">
      <div className="page-shell mx-auto max-w-page">
        <div className="mx-auto max-w-[720px] text-center">
          <Eyebrow>Trust</Eyebrow>
          <SectionTitle className="mt-5">
            Better presented,
            <br />
            still the <Accent>same item.</Accent>
          </SectionTitle>
          <Lede className="mx-auto mt-6 max-w-[600px]">
            We improve how your listing is shown — not what you are selling. Cleaner presentation
            and clearer coverage,{' '}
            <span className="font-medium text-marketplace-ink">
              without inventing details or hiding real condition.
            </span>
          </Lede>


        <div className="mt-7 flex justify-center">
          <VariantSwitcher variant={variant} step={step} label="item" />
        </div>
        </div>

        <div className="mt-14 grid gap-6 rounded-brand-xl border border-marketplace-line/60 bg-white/70 p-6 shadow-soft backdrop-blur lg:grid-cols-[minmax(0,0.62fr)_minmax(0,1.5fr)_minmax(0,0.78fr)]">
          <div>
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-5 w-5" {...gradientStroke} strokeWidth={2} />
              <h3 className="text-[1.0625rem] font-semibold tracking-[-0.02em] text-marketplace-ink">
                What improves
              </h3>
            </div>
            <div className="mt-4 h-px w-full bg-gradient-to-r from-marketplace-violet/40 to-transparent" />
            <div className="mt-6 flex flex-col gap-6">
              {IMPROVES.map(({ icon: Icon, title, body }) => (
                <div key={title} className="flex items-start gap-3.5">
                  <IconChip size="sm">
                    <Icon className="h-4 w-4" {...gradientStroke} strokeWidth={2} />
                  </IconChip>
                  <div>
                    <p className="text-[0.9375rem] font-semibold tracking-[-0.015em] text-marketplace-ink">
                      {title}
                    </p>
                    <p className="mt-1 text-[0.8375rem] leading-[1.45] text-marketplace-muted">
                      {body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* the item itself, annotated */}
          <div className="relative">
            <PhotoCard
              src={`/images/trust/v${variant}/inspect.webp`}
              alt="The finished image with annotations showing what is preserved"
              className="min-h-[420px] w-full"
              radius={18}
              pad={0}
            />
            {PINS.map(({ icon: Icon, text, pos }) => (
              <span
                key={text}
                className={`absolute ${pos} inline-flex max-w-[46%] items-center gap-2 rounded-[12px] bg-white/94 px-3 py-2 text-[0.75rem] font-medium leading-tight text-marketplace-ink shadow-lift backdrop-blur`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" {...gradientStroke} strokeWidth={2} />
                {text}
              </span>
            ))}
          </div>

          {/* magnified detail crops proving texture and wear survive */}
          <div className="flex flex-col gap-5">
            {[
              { src: `/images/trust/v${variant}/detail-1.webp`, caption: 'Natural texture and fabric visible' },
              { src: `/images/trust/v${variant}/detail-2.webp`, caption: 'Real wear, seams, and joins shown' },
            ].map(({ src, caption }) => (
              <figure key={src} className="relative">
                <PhotoCard src={src} alt={caption} className="h-[170px] w-full" radius={14} pad={4} />
                <span
                  className="absolute -right-3 top-1/2 hidden h-24 w-24 -translate-y-1/2 overflow-hidden rounded-full border-4 border-white shadow-lift xl:block"
                  aria-hidden="true"
                >
                  <PhotoCard src={src} alt="" className="h-full w-full scale-[2.2]" radius={999} pad={0} />
                </span>
                <figcaption className="mt-2.5 text-[0.8125rem] text-marketplace-muted">
                  {caption}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {GUARANTEES.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-brand-lg border border-marketplace-line/60 bg-white/75 p-5 shadow-soft backdrop-blur"
            >
              <Icon className="h-6 w-6" {...gradientStroke} strokeWidth={1.75} />
              <p className="mt-3 text-[0.9375rem] font-semibold tracking-[-0.015em] text-marketplace-ink">
                {title}
              </p>
              <p className="mt-1.5 text-[0.8375rem] leading-[1.45] text-marketplace-muted">{body}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 rounded-full border border-marketplace-line/60 bg-white/80 px-7 py-4 shadow-soft backdrop-blur">
          <ShieldCheck className="h-5 w-5" {...gradientStroke} strokeWidth={2} />
          <span className="text-[0.9375rem] font-medium text-marketplace-ink">
            Better presentation builds confidence. Truth builds trust. We protect both.
          </span>
          <span className="hidden h-4 w-px bg-marketplace-line sm:block" />
          <span className="text-[0.9375rem] font-medium text-marketplace-violet">
            You&rsquo;re in control.
          </span>
        </div>
      </div>
    </section>
  );
}
