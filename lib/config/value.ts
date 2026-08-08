// The stakes model behind the "what a weak listing costs" section.
//
// The argument is deliberately NOT "sellers earn +$X on average". That is an objective
// performance claim about outcomes this product has never measured, and asserting it as fact is
// the category that needs substantiation.
//
// The argument it makes instead is about the SIZE OF THE GAP, driven by a number the visitor
// supplies about their own item: two listings for the same object, one shot badly and one shot
// as a complete set, do not attract the same offers -- and the spread between them dwarfs what
// photos cost. That asymmetry holds wherever an individual sale lands, so it needs no claim
// about central tendency, and every figure on screen is visibly derived from the visitor's own
// input rather than asserted by us.
//
// Language is part of the model, not decoration: "can", "potential", "typical offers" against a
// range. Avoid "average", "results", and anything that reads as a measured outcome.

import type { CategoryKey } from './categories';
import { PRICE_PER_IMAGE_CENTS } from './pricing';

/**
 * How far below its worth a listing can settle when the photos leave buyers guessing. The low
 * end is the everyday case; the high end is the item that reads as suspect and goes for half.
 */
export const SHORTFALL_LOW = 0.2;
export const SHORTFALL_HIGH = 0.5;

export type ValuePreset = {
  key: string;
  label: string;
  /** a believable asking price for a used one in good condition */
  price: number;
  /**
   * Which generated image set illustrates this preset. Pointing at real category/variant folders
   * means the thumbnails fill in with the same items the rest of the site shows, rather than
   * needing their own photography.
   */
  category: CategoryKey;
  variant: number;
};

// Ordered cheapest to dearest so the row itself reads as a scale, and the gap visibly grows as a
// visitor moves right.
export const VALUE_PRESETS: ValuePreset[] = [
  { key: 'accent-chair', label: 'Accent chair', price: 120, category: 'furniture', variant: 1 },
  { key: 'sectional-sofa', label: 'Sectional sofa', price: 425, category: 'furniture', variant: 2 },
  { key: 'dining-set', label: 'Dining set', price: 700, category: 'furniture', variant: 4 },
  { key: 'riding-mower', label: 'Riding mower', price: 1200, category: 'outdoor', variant: 1 },
  { key: 'atv', label: 'ATV / quad', price: 1800, category: 'outdoor', variant: 3 },
  { key: 'fishing-boat', label: 'Boat and trailer', price: 2400, category: 'outdoor', variant: 2 },
];

export const MIN_VALUE = 125;
export const MAX_VALUE = 2500;
export const DEFAULT_PRESET = 'dining-set';

export type Stakes = {
  price: number;
  /** the smaller and larger ends of what a weak listing can leave behind */
  shortfallLow: number;
  shortfallHigh: number;
  /** what the weak listing would actually fetch, low and high */
  weakLow: number;
  weakHigh: number;
  /** what a full set of photos costs at the recommended count */
  photoCost: number;
};

const round5 = (n: number) => Math.round(n / 5) * 5;

export function stakesFor(price: number, imageCount: number): Stakes {
  const shortfallLow = round5(price * SHORTFALL_LOW);
  const shortfallHigh = round5(price * SHORTFALL_HIGH);
  return {
    price,
    shortfallLow,
    shortfallHigh,
    weakLow: price - shortfallHigh,
    weakHigh: price - shortfallLow,
    photoCost: (imageCount * PRICE_PER_IMAGE_CENTS) / 100,
  };
}

export function formatMoney(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}
