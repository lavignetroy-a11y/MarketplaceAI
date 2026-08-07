// GENERATED — do not edit by hand. Regenerate with: npx tsx scripts/gen-shot-labels.ts
//
// The reveal grid labels each tile with what it shows. Those labels cannot be a fixed list,
// because what slot 2 IS depends on the item: a side profile for a chair, an open door for a
// washing machine, the opposite front corner for a mower. Labelling a washer tile "Rear angle"
// is the exact nonsense the per-item shot vocabularies exist to prevent.
//
// This table is generated from the real vocabularies so the site and the generator can never
// disagree, but it carries only the short labels -- the marketing bundle must not pull in the
// full prompt text.

import type { CategoryKey } from './categories';

export const SHOT_LABELS: Record<CategoryKey, string[][]> = {
  furniture: [
    ['Hero image', 'Side profile', 'Rear view', 'Texture detail', 'Condition view', 'Context shot'], // v1 — Accent chair
    ['Hero image', 'Side profile', 'Rear view', 'Texture detail', 'Condition view', 'Context shot'], // v2 — Sectional sofa
    ['Hero image', 'Drawers open', 'Inside a drawer', 'Corner angle', 'Texture detail', 'Condition view'], // v3 — Solid wood dresser
    ['Hero image', 'Side profile', 'Rear view', 'Texture detail', 'Condition view', 'Context shot'], // v4 — Dining table and chairs
    ['Hero image', 'Side profile', 'Rear view', 'Texture detail', 'Condition view', 'Context shot'], // v5 — Bookshelf
  ],
  outdoor: [
    ['Hero image', 'Front-right corner', 'Rear-left corner', 'Seat and controls', 'Mechanical detail', 'Context shot'], // v1 — Riding mower
    ['Hero image', 'Front-right corner', 'Rear-left corner', 'Seat and controls', 'Mechanical detail', 'Context shot'], // v2 — Boat and trailer
    ['Hero image', 'Front-right corner', 'Rear-left corner', 'Seat and controls', 'Mechanical detail', 'Context shot'], // v3 — ATV / quad
    ['Hero image', 'Side profile', 'Rear view', 'Texture detail', 'Condition view', 'Context shot'], // v4 — Patio furniture set
    ['Hero image', 'Side profile', 'Rear view', 'Texture detail', 'Condition view', 'Context shot'], // v5 — Pressure washer
  ],
  appliances: [
    ['Hero image', 'Open', 'Interior', 'Controls', 'Inspection detail', 'Context shot'], // v1 — Washing machine
    ['Hero image', 'Open', 'Interior', 'Controls', 'Inspection detail', 'Context shot'], // v2 — Tumble dryer
    ['Hero image', 'Open', 'Interior', 'Controls', 'Inspection detail', 'Context shot'], // v3 — Fridge freezer
    ['Hero image', 'Open', 'Interior', 'Controls', 'Inspection detail', 'Context shot'], // v4 — Dishwasher
    ['Hero image', 'Open', 'Interior', 'Controls', 'Inspection detail', 'Context shot'], // v5 — Range cooker
  ],
  tools: [
    ['Hero image', 'Drawers open', 'Inside a drawer', 'Corner angle', 'Texture detail', 'Condition view'], // v1 — Rolling tool chest
    ['Hero image', 'Adjusted position', 'Contact surface', 'Components', 'Condition view', 'Context shot'], // v2 — Table saw
    ['Hero image', 'Side profile', 'Rear view', 'Texture detail', 'Condition view', 'Context shot'], // v3 — Air compressor
    ['Hero image', 'Drawers open', 'Inside a drawer', 'Corner angle', 'Texture detail', 'Condition view'], // v4 — Workbench
    ['Hero image', 'Side profile', 'Rear view', 'Texture detail', 'Condition view', 'Context shot'], // v5 — Portable generator
  ],
  fitness: [
    ['Hero image', 'Adjusted position', 'Contact surface', 'Components', 'Condition view', 'Context shot'], // v1 — Weight bench and barbell
    ['Hero image', 'Adjusted position', 'Contact surface', 'Components', 'Condition view', 'Context shot'], // v2 — Treadmill
    ['Hero image', 'Adjusted position', 'Contact surface', 'Components', 'Condition view', 'Context shot'], // v3 — Rowing machine
    ['Hero image', 'Adjusted position', 'Contact surface', 'Components', 'Condition view', 'Context shot'], // v4 — Squat rack
    ['Hero image', 'Adjusted position', 'Contact surface', 'Components', 'Condition view', 'Context shot'], // v5 — Dumbbell set and rack
  ],
};

/** Labels for one category tab at one variant. */
export function shotLabels(category: CategoryKey, variant: number): string[] {
  const per = SHOT_LABELS[category];
  return per[(variant - 1) % per.length];
}
