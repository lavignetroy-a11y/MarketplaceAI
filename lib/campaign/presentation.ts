// The presentation standard: the ten minutes before the shutter.
//
// WHY THIS EXISTS
//
// master-improvement-logic.txt is an honesty policy, and a good one. But it forbids improving
// "cleanliness" and lists wrinkle, compression, sagging and soiling among the things that may
// never be removed. Read literally -- which is how an image model reads -- that instructs a
// photographer to faithfully reproduce dust, a cushion somebody shoved sideways on their way past,
// and a velvet nap rubbed four different directions by a hand. Every set came back looking like
// the snapshot it was made from, because that is precisely what it was told to produce.
//
// THE DISTINCTION THE DOCUMENT IS MISSING
//
//   CONDITION is what the item IS. It survives cleaning and tidying, because it is the item.
//   STATE is how the item happened to be sitting in the minute somebody took a snapshot of it.
//   It survives nothing, because it is not the item at all.
//
// A dead cushion is condition; a cushion shoved sideways is state. A set-in stain is condition;
// dust is state. Velvet worn bald on the arm is condition; velvet brushed the wrong way is state.
// Condition is owed to the buyer in full. State is owed to nobody.
//
// WHERE THE LINE IS DRAWN, AND WHY IT IS NOT A LOOPHOLE
//
// The two are told apart by the seller's own hands: anything the seller could put right in ten
// minutes before the buyer arrives -- no tools, no parts, no money, no repair -- is state.
//
// That test is not a weakening of the truth policy. It is the sharpest available statement of it,
// because it is the only formulation that keeps the photograph and the delivered object in
// agreement. A photograph showing squared cushions and a uniformly brushed nap is showing a state
// this item will genuinely be handed over in, since squaring cushions and brushing nap is what the
// seller does before the buyer's car pulls up. A photograph showing the tear gone is showing a
// state that will never exist. The test separates those two cases exactly, and it does it without
// anyone having to enumerate cushions and nap and dust in advance -- which is the point, because
// the enumeration is different for a sofa, a lathe and a necklace.

import type { ShotClassification } from './types';

/**
 * The specific grooming decided for one item, produced by the planner and injected into every
 * shot's prompt. Naming both halves in one object is the safety mechanism: the planner cannot
 * write "settle the cushions" without also writing down which faults have to survive it.
 */
export type PresentationPlan = {
  /** Item-specific actions to perform before the shutter. */
  groom: string[];
  /** The real faults that must be visible in the finished photographs regardless. */
  leave: string[];
};

/**
 * The general standard, carried in the photographic contract for marketing shots.
 *
 * Written as a standing instruction rather than a permission, because the whole complaint it
 * answers is that these things only happened when they were asked for by name.
 */
