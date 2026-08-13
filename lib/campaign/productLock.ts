// The product lock: what keeps it the SAME OBJECT from shot to shot.
//
// THE FAILURE THIS ANSWERS
//
// A sectional came back with the wrong number of sections and a warmer colour than the real one.
// A washer and dryer pair came back with a different control panel in every frame, rust in one
// image and none in the next, and -- in the last shot of the set -- a front-loading washer with a
// round glass door, when the machine being sold is a top-loader with a lid.
//
// Every one of those images was individually plausible. None of them was the thing being sold.
//
// WHY IT HAPPENS, WHICH IS STRUCTURAL AND NOT BAD LUCK
//
// The scene lock taught the lesson and only half of it was applied. An edit model handed several
// reference photographs averages them; it does not treat one as a specification to match. Text
// transfers where a reference image does not. That is why writing the room down fixed the room.
//
// The item never got the same treatment. The only thing carrying it between shots was
// SceneLock.item -- one free-text paragraph, read out of the GENERATED HERO, so the hero's own
// drift was propagated faithfully to everything behind it.
//
// WHY THIS IS ITS OWN CALL AND NOT A FIELD ON THE PLAN
//
// It was a field on the planning schema first, and it came back limp: "standard rectangular
// shape", "the washer is on the left", `neverShow: ["not a complete new set"]`. Every instruction
// about specificity was present and none of it was followed.
//
// The comparison that explains it is sitting in the same codebase. readSceneFromHero() is a small
// focused call with one job, and it returns dense, checkable, genuinely useful text from the same
// model. The product lock was one field among a dozen at the end of a nineteen-thousand-token
// brief, and it got a dozenth of the attention. Structured extraction does not survive being an
// afterthought in a large prompt, so it gets its own call, its own short brief, and a schema whose
// shape makes vagueness difficult -- counts are integers, enumerations are arrays.

import type OpenAI from 'openai';
import type { ProductIdentity, ShotClassification, SourcePhoto } from './types';

/**
 * One real fault, anchored to the photograph that shows it.
 *
 * The anchor is the point. Describing a fault in words and asking an image model to draw it is
 * asking it to INVENT damage, and it invents generously -- "rust spots around the washer lid"
 * came back as rust along the base of both machines in four frames out of eight. A described
 * fault is a licence to add grime; a fault the model can look at is a thing to copy.
 *
 * So each mark carries the index of an upload that actually shows it, that upload is attached to
 * the shots covering that area, and the instruction becomes "reproduce what is in the photograph"
 * rather than "add rust here".
 */
export type ProductMark = {
  /** What it is: "surface rust", "a chip in the enamel", "sun-faded panel". */
  what: string;
  /** Where it is, tightly enough to place it: which panel, which corner, roughly how big. */
  where: string;
  /** Index of an upload that shows it, or null when no photograph captures it clearly. */
  sourcePhotoIndex: number | null;
};

export type ProductLock = {
  /** One line: exactly what this object is, in the terms a buyer would search for. */
  identity: string;
  /**
   * The exact mass-produced product, when it has been identified -- "GE GTW460ASJWW top-load
   * washer". Null when unknown.
   *
   * This is the single most valuable thing the system can know about an item, because it converts
   * the whole job from reconstruction to recall. An image model asked for "a white top-load
   * washer" averages every washer it has seen; asked for a named model it has seen thousands of
   * times, it draws that one, with the right dial count in the right order.
   */
  identifiedProduct: string | null;
  /** Roughly when it was made, when that is known. Buyers ask, and it bounds the styling. */
  productionYears: string | null;
  /** How many separate physical units are being sold. One sofa is 1; a washer and dryer is 2. */
  unitCount: number;
  /** How the units and their major parts sit relative to one another, stated left to right. */
  layout: string;
  /**
   * The countable facts, one per entry, each opening with a number. This is the field that fails
   * most often and matters most, because a buyer counts what is in the picture.
   */
  countableParts: string[];
  /** Proportions and silhouette: relative dimensions, shape of arms, legs, edges, profile. */
  form: string;
  /** Colour with its undertone, material, weave or finish, and how the surface takes light. */
  colorAndMaterial: string;
  /** Hardware, controls, panels, badges, trim -- each with WHERE it is on the object. */
  features: string[];
  /** Every visible mark, wear, stain, rust patch or damage, anchored to a photograph of it. */
  marks: ProductMark[];
  /**
   * What this object is NOT, aimed squarely at the likeliest wrong answer. Without this a
   * top-loading washer gets rendered with a front door, because that is the stronger prior.
   */
  neverShow: string[];
};

const productLockSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    identity: { type: 'string' },
    unitCount: { type: 'integer' },
    layout: { type: 'string' },
    countableParts: { type: 'array', items: { type: 'string' } },
    form: { type: 'string' },
    colorAndMaterial: { type: 'string' },
    features: { type: 'array', items: { type: 'string' } },
    marks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          what: { type: 'string' },
          where: { type: 'string' },
          sourcePhotoIndex: { type: ['integer', 'null'] },
        },
        required: ['what', 'where', 'sourcePhotoIndex'],
      },
    },
    neverShow: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'identity',
    'unitCount',
    'layout',
    'countableParts',
    'form',
    'colorAndMaterial',
    'features',
    'marks',
    'neverShow',
  ],
} as const;

const READER_ROLE = `
You are writing the specification a manufacturer would need to build one specific second-hand
object, from photographs of it, for someone who will never see those photographs.

That framing is the whole job. You are not describing the item attractively, and you are not
summarising it. You are recording the facts that distinguish THIS object from every other object of
its type, precisely enough that a drawing made from your notes can be checked against them and
found right or wrong.

WRITE WHAT CAN BE CHECKED, NOT WHAT READS WELL
"A standard rectangular washing machine" is unfalsifiable and reproduces nothing. "Top-loading
washer, lid hinged at the rear, four control dials in a row across the back panel with a rotary
timer at the far left" can be checked against a drawing and either holds or visibly fails. Every
line you write should be capable of being wrong.

COUNT EVERYTHING A BUYER WOULD COUNT
countableParts is the field that fails most often. Every entry begins with a number, and there
should be several: seat sections, cushions, dials, buttons, doors, drawers, shelves, burners,
wheels, legs, pockets, tiers. If the photographs show four dials, "4 control dials" is the answer
and "several controls" is not. When you genuinely cannot count something because no photograph
shows it clearly, leave it out rather than guessing a number.

POSITIONS ARE PART OF THE FACT
Say where things are, using left and right as somebody facing the front of the item would see
them. A control panel with the right number of dials in the wrong order is a different machine,
and a buyer spots that instantly.

MARKS BELONG TO PLACES, AND TO PHOTOGRAPHS
Record every visible mark, scuff, stain, rust patch, chip, tear and worn area. Each one needs three
things: what it is, where it is, and WHICH PHOTOGRAPH SHOWS IT.

The photograph index is not bookkeeping, it is the whole mechanism. A fault described in words is
an instruction to an image model to invent damage, and it invents generously -- "rust spots around
the washer lid" came back as rust along the base of both machines. A fault with a photograph
attached is something to copy instead. So set sourcePhotoIndex to the SOURCE INDEX of an upload
that actually shows that fault clearly, and null only when nothing does.

Be exact about "where": which panel, which corner, how far along, roughly how big. "A patch of
surface rust about an inch wide on the bottom-left corner of the washer's front panel" places it.
"Some rust" does not, and will be drawn everywhere.

Record only faults you can actually SEE in a photograph. Do not list what an appliance of this age
probably has.

neverShow IS NOT PADDING -- IT IS THE MOST VALUABLE FIELD YOU WRITE
An image model has a powerful prior for what a category looks like, and no amount of positive
description outvotes a prior. A top-loading washer WILL be drawn as a front-loader unless you
write "NOT a front-loader; there is no round glass door anywhere in the front panel". A six-piece
sectional WILL be drawn as a three-seat sofa unless you forbid it.
So: work out what a careless artist would draw if they read only the category name and ignored the
photographs -- then forbid exactly that, in plain words, one entry per mistake. Aim at the specific
likely error, never at generalities. "Not a complete new set" forbids nothing anybody would draw.
Three to six entries. Include the item's real wear here too if it is at risk of being cleaned up:
"not a clean example -- the rust around the lid is present in every view".

NEVER NAME A BRAND YOU CANNOT SEE
State a manufacturer, model name or model number ONLY if it is legible in a photograph or the
seller wrote it down. Guessing one from an appliance's silhouette is a false claim about what is
being sold. Where you have no brand, describe the object without one.

IF THE EXACT PRODUCT IS NAMED FOR YOU
You may be told the manufacturer and model. When you are, use what you know about that specific
product to make the specification RIGHT rather than merely descriptive -- the true dial count and
order, the badge position, the panel shape -- and say so plainly. What you may not do is invent
anything the photographs contradict, or record a fault the product line has generally rather than
one this unit shows.

Write plainly and densely. No adjectives that carry no information. No commentary.
`.trim();

