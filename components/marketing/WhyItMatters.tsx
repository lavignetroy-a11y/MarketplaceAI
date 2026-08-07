'use client';

import { Eye, Gem, Heart, Truck, Zap, BadgeCheck } from 'lucide-react';
import { Accent, Eyebrow, IconChip, Lede, PhotoCard, SectionTitle, gradientStroke } from './primitives';
import { VariantSwitcher, useVariant } from './VariantSwitcher';

const LEFT = [
  {
    icon: Eye,
    title: 'More attention',
    body: 'Stronger visuals help stop the scroll.',
    imgSlot: 1,
  },
  {
    icon: Gem,
    title: 'Higher perceived value',
    body: 'Cleaner presentation makes the item feel cared for.',
    imgSlot: 2,
  },
];

const RIGHT = [
  {
    icon: BadgeCheck,
    title: 'More buyer confidence',
    body: 'Clear angles and details show exactly what they are getting.',
    imgSlot: 3,
  },
  {
    icon: Zap,
    title: 'A smoother sale',
    body: 'Better coverage answers questions before they are asked.',
    imgSlot: 4,
  },
];

/**
 * Why better photos matter. The centrepiece is a realistic marketplace listing card -- showing
 * the product in the context a buyer actually meets it does more persuading than a paragraph
 * about presentation could.
 */
export function WhyItMatters() {
  const { variant, step } = useVariant();
  return (
    <section id="why" className="section relative overflow-hidden bg-marketplace-canvas/40">
      <div className="page-shell mx-auto max-w-page">
        <div className="max-w-[620px]">
          <Eyebrow>Why better photos matter</Eyebrow>
          <SectionTitle className="mt-5">
            A better listing works before you answer a <Accent>single message.</Accent>
          </SectionTitle>
          <Lede className="mt-6 max-w-[540px]">
            Buyers notice the photos first. Stronger presentation helps your listing stand out,
            feel more trustworthy, and look more valuable — so you attract the right buyers with
            less back and forth.
          </Lede>


        <div className="mt-7 flex justify-center">
          <VariantSwitcher variant={variant} step={step} label="item" />
        </div>
        </div>

        <div className="mt-10 grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-5">
            {LEFT.map(({ icon: Icon, title, body, imgSlot }) => (
              <BenefitCard
                key={title}
                Icon={Icon}
                title={title}
                body={body}
                img={`/images/why/v${variant}/detail-${imgSlot}.webp`}
              />
            ))}
          </div>

          <ListingCard variant={variant} />

          <div className="flex flex-col gap-5">
            {RIGHT.map(({ icon: Icon, title, body, imgSlot }) => (
              <BenefitCard
                key={title}
                Icon={Icon}
                title={title}
                body={body}
                img={`/images/why/v${variant}/detail-${imgSlot}.webp`}
              />
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 rounded-full border border-marketplace-line/60 bg-white/75 px-7 py-4 text-center shadow-soft backdrop-blur">
          <span className="text-[0.9375rem] font-semibold tracking-[-0.015em] text-marketplace-ink">
            Better photos don&rsquo;t just look better — they work harder.
          </span>
          <span className="hidden h-4 w-px bg-marketplace-line sm:block" />
          <span className="text-[0.9375rem] text-marketplace-muted">
            Stand out. Earn trust. Get it sold.
          </span>
        </div>
      </div>
    </section>
  );
}

function BenefitCard({
  Icon,
  title,
  body,
  img,
}: {
  Icon: React.ComponentType<{ className?: string; stroke?: string; strokeWidth?: number }>;
  title: string;
  body: string;
  img: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-brand-lg border border-marketplace-line/60 bg-white/80 p-4 shadow-soft backdrop-blur">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5">
          <IconChip size="sm">
            <Icon className="h-4 w-4" {...gradientStroke} strokeWidth={2} />
          </IconChip>
          <p className="text-[0.9375rem] font-semibold tracking-[-0.015em] text-marketplace-ink">
            {title}
          </p>
        </div>
        <p className="mt-2 text-[0.8375rem] leading-[1.45] text-marketplace-muted">{body}</p>
      </div>
      <PhotoCard
        src={img}
        alt=""
        className="hidden h-[92px] w-[112px] shrink-0 sm:block"
        radius={14}
        pad={4}
      />
    </div>
  );
}

/** A marketplace listing as a buyer would actually see it. */
function ListingCard({ variant }: { variant: number }) {
  return (
    <div className="mx-auto w-full max-w-[380px] overflow-hidden rounded-brand-lg border border-marketplace-line/60 bg-white shadow-lift">
      <div className="relative">
        <PhotoCard
          src={`/images/why/v${variant}/listing-hero.webp`}
          alt="The finished hero image as it appears in a marketplace listing"
          className="aspect-[4/5] w-full"
          radius={0}
          pad={0}
        />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/92 px-3 py-1.5 text-[0.75rem] font-medium text-marketplace-ink shadow-soft backdrop-blur">
          <Gem className="h-3.5 w-3.5" {...gradientStroke} strokeWidth={2} />
          Featured
        </span>
        <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/92 shadow-soft backdrop-blur">
          <Heart className="h-4 w-4 text-marketplace-muted" strokeWidth={2} />
        </span>
      </div>

      <div className="flex gap-2 px-4 pt-4">
        {['a', 'b', 'c', 'd'].map((k, i) => (
          <PhotoCard
            key={k}
            src={`/images/why/v${variant}/thumb-${i + 1}.webp`}
            alt=""
            className={`h-14 flex-1 ${i === 0 ? 'ring-2 ring-marketplace-violet' : ''}`}
            radius={10}
            pad={3}
          />
        ))}
      </div>

      <div className="px-4 pb-5 pt-4">
        <p className="text-[1.0625rem] font-semibold tracking-[-0.02em] text-marketplace-ink">
          Tufted Accent Chair
        </p>
        <p className="mt-1 text-[0.875rem] text-marketplace-muted">
          <span className="font-semibold text-marketplace-ink">$195</span> · Excellent condition
        </p>
        <div className="mt-3 flex items-center gap-4 text-[0.8125rem] text-marketplace-muted">
          <span className="inline-flex items-center gap-1.5">
            <BadgeCheck className="h-4 w-4" {...gradientStroke} strokeWidth={2} />
            Verified seller
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Truck className="h-4 w-4" {...gradientStroke} strokeWidth={2} />
            Local pickup
          </span>
        </div>
        <button
          type="button"
          className="mt-4 w-full rounded-[14px] bg-violet-blue py-3 text-[0.9375rem] font-semibold text-white shadow-[0_8px_20px_rgba(122,92,255,0.3)]"
        >
          Message seller
        </button>
      </div>
    </div>
  );
}
