import {
  amateurClause,
  CONSISTENCY_CLAUSE,
  SAME_SCENE_CLAUSE,
  STYLE_CONTRACT,
} from './styleContract';

// Every image the site needs, with the prompt that produces it.
//
// Two rules shape this file.
//
// 1. Prompts are composed, not hand-written: STYLE_CONTRACT + subject + shot role. Writing 117
//    prompts by hand would guarantee they drift into 117 unrelated stock photos.
//
// 2. Images are chained, not independent. Each category has one canonical root shot; every other
//    image in that category is generated as an edit against it. Without this, a "before" and an
//    "after" are two separate rolls of the dice -- two similar-ish objects in two different
//    rooms -- and a viewer cannot tell which is which, because there is no relationship between
//    them to read. The chain is what turns a pile of pictures into a comparison.

export type StudioSize = '1024x1024' | '1024x1536' | '1536x1024';

export type StudioImage = {
  /** stable id, also the public path minus /public and .webp */
  id: string;
  path: string;
  group: string;
  label: string;
  prompt: string;
  size: StudioSize;
  /** Real files on disk, always available as references. */
  staticReferences: string[];
  /**
   * Ids of other studio images whose output is used as a reference for this one. Those must be
   * generated first -- the batch runner orders by this, and the API refuses if one is missing.
   */
  dependsOn: string[];
};

// ---------------------------------------------------------------------------
// Subjects
// ---------------------------------------------------------------------------

type Subject = {
  key: string;
  label: string;
  /** what the thing IS -- specific enough that every shot renders the same object */
  description: string;
  /** the room, tidied and properly lit. The "before" happens here too, just untidied. */
  setting: string;
  /** the material worth showing in a macro crop */
  texture: string;
  /** honest, visible wear -- the product's whole promise is that this survives */
  condition: string;
  /**
   * How the "before" photo is badly lit. This has to be per-subject: a mower on a driveway is
   * never lit by a ceiling bulb, and a washer in an alcove is never lit by overcast sky.
   */
  badLight: string;
  /** The everyday mess left in shot, appropriate to where this item actually lives. */
  clutter: string;
  /** reference photos of the real item, when we have them */
  references: string[];
};

// The tufted chair is the site's anchor item and we have real photographs of it, so it stays the
// root of the furniture chain rather than being generated from text.
const CHAIR_REFS = ['/images/hero/main.webp', '/images/hero/alt-1.webp', '/images/hero/alt-3.webp'];

