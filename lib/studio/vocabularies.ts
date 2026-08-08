// How a person actually photographs a thing depends on what the thing is.
//
// The first version of this used one shot list for everything -- hero, alt, texture, rear,
// condition, context -- applied to all five categories. On the chair it looked fine, because a
// chair is the one item you genuinely can pick up and spin. Everywhere else it produced
// nonsense: a "rear angle" of a washing machine wedged in an alcove, a mower shot "from the
// opposite three-quarter angle" as though someone had dragged it around the driveway.
//
// So shot lists are keyed to how an object BEHAVES, not to the category it's filed under:
//
//   freestanding  light enough to move and turn      chair, dresser, bookshelf
//   appliance     heavy, stays put, opens            washer, fridge, dryer
//   cabinet       stays put, drawers and doors       tool chest, sideboard
//   rideable      walked around, has controls        mower, motorcycle, ATV
//   rig           assembled, adjusts, has parts      weight bench, rack, treadmill
//
// Two things follow from this. A freestanding item gets a rear view because you can turn it
// round; an appliance gets its door open instead, because that is the shot a buyer actually
// wants and the one a seller can actually take. And a rideable gets four corners rather than
// "the other side", because that is literally what someone does -- they walk around it.
//
// Each vocabulary asks the item for the nouns it needs (what its interior is, what its controls
// look like), so the shot stays specific without every item needing a hand-written list.

export type ShotSize = '1024x1024' | '1024x1536' | '1536x1024';

/** The item facts a shot brief can draw on. Kept narrow on purpose. */
export type ItemFacts = {
  /** the full physical description, used as the subject of every sentence */
  description: string;
  /** where it lives, tidied */
  setting: string;
  /** the surface worth a macro crop */
  texture: string;
  /** honest visible wear */
  condition: string;
  /** what opens: door, lid, drawers -- appliance/cabinet only */
  opening?: string;
  /** what's inside when it opens */
  interior?: string;
  /** the controls, unmarked */
  controls?: string;
  /** the part a buyer inspects hardest */
  scrutiny?: string;
};

/** Descriptions are noun phrases, so they need a capital when they open a sentence. */
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export type Shot = {
  key: string;
  label: string;
  size: ShotSize;
  brief: (f: ItemFacts) => string;
};

const hero = (extra = ''): Shot => ({
  key: 'hero',
  label: 'Hero image',
  size: '1024x1536',
  brief: (f) =>
    `A hero listing photograph of ${f.description}. The setting is ${f.setting}. ` +
    `Three-quarter front view from chest height, level, the whole item in frame with ` +
    `comfortable even space around it, filling roughly 70% of the frame height. The place has ` +
    `been tidied and the item is well lit, but it is plainly an ordinary everyday setting ` +
    `rather than a styled set. ${extra}` +
    `Keep the item's real condition plainly visible — ${f.condition}. Do not clean it up.`,
});

const texture: Shot = {
  key: 'texture',
  label: 'Texture detail',
  size: '1024x1024',
  brief: (f) =>
    `A close macro detail photograph of ${f.texture} on ${f.description}. Fills the frame. ` +
    `Raking side light so the material's weave, grain, and relief are clearly legible. The ` +
    `surrounding room is out of frame entirely.`,
};

const condition: Shot = {
  key: 'condition',
  label: 'Condition view',
  size: '1024x1024',
  brief: (f) =>
    `An honest close condition photograph of ${f.description}, framed tightly on the area that ` +
    `shows its wear — ${f.condition}. Even, neutral light that reveals the wear plainly rather ` +
    `than flattering it away. This image exists to disclose, not to sell.`,
};

const context: Shot = {
  key: 'context',
  label: 'Context shot',
  size: '1536x1024',
  brief: (f) =>
    `A wider photograph of ${f.description}, pulled back to take in more of the setting — ` +
    `${f.setting} — with enough of the surroundings visible to read the item's real scale. ` +
    `The item remains the clear subject.`,
};


