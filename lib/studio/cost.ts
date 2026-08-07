// Rough spend estimates for the studio, so a batch button says what it will cost before it runs.
//
// These are published gpt-image-2 output rates as of August 2026, and they are ESTIMATES: they
// cover generated output only, not the image-input tokens that every images.edit call adds for
// its reference photos (billed separately at ~$8 per million image input tokens). For this
// manifest that undercounts by roughly 15-30%.
//
// Low quality is ~35x cheaper than high, which makes a full low-quality pass the cheap way to
// check framing and composition across the whole set before committing real money to it.

export type StudioQuality = 'low' | 'medium' | 'high';

const RATES: Record<StudioQuality, Record<string, number>> = {
  low: { '1024x1024': 0.006, '1024x1536': 0.006, '1536x1024': 0.006 },
  medium: { '1024x1024': 0.053, '1024x1536': 0.05, '1536x1024': 0.05 },
  high: { '1024x1024': 0.211, '1024x1536': 0.2, '1536x1024': 0.199 },
};

/** Estimated output spend for a set of images at a given quality, in dollars. */
export function estimateCost(sizes: string[], quality: StudioQuality): number {
  const table = RATES[quality];
  return sizes.reduce((sum, size) => sum + (table[size] ?? table['1024x1024']), 0);
}

export function formatCost(dollars: number): string {
  if (dollars < 1) return `${Math.round(dollars * 100)}¢`;
  return `$${dollars.toFixed(dollars < 10 ? 2 : 0)}`;
}
