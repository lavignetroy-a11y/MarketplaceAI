import { EXAMPLE_CATEGORY_KEYS, ITEM_CATEGORIES, VARIANTS } from '../config/categories';
import { ITEMS, ITEMS_BY_CATEGORY, type Item } from './items';
import { VOCABULARIES, type Shot, type ShotSize } from './vocabularies';
import { amateurClause, CONSISTENCY_CLAUSE, SAME_SCENE_CLAUSE, STYLE_CONTRACT } from './styleContract';
import { BEFORE_ANGLES } from './vocabularies';

// Every image the site needs, with the prompt that produces it.
//
// Three rules shape this file.
//
// 1. Prompts are composed, not hand-written: STYLE_CONTRACT + item + shot. Writing hundreds of
//    prompts by hand would guarantee they drift into unrelated stock photos.
//
// 2. Images are chained. Each item's hero is generated first and every other shot of that item
//    is an edit against it. Without this a "before" and an "after" are two separate rolls of the
//    dice -- two similar-ish objects in two different rooms -- and a viewer cannot tell which is
//    which, because there is no relationship between them to read.
//
// 3. A VARIANT IS AN ITEM, NOT AN ANGLE. Every image slot on the site can cycle through five
//    options, and each option is a different object. Crucially the variant applies to a whole
//    GROUP at once: switching the furniture tab to variant 3 swaps all ten of its tiles to the
//    dining set together. A group showing a chair back, a mower tyre and a fridge shelf side by
//    side would be nonsense, so coherence within a group is the constraint the whole layout
//    below is built to preserve.

export type StudioSize = ShotSize;

export type StudioImage = {
  id: string;
  path: string;
  group: string;
  label: string;
  prompt: string;
  size: StudioSize;
  /** which item this shows, so the studio can group and label sensibly */
  item: string;
  variant: number;
  staticReferences: string[];
  dependsOn: string[];
};

// ---------------------------------------------------------------------------
// Prompt assembly
// ---------------------------------------------------------------------------

function compose(item: Item, brief: string, isRoot: boolean): string {
  const parts = [STYLE_CONTRACT, '', 'THIS SHOT', brief];
  if (item.references?.length) parts.push('', CONSISTENCY_CLAUSE);
  if (!isRoot) parts.push('', SAME_SCENE_CLAUSE);
  return parts.join('\n');
}

function beforePrompt(item: Item, n: number): string {
  const angles = BEFORE_ANGLES[item.vocabulary];
  const brief =
    `An ordinary seller's own phone snapshot of ${item.description}, taken ` +
    `${angles[(n - 1) % angles.length]}. The whole item is recognisable even though the ` +
    `photograph is poor. This is the picture that was going to be listed before anything was ` +
    `done about it.`;
  return [STYLE_CONTRACT, '', 'THIS SHOT', brief, '', amateurClause(item.badLight, item.clutter)].join('\n');
}

/** Every item's chain is rooted at its own hero shot. */
const rootId = (item: Item) => `item/${item.key}/hero`;

const shotsFor = (item: Item): Shot[] => [...VOCABULARIES[item.vocabulary]];

// ---------------------------------------------------------------------------
// Slot layout
// ---------------------------------------------------------------------------

const items: StudioImage[] = [];
const seen = new Set<string>();

/** A finished shot. Shots are addressed by index so the slot works across all vocabularies. */
function shot(opts: {
  id: string;
  path: string;
  group: string;
  label: string;
  item: Item;
  shotIndex: number;
  /** override the vocabulary's natural size when a slot needs a different aspect */
  size?: StudioSize;
}) {
  if (seen.has(opts.path)) return;
  seen.add(opts.path);
  const list = shotsFor(opts.item);
  const s = list[opts.shotIndex % list.length];
  const isRoot = opts.id === rootId(opts.item);
  items.push({
    id: opts.id,
    path: opts.path,
    group: opts.group,
    label: `${opts.item.label} — ${opts.label}`,
    prompt: compose(opts.item, s.brief(opts.item), isRoot),
    size: opts.size ?? s.size,
    item: opts.item.key,
    variant: 0,
    staticReferences: opts.item.references ?? [],
    dependsOn: isRoot ? [] : [rootId(opts.item)],
  });
}

function before(opts: {
  id: string;
  path: string;
  group: string;
  label: string;
  item: Item;
  n: number;
  size: StudioSize;
}) {
  if (seen.has(opts.path)) return;
  seen.add(opts.path);
  items.push({
    id: opts.id,
    path: opts.path,
    group: opts.group,
    label: `${opts.item.label} — ${opts.label}`,
    prompt: beforePrompt(opts.item, opts.n),
    size: opts.size,
    item: opts.item.key,
    variant: 0,
    staticReferences: [],
    dependsOn: [rootId(opts.item)],
  });
}