// Categories are chosen on one test: has the visitor personally sold one, or are they about to?
// Not "is it attractive". These five are the things that get listed constantly, photographed
// badly, and sold under value because the photos are the only thing a buyer has to go on.
const SUBJECTS: Record<string, Subject> = {
  furniture: {
    key: 'furniture',
    label: 'Furniture',
    description:
      'a cream upholstered high-back wing accent chair with deep diamond button tufting on the ' +
      'backrest, a subtle tone-on-tone damask weave in the fabric, gently curved wing sides, ' +
      'rolled arms, a single box-edge seat cushion, and four tapered dark espresso-stained wooden legs',
    setting:
      'a corner of an ordinary living room with a soft white wall, warm oak floorboards, a plain ' +
      'pale linen curtain at the window, and a simple low bookshelf against the far wall',
    texture:
      'the tufted upholstery — the button dimples, the woven damask pattern in the fabric, and the ' +
      'piped seam along the arm',
    condition:
      'light honest wear consistent with a used item: faint compression in the seat cushion and ' +
      'slight softening at the front arm edges',
    badLight:
      'a single ceiling bulb burning against weak daylight from a half-drawn curtain, flat and ' +
      'top-down, giving the whole frame a muddy yellow-green cast',
    clutter:
      'a plastic laundry basket, a couple of flattened cardboard boxes leaning against the wall, ' +
      'a power cord trailing across the floorboards, and a coat slung over the bookshelf',
    references: CHAIR_REFS,
  },

  outdoor: {
    key: 'outdoor',
    label: 'Outdoor & powersports',
    description:
      'a red and black riding lawn tractor with a wide mid-mounted cutting deck, a black moulded ' +
      'seat with a low backrest, a black steering wheel, chunky treaded rear tyres and smaller ' +
      'smooth front tyres, and plain unmarked bodywork with no badges or lettering anywhere',
    setting:
      'a plain concrete driveway directly in front of a closed sectional garage door, with a low ' +
      'brick house wall to one side and a narrow strip of mown lawn in the foreground',
    texture:
      'the deep-treaded rear tyre and the steel wheel rim behind it, with the mower deck edge above',
    condition:
      'honest working wear: dried grass clippings packed along the deck edge, dulled and lightly ' +
      'scratched paint on the deck, and scuffing on the footplate where boots have rested',
    badLight:
      'flat colourless overcast at midday with the sun straight overhead, so the whole frame is ' +
      'grey and dull with no direction to the light and no shape on the item',
    clutter:
      'a green wheelie bin, a coiled garden hose dumped on the concrete, a leaf rake and a spade ' +
      'leaning against the house wall, and the garage door rolled half open with storage boxes ' +
      'visible in the dark behind it',
    references: [],
  },

  appliances: {
    key: 'appliances',
    label: 'Appliances',
    description:
      'a white front-loading washing machine with a large round chrome-rimmed glass door, a flat ' +
      'top surface, a recessed detergent drawer, and a plain control panel with unmarked dials ' +
      'and blank buttons carrying no lettering, numbers, or symbols',
    setting:
      'a small domestic laundry alcove with pale grey painted walls, a plain grey tiled floor, a ' +
      'white shelf above holding two folded towels, and a shallow window at the far end',
    texture:
      'the chrome door rim meeting the white enamel front panel, showing the rubber door seal ' +
      'behind the glass',
    condition:
      'honest used-appliance wear: a faint chalky detergent residue in the drawer recess, a light ' +
      'scuff on the lower front panel, and slight dulling of the enamel around the door edge',
    badLight:
      'one bare ceiling bulb in a cramped alcove with the daylight behind the camera blocked, ' +
      'harsh from directly above and dropping straight into shadow below',
    clutter:
      'detergent bottles and a scrunched packet crowded on the machine top, a heap of unfolded ' +
      'laundry on the floor, a mop and bucket wedged in the corner, and a towel hanging off the shelf',
    references: [],
  },

  tools: {
    key: 'tools',
    label: 'Tools & equipment',
    description:
      'a red steel rolling tool chest about chest height, with seven drawers of varying depth, ' +
      'brushed metal drawer pulls, a flat black work surface on top, black rubber-tyred swivel ' +
      'castors, and plain unmarked drawer fronts with no lettering or labels',
    setting:
      'the working corner of an ordinary attached garage with a plain grey breeze-block wall, a ' +
      'sealed concrete floor, and a simple timber workbench alongside',
    texture: 'a single drawer front and its brushed metal pull, with the drawer edges above and below',
    condition:
      'genuine use: small dings and chips in the red paint along the drawer edges, faint grease ' +
      'marks around the pulls, and light surface scratching on the black work top',
    badLight:
      'a single bare fluorescent strip light high on the garage ceiling, cold and flat, throwing ' +
      'a hard shadow straight down under the chest',
    clutter:
      'part-used paint tins stacked on the floor, an open toolbox with its contents spilling out, ' +
      'timber offcuts leaning in the corner, and a bicycle propped against the workbench',
    references: [],
  },

  fitness: {
    key: 'fitness',
    label: 'Exercise & fitness',
    description:
      'an adjustable black steel weight bench with thick black vinyl padding, set beside an ' +
      'upright squat rack holding a knurled steel olympic barbell, with four black rubber-coated ' +
      'weight plates stacked on a small floor rack nearby, all unmarked and free of lettering',
    setting:
      'a cleared corner of an attached garage with interlocking black rubber floor matting, a ' +
      'plain painted breeze-block wall, and a small window high on the wall',
    texture:
      'the knurled grip section of the steel barbell where it sits in the rack, with the rack ' +
      'upright behind it',
    condition:
      'honest used-equipment wear: light rust speckling in the barbell knurling, a scuffed patch ' +
      'and a small crease in the vinyl bench padding, and chipped edges on the rubber plates',
    badLight:
      'one dim bulb on the garage ceiling with the door shut, so the corner is gloomy, the ' +
      'shadows go flat black, and the whole frame reads cold and blue',
    clutter:
      'stacked plastic storage bins along the wall, a folded camping chair, a bulging bin bag of ' +
      'old clothes, and a cardboard box with its flaps open',
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
  brief: (s: Subject) => string;
};

const ROLES: Record<string, Role> = {
  hero: {
    key: 'hero',
    label: 'Hero image',
    size: '1024x1536',
    brief: (s) =>
      `A hero listing photograph of ${s.description}. The setting is ${s.setting}. ` +
      `Three-quarter front view from chest height, level, with the whole item in frame and ` +
      `comfortable even space around it. The item occupies roughly 70% of the frame height and is ` +
      `the unmistakable subject. The place has been tidied and the item is well lit, but it is ` +
      `plainly an ordinary everyday setting rather than a styled set. ` +
      `Keep the item's real condition plainly visible — ${s.condition}. Do not clean it up.`,
  },
  alt: {
    key: 'alt',
    label: 'Alternate angle',
    size: '1024x1024',
    brief: (s) =>
      `The same ${s.description}, in the same room, photographed from the opposite three-quarter ` +
      `angle so the other side is shown. Whole item in frame, framed slightly tighter than the ` +
      `hero shot.`,
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
      `The same ${s.description}, in the same room, photographed from behind and slightly to one ` +
      `side, showing the back and rear construction. Whole item in frame.`,
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
      `A wider photograph of ${s.description}, pulled back to take in more of the setting — ` +
      `${s.setting} — with enough of the surroundings visible to read the item's real scale. ` +
      `The item remains the clear subject.`,
  },
};

// ---------------------------------------------------------------------------
// Prompt assembly
// ---------------------------------------------------------------------------

function compose(brief: string, opts: { consistency?: boolean; sameScene?: boolean } = {}): string {
  const parts = [STYLE_CONTRACT, '', 'THIS SHOT', brief];
  if (opts.consistency) parts.push('', CONSISTENCY_CLAUSE);
  if (opts.sameScene) parts.push('', SAME_SCENE_CLAUSE);
  return parts.join('\n');
}

/**
 * The "before" half of a pair. Always generated from the finished shot, never from scratch --
 * that is what guarantees it is the same item in the same room, which is the claim the whole
 * product rests on.
 */
function beforePhoto(subject: Subject, n: number): string {
  const angles = [
    'standing more or less square in front of it, close enough that the top edge is nearly clipped',
    'standing off to the left and angling the phone down at it',
    'standing well back to the right, so the item sits small and low in the frame',
    'standing behind and to one side, catching it at an awkward half-rear angle',
  ];
  const brief =
    `An ordinary seller's own phone snapshot of ${subject.description}, taken ${angles[(n - 1) % 4]}. ` +
    `The whole item is recognisable even though the photograph is poor. This is the picture that ` +
    `was going to be listed before anything was done about it.`;
  return [
    STYLE_CONTRACT,
    '',
    'THIS SHOT',
    brief,
    '',
    amateurClause(subject.badLight, subject.clutter),
  ].join('\n');
}

// The root of each category's chain. Everything else in the category is an edit against it, so
// one chair, one mower, one washer runs through the entire site.
const rootId = (key: string) => `reveal/${key}/hero`;

let items: StudioImage[] = [];
const add = (i: StudioImage) => items.push(i);

/** A finished shot of a subject, chained to that subject's root image. */
function finished(opts: {
  id: string;
  path: string;
  group: string;
  label: string;
  subject: Subject;
  brief: string;
  size: StudioSize;
}) {
  const isRoot = opts.id === rootId(opts.subject.key);
  add({
    id: opts.id,
    path: opts.path,
    group: opts.group,
    label: opts.label,
    prompt: compose(opts.brief, {
      consistency: opts.subject.references.length > 0,
      sameScene: !isRoot,
    }),
    size: opts.size,
    staticReferences: opts.subject.references,
    dependsOn: isRoot ? [] : [rootId(opts.subject.key)],
  });
}

/** A deliberately bad "before" shot, chained to the same subject's root image. */
function before(opts: {
  id: string;
  path: string;
  group: string;
  label: string;
  subject: Subject;
  n: number;
  size: StudioSize;
}) {
  add({
    id: opts.id,
    path: opts.path,
    group: opts.group,
    label: opts.label,
    prompt: beforePhoto(opts.subject, opts.n),
    size: opts.size,
    staticReferences: [],
    dependsOn: [rootId(opts.subject.key)],
  });
}

// --- reveal/: five categories × (6 finished shots + 4 before photos) ---
for (const subject of Object.values(SUBJECTS)) {
  for (const role of Object.values(ROLES)) {
    finished({
      id: `reveal/${subject.key}/${role.key}`,
      path: `/images/reveal/${subject.key}/${role.key}.webp`,
      group: `Campaign reveal — ${subject.label}`,
      label: role.label,
      subject,
      brief: role.brief(subject),
      size: role.size,
    });
  }
  for (let n = 1; n <= 4; n++) {
    before({
      id: `reveal/${subject.key}/source-${n}`,
      path: `/images/reveal/${subject.key}/source-${n}.webp`,
      group: `Campaign reveal — ${subject.label}`,
      label: `Before photo ${n}`,
      subject,
      n,
      size: '1024x1536',
    });
  }
}

// --- examples/: before/after proof for the four categories the section shows ---
const EXAMPLE_KEYS = ['furniture', 'outdoor', 'appliances', 'tools'] as const;
for (const key of EXAMPLE_KEYS) {
  const subject = SUBJECTS[key];
  finished({
    id: `examples/${key}-result-hero`,
    path: `/images/examples/${key}-result-hero.webp`,
    group: `Examples — ${subject.label}`,
    label: 'Result hero',
    subject,
    brief: ROLES.hero.brief(subject),
    size: '1536x1024',
  });
  (['alt', 'texture', 'rear', 'context'] as const).forEach((r, i) => {
    finished({
      id: `examples/${key}-result-${i + 1}`,
      path: `/images/examples/${key}-result-${i + 1}.webp`,
      group: `Examples — ${subject.label}`,
      label: `Result ${i + 1} (${ROLES[r].label})`,
      subject,
      brief: ROLES[r].brief(subject),
      size: '1024x1024',
    });
  });
  for (let n = 1; n <= 4; n++) {
    before({
      id: `examples/${key}-source-${n}`,
      path: `/images/examples/${key}-source-${n}.webp`,
      group: `Examples — ${subject.label}`,
      label: `Before photo ${n}`,
      subject,
      n,
      size: '1024x1024',
    });
  }
}

// --- why/: the marketplace listing card ---
const chair = SUBJECTS.furniture;
finished({
  id: 'why/listing-hero',
  path: '/images/why/listing-hero.webp',
  group: 'Why it matters',
  label: 'Listing card hero',
  subject: chair,
  brief: ROLES.hero.brief(chair),
  size: '1024x1536',
});
(['alt', 'texture', 'rear', 'context'] as const).forEach((r, i) => {
  finished({
    id: `why/thumb-${i + 1}`,
    path: `/images/why/thumb-${i + 1}.webp`,
    group: 'Why it matters',
    label: `Listing thumbnail ${i + 1}`,
    subject: chair,
    brief: ROLES[r].brief(chair),
    size: '1024x1024',
  });
});
(['texture', 'condition', 'alt', 'context'] as const).forEach((r, i) => {
  finished({
    id: `why/detail-${i + 1}`,
    path: `/images/why/detail-${i + 1}.webp`,
    group: 'Why it matters',
    label: `Benefit detail ${i + 1}`,
    subject: chair,
    brief: ROLES[r].brief(chair),
    size: '1536x1024',
  });
});

// --- how/: the three-step flow ---
for (let n = 1; n <= 4; n++) {
  before({
    id: `how/source-${n}`,
    path: `/images/how/source-${n}.webp`,
    group: 'How it works',
    label: `Before photo ${n}`,
    subject: chair,
    n,
    size: '1024x1536',
  });
}
finished({
  id: 'how/result-hero',
  path: '/images/how/result-hero.webp',
  group: 'How it works',
  label: 'Result hero',
  subject: chair,
  brief: ROLES.hero.brief(chair),
  size: '1536x1024',
});
(['alt', 'texture', 'rear', 'condition'] as const).forEach((r, i) => {
  finished({
    id: `how/result-${i + 1}`,
    path: `/images/how/result-${i + 1}.webp`,
    group: 'How it works',
    label: `Result ${i + 1} (${ROLES[r].label})`,
    subject: chair,
    brief: ROLES[r].brief(chair),
    size: '1024x1024',
  });
});

// --- trust/: the inspection section ---
finished({
  id: 'trust/inspect',
  path: '/images/trust/inspect.webp',
  group: 'Trust',
  label: 'Inspection hero',
  subject: chair,
  brief:
    `A hero listing photograph of ${chair.description}. The setting is ${chair.setting}. ` +
    `Three-quarter front view from chest height, level, with the whole item in frame and ` +
    `generous even space around all four sides — annotation labels will be placed over the ` +
    `surrounding room, so keep the margins clean and uncluttered. ` +
    `Keep the chair's real condition plainly visible — ${chair.condition}.`,
  size: '1024x1536',
});
finished({
  id: 'trust/detail-1',
  path: '/images/trust/detail-1.webp',
  group: 'Trust',
  label: 'Texture proof crop',
  subject: chair,
  brief: ROLES.texture.brief(chair),
  size: '1536x1024',
});
finished({
  id: 'trust/detail-2',
  path: '/images/trust/detail-2.webp',
  group: 'Trust',
  label: 'Wear proof crop',
  subject: chair,
  brief: ROLES.condition.brief(chair),
  size: '1536x1024',
});

// --- pricing/: coverage preview tiles, one per category ---
Object.values(SUBJECTS).forEach((s, i) => {
  finished({
    id: `pricing/tile-${i + 1}`,
    path: `/images/pricing/tile-${i + 1}.webp`,
    group: 'Pricing',
    label: `Coverage tile ${i + 1} (${s.label})`,
    subject: s,
    brief: ROLES.hero.brief(s),
    size: '1024x1024',
  });
});

// --- cta/: the fanned set above the dark upload surface ---
(['context', 'texture', 'hero', 'alt', 'rear'] as const).forEach((r, i) => {
  finished({
    id: `cta/card-${i + 1}`,
    path: `/images/cta/card-${i + 1}.webp`,
    group: 'Final CTA',
    label: `Fan card ${i + 1} (${ROLES[r].label})`,
    subject: chair,
    brief: ROLES[r].brief(chair),
    size: '1024x1536',
  });
});

export const STUDIO_MANIFEST: StudioImage[] = items;

export const STUDIO_GROUPS = Array.from(new Set(STUDIO_MANIFEST.map((i) => i.group)));

export function studioImageById(id: string): StudioImage | undefined {
  return STUDIO_MANIFEST.find((i) => i.id === id);
}

/** Public paths of every reference this image needs, real files and chained outputs alike. */
export function resolveReferences(image: StudioImage): string[] {
  const chained = image.dependsOn
    .map((id) => studioImageById(id)?.path)
    .filter((p): p is string => Boolean(p));
  return [...image.staticReferences, ...chained];
}

/**
 * Orders a batch so an image's dependencies are generated before it. Without this, "generate all
 * missing" would fire the before photos before the finished shot they are derived from and every
 * one of them would fail.
 */
export function studioBatchOrder(ids: string[]): string[] {
  const wanted = new Set(ids);
  const ordered: string[] = [];
  const placed = new Set<string>();

  const visit = (id: string, seen: Set<string>) => {
    if (placed.has(id) || seen.has(id)) return;
    seen.add(id);
    const image = studioImageById(id);
    if (!image) return;
    for (const dep of image.dependsOn) {
      if (wanted.has(dep)) visit(dep, seen);
    }
    if (!placed.has(id)) {
      placed.add(id);
      ordered.push(id);
    }
  };

  for (const id of ids) visit(id, new Set());
  return ordered;
}
