// The stakes model behind the "what a weak listing costs" section.
//
// The argument this makes is deliberately NOT "sellers earn +$X on average". That is an
// objective performance claim about outcomes this product has never measured, and stating it as
// fact is the category regulators expect substantiation for.
//
// The argument it makes instead is about the SIZE OF THE GAP, driven by a number the visitor
// supplies about their own item: two listings for the same object, one shot badly on a phone in
// a dim garage and one shot as a complete set, do not attract the same offers -- and the spread
// between them dwarfs what a set of photos costs. That asymmetry is the whole pitch, it holds
// regardless of where in the range any individual sale lands, and every figure on screen is
// visibly derived from the visitor's own input rather than asserted by us.
//
// Language matters here and is part of the model, not decoration: "can", "as much as", and
// "often" describe a range of possible outcomes. Avoid "average", "typical", and "results" --
// those assert measured central tendency.

import { PRICE_PER_IMAGE_CENTS } from './pricing';

/**
 * How far below its worth a badly-photographed listing can settle. The low end is the everyday
 * case -- a few hundred off a mid-priced item because buyers can't tell condition. The high end
 * is the item that reads as suspect and goes for half, or doesn't sell at all until it's cut.
 */
export const SHORTFALL_LOW = 0.2;
export const SHORTFALL_HIGH = 0.5;

export type ValuePreset = {
  key: string;
  /** what a seller would call it */
  label: string;
  /** a believable asking price for a used one in good condition */
  price: number;
};

// Spread across an order of magnitude on purpose. The pitch gets stronger as the item gets more
// valuable, and a seller with a boat should be able to see their own situation on the scale.
export const VALUE_PRESETS: ValuePreset[] = [
  { key: 'chair', label: 'Accent chair', price: 240 },
  { key: 'sofa', label: 'Sectional sofa', price: 850 },
  { key: 'dining', label: 'Dining set', price: 1400 },
  { key: 'mower', label: 'Riding mower', price: 2400 },
  { key: 'motorcycle', label: 'Motorcycle', price: 7500 },
  { key: 'boat', label: 'Boat and trailer', price: 19000 },
];

export const MIN_VALUE = 100;
export const MAX_VALUE = 25000;
export const DEFAULT_PRESET = 'dining';

export type Stakes = {
  /** what the item is honestly worth */
  price: number;
  /** the smaller and larger ends of what a weak listing can leave behind */
  shortfallLow: number;
  shortfallHigh: number;
  /** what a full set of photos costs at the recommended count */
  photoCost: number;
  /** the photo cost as a percentage of the smaller end of the gap */
  costAsPercentOfGap: number;
};

export function stakesFor(price: number, imageCount: number): Stakes {
  const shortfallLow = Math.round((price * SHORTFALL_LOW) / 5) * 5;
  const shortfallHigh = Math.round((price * SHORTFALL_HIGH) / 5) * 5;
  const photoCost = (imageCount * PRICE_PER_IMAGE_CENTS) / 100;
  return {
    price,
    shortfallLow,
    shortfallHigh,
    photoCost,
    costAsPercentOfGap: shortfallLow > 0 ? (photoCost / shortfallLow) * 100 : 0,
  };
}

export function formatMoney(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}