const WALK_AROUND = `
HOW THIS ANGLE IS REACHED — read this literally.
The machine has not moved. It has not been turned, reversed, or repositioned by so much as a
degree; it is parked exactly where the previous photograph left it, on the same ground, facing
the same way. The PHOTOGRAPHER has walked to a different corner of it and taken another picture.
Two consequences must both be visible, and getting them wrong is what makes a set look faked:
the background changes, because the camera is now pointing a different way across the same
place — a wall that was behind the machine may now be behind the photographer, and vice versa.
And the machine presents a different face to the lens purely because the lens moved around it.
Never render this as the same view mirrored, and never render the machine rotated in place.
`.trim();

// --- freestanding: you can pick it up and turn it round -----------------------------------

const FREESTANDING: Shot[] = [
  hero(),
  {
    key: 'side',
    label: 'Side profile',
    size: '1024x1024',
    brief: (f) =>
      `${cap(f.description)}, in the same place, photographed square from the side so the full ` +
      `profile and depth read clearly. Whole item in frame.`,
  },
  {
    key: 'rear',
    label: 'Rear view',
    size: '1024x1024',
    brief: (f) =>
      `${cap(f.description)}, turned round in the same place and photographed from behind, showing ` +
      `the back and how it is built. Whole item in frame. This is a shot a seller can take ` +
      `because the item is light enough to move.`,
  },
  texture,
  condition,
  context,
];

// --- appliance: heavy, stays where it is, but it opens -------------------------------------

const APPLIANCE: Shot[] = [
  hero('The unit stays exactly where it is installed and is photographed from the front. '),
  {
    key: 'open',
    label: 'Open',
    size: '1024x1536',
    brief: (f) =>
      `${cap(f.description)}, in place, with ${f.opening ?? 'the door'} standing fully open. Shot ` +
      `straight on from the front at chest height so both the opening and the inside are ` +
      `visible. The unit is not moved.`,
  },
  {
    key: 'interior',
    label: 'Interior',
    size: '1024x1024',
    brief: (f) =>
      `A close photograph looking into ${f.interior ?? 'the inside of the unit'} on ` +
      `${f.description}, taken from just outside the opening. The inside fills the frame. ` +
      `Light falls in from the front, as it would from the room.`,
  },
  {
    key: 'controls',
    label: 'Controls',
    size: '1024x1024',
    brief: (f) =>
      `A close photograph of ${f.controls ?? 'the control panel'} on ${f.description}, shot ` +
      `straight on and filling the frame. Every dial, button, and marking area is completely ` +
      `blank — no lettering, numbers, symbols, or icons anywhere.`,
  },
  {
    key: 'scrutiny',
    label: 'Inspection detail',
    size: '1024x1024',
    brief: (f) =>
      `An honest close photograph of ${f.scrutiny ?? f.texture} on ${f.description} — the part ` +
      `a careful buyer checks first. Even, neutral light showing it exactly as it is, including ` +
      `${f.condition}.`,
  },
  context,
];

// --- cabinet: stays put, drawers and doors are the story -----------------------------------

const CABINET: Shot[] = [
  hero('It stands against the wall where it lives, with everything closed. '),
  {
    key: 'open',
    label: 'Drawers open',
    size: '1024x1536',
    brief: (f) =>
      `${cap(f.description)}, in the same place, with ${f.opening ?? 'two or three drawers'} pulled ` +
      `open at staggered depths so the runners and the depth of each are visible. Shot from the ` +
      `front, slightly above chest height so the openings read.`,
  },
  {
    key: 'interior',
    label: 'Inside a drawer',
    size: '1024x1024',
    brief: (f) =>
      `A close photograph looking down into one open drawer on ${f.description}, showing ` +
      `${f.interior ?? 'the empty drawer, its liner, and the runners at each side'}. The drawer ` +
      `fills the frame.`,
  },
  {
    key: 'corner',
    label: 'Corner angle',
    size: '1024x1024',
    brief: (f) =>
      `${cap(f.description)}, photographed from a tight corner angle, close to one front edge, so the ` +
      `depth of the unit and the meeting of front and side faces are both visible.`,
  },
  texture,
  condition,
];

// --- rideable: you walk around it ----------------------------------------------------------

