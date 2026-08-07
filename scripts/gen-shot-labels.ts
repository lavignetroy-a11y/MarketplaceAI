import fs from 'fs';
import { ITEM_CATEGORIES, VARIANTS } from '../lib/config/categories';
import { ITEMS_BY_CATEGORY } from '../lib/studio/items';
import { VOCABULARIES } from '../lib/studio/vocabularies';

const rows: string[] = [];
for (const c of ITEM_CATEGORIES) {
  const pool = ITEMS_BY_CATEGORY(c.key);
  const per = VARIANTS.map((v) => {
    const item = pool[(v - 1) % pool.length];
    const labels = VOCABULARIES[item.vocabulary].map((s) => `'${s.label}'`);
    return `    [${labels.join(', ')}], // v${v} — ${item.label}`;
  });
  rows.push(`  ${c.key}: [\n${per.join('\n')}\n  ],`);
}

fs.writeFileSync(new URL('../lib/config/shotLabels.ts', import.meta.url),
`// GENERATED — do not edit by hand. Regenerate with: npx tsx scripts/gen-shot-labels.ts
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
${rows.join('\n')}
};

/** Labels for one category tab at one variant. */
export function shotLabels(category: CategoryKey, variant: number): string[] {
  const per = SHOT_LABELS[category];
  return per[(variant - 1) % per.length];
}
`);
console.log('written');