const setVariant = (from: number, v: number) => {
  for (let i = from; i < items.length; i++) items[i].variant = v;
};

// --- roots: every item's hero, generated before anything derived from it ---
for (const item of ITEMS) {
  shot({
    id: rootId(item),
    path: `/images/items/${item.key}/hero.webp`,
    group: `Items — ${item.label}`,
    label: 'Hero (chain root)',
    item,
    shotIndex: 0,
  });
}

// --- reveal/: category tab x variant, the full campaign grid + before photos ---
for (const category of ITEM_CATEGORIES) {
  const pool = ITEMS_BY_CATEGORY(category.key);
  for (const v of VARIANTS) {
    const item = pool[(v - 1) % pool.length];
    const start = items.length;
    const g = `Reveal — ${category.label} v${v}`;
    shotsFor(item).forEach((s, i) =>
      shot({
        id: `reveal/${category.key}/v${v}/${s.key}`,
        path: `/images/reveal/${category.key}/v${v}/slot-${i + 1}.webp`,
        group: g,
        label: s.label,
        item,
        shotIndex: i,
      }),
    );
    for (let n = 1; n <= 4; n++)
      before({
        id: `reveal/${category.key}/v${v}/before-${n}`,
        path: `/images/reveal/${category.key}/v${v}/before-${n}.webp`,
        group: g,
        label: `Before photo ${n}`,
        item,
        n,
        size: '1024x1536',
      });
    setVariant(start, v);
  }
}

// --- examples/: before/after proof, four category tabs x variant ---
for (const key of EXAMPLE_CATEGORY_KEYS) {
  const pool = ITEMS_BY_CATEGORY(key);
  const label = ITEM_CATEGORIES.find((c) => c.key === key)!.label;
  for (const v of VARIANTS) {
    // offset by one from the reveal tabs so the two biggest image sections never open on the
    // same object -- with five items per category and seven sections some overlap is
    // unavoidable, so it's spent on the small tiles rather than the full-width grids
    const item = pool[v % pool.length];
    const start = items.length;
    const g = `Examples — ${label} v${v}`;
    shot({
      id: `examples/${key}/v${v}/result-hero`,
      path: `/images/examples/${key}/v${v}/result-hero.webp`,
      group: g,
      label: 'Result hero',
      item,
      shotIndex: 0,
      size: '1536x1024',
    });
    for (let i = 1; i <= 4; i++)
      shot({
        id: `examples/${key}/v${v}/result-${i}`,
        path: `/images/examples/${key}/v${v}/result-${i}.webp`,
        group: g,
        label: `Result ${i}`,
        item,
        shotIndex: i,
        size: '1024x1024',
      });
    for (let n = 1; n <= 4; n++)
      before({
        id: `examples/${key}/v${v}/source-${n}`,
        path: `/images/examples/${key}/v${v}/source-${n}.webp`,
        group: g,
        label: `Before photo ${n}`,
        item,
        n,
        size: '1024x1024',
      });
    setVariant(start, v);
  }
}

// Sections that aren't tied to a category pick across the whole roster, and each starts on a
// different item so a visitor landing on the page sees five different objects rather than the
// same chair five times.
const acrossCategories = (offset: number): Item[] =>
  ITEM_CATEGORIES.map((c, ci) => {
    const pool = ITEMS_BY_CATEGORY(c.key);
    return pool[(offset + ci) % pool.length];
  });

const WHY_ITEMS = acrossCategories(2);
const HOW_ITEMS = acrossCategories(4);
const TRUST_ITEMS = acrossCategories(3);
const CTA_ITEMS = acrossCategories(1);

// --- why/ ---
for (const v of VARIANTS) {
  const item = WHY_ITEMS[(v - 1) % WHY_ITEMS.length];
  const start = items.length;
  const g = `Why it matters v${v}`;
  shot({ id: `why/v${v}/listing-hero`, path: `/images/why/v${v}/listing-hero.webp`, group: g, label: 'Listing card hero', item, shotIndex: 0, size: '1024x1536' });
  for (let i = 1; i <= 4; i++)
    shot({ id: `why/v${v}/thumb-${i}`, path: `/images/why/v${v}/thumb-${i}.webp`, group: g, label: `Thumbnail ${i}`, item, shotIndex: i, size: '1024x1024' });
  for (let i = 1; i <= 4; i++)
    shot({ id: `why/v${v}/detail-${i}`, path: `/images/why/v${v}/detail-${i}.webp`, group: g, label: `Benefit detail ${i}`, item, shotIndex: i + 1, size: '1536x1024' });
  setVariant(start, v);
}

