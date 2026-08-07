'use client';

import { useState } from 'react';
import { ArrowRight, Eye, Grid2x2, LayoutGrid, ShieldCheck, Sparkles, Star } from 'lucide-react';
import { Accent, Eyebrow, IconChip, Lede, PhotoCard, SectionTitle, gradientStroke } from './primitives';
import { ITEM_CATEGORIES, type CategoryKey } from '@/lib/config/categories';
import { VariantSwitcher, useVariant } from './VariantSwitcher';
import { shotLabels } from '@/lib/config/shotLabels';

// Tabs come from the shared category list because these keys are also the folder names the
// images are generated into -- a local copy here drifts and the tiles silently go blank.
const CATEGORIES = ITEM_CATEGORIES;

// Only the grid geometry is fixed. What each tile SHOWS depends on the item on display, so the
// labels come from that item's shot vocabulary -- a washer's slot 2 is its open door, not a
// "rear angle" it could never be photographed from.
const SHOT_AREAS = ['hero', 'alt', 'texture', 'rear', 'condition', 'context'];

/**
 * The differentiator section: one upload becomes an entire coordinated set, not one edited
 * photo. Every tile is labelled with the buyer question it answers, because the labels are
 * what make the "campaign, not a filter" point land without a paragraph explaining it.
 */
export function CampaignReveal() {
  const [category, setCategory] = useState<CategoryKey>('furniture');
  const { variant, step } = useVariant();
  const labels = shotLabels(category, variant);

  return (
    <section id="campaign" className="section relative overflow-hidden">
      <div className="page-shell mx-auto max-w-page">
        <div className="mb-10 flex flex-wrap items-center justify-end gap-4">
          <VariantSwitcher variant={variant} step={step} label="item" />
          <div
            role="tablist"
            aria-label="Item category"
            className="inline-flex flex-wrap gap-1 rounded-full border border-marketplace-line/60 bg-white/80 p-1.5 shadow-soft backdrop-blur"
          >
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                role="tab"
                aria-selected={category === c.key}
                aria-controls="campaign-reveal-set"
                onClick={() => setCategory(c.key)}
                className={`rounded-full px-4 py-2 text-[0.875rem] font-medium transition-colors ${
                  category === c.key
                    ? 'bg-white text-marketplace-ink shadow-soft'
                    : 'text-marketplace-muted hover:text-marketplace-ink'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:gap-10">
          <div>
            <Eyebrow>Full campaign reveal</Eyebrow>
            <SectionTitle className="mt-5">
              Not one edited photo.
              <br />
              The <Accent>full visual story.</Accent>
            </SectionTitle>
            <Lede className="mt-6 max-w-[440px]">
              One upload becomes a complete, coordinated listing set — every angle, every detail,
              every buyer question answered before it&rsquo;s asked.
            </Lede>

            <div className="mt-9 flex items-center gap-5">
              <div className="flex-1 rounded-brand-lg border border-marketplace-line/60 bg-white/80 p-5 shadow-soft backdrop-blur">
                <p className="text-[0.9375rem] font-semibold tracking-[-0.015em] text-marketplace-ink">
                  Your photos
                </p>
                <p className="mt-0.5 text-[0.8125rem] text-marketplace-muted">What we start with</p>
                <div className="mt-4 flex gap-2">
                  {[1, 2, 3, 4].map((n) => (
                    <PhotoCard
                      key={n}
                      src={`/images/reveal/${category}/v${variant}/before-${n}.webp`}
                      alt=""
                      className="aspect-[3/4] flex-1 saturate-[0.85]"
                      radius={10}
                      pad={3}
                    />
                  ))}
                </div>
              </div>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-marketplace-line/60 bg-white shadow-soft">
                <ArrowRight className="h-5 w-5" {...gradientStroke} strokeWidth={2} />
              </span>
            </div>
          </div>

          {/* The finished set. Grid areas keep the hero dominant with supporting views around it. */}
          <div
            id="campaign-reveal-set"
            role="tabpanel"
            className="grid gap-3"
            style={{
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gridTemplateAreas: `
                "hero hero alt"
                "hero hero texture"
                "rear condition context"
              `,
            }}
          >
            {SHOT_AREAS.map((area, si) => (
              <PhotoCard
                key={area}
                src={`/images/reveal/${category}/v${variant}/slot-${si + 1}.webp`}
                alt={labels[si]}
                className={area === 'hero' ? 'min-h-[280px]' : 'min-h-[135px]'}
                label={{
                  text: labels[si],
                  icon:
                    area === 'hero' ? (
                      <Star className="h-3.5 w-3.5" {...gradientStroke} strokeWidth={2} />
                    ) : (
                      <Grid2x2 className="h-3.5 w-3.5" {...gradientStroke} strokeWidth={2} />
                    ),
                }}
                radius={16}
                pad={5}
                gridArea={area}
              />
            ))}
          </div>
        </div>

        <div className="mt-10 grid gap-6 rounded-brand-lg border border-marketplace-line/60 bg-white/75 p-7 shadow-soft backdrop-blur sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-violet-blue shadow-[0_8px_22px_rgba(122,92,255,0.35)]">
              <Sparkles className="h-6 w-6 text-white" strokeWidth={2} />
            </span>
            <p className="text-[0.9375rem] font-semibold leading-snug tracking-[-0.015em] text-marketplace-ink">
              One upload becomes a complete marketplace campaign.
            </p>
          </div>
          {[
            { icon: Eye, t: 'Stronger first impression', b: 'Stand out in search and capture more attention.' },
            { icon: ShieldCheck, t: 'More buyer confidence', b: 'Answer questions upfront and build instant trust.' },
            { icon: LayoutGrid, t: 'Complete visual coverage', b: 'Every angle, every detail, everything buyers need.' },
          ].map(({ icon: Icon, t, b }) => (
            <div key={t} className="flex items-start gap-3.5 lg:border-l lg:border-marketplace-line/70 lg:pl-6">
              <IconChip size="sm">
                <Icon className="h-4 w-4" {...gradientStroke} strokeWidth={2} />
              </IconChip>
              <div>
                <p className="text-[0.9375rem] font-semibold tracking-[-0.015em] text-marketplace-ink">
                  {t}
                </p>
                <p className="mt-1 text-[0.8375rem] leading-[1.45] text-marketplace-muted">{b}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