/**
 * Reads the object out of the seller's own photographs.
 *
 * Deliberately given the sources rather than the generated hero: a hero that has already reinvented
 * the item would otherwise have its reinvention recorded as fact and propagated to every remaining
 * shot, which is exactly the failure this exists to stop.
 */
export async function readProductFromSources(
  client: OpenAI,
  model: string,
  images: { index: number; url: string }[],
  identity: ProductIdentity,
  sellerNotes: string,
  identifiedProduct: string | null = null,
  productionYears: string | null = null,
): Promise<ProductLock> {
  const named = identifiedProduct ?? [identity.brand, identity.model].filter(Boolean).join(' ');
  const known = named
    ? `This has been identified as: ${named}` +
      (productionYears ? ` (made ${productionYears})` : '') +
      '. Use what you know about that exact product to get the details right.'
    : 'NO brand or model has been established for this item. Do not name one.';

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: READER_ROLE },
      {
        role: 'user',
        content: [
          {
            type: 'text' as const,
            text:
              `The item is: ${identity.itemType} (${identity.category}), ` +
              `quantity ${identity.quantity}.\n${known}\n` +
              `Seller notes: ${sellerNotes.trim() || 'none provided'}\n\n` +
              'Write the specification for this object.',
          },
          ...images.flatMap(({ index, url }) => [
            { type: 'text' as const, text: `SOURCE INDEX ${index}:` },
            { type: 'image_url' as const, image_url: { url, detail: 'high' as const } },
          ]),
        ],
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'product_lock', strict: true, schema: productLockSchema },
    },
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error('Product reader returned no content.');
  const parsed = JSON.parse(raw) as ProductLock;

  // A cited index that does not exist would attach nothing and quietly turn an anchored fault back
  // into an invented one, so it is demoted to "described only" where the wording is more cautious.
  const valid = new Set(images.map((i) => i.index));
  parsed.marks = (parsed.marks ?? []).map((m) =>
    m.sourcePhotoIndex !== null && !valid.has(m.sourcePhotoIndex)
      ? { ...m, sourcePhotoIndex: null }
      : m,
  );
  parsed.identifiedProduct = identifiedProduct ?? null;
  parsed.productionYears = productionYears ?? null;
  return parsed;
}

/**
 * Cheap tells that the lock came back vague, reported rather than repaired.
 *
 * Repairing it is not possible -- nothing here can invent a dial count nobody recorded. What this
 * can do is put the weakness in front of a person BEFORE the images are generated, since a limp
 * lock is visible in two seconds here and takes eight images and several dollars to discover
 * otherwise.
 */
