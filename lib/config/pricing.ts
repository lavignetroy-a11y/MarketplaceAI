// Single source of truth for pricing. Nothing else in the app should hard-code a price --
// changing the model here changes it everywhere (marketing counter, checkout, account history).

/** Price per generated image, in whole cents, to avoid floating-point money. */
export const PRICE_PER_IMAGE_CENTS = 100;

/**
 * The counter's range. Buyers pick any count in between, not just preset packages.
 *
 * This is the ONLY definition of the range. The analysis prompt is handed these numbers at
 * runtime rather than stating a range of its own -- the master logic document has carried a
 * hardcoded count in every revision, and when it drifted from this file the model was being
 * briefed on packages the UI had never offered.
 */
export const MIN_IMAGES = 4;
export const MAX_IMAGES = 30;
export const DEFAULT_IMAGES = 6;

/** How many source photos one item's set may contain. */
export const MAX_SOURCE_PHOTOS = 20;

/** One image is generated free, watermarked, so a seller can judge quality on their own item. */
export const FREE_PREVIEW_IMAGES = 1;

export function priceCents(imageCount: number): number {
  return imageCount * PRICE_PER_IMAGE_CENTS;
}

export function formatPrice(cents: number): string {
  return cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;
}

/**
 * Coverage labels shown against counts on the counter, so a number means something.
 *
 * Bands rather than one entry per number, because the range now runs to 30 and thirty bespoke
 * blurbs would be thirty things to keep true. The bands deliberately mirror the count-adaptive
 * priorities in the master logic document, so what a buyer is promised at a given number and what
 * the planner is told to build at that number are the same idea.
 */
export const COVERAGE_BANDS: { upTo: number; label: string; blurb: string }[] = [
  { upTo: 5, label: 'Essential', blurb: 'A stronger first impression for simple listings.' },
  { upTo: 6, label: 'Recommended', blurb: 'Right for most furniture and household items.' },
  { upTo: 8, label: 'Detailed', blurb: 'For higher-value items where details matter.' },
  { upTo: 10, label: 'Comprehensive', blurb: 'Near-complete coverage of angles and condition.' },
  { upTo: 15, label: 'Full campaign', blurb: 'Mechanisms, labels, and multiple condition areas.' },
  { upTo: 20, label: 'Extensive', blurb: 'Every useful angle, with each question its own image.' },
  { upTo: 30, label: 'Exhaustive', blurb: 'For vehicles, equipment, and large matching sets.' },
];

export function coverageFor(count: number) {
  return (
    COVERAGE_BANDS.find((b) => count <= b.upTo) ?? COVERAGE_BANDS[COVERAGE_BANDS.length - 1]
  );
}
