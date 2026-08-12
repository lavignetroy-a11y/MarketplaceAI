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
// WHY IT HAPPENED, WHICH IS STRUCTURAL AND NOT BAD LUCK
//
// The scene lock taught us the lesson and we only applied half of it. An edit model handed several
// reference photographs averages them; it does not treat one as a specification to match. Text
// transfers where a reference image does not. That is why writing the room down fixed the room.
//
// The item never got the same treatment. The only thing carrying it between shots was
// SceneLock.item -- one free-text paragraph, and worse, one read out of the GENERATED HERO. So the
// chain ran:
//
//   1. the hero is generated with no dense description of the item, from averaged references,
//      and reinvents it;
//   2. the scene reader faithfully describes that reinvention;
//   3. every later shot is locked to the reinvention, and drifts further, because a paragraph
//      about "a beige sectional sofa" cannot hold a section count or a control panel layout.
//
// The room was consistent and the product was not, which is the worst of both: a coherent set of
// photographs of an object the buyer will never receive.
//
// WHAT THIS DOES DIFFERENTLY
//
// It is read from the SOURCE PHOTOGRAPHS, by the planner that is already looking at them at full
// detail, and it is injected into EVERY shot including the hero. The hero is the shot that most
// needs it, since everything downstream inherits whatever it decides.
//
// It is also written to be checkable rather than evocative. "A comfortable modern sectional" is
// unfalsifiable and reproduces nothing. "Six seat sections in a row plus a chaise at the LEFT end;
// four cushions across the back" is a specification, and a generated image either satisfies it or
// visibly does not.
//
// `neverShow` earns its place the same way `absent` did in the scene lock. Naming what the object
// is NOT is what stops a top-loader being rendered with a round front door, because the model's
// prior for "washing machine" is a front-loader and no amount of positive description outvotes a
// prior. The absence has to be stated.

import type { ShotClassification } from './types';

export type ProductLock = {
  /** One line: exactly what this object is, in the terms a buyer would search for. */
  identity: string;
  /**
   * The countable, structural facts -- units, sections, seats, doors, drawers, burners, knobs,
   * wheels -- with their arrangement stated left to right. This is the field that fails most
   * often and matters most, because a buyer counts.
   */
  configuration: string;
  /** Proportions and silhouette: relative dimensions, shape of arms, legs, edges, profile. */
  form: string;
  /** Colour with its undertone, material, weave or finish, and how the surface takes light. */
  colorAndMaterial: string;
  /** Hardware, controls, panels, badges, trim -- each with WHERE it is on the object. */
  features: string[];
  /** Every visible mark, wear, stain, rust patch or damage, with its exact location. */
  marks: string[];
  /**
   * What this object is NOT, aimed squarely at the likeliest wrong answer. Without this a
   * top-loading washer gets rendered with a front door, because that is the stronger prior.
   */
  neverShow: string[];
};

/**
 * The clause injected ahead of everything else in every shot.
 *
 * It goes FIRST, above the scene and above the shot, because the ranking is genuine: a beautiful
 * photograph of the wrong object is worth less than a plain photograph of the right one, and when
 * two instructions collide this is the one that should win.
 */
export function productClause(lock: ProductLock, classification: ShotClassification): string {
  const features = lock.features.filter((f) => f.trim());
  const marks = lock.marks.filter((m) => m.trim());
  const never = lock.neverShow.filter((n) => n.trim());

  return `
THE OBJECT -- ONE SPECIFIC SECOND-HAND ITEM, NOT AN EXAMPLE OF ITS TYPE
This outranks every other instruction below, including the framing, the room and the styling. You
are photographing one particular object that physically exists and that a buyer is going to travel
to collect. It is not a representative example of its category, and it is not an improved version
of itself. If satisfying this section makes the photograph less attractive, the photograph gets
less attractive.

WHAT IT IS
${lock.identity}

STRUCTURE AND COUNT -- verify this against the image before finishing
${lock.configuration}
A buyer counts what is in the picture. If the count or the arrangement here disagrees with what you
have drawn, the drawing is wrong and must be redone, however well it reads otherwise.

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
${marks.length ? marks.map((m) => `- ${m}`).join('\n') : '- no visible damage or wear was recorded; do not invent any, and do not idealise the object either'}

WHAT THIS OBJECT IS NOT -- do not draw any of these, whatever is typical for the category
${never.length ? never.map((n) => `- ${n}`).join('\n') : '- nothing further'}

THE CHECK BEFORE YOU FINISH
Compare what you have drawn against the four sections above, in this order: the count, the
features and their positions, the colour, the marks. Any disagreement means this is a photograph
of a different object than the one being sold, which is the one failure this whole set cannot
survive.
`.trim();
}
