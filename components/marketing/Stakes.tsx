'use client';

import { useMemo, useState } from 'react';
import {
  Armchair,
  Bike,
  Camera,
  CircleDollarSign,
  CircleHelp,
  Pencil,
  Sailboat,
  ShieldCheck,
  Sofa,
  Tractor,
  Users,
  Utensils,
} from 'lucide-react';
import { PlaceholderImage } from './PlaceholderImage';
import { DEFAULT_IMAGES } from '@/lib/config/pricing';
import {
  DEFAULT_PRESET,
  MAX_VALUE,
  MIN_VALUE,
  SHORTFALL_HIGH,
  SHORTFALL_LOW,
  VALUE_PRESETS,
  formatMoney,
  stakesFor,
  type ValuePreset,
} from '@/lib/config/value';

/**
 * The money section, and the second thing a visitor sees.
 *
 * Every figure is computed from a price the visitor sets, so it demonstrates the scale of what
 * is at stake rather than asserting an outcome we have measured. That is both the defensible
 * framing and the persuasive one: a seller reading "$280 – $700" about their own dining set is
 * doing arithmetic we never had to claim on their behalf, and that number sitting beside a $6
 * line of photos makes the argument without a single adjective.
 */

const PRESET_ICON: Record<string, typeof Armchair> = {
  'accent-chair': Armchair,
  'sectional-sofa': Sofa,
  'dining-set': Utensils,
  'riding-mower': Tractor,
  atv: Bike,
  'fishing-boat': Sailboat,
};