export function productLockWeaknesses(lock: ProductLock): string[] {
  const warnings: string[] = [];
  const numbered = lock.countableParts.filter((p) => /\d/.test(p));

  if (numbered.length < 2) {
    warnings.push(
      `only ${numbered.length} countable fact(s) with an actual number -- a buyer counts, and ` +
        'this is what stops the section or dial count drifting',
    );
  }
  if (!lock.neverShow.some((n) => /\bnot\b|\bno\b|\bnever\b|\bwithout\b/i.test(n))) {
    warnings.push(
      'neverShow contains no actual prohibition, so the model\'s default idea of this category ' +
        'is unopposed -- this is the field that stops a top-loader being drawn with a front door',
    );
  }
  if (lock.neverShow.length < 2) {
    warnings.push(`neverShow has only ${lock.neverShow.length} entry; two to six is the useful range`);
  }
  if (!lock.marks.length) {
    warnings.push('no marks recorded, so nothing stops the set drifting toward a clean example');
  }
  if (lock.features.length < 2) {
    warnings.push('fewer than two features with positions, so hardware layout is unconstrained');
  }
  if (/\b(standard|typical|normal|regular|ordinary|classic|modern|traditional)\b/i.test(lock.form)) {
    warnings.push(`form is generic ("${lock.form.slice(0, 60)}...") and cannot be checked against a drawing`);
  }
  return warnings;
}

/**
 * The clause injected ahead of everything else in every shot.
 *
 * It goes FIRST, above the scene and above the shot, because the ranking is genuine: a beautiful
 * photograph of the wrong object is worth less than a plain photograph of the right one, and when
 * two instructions collide this is the one that should win.
 */