export const PRESENTATION_STANDARD = `
PRESENT THE ITEM AT ITS BEST -- DO THIS WITHOUT BEING ASKED

Before any real photographer opens the shutter, somebody spends ten minutes on the subject. They
sit the cushions square and knock the slump out of them. They brush the pile of a velvet or a
corduroy all one way, so the piece reads as one continuous surface instead of a patchwork of
handprints. They straighten what is crooked, close what is hanging open, coil the cable, wipe the
dust off, and carry the laundry basket out of shot. Nobody instructs them to do any of it. It is
simply what photographing something properly means.

Do that here, on your own initiative, in every shot. Look at this specific item, work out what
those ten minutes consist of for THIS object and THESE materials, and photograph it in that state.

THE TEST -- COULD THE SELLER HAND IT OVER LIKE THIS?
An improvement is legitimate exactly when the seller could achieve it themselves before the buyer
arrives, with their own hands and ordinary household effort: no tools, no parts, no money, no
repair, no professional. If they could, the photograph may show it already done, because that is
genuinely the state the item will be handed over in. If they could not, the photograph shows it
exactly as it is.

That test is not a loophole in the truth policy, it is the sharpest statement of it. Untidiness is
not a property of the object -- it is a property of the minute somebody happened to take a
snapshot. Reproducing a cushion that got shoved sideways, or a nap rubbed the wrong way by a hand,
tells the buyer nothing true about what they are buying. It is not honesty. It is just a worse
photograph of the same object.

ALWAYS DO, WITHOUT BEING TOLD
- Settle and square. Cushions seated properly in their frame and plumped to the loft their foam
  still has. Covers and slipcovers pulled taut at the seams. Doors and drawers closed flush, lids
  seated, straps and cables laid flat or coiled, feet and wheels aligned.
- Groom nap and pile. Velvet, corduroy, chenille, suede, microfibre, felt and carpet all brushed
  in ONE consistent direction across the whole piece, so it reads as a single surface with one
  sheen and one depth of colour. The scuffed, patchy, handprinted look goes. The fabric's own
  colour, weave and texture do not change.
- Relax handling creases -- storage folds, packing creases, the slump wrinkles that fall out when
  a cover is tugged straight.
- Clean what cleans: dust, lint, pet hair, crumbs, cobwebs, fingerprints, smudges, water spots,
  light surface soiling. Vacuum-and-wipe clean. Not shampooed, not refinished, not restored.
- Clear what is not for sale: laundry, boxes, bins, bags, tools, mail, unrelated furniture, price
  stickers, moving blankets, packing plastic, cables trailing out of frame. Sweep the floor.

NEVER DO -- THIS IS THE ITEM'S REAL CONDITION AND IT IS WHAT THE BUYER IS BUYING
- Tears, rips, holes, burns, cracks, chips, splits, breaks, missing or broken parts.
- Stains, set-in marks, discolouration, water rings, yellowing, sun fading, colour loss.
- Material actually worn away: pilling and bobbling, thinning, bald or shiny patches on seats and
  arms, frayed edges and piping, cracked or peeling leather, rubbed-through veneer, worn tread.
- Rust, corrosion, oxidation, pitting, mould, mildew.
- STRUCTURAL SAG. This is the line that matters most, because it looks like tidying and is not.
  A cushion may be sat square and plumped to the loft its foam still holds. A cushion whose foam
  is dead stays dead -- it keeps its collapsed profile, its dished seat, its slack wrinkled cover.
  The same goes for a sunken seat, a drooping arm, a bowed shelf, a sagging frame. Plumping
  restores the shape a sound cushion returns to by itself; it does not give a broken-down one back
  its loft. A photograph of a flat old sofa sitting up like new is a lie about the exact thing
  that buyer cares about most.
- Anything needing a tool, a part, a tradesperson, or money.

THE CALIBRATION
The buyer has to recognise this item when it arrives -- not "close enough", recognise it,
including its faults, in the places these photographs put them. Before finishing, ask: if this
exact object were carried into the room right now, with everything still wrong with it, would the
person holding this photograph say "yes, that is the one"? Any answer but yes means it has gone
too far, and the fix is to put the fault back rather than to soften it.
`.trim();

/**
 * The documentary counterpart.
 *
 * Grooming an evidence shot is the precise thing the truth policy exists to stop -- but so is
 * photographing a serial plate under a layer of dust nobody can read through. The resolution is
 * that on an evidence shot you may remove what OBSCURES the fact and nothing that FLATTERS it.
 */
export const PRESENTATION_EVIDENCE = `
PRESENTATION ON A DOCUMENTARY SHOT -- REMOVE WHAT OBSCURES, FLATTER NOTHING

This shot exists so a buyer can verify a fact, so preparation applies only where it makes that
fact more legible, never where it makes it look better. Wipe loose dust, lint and debris off the
surface being documented -- a photographer does clean a label before reading it -- and clear
unrelated objects out of the frame.

Nothing else. No plumping, no squaring, no relaxing of creases, no brushing the nap into an even
sheen: on this shot the uneven nap, the slack cover and the settled cushion ARE the evidence, and
tidying them is destroying it. The defect itself is never touched, reduced, softened, pushed into
shadow, cropped short, or thrown out of focus.
`.trim();

/**
 * The item-specific half, injected into each shot's prompt alongside the scene lock.
 *
 * It goes in the SHOT half rather than the contract for the same reason the scene lock does: the
 * shot prompt outranks the contract by construction, so a general standard sitting above it can be
 * overridden by a per-shot prompt that says "preserve every wrinkle exactly". Both halves have to
 * say the same thing or the more specific one wins the argument.
 */