export function Stakes() {
  const [preset, setPreset] = useState<ValuePreset>(
    VALUE_PRESETS.find((p) => p.key === DEFAULT_PRESET)!,
  );
  const [price, setPrice] = useState(preset.price);
  const [custom, setCustom] = useState(false);

  const s = useMemo(() => stakesFor(price, DEFAULT_IMAGES), [price]);
  const pct = ((price - MIN_VALUE) / (MAX_VALUE - MIN_VALUE)) * 100;

  const choose = (p: ValuePreset) => {
    setPreset(p);
    setPrice(p.price);
    setCustom(false);
  };

  const weakPhotos = [1, 2, 3].map(
    (n) => `/images/reveal/${preset.category}/v${preset.variant}/before-${n}.webp`,
  );
  const fullSet = [1, 2, 3, 4, 5].map(
    (n) => `/images/reveal/${preset.category}/v${preset.variant}/slot-${n}.webp`,
  );

  return (
    <section id="stakes" className="section relative overflow-hidden bg-marketplace-paper">
      <div className="page-shell relative mx-auto max-w-page">
        {/* ---------------------------------------------------------------- header */}
        <div className="relative">
          {/* The two outcomes the section is about, flanking the headline. Decorative, and
              dropped below xl where they would crowd the text. */}
          <Flank
            side="left"
            icon={<CircleHelp className="h-5 w-5 text-marketplace-muted" strokeWidth={1.8} />}
            label={<>Unclear<br />condition</>}
          />
          <Flank
            side="right"
            icon={<ShieldCheck className="h-5 w-5 text-marketplace-violet" strokeWidth={1.8} />}
            label={<>Confident<br />buyers</>}
          />

          <div className="mx-auto max-w-[760px] text-center">
            <h2 className="text-[clamp(2.2rem,4.2vw,3.5rem)] font-[650] leading-[1.04] tracking-[-0.045em] text-marketplace-ink">
              Cheap photos create
              <br />
              <span className="bg-violet-blue bg-clip-text text-transparent">
                expensive doubt.
              </span>
            </h2>
            <p className="mx-auto mt-6 max-w-[600px] text-[1.0625rem] leading-[1.6] tracking-[-0.012em] text-marketplace-muted">
              Two sellers can list the same item. But the one with clearer, fuller photos keeps
              more buyer confidence — and more of the asking price.
            </p>
          </div>
        </div>

        {/* ---------------------------------------------------------------- item chips */}
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {VALUE_PRESETS.map((p) => {
            const Icon = PRESET_ICON[p.key] ?? Armchair;
            const on = preset.key === p.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => choose(p)}
                aria-pressed={on}
                className={`inline-flex items-center gap-2.5 rounded-full border px-5 py-3 text-[0.9375rem] font-medium tracking-[-0.01em] transition-all duration-200 ${
                  on
                    ? 'border-transparent bg-violet-blue text-white shadow-[0_10px_26px_-8px_rgba(122,92,255,0.65)]'
                    : 'border-marketplace-line/80 bg-white/90 text-marketplace-ink shadow-soft hover:-translate-y-px hover:border-marketplace-ink/25'
                }`}
              >
                <Icon
                  className={`h-[1.125rem] w-[1.125rem] ${on ? 'text-white' : 'text-marketplace-muted'}`}
                  strokeWidth={1.8}
                />
                {p.label}
              </button>
            );
          })}
        </div>

        {/* ---------------------------------------------------------------- the card */}
        <div className="mt-8 rounded-[26px] border border-marketplace-line/60 bg-white/90 p-6 shadow-[0_28px_70px_-40px_rgba(12,13,18,0.30)] backdrop-blur sm:p-9">
          {/* step 1 — value */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2.5 text-[0.9375rem] font-medium text-marketplace-ink">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-blue text-[0.625rem] font-bold text-white">
                  1
                </span>
                What is your item worth?
              </p>
              <p className="mt-2 text-[clamp(2rem,3.4vw,2.6rem)] font-[650] leading-none tracking-[-0.045em] text-marketplace-ink">
                {formatMoney(price)}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setCustom((c) => !c)}
              aria-pressed={custom}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-[0.8125rem] font-medium transition-colors ${
                custom
                  ? 'border-marketplace-violet/40 bg-marketplace-violet/10 text-marketplace-violet'
                  : 'border-marketplace-line bg-white text-marketplace-muted hover:border-marketplace-ink/30 hover:text-marketplace-ink'
              }`}
            >
              Adjust value
              <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>

          {/* slider — the fill is painted on the track so the violet reads to the left of the
              thumb the way a progress bar does, which no browser gives you for free */}
          <div className="mt-5">
            <input
              type="range"
              min={MIN_VALUE}
              max={MAX_VALUE}
              step={50}
              value={price}
              onChange={(e) => {
                setPrice(Number(e.target.value));
                setCustom(true);
              }}
              aria-label="Item value"
              className="stakes-range w-full"
              style={{
                background: `linear-gradient(to right, #7A5CFF 0%, #5B8DEF ${pct}%, #E4E8F1 ${pct}%, #E4E8F1 100%)`,
              }}
            />
            <div className="mt-2.5 flex justify-between text-[0.8125rem] text-marketplace-muted-light">
              <span>{formatMoney(MIN_VALUE)}</span>
              <span>{formatMoney(MAX_VALUE)}+</span>
            </div>
          </div>

          {/* ------------------------------------------------------------ comparison */}
          <div className="relative mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.86fr)_minmax(0,1fr)] lg:gap-10">
            <Panel
              tone="weak"
              caption="Weak photos"
              images={weakPhotos}
              amount={`${formatMoney(s.weakLow)} – ${formatMoney(s.weakHigh)}`}
              heading="Typical offers"
              note="Buyers discount for uncertainty."
            />

            {/* the gap, centred between the two outcomes */}
            <div className="relative flex flex-col items-center justify-center px-2 text-center">
              {/* Arrows drive the eye inward from both outcomes to the number between them.
                  Anchored to this column's own edges rather than offset from the card's midpoint,
                  so they stay put as the three columns resize. */}
              <Arrow direction="right" className="-left-14 hidden lg:block" />
              <Arrow direction="left" className="-right-14 hidden lg:block" />
              <p className="text-[0.75rem] font-[650] uppercase tracking-[0.14em] text-marketplace-violet">
                Potential value gap
              </p>
              <p className="mt-3 bg-violet-blue bg-clip-text text-[clamp(2.1rem,3.6vw,2.9rem)] font-[680] leading-none tracking-[-0.05em] text-transparent">
                {formatMoney(s.shortfallLow)}–{formatMoney(s.shortfallHigh)}
              </p>
              <p className="mt-2.5 text-[1.0625rem] font-[650] tracking-[-0.02em] text-marketplace-ink">
                left on the table
              </p>
              <p className="mt-4 text-[0.875rem] leading-[1.55] text-marketplace-muted">
                The same item.
                <br />
                Different photos. Very different outcomes.
              </p>
            </div>

            <Panel
              tone="full"
              caption="Complete photo set"
              images={fullSet}
              amount={formatMoney(price)}
              heading="Typical offers"
              note="Clear photos help preserve asking price."
            />

          </div>

          {/* ------------------------------------------------------------ reassurance */}
          <div className="mt-8 grid gap-6 border-t border-marketplace-line/70 pt-7 sm:grid-cols-3">
            <Reassurance
              icon={<Users className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.9} />}
              title="Better photos build confidence"
              body="Buyers trust what they can see."
            />
            <Reassurance
              icon={<Camera className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.9} />}
              title="Clearer coverage supports stronger offers"
              body="Show the details that matter."
            />
            <Reassurance
              icon={<CircleDollarSign className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.9} />}
              title={`Full set cost: $${s.photoCost.toFixed(0)}`}
              body="A small investment. A big difference."
            />
          </div>

          <p className="mt-6 text-[0.75rem] leading-[1.55] text-marketplace-muted-light">
            An illustration, not a forecast. The gap shown is {SHORTFALL_LOW * 100}–
            {SHORTFALL_HIGH * 100}% of the value you entered — what a listing can give up when
            buyers can&rsquo;t tell what they&rsquo;re looking at. What any individual item sells
            for depends on the item, the price, and the market.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ pieces */

