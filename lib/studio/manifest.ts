import { AMATEUR_CLAUSE, CONSISTENCY_CLAUSE, STYLE_CONTRACT } from './styleContract';

// Every image the site needs, with the prompt that produces it.
//
// Prompts are composed rather than hand-written: STYLE_CONTRACT + subject + shot role. Hand-
// writing 117 prompts would guarantee they drift apart; composing them guarantees they don't.

export type StudioSize = '1024x1024' | '1024x1536' | '1536x1024';

export type StudioImage = {
  /** stable id, also the public path minus /public and .webp */
  id: string;
  path: string;
  group: string;
  label: string;
  prompt: string;
  size: StudioSize;
  /**
   * Reference images (public paths) passed to the edit endpoint so the generated item matches
   * one already on the site. Empty means pure text-to-image.
   */
  references: string[];
};

// ---------------------------------------------------------------------------
// Subjects
// ---------------------------------------------------------------------------

type Subject = {
  key: string;
  label: string;
  /** what the thing IS -- specific enough that every shot renders the same object */
  description: string;
  /** where it plausibly lives */
  setting: string;
  /** the material worth showing in a macro crop */
  texture: string;
  /** honest, visible wear -- the product's whole promise is that this survives */
  condition: string;
  /** reference photos of the real item, when we have them */
  references: string[];
};

// The tufted chair is the site's anchor item and we have real photos of it, so furniture shots
// are generated as edits against those references rather than from text alone. Everything else
// is text-to-image.
const CHAIR_REFS = ['/images/hero/main.webp', '/images/hero/alt-1.webp', '/images/hero/alt-3.webp'];

const SUBJECTS: Record<string, Subject> = {
  furniture: {
    key: 'furniture',
    label: 'Furniture',
    description:
      'a cream upholstered high-back wing accent chair with deep diamond button tufting on the ' +
      'backrest, a subtle tone-on-tone damask weave in the fabric, gently curved wing sides, ' +
      'rolled arms, a single box-edge seat cushion, and four tapered dark espresso-stained wooden legs',
    setting:
      'a bright, simply furnished living room corner with a soft white wall, warm oak floorboards, ' +
      'and a pale linen curtain at the window',
    texture:
      'the tufted upholstery — the button dimples, the woven damask pattern in the fabric, and the ' +
      'piped seam along the arm',
    condition:
      'light honest wear consistent with a used item: faint compression in the seat cushion and ' +
      'slight softening at the front arm edges',
    references: CHAIR_REFS,
  },
  vehicles: {
    key: 'vehicles',
    label: 'Vehicles',
    description:
      'a silver-grey mid-size five-door family SUV, roughly ten years old, with alloy wheels, ' +
      'body-coloured mirrors, roof rails, and clean unbadged bodywork',
    setting:
      'a residential driveway in front of a plain garage door, with a strip of lawn and mature ' +
      'trees behind, under bright overcast daylight',
    texture:
      'the front alloy wheel and tyre sidewall, with the lower door panel and wheel arch behind it',
    condition:
      'honest used-car wear: a few fine paint swirls catching the light and light stone-chipping ' +
      'along the lower front bumper',
    references: [],
  },
  tools: {
    key: 'tools',
    label: 'Tools',
    description:
      'a yellow and black cordless power drill with a keyless chuck, a clip-in battery pack, and ' +
      'a rubberised grip, alongside its matching spare battery',
    setting:
      'a tidy home workshop bench with a scuffed natural timber worktop and a plain grey wall behind',
    texture: 'the rubberised grip and the metal chuck jaws',
    condition: 'genuine use: light scuffing on the housing and faint dust in the grip texture',
    references: [],
  },
  plants: {
    key: 'plants',
    label: 'Plants',
    description:
      'a healthy mature Monstera deliciosa about waist height, with large glossy fenestrated ' +
      'leaves on arching stems, planted in a plain ribbed cream ceramic pot',
    setting:
      'beside a bright window on warm oak floorboards against a soft white wall',
    texture: 'a single large leaf, showing the fenestration edges and raised leaf veins',
    condition:
      'a real living plant rather than a perfect one: one slightly yellowing lower leaf and a ' +
      'small nick in one leaf edge',
    references: [],
  },
  collectibles: {
    key: 'collectibles',
    label: 'Collectibles',
    description:
      'a vintage 1960s rangefinder film camera in chrome and black leatherette, with a fixed lens, ' +
      'a knurled focus ring, and a top-plate winding lever',
    setting:
      'on a walnut tabletop against a soft neutral wall, with a plain linen cloth beneath it',
    texture: 'the knurled metal focus ring and the leatherette body covering',
    condition:
      'age-appropriate wear: fine brassing on the chrome edges and slight shine on the leatherette ' +
      'where it has been handled',
    references: [],
  },
};

// ---------------------------------------------------------------------------
// Shot roles
// ---------------------------------------------------------------------------

type Role = {
  key: string;
  label: string;
  size: StudioSize;
  /** builds the shot-specific half of the prompt */
  brief: (s: Subject) => string;
};