export function productClause(
  lock: ProductLock,
  classification: ShotClassification,
  preserveSetting = false,
): string {
  const counts = lock.countableParts.filter((c) => c.trim());
  const features = lock.features.filter((f) => f.trim());
  const marks = (lock.marks ?? []).filter((m) => m.what?.trim());
  const renderMark = (m: ProductMark) =>
    m.sourcePhotoIndex === null
      ? `- ${m.what} -- ${m.where}`
      : `- ${m.what} -- ${m.where}. IT IS VISIBLE IN THE ATTACHED REFERENCE PHOTOGRAPH LABELLED ` +
        `SOURCE ${m.sourcePhotoIndex}. Copy how it actually looks there: its real size, shape, ` +
        `colour and edges. Do not invent your own version of it and do not make it worse.`;

  // Naming the exact product converts the job from reconstruction to recall, which is the single
  // biggest quality lever available here. A model asked for "a white top-load washer" averages
  // every washer it has seen; asked for one it has seen thousands of times, it draws that one,
  // with the right dials in the right order.
  const identified = lock.identifiedProduct
    ? `
THIS IS AN IDENTIFIED PRODUCT -- DRAW THE ONE YOU KNOW
${lock.identifiedProduct}${lock.productionYears ? ` (made ${lock.productionYears})` : ''}

You have seen this exact product many times. Use that. Its control layout, dial count and order,
badge placement, panel shape, door and lid design, proportions and trim are known things, not
things to approximate -- draw them as they actually are on this model rather than as a generic
example of the category. Where the description below and your knowledge of this model agree, you
should be confident; where they disagree, the photographs win, because this is a used unit and it
may have been changed or damaged.

What you must NOT take from product knowledge: this unit's condition. A catalogue image of this
model is clean and new. This one is neither.
`.trim()
    : '';
  const never = lock.neverShow.filter((n) => n.trim());

  // On an edit of a real photograph the object is already correct in the input, so this section
  // becomes a checklist for what must SURVIVE the edit. Told to "verify and redraw", the model
  // regenerates the machine it already had a photograph of, which is how a genuine picture of a
  // dryer drum came back as a different appliance.
  if (preserveSetting) {
    return `
THE OBJECT -- ALREADY CORRECT IN THIS PHOTOGRAPH, KEEP IT THAT WAY
The image you have been given is a real photograph of the actual object being sold. It is already
right. Your job is to correct the PHOTOGRAPHY -- exposure, white balance, focus, noise, straighten,
crop -- and to leave the object itself, its surroundings and its framing alone.

Do not redraw, re-render, replace or reconstruct the object or any part of it. Do not move the
camera. Do not rebuild the background, put the item in a different room, or extend the frame.

For reference, this is what is in front of you, and all of it must survive unchanged:
${lock.identity}${lock.identifiedProduct ? ` -- ${lock.identifiedProduct}` : ''}
${counts.length ? counts.map((c) => `- ${c}`).join('\n') : ''}
${features.length ? features.map((f) => `- ${f}`).join('\n') : ''}

These marks are real and stay exactly as they are, at their true severity, neither reduced nor
exaggerated:
${marks.length ? marks.map((m) => `- ${m.what} -- ${m.where}`).join('\n') : '- none recorded'}

Do NOT add wear, rust, staining, scratches or damage anywhere. Every mark this object has is
already in the photograph. Anything you add is damage to goods that are not damaged, which
misrepresents them just as badly as hiding a fault would.
`.trim();
  }

  return `
THE OBJECT -- ONE SPECIFIC SECOND-HAND ITEM, NOT AN EXAMPLE OF ITS TYPE
This outranks every other instruction below, including the framing, the room and the styling. You
are photographing one particular object that physically exists and that a buyer is going to travel
to collect. It is not a representative example of its category, and it is not an improved version
of itself. If satisfying this section makes the photograph less attractive, the photograph gets
less attractive.

WHAT IT IS
${lock.identity}
${lock.unitCount} separate unit${lock.unitCount === 1 ? '' : 's'} being sold. ${lock.layout}
${identified ? `\n${identified}\n` : ''}

COUNT -- verify every line of this against the image before you finish
${counts.length ? counts.map((c) => `- ${c}`).join('\n') : '- no counts were recorded'}
A buyer counts what is in the picture. If any count or position here disagrees with what you have
drawn, the drawing is wrong and must be redone, however well it reads otherwise.

FORM AND PROPORTION
${lock.form}

COLOUR AND MATERIAL
${lock.colorAndMaterial}
Match the colour including its undertone. Warming it, cooling it, deepening it, or making it read
as a more expensive material are all the same error.

FEATURES, IN THEIR ACTUAL POSITIONS
${features.length ? features.map((f) => `- ${f}`).join('\n') : '- no distinguishing hardware or controls'}
Positions are part of the fact. A control panel with the right number of dials in the wrong order
is a different machine, and the buyer will see that immediately.

${
  classification === 'evidence'
    ? `MARKS AND WEAR -- THE SUBJECT OF THIS SHOT
This is a documentary photograph. Every one of the following is real, and this frame exists to let
a buyer inspect it. None of it is reduced, softened, shadowed, cropped short or blurred:`
    : `MARKS AND WEAR -- PRESENT AND VISIBLE
Every one of the following is real and belongs to this object. Where this shot's framing includes
the area it sits on, it appears, at its true severity. It does not migrate to another part of the
object, and it does not come and go between photographs -- a rust patch visible in one image and
absent from the next tells a buyer the photographs are fabricated:`
}
${marks.length ? marks.map(renderMark).join('\n') : '- no visible damage or wear was recorded; do not invent any, and do not idealise the object either'}

EVERYWHERE ELSE ON THIS OBJECT IS UNMARKED. That list is exhaustive: it is every fault the object
has. Do not add rust, staining, scratches, dents, chips, corrosion, discolouration or grime
anywhere it does not name. In particular, a mark recorded at ONE location does not spread -- rust
recorded around a lid does not also appear along the base, up the sides, or on the second unit, and
a scratch on one door does not reappear on the other. Adding damage to goods that do not have it
misrepresents them exactly as badly as hiding a fault would, and it is the more likely error here,
because "used appliance" pulls toward generic grime that this particular object does not have.

WHAT THIS OBJECT IS NOT -- do not draw any of these, whatever is typical for the category
${never.length ? never.map((n) => `- ${n}`).join('\n') : '- nothing further'}

THE CHECK BEFORE YOU FINISH
Compare what you have drawn against the sections above, in this order: the counts, the features and
their positions, the colour, the marks. Any disagreement means this is a photograph of a different
object than the one being sold, which is the one failure this whole set cannot survive.
`.trim();
}
