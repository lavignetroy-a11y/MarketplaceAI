'use client';

import { useMemo, useState } from 'react';
import { ArrowDown, Camera, TrendingDown } from 'lucide-react';
import { Accent, Eyebrow, Lede, SectionTitle } from './primitives';
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
} from '@/lib/config/value';

/**
 * The money section.
 *
 * Every number on screen is computed from a price the visitor sets, so this demonstrates the
 * scale of what is at stake rather than asserting an outcome we have measured. That is both the
 * defensible framing and the persuasive one: a seller reading "$280 to $700" about their own
 * dining set is doing arithmetic we never had to claim on their behalf, and the gap next to an
 * $6 line of photos makes the argument without a single adjective.
 */
export function Stakes() {
  const [price, setPrice] = useState(
    VALUE_PRESETS.find((p) => p.key === DEFAULT_PRESET)!.price,
  );
  const [activePreset, setActivePreset] = useState<string | null>(DEFAULT_PRESET);

  const s = useMemo(() => stakesFor(price, DEFAULT_IMAGES), [price]);

  // The weak-listing bar is drawn at what the item would fetch at the pessimistic end, as a
  // fraction of full worth, so the empty space above it IS the gap being discussed.
  const weakPct = (1 - SHORTFALL_HIGH) * 100;
  const okayPct = (1 - SHORTFALL_LOW) * 100;

  return (
    <section id="stakes" className="section relative overflow-hidden bg-marketplace-paper">
      <div className="page-shell relative mx-auto max-w-page">
        <div className="mx-auto max-w-[680px] text-center">
          <Eyebrow>What&rsquo;s at stake</Eyebrow>
          <SectionTitle className="mt-5">
            The photos are cheap.
            <br />
            The <Accent>gap isn&rsquo;t.</Accent>
          </SectionTitle>
          <Lede className="mx-auto mt-6 max-w-[560px]">
            Two people list the same item. One posts four dim phone snapshots taken in a garage.
            The other posts a complete, well-lit set. They do not get the same offers.
          </Lede>
        </div>

        {/* Item picker */}
        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {VALUE_PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => {
                setPrice(p.price);
                setActivePreset(p.key);
              }}
              aria-pressed={activePreset === p.key}
              className={`rounded-full border px-4 py-2 text-[0.8125rem] font-medium transition-colors ${
                activePreset === p.key
                  ? 'border-marketplace-violet bg-violet-blue text-white shadow-[0_6px_18px_rgba(122,92,255,0.3)]'
                  : 'border-marketplace-line bg-white/80 text-marketplace-muted hover:border-marketplace-ink hover:text-marketplace-ink'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="mx-auto mt-8 max-w-[860px] rounded-brand-xl border border-marketplace-line/60 bg-white/80 p-7 shadow-soft backdrop-blur sm:p-9">
          {/* Value input */}
          <label className="block">
            <span className="text-[0.875rem] text-marketplace-muted">
              What&rsquo;s your item honestly worth?
            </span>
            <span className="mt-2 block text-[2.5rem] font-[650] leading-none tracking-[-0.04em] text-marketplace-ink">
              {formatMoney(price)}
            </span>
            <input
              type="range"
              min={MIN_VALUE}
              max={MAX_VALUE}
              step={50}
              value={price}
              onChange={(e) => {
                setPrice(Number(e.target.value));
                setActivePreset(null);
              }}
              aria-label="Item value"
              className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-marketplace-line accent-marketplace-violet"
            />
          </label>

          {/* The comparison. Both bars share one plot so the heights are read against each
              other directly -- in separate boxes they were two wide blocks rather than a
              measurement, and the gap is the entire point of the section. */}
          <div className="mt-9 grid gap-6 sm:grid-cols-2 sm:gap-10">
            <Bar
              tone="weak"
              heightPct={weakPct}
              caption="Listed with weak photos"
              detail="Buyers can't read condition, so they discount for the risk — or scroll past."
              amount={`${formatMoney(price - s.shortfallHigh)} – ${formatMoney(price - s.shortfallLow)}`}
            />
            <Bar
              tone="full"
              heightPct={100}
              caption="Listed with a complete set"
              detail="Every angle, texture, and mark visible. Nothing left to a buyer's imagination."
              amount={formatMoney(price)}
            />
          </div>

          {/* The punchline */}
          <div className="mt-9 rounded-brand-lg border border-marketplace-violet/25 bg-violet-50/60 p-6">
            <div className="flex flex-wrap items-center justify-between gap-5">
              <div>
                <p className="flex items-center gap-2 text-[0.8125rem] font-medium uppercase tracking-[0.1em] text-marketplace-violet">
                  <TrendingDown className="h-4 w-4" strokeWidth={2.2} />
                  What weak photos can leave on the table
                </p>
                <p className="mt-2 text-[2rem] font-[650] leading-none tracking-[-0.04em] text-marketplace-ink">
                  {formatMoney(s.shortfallLow)} – {formatMoney(s.shortfallHigh)}
                </p>
              </div>

              <ArrowDown
                className="hidden h-6 w-6 shrink-0 text-marketplace-violet/40 sm:block"
                aria-hidden="true"
              />

              <div className="sm:text-right">
                <p className="flex items-center gap-2 text-[0.8125rem] font-medium uppercase tracking-[0.1em] text-marketplace-muted sm:justify-end">
                  <Camera className="h-4 w-4" strokeWidth={2.2} />
                  What a full set costs
                </p>
                <p className="mt-2 text-[2rem] font-[650] leading-none tracking-[-0.04em] text-marketplace-ink">
                  ${s.photoCost.toFixed(0)}
                </p>
              </div>
            </div>

            <p className="mt-5 border-t border-marketplace-violet/15 pt-4 text-[0.9375rem] leading-[1.6] text-marketplace-muted">
              That&rsquo;s{' '}
              <span className="font-semibold text-marketplace-ink">
                {s.costAsPercentOfGap < 1
                  ? `under 1%`
                  : `about ${s.costAsPercentOfGap.toFixed(0)}%`}
              </span>{' '}
              of the smaller end of the gap. On a {formatMoney(price)} item, the photos cost less
              than the difference a single hesitant buyer talks you down by.
            </p>
          </div>

          <p className="mt-5 text-[0.75rem] leading-[1.55] text-marketplace-muted-light">
            An illustration, not a forecast. The range shown is {SHORTFALL_LOW * 100}–
            {SHORTFALL_HIGH * 100}% of the value you entered — what a listing can give up when
            buyers can&rsquo;t tell what they&rsquo;re looking at. What any individual item sells
            for depends on the item, the price, and the market.
          </p>
        </div>
      </div>
    </section>
  );
}

function Bar({
  tone,
  heightPct,
  caption,
  detail,
  amount,
}: {
  tone: 'weak' | 'full';
  heightPct: number;
  caption: string;
  detail: string;
  amount: string;
}) {
  const weak = tone === 'weak';
  return (
    <div>
      <div className="relative mx-auto flex h-[210px] max-w-[190px] items-end justify-center rounded-brand bg-marketplace-canvas/50 px-5 pt-4">
        {/* the shortfall, drawn as the space the bar doesn't reach -- a dashed ceiling at full
            worth makes the missing height legible as an amount rather than a shorter block */}
        {weak && (
          <>
            <span
              className="pointer-events-none absolute inset-x-4 top-4 border-t border-dashed border-marketplace-muted-light/70"
              aria-hidden="true"
            />
            <span
              className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-2.5 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-marketplace-muted shadow-soft"
              style={{ top: `calc(${(100 - heightPct) / 2}% + 0.5rem)` }}
            >
              gone
            </span>
          </>
        )}
        <div
          className={`w-full rounded-t-[6px] transition-[height] duration-500 ease-out ${
            weak
              ? 'bg-[linear-gradient(to_top,#C4CAD9,#DDE1EC)]'
              : 'bg-violet-blue shadow-[0_-6px_24px_rgba(122,92,255,0.32)]'
          }`}
          style={{ height: `calc(${heightPct}% - 1rem)` }}
        />
      </div>
      <p className="mt-4 text-[0.9375rem] font-semibold tracking-[-0.015em] text-marketplace-ink">
        {caption}
      </p>
      <p
        className={`mt-1 text-[1.125rem] font-[650] tracking-[-0.03em] ${
          weak ? 'text-marketplace-muted' : 'text-marketplace-violet'
        }`}
      >
        {amount}
      </p>
      <p className="mt-1.5 text-[0.8375rem] leading-[1.5] text-marketplace-muted">{detail}</p>
    </div>
  );
}