// --- how/ ---
for (const v of VARIANTS) {
  const item = HOW_ITEMS[(v - 1) % HOW_ITEMS.length];
  const start = items.length;
  const g = `How it works v${v}`;
  for (let n = 1; n <= 4; n++)
    before({ id: `how/v${v}/source-${n}`, path: `/images/how/v${v}/source-${n}.webp`, group: g, label: `Before photo ${n}`, item, n, size: '1024x1536' });
  shot({ id: `how/v${v}/result-hero`, path: `/images/how/v${v}/result-hero.webp`, group: g, label: 'Result hero', item, shotIndex: 0, size: '1536x1024' });
  for (let i = 1; i <= 4; i++)
    shot({ id: `how/v${v}/result-${i}`, path: `/images/how/v${v}/result-${i}.webp`, group: g, label: `Result ${i}`, item, shotIndex: i, size: '1024x1024' });
  setVariant(start, v);
}

// --- trust/ ---
for (const v of VARIANTS) {
  const item = TRUST_ITEMS[(v - 1) % TRUST_ITEMS.length];
  const start = items.length;
  const g = `Trust v${v}`;
  shot({ id: `trust/v${v}/inspect`, path: `/images/trust/v${v}/inspect.webp`, group: g, label: 'Inspection hero', item, shotIndex: 0, size: '1024x1536' });
  shot({ id: `trust/v${v}/detail-1`, path: `/images/trust/v${v}/detail-1.webp`, group: g, label: 'Texture proof', item, shotIndex: 3, size: '1536x1024' });
  shot({ id: `trust/v${v}/detail-2`, path: `/images/trust/v${v}/detail-2.webp`, group: g, label: 'Wear proof', item, shotIndex: 4, size: '1536x1024' });
  setVariant(start, v);
}

// --- pricing/: one tile per category, each cycling its own items ---
for (const v of VARIANTS) {
  const start = items.length;
  ITEM_CATEGORIES.forEach((c, i) => {
    const pool = ITEMS_BY_CATEGORY(c.key);
    // offset so the pricing strip doesn't open on the same items the reveal tabs lead with
    const item = pool[(v + 1) % pool.length];
    shot({
      id: `pricing/v${v}/tile-${i + 1}`,
      path: `/images/pricing/v${v}/tile-${i + 1}.webp`,
      group: `Pricing v${v}`,
      label: `Coverage tile ${i + 1}`,
      item,
      shotIndex: 0,
      size: '1024x1024',
    });
  });
  setVariant(start, v);
}

// --- cta/: the fanned set ---
for (const v of VARIANTS) {
  const item = CTA_ITEMS[(v - 1) % CTA_ITEMS.length];
  const start = items.length;
  for (let i = 1; i <= 5; i++)
    shot({
      id: `cta/v${v}/card-${i}`,
      path: `/images/cta/v${v}/card-${i}.webp`,
      group: `Final CTA v${v}`,
      label: `Fan card ${i}`,
      item,
      shotIndex: i - 1,
      size: '1024x1536',
    });
  setVariant(start, v);
}

export const STUDIO_MANIFEST: StudioImage[] = items;

export const STUDIO_GROUPS = Array.from(new Set(STUDIO_MANIFEST.map((i) => i.group)));

export function studioImageById(id: string): StudioImage | undefined {
  return STUDIO_MANIFEST.find((i) => i.id === id);
}

export function resolveReferences(image: StudioImage): string[] {
  const chained = image.dependsOn
    .map((id) => studioImageById(id)?.path)
    .filter((p): p is string => Boolean(p));
  return [...image.staticReferences, ...chained];
}

/** Orders a batch so an image's dependencies are generated before it. */
export function studioBatchOrder(ids: string[]): string[] {
  const wanted = new Set(ids);
  const ordered: string[] = [];
  const placed = new Set<string>();
  const visit = (id: string, seenIds: Set<string>) => {
    if (placed.has(id) || seenIds.has(id)) return;
    seenIds.add(id);
    const image = studioImageById(id);
    if (!image) return;
    for (const dep of image.dependsOn) if (wanted.has(dep)) visit(dep, seenIds);
    if (!placed.has(id)) {
      placed.add(id);
      ordered.push(id);
    }
  };
  for (const id of ids) visit(id, new Set());
  return ordered;
}