const RIDEABLE: Shot[] = [
  hero('Taken standing at the front-left corner, the way someone starts a walk-around. '),
  {
    key: 'front-right',
    label: 'Front-right corner',
    size: '1024x1024',
    brief: (f) =>
      `${cap(f.description)}, photographed from its front-right corner. The photographer has ` +
      `walked round from the front-left corner to the front-right one.\n\n${WALK_AROUND}`,
  },
  {
    key: 'rear-left',
    label: 'Rear-left corner',
    size: '1024x1024',
    brief: (f) =>
      `${cap(f.description)}, photographed from its rear-left corner, continuing the walk-around. ` +
      `The back of the machine is the subject now.\n\n${WALK_AROUND}`,
  },
  {
    key: 'controls',
    label: 'Seat and controls',
    size: '1024x1024',
    brief: (f) =>
      `A photograph taken standing over the machine and looking down at ` +
      `${f.controls ?? 'the seat, steering, and controls'} on ${f.description}, the way someone ` +
      `photographs the part they will actually sit at. Every dial, label plate, and switch face ` +
      `is completely blank — no lettering, numbers, or symbols.`,
  },
  {
    key: 'scrutiny',
    label: 'Mechanical detail',
    size: '1024x1024',
    brief: (f) =>
      `A low close photograph of ${f.scrutiny ?? f.texture} on ${f.description}, taken by ` +
      `crouching beside the machine. This is the shot that answers whether it has been looked ` +
      `after: ${f.condition} is plainly visible.`,
  },
  context,
];

// --- rig: assembled, adjusts, comes apart --------------------------------------------------

const RIG: Shot[] = [
  hero('Shown assembled and set up as it would be used. '),
  {
    key: 'adjusted',
    label: 'Adjusted position',
    size: '1024x1024',
    brief: (f) =>
      `${cap(f.description)}, in the same place, reconfigured — ${f.opening ?? 'adjusted to a ' +
      'different position'} — so a buyer can see it actually moves and how. Whole item in frame.`,
  },
  {
    key: 'grip',
    label: 'Contact surface',
    size: '1024x1024',
    brief: (f) =>
      `A close macro photograph of ${f.texture} on ${f.description}, the surface a user actually ` +
      `grips or sits on. Fills the frame, raking side light so the texture and any wear read.`,
  },
  {
    key: 'parts',
    label: 'Components',
    size: '1024x1024',
    brief: (f) =>
      `A close photograph of ${f.interior ?? 'the separate components that come with it'}, ` +
      `arranged on the floor beside ${f.description} so a buyer can count what is included.`,
  },
  condition,
  context,
];

export const VOCABULARIES = {
  freestanding: FREESTANDING,
  appliance: APPLIANCE,
  cabinet: CABINET,
  rideable: RIDEABLE,
  rig: RIG,
} as const;

export type VocabularyKey = keyof typeof VOCABULARIES;

/** How a seller frames a bad phone photo depends on whether they can move the thing. */
export const BEFORE_ANGLES: Record<VocabularyKey, string[]> = {
  freestanding: [
    'standing more or less square in front of it, close enough that the top edge is nearly clipped',
    'standing off to one side and angling the phone down at it',
    'standing well back, so it sits small and low in the frame',
    'from behind and to one side, at an awkward half-rear angle',
  ],
  appliance: [
    'standing square in front of it in the cramped space, phone angled down',
    'from the doorway, so the frame is half doorway and the unit sits off to one side',
    'close in and slightly to one side, too near to fit the whole unit comfortably',
    'with the door hanging half open, taken without thinking about it',
  ],
  cabinet: [
    'standing square in front of it, phone angled down so the top edge converges',
    'from one side, at a sharp angle that squashes the front face',
    'standing back across the garage, so it sits small among the clutter',
    'close in on one corner, cutting off the far side',
  ],
  rideable: [
    'standing at one front corner, phone angled down so it looks squat',
    'from directly in front, too close, so the near end looms and the far end shrinks',
    'from well back, so it sits small in a wide frame of driveway and bins',
    'from behind at a sharp angle, half of it out of frame',
  ],
  rig: [
    'standing over it, phone angled steeply down so nothing reads at its true size',
    'from one end, so the length of it is completely lost',
    'from across the garage, small in frame among the storage bins',
    'close in on the middle, with both ends cut off by the frame edge',
  ],
};