export function presentationClause(
  plan: PresentationPlan,
  classification: ShotClassification,
): string {
  const groom = plan.groom.filter((g) => g.trim());
  const leave = plan.leave.filter((l) => l.trim());
  if (!groom.length && !leave.length) return '';

  // On an evidence shot the grooming list is suppressed entirely and only the faults survive,
  // because "settle the cushions" and "document the collapsed cushion" cannot both be followed.
  if (classification === 'evidence') {
    if (!leave.length) return '';
    return `
THIS SHOT DOCUMENTS THE ITEM AS IT IS
Do not prepare, tidy, settle or groom anything here beyond wiping loose dust off the surface being
documented and clearing unrelated objects out of frame. These are real and must be plainly visible
exactly as they are, not softened, shadowed, cropped short or blurred:
${leave.map((l) => `- ${l}`).join('\n')}
`.trim();
  }

  return `
PREPARED FOR THE SHOOT -- THIS SPECIFIC ITEM
Photograph the item in the state it would be in after ten minutes of the seller's own preparation.
For this item that means:
${groom.length ? groom.map((g) => `- ${g}`).join('\n') : '- nothing beyond dusting and tidying the surroundings'}

AND THESE SURVIVE ALL OF IT, UNCHANGED
Every one of the following is real, is what the buyer is buying, and must be plainly visible in
this photograph wherever this shot's framing includes it. Preparation never touches them, and they
are never softened, shadowed, cropped out, or thrown out of focus:
${leave.length ? leave.map((l) => `- ${l}`).join('\n') : '- no faults were recorded for this item; do not invent any, and do not idealise it either'}

A tidy item with its faults intact is the whole objective. Tidy with the faults gone is fraud, and
untidy with the faults intact is just a bad photograph.
`.trim();
}

/**
 * Crude, deliberate guard on what the planner asked for.
 *
 * The planner is told the line and mostly holds it, but "an instruction is not an enforcement
 * mechanism" applies here more than anywhere else in the pipeline: a grooming action that repairs
 * the item ships a photograph of goods that do not exist. Matching entries are dropped rather than
 * flagged, because there is nobody watching a customer's run at 2am.
 */
const REPAIR_PATTERNS: RegExp[] = [
  // Acting on a named fault. "remove the scratches", "conceal the rust", "minimise the fading".
  /\b(remove|removing|erase|erasing|eliminat\w*|hide|hiding|conceal\w*|cover up|patch|fill in|smooth out|buff out|polish out|touch up|minimi[sz]\w*|reduc\w*|soften\w*|fade out|blend away)\b[^.]{0,70}\b(stain|scratch|scuff|dent|chip|crack|tear|rip|hole|burn|wear|damage|rust|corrosion|oxidation|mark|blemish|fading|discolo\w+|pilling|fray\w*|peeling|mildew|mould|mold|sag\w*|scratches|stains)/i,
  // Restoration verbs applied to the item itself.
  /\b(repair|repairing|restor\w+|refinish\w*|reupholster\w*|repaint\w*|resurfac\w*|replat\w*|re-?dye|sand\w*|weld\w*|shampoo\w*|steam clean\w*|deep clean\w*|renew\w*|rejuvenat\w*)\b/i,
  // Condition claims smuggled in as a grooming action.
  /\b(like[- ]new|as[- ]new|showroom|mint condition|pristine|flawless|immaculate|factory[- ]fresh|as if (it were )?new)\b/i,
  // The specific structural-sag violation, which reads as tidying and is not.
  /\b(plump|fluff|restuff|re-?stuff|fill|firm|firming|lift|restore)\w*\b[^.]{0,50}\b(collapsed|dead|broken[- ]down|flattened|sunken|worn[- ]out|deflated)\b/i,
  /\b(collapsed|dead|broken[- ]down|flattened|sunken|deflated)\b[^.]{0,50}\b(cushion|foam|seat|padding)\b[^.]{0,50}\b(plump|fluff|full|restored|firm|lifted)/i,
];

/** Returns the plan with any repair-flavoured grooming stripped, plus what was dropped. */
export function sanitizePresentation(
  plan: PresentationPlan,
): { plan: PresentationPlan; dropped: string[] } {
  const dropped: string[] = [];
  const groom = plan.groom.filter((g) => {
    if (REPAIR_PATTERNS.some((re) => re.test(g))) {
      dropped.push(g);
      return false;
    }
    return true;
  });
  return { plan: { groom, leave: plan.leave }, dropped };
}
