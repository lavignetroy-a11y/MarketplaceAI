'use client';

import { useCallback, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { VARIANT_COUNT } from '@/lib/config/categories';

/**
 * Steps a section through its alternative items.
 *
 * A variant is a different object, not a different angle, and it applies to the whole section at
 * once -- so this control is deliberately one per section rather than one per tile. Stepping it
 * swaps every image in the group together, which is what keeps a grid showing one coherent item
 * instead of a collage of unrelated things.
 */
export function useVariant() {
  const [variant, setVariant] = useState(1);
  const step = useCallback((delta: number) => {
    setVariant((v) => ((v - 1 + delta + VARIANT_COUNT) % VARIANT_COUNT) + 1);
  }, []);
  return { variant, step, setVariant };
}

export function VariantSwitcher({
  variant,
  step,
  dark,
  label = 'example',
}: {
  variant: number;
  step: (delta: number) => void;
  dark?: boolean;
  /** what the visitor is stepping through, for the accessible name */
  label?: string;
}) {
  const base = dark
    ? 'border-white/15 bg-white/[0.06] text-white/70 hover:text-white hover:border-white/30'
    : 'border-marketplace-line bg-white/85 text-marketplace-muted hover:text-marketplace-ink hover:border-marketplace-ink';

  return (
    <div className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => step(-1)}
        aria-label={`Previous ${label}`}
        className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${base}`}
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={2.2} />
      </button>

      {/* Dots rather than "3 / 5" -- the count is reassurance that there's more to see, not
          information anyone needs to read precisely. */}
      <span className="flex items-center gap-1.5 px-1.5" aria-hidden="true">
        {Array.from({ length: VARIANT_COUNT }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i + 1 === variant
                ? 'w-4 bg-marketplace-violet'
                : dark
                  ? 'w-1.5 bg-white/25'
                  : 'w-1.5 bg-marketplace-line'
            }`}
          />
        ))}
      </span>
      <span className="sr-only" role="status">
        Showing {label} {variant} of {VARIANT_COUNT}
      </span>

      <button
        type="button"
        onClick={() => step(1)}
        aria-label={`Next ${label}`}
        className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${base}`}
      >
        <ChevronRight className="h-4 w-4" strokeWidth={2.2} />
      </button>
    </div>
  );
}