const ROLES: Record<string, Role> = {
  hero: {
    key: 'hero',
    label: 'Hero image',
    size: '1024x1536',
    brief: (s) =>
      `A hero listing photograph of ${s.description}, positioned in ${s.setting}. ` +
      `Three-quarter front view, the whole item in frame with comfortable space around it. ` +
      `The item occupies roughly 70% of the frame height and is the unmistakable subject. ` +
      `Keep the item's real condition plainly visible — ${s.condition}. Do not clean it up.`,
  },
  alt: {
    key: 'alt',
    label: 'Alternate angle',
    size: '1024x1024',
    brief: (s) =>
      `The same ${s.description} in the same room, photographed from the opposite three-quarter ` +
      `angle so the other side is shown. Whole item in frame, slightly tighter than the hero.`,
  },
  texture: {
    key: 'texture',
    label: 'Texture detail',
    size: '1024x1024',
    brief: (s) =>
      `A close macro detail photograph of ${s.texture} on ${s.description}. ` +
      `Fills the frame. Raking side light so the material's weave, grain, and relief are clearly ` +
      `legible. The surrounding room is out of frame entirely.`,
  },
  rear: {
    key: 'rear',
    label: 'Rear angle',
    size: '1024x1024',
    brief: (s) =>
      `The same ${s.description} photographed from behind in the same room, showing the back and ` +
      `rear construction. Whole item in frame.`,
  },
  condition: {
    key: 'condition',
    label: 'Condition view',
    size: '1024x1024',
    brief: (s) =>
      `An honest close condition photograph of ${s.description}, framed tightly on the area that ` +
      `shows its wear — ${s.condition}. Even, neutral light that reveals the wear plainly rather ` +
      `than flattering it away. This image exists to disclose, not to sell.`,
  },
  context: {
    key: 'context',
    label: 'Context shot',
    size: '1536x1024',
    brief: (s) =>
      `A wider room photograph showing ${s.description} in use within ${s.setting}, with enough ` +
      `surrounding room visible to read the item's real scale. The item remains the clear subject.`,
  },
};

// ---------------------------------------------------------------------------
// Prompt assembly
// ---------------------------------------------------------------------------

function compose(subject: Subject, brief: string, opts?: { amateur?: boolean }): string {
  const parts = [STYLE_CONTRACT, '', 'THIS SHOT', brief];
  if (opts?.amateur) parts.push('', AMATEUR_CLAUSE);
  if (subject.references.length && !opts?.amateur) parts.push('', CONSISTENCY_CLAUSE);
  return parts.join('\n');
}

function sourcePhoto(subject: Subject, n: number, size: StudioSize = '1024x1536'): string {
  const angles = [
    'a straight-on front view',
    'a three-quarter view from the left',
    'a view from the right side',
    'a view from behind and slightly to one side',
  ];
  return compose(
    subject,
    `An ordinary seller's own phone snapshot of ${subject.description}, ${angles[(n - 1) % 4]}, ` +
      `taken before it was properly photographed. The whole item is visible.`,
    { amateur: true },
  );
}

let items: StudioImage[] = [];
const add = (i: StudioImage) => items.push(i);

// --- reveal/: five categories × (6 finished shots + 4 source photos) ---
for (const subject of Object.values(SUBJECTS)) {
  for (const role of Object.values(ROLES)) {
    add({
      id: `reveal/${subject.key}/${role.key}`,
      path: `/images/reveal/${subject.key}/${role.key}.webp`,
      group: `Campaign reveal — ${subject.label}`,
      label: role.label,
      prompt: compose(subject, role.brief(subject)),
      size: role.size,
      references: subject.references,
    });
  }
  for (let n = 1; n <= 4; n++) {
    add({
      id: `reveal/${subject.key}/source-${n}`,
      path: `/images/reveal/${subject.key}/source-${n}.webp`,
      group: `Campaign reveal — ${subject.label}`,
      label: `Source photo ${n}`,
      prompt: sourcePhoto(subject, n),
      size: '1024x1536',
      references: [],
    });
  }
}

// --- examples/: four categories, before/after proof ---
const EXAMPLE_KEYS = ['furniture', 'vehicles', 'plants', 'tools'] as const;
for (const key of EXAMPLE_KEYS) {
  const subject = SUBJECTS[key];
  add({
    id: `examples/${key}-result-hero`,
    path: `/images/examples/${key}-result-hero.webp`,
    group: `Examples — ${subject.label}`,
    label: 'Result hero',
    prompt: compose(subject, ROLES.hero.brief(subject)),
    size: '1536x1024',
    references: subject.references,
  });
  const resultRoles = ['alt', 'texture', 'rear', 'context'];
  resultRoles.forEach((r, i) => {
    add({
      id: `examples/${key}-result-${i + 1}`,
      path: `/images/examples/${key}-result-${i + 1}.webp`,
      group: `Examples — ${subject.label}`,
      label: `Result ${i + 1} (${ROLES[r].label})`,
      prompt: compose(subject, ROLES[r].brief(subject)),
      size: '1024x1024',
      references: subject.references,
    });
  });
  for (let n = 1; n <= 4; n++) {
    add({
      id: `examples/${key}-source-${n}`,
      path: `/images/examples/${key}-source-${n}.webp`,
      group: `Examples — ${subject.label}`,
      label: `Source photo ${n}`,
      prompt: sourcePhoto(subject, n),
      size: '1024x1024',
      references: [],
    });
  }
}