function Flank({
  side,
  icon,
  label,
}: {
  side: 'left' | 'right';
  icon: React.ReactNode;
  label: React.ReactNode;
}) {
  const left = side === 'left';
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute top-9 hidden flex-col items-center xl:flex ${
        left ? 'left-[11%]' : 'right-[11%]'
      }`}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-marketplace-line/70 bg-white/90 shadow-soft">
        {icon}
      </span>
      <span className="mt-3 text-center text-[0.8125rem] leading-[1.3] text-marketplace-muted">
        {label}
      </span>
      {/* dashed arc reaching toward the headline */}
      <svg
        className={`absolute top-5 h-6 w-28 ${left ? 'left-[3.25rem]' : 'right-[3.25rem]'}`}
        viewBox="0 0 112 24"
        fill="none"
        preserveAspectRatio="none"
      >
        <path
          d={left ? 'M2 20 Q 56 -6 110 14' : 'M110 20 Q 56 -6 2 14'}
          stroke="#C9CEDC"
          strokeWidth="1.5"
          strokeDasharray="4 5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function Panel({
  tone,
  caption,
  images,
  amount,
  heading,
  note,
}: {
  tone: 'weak' | 'full';
  caption: string;
  images: string[];
  amount: string;
  heading: string;
  note: string;
}) {
  const weak = tone === 'weak';
  return (
    <div
      className={`rounded-[20px] border p-6 ${
        weak
          ? 'border-marketplace-line/50 bg-marketplace-canvas/70'
          : 'border-marketplace-violet/20 bg-[linear-gradient(160deg,rgba(122,92,255,0.09),rgba(91,141,239,0.06))]'
      }`}
    >
      <p
        className={`text-center text-[0.6875rem] font-[650] uppercase tracking-[0.14em] ${
          weak ? 'text-marketplace-muted' : 'text-marketplace-violet'
        }`}
      >
        {caption}
      </p>

      <div className="mt-4 flex gap-2">
        {images.map((src) => (
          <div
            key={src}
            className="min-w-0 flex-1 overflow-hidden rounded-[9px] border border-white/70 shadow-[0_3px_10px_-4px_rgba(12,13,18,0.28)]"
          >
            <PlaceholderImage
              src={src}
              alt=""
              decorative
              className={`h-full w-full ${weak ? 'aspect-[4/3] saturate-[0.72] brightness-[0.94]' : 'aspect-[3/4]'}`}
            />
          </div>
        ))}
      </div>

      <p
        className={`mt-6 text-[clamp(1.5rem,2.6vw,2.05rem)] font-[650] leading-none tracking-[-0.045em] ${
          weak ? 'text-marketplace-ink' : 'bg-violet-blue bg-clip-text text-transparent'
        }`}
      >
        {amount}
      </p>
      <p className="mt-2.5 text-[0.9375rem] font-[620] tracking-[-0.015em] text-marketplace-ink">
        {heading}
      </p>
      <p className="mt-1 text-[0.8375rem] leading-[1.5] text-marketplace-muted">{note}</p>
    </div>
  );
}

/** A wide gradient arrow pointing into the value gap. */
function Arrow({ direction, className }: { direction: 'left' | 'right'; className: string }) {
  const id = `stakes-arrow-${direction}`;
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 64 34"
      fill="none"
      className={`pointer-events-none absolute top-1/2 h-[34px] w-14 -translate-y-1/2 ${className}`}
      style={direction === 'left' ? { transform: 'translateY(-50%) scaleX(-1)' } : undefined}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="64" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7A5CFF" stopOpacity="0.18" />
          <stop offset="1" stopColor="#5B8DEF" stopOpacity="0.85" />
        </linearGradient>
      </defs>
      <path d="M0 10h40V0l24 17-24 17V24H0z" fill={`url(#${id})`} />
    </svg>
  );
}

function Reassurance({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-3.5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-violet-blue text-white shadow-[0_8px_18px_-8px_rgba(122,92,255,0.8)]">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[0.9375rem] font-[620] leading-[1.35] tracking-[-0.015em] text-marketplace-ink">
          {title}
        </p>
        <p className="mt-1 text-[0.8375rem] leading-[1.45] text-marketplace-muted">{body}</p>
      </div>
    </div>
  );
}
