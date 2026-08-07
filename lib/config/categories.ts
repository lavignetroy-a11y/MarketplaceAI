// The item categories the site shows, in one place.
//
// These keys are load-bearing: they are literally the folder names under public/images/reveal/
// and the filename prefixes under public/images/examples/. The marketing sections build image
// paths from them and the studio manifest generates into them, so when the two disagree the
// site silently renders blank tiles while the generator fills folders nobody reads. Keeping one
// list means changing a category is one edit rather than three that must be made together.
//
// Chosen on one test: has the visitor personally sold one, or are they about to? These are the
// things that get listed constantly, photographed badly, and sold under value because the
// photos are all a buyer has to go on.

export type CategoryKey = 'furniture' | 'outdoor' | 'appliances' | 'tools' | 'fitness';

export type ItemCategory = {
  key: CategoryKey;
  /** short label for the reveal tabs */
  label: string;
  /** longer label where there's room for it */
  longLabel: string;
  /** the specific example item, named on the Examples tab */
  item: string;
};

export const ITEM_CATEGORIES: readonly ItemCategory[] = [
  {
    key: 'furniture',
    label: 'Furniture',
    longLabel: 'Furniture',
    item: 'Upholstered accent chair',
  },
  {
    key: 'outdoor',
    label: 'Outdoor',
    longLabel: 'Outdoor & powersports',
    item: 'Riding lawn tractor',
  },
  {
    key: 'appliances',
    label: 'Appliances',
    longLabel: 'Appliances',
    item: 'Front-loading washing machine',
  },
  {
    key: 'tools',
    label: 'Tools',
    longLabel: 'Tools & equipment',
    item: 'Rolling tool chest',
  },
  {
    key: 'fitness',
    label: 'Fitness',
    longLabel: 'Exercise & fitness',
    item: 'Weight bench and barbell set',
  },
] as const;

/**
 * The subset the Examples section shows. It is a four-tab layout, and these are the four with
 * the most dramatic before/after — every category still appears in the reveal section.
 */
export const EXAMPLE_CATEGORY_KEYS: readonly CategoryKey[] = [
  'furniture',
  'outdoor',
  'appliances',
  'tools',
] as const;

export const EXAMPLE_CATEGORIES: readonly ItemCategory[] = ITEM_CATEGORIES.filter((c) =>
  EXAMPLE_CATEGORY_KEYS.includes(c.key),
);

/** Source photos and finished images shown per example. Both match what the manifest generates. */
export const EXAMPLE_SOURCE_COUNT = 4;
export const EXAMPLE_RESULT_COUNT = 5;