// --- why/: the marketplace listing card ---
const chair = SUBJECTS.furniture;
add({
  id: 'why/listing-hero',
  path: '/images/why/listing-hero.webp',
  group: 'Why it matters',
  label: 'Listing card hero',
  prompt: compose(chair, ROLES.hero.brief(chair)),
  size: '1024x1536',
  references: chair.references,
});
(['alt', 'texture', 'rear', 'context'] as const).forEach((r, i) => {
  add({
    id: `why/thumb-${i + 1}`,
    path: `/images/why/thumb-${i + 1}.webp`,
    group: 'Why it matters',
    label: `Listing thumbnail ${i + 1}`,
    prompt: compose(chair, ROLES[r].brief(chair)),
    size: '1024x1024',
    references: chair.references,
  });
});
(['texture', 'condition', 'alt', 'context'] as const).forEach((r, i) => {
  add({
    id: `why/detail-${i + 1}`,
    path: `/images/why/detail-${i + 1}.webp`,
    group: 'Why it matters',
    label: `Benefit detail ${i + 1}`,
    prompt: compose(chair, ROLES[r].brief(chair)),
    size: '1536x1024',
    references: chair.references,
  });
});

// --- how/: the three-step flow ---
for (let n = 1; n <= 4; n++) {
  add({
    id: `how/source-${n}`,
    path: `/images/how/source-${n}.webp`,
    group: 'How it works',
    label: `Source photo ${n}`,
    prompt: sourcePhoto(chair, n),
    size: '1024x1536',
    references: [],
  });
}
add({
  id: 'how/result-hero',
  path: '/images/how/result-hero.webp',
  group: 'How it works',
  label: 'Result hero',
  prompt: compose(chair, ROLES.hero.brief(chair)),
  size: '1536x1024',
  references: chair.references,
});
(['alt', 'texture', 'rear', 'condition'] as const).forEach((r, i) => {
  add({
    id: `how/result-${i + 1}`,
    path: `/images/how/result-${i + 1}.webp`,
    group: 'How it works',
    label: `Result ${i + 1} (${ROLES[r].label})`,
    prompt: compose(chair, ROLES[r].brief(chair)),
    size: '1024x1024',
    references: chair.references,
  });
});

// --- trust/: the inspection section ---
add({
  id: 'trust/inspect',
  path: '/images/trust/inspect.webp',
  group: 'Trust',
  label: 'Inspection hero',
  prompt: compose(
    chair,
    `A hero listing photograph of ${chair.description} in ${chair.setting}. ` +
      `Three-quarter front view with the whole item in frame and generous even space around all ` +
      `four sides — annotation labels will be placed over the surrounding room, so keep the ` +
      `margins clean and uncluttered. Keep the chair's real condition plainly visible — ` +
      `${chair.condition}.`,
  ),
  size: '1024x1536',
  references: chair.references,
});
add({
  id: 'trust/detail-1',
  path: '/images/trust/detail-1.webp',
  group: 'Trust',
  label: 'Texture proof crop',
  prompt: compose(chair, ROLES.texture.brief(chair)),
  size: '1536x1024',
  references: chair.references,
});
add({
  id: 'trust/detail-2',
  path: '/images/trust/detail-2.webp',
  group: 'Trust',
  label: 'Wear proof crop',
  prompt: compose(chair, ROLES.condition.brief(chair)),
  size: '1536x1024',
  references: chair.references,
});

// --- pricing/: coverage preview tiles, one per category ---
(['furniture', 'vehicles', 'tools', 'plants', 'collectibles'] as const).forEach((key, i) => {
  const s = SUBJECTS[key];
  add({
    id: `pricing/tile-${i + 1}`,
    path: `/images/pricing/tile-${i + 1}.webp`,
    group: 'Pricing',
    label: `Coverage tile ${i + 1} (${s.label})`,
    prompt: compose(s, ROLES.hero.brief(s)),
    size: '1024x1024',
    references: s.references,
  });
});

// --- cta/: the fanned set above the dark upload surface ---
(['context', 'texture', 'hero', 'alt', 'rear'] as const).forEach((r, i) => {
  add({
    id: `cta/card-${i + 1}`,
    path: `/images/cta/card-${i + 1}.webp`,
    group: 'Final CTA',
    label: `Fan card ${i + 1} (${ROLES[r].label})`,
    prompt: compose(chair, ROLES[r].brief(chair)),
    size: '1024x1536',
    references: chair.references,
  });
});

export const STUDIO_MANIFEST: StudioImage[] = items;

export const STUDIO_GROUPS = Array.from(new Set(STUDIO_MANIFEST.map((i) => i.group)));

export function studioImageById(id: string): StudioImage | undefined {
  return STUDIO_MANIFEST.find((i) => i.id === id);
}
