// Single source of truth for pricing. Nothing else in the app should hard-code a price --
// changing the model here changes it everywhere (marketing counter, checkout, account history).

/** Price per generated image, in whole cents, to avoid floating-point money. */
export const PRICE_PER_IMAGE_CENTS = 100;

/** The counter's range. Buyers pick any count in between, not just preset packages. */
export const MIN_IMAGES = 4;
export const MAX_IMAGES = 10;
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

/** Coverage labels shown against counts on the counter, so a number means something. */
export const COVERAGE_NOTES: Record<number, { label: string; blurb: string }> = {
  4: { label: 'Essential', blurb: 'A stronger first impression for simple listings.' },
  5: { label: 'Essential+', blurb: 'One more angle for a little extra proof.' },
  6: { label: 'Recommended', blurb: 'Right for most furniture and household items.' },
  7: { label: 'Detailed', blurb: 'Extra coverage for items with more to show.' },
  8: { label: 'Detailed+', blurb: 'For higher-value items where details matter.' },
  9: { label: 'Comprehensive', blurb: 'Near-complete coverage of angles and condition.' },
  10: { label: 'Maximum', blurb: 'For vehicles, equipment, and full sets.' },
};

export function coverageFor(count: number) {
  return COVERAGE_NOTES[count] ?? COVERAGE_NOTES[DEFAULT_IMAGES];
}
