// Prompt-strategy arms for A/B testing how listing images should be briefed.
//
// WHAT IS BEING TESTED
//
// Every arm receives the SAME shot plan, generated once by the analysis model, and the same
// reference photographs. The only variable is the wrapper placed around each shot's prompt. That
// is what makes the comparison mean anything: differences in the output are attributable to the
// briefing strategy rather than to two planners having had different ideas.
//
// THE TENSION EVERY ARM IS TRYING TO RESOLVE
//
// The image has to look better than the seller's snapshot while still reading as a photograph
// somebody took. Those pull against each other. Push on "improve" and you get the waxy,
// symmetrical, weightless catalogue look that buyers now recognise instantly and distrust. Push on
// "authentic" and you get back the bad phone photo the seller already had. The interesting
// question is not which arm is prettiest -- it is which arm holds both at once.
//
// The arms below attack that from deliberately different directions, because five variations on
// one idea would produce five similar images and teach us nothing:
//
//   control    nothing added. The baseline the others must beat.
//   current    specify the apparatus -- a coherent physical camera.
//   accident   specify the accidents -- evidence of a human being present.
//   habitat    specify the world -- believability comes from the room, not the lens.
//   retoucher  specify almost nothing -- every sentence is a chance to regenerate.
//   forensic   specify the failures -- name the artifacts rather than the aesthetics.
//
// Arms are meant to be harvested, not crowned. The intended end state is one contract built from
// whichever sections actually worked, which is why each arm keeps its clauses separable.

import { withPhotoContract } from './photoContract';
import type { ShotClassification } from './types';

export type PromptStrategy = {
  id: string;
  name: string;
  hypothesis: string;
  compose: (
    prompt: string,
    classification: ShotClassification,
    preserveSetting: boolean,
  ) => string;
};

/**
 * Precedence footer shared by every arm that adds text at all.
 *
 * Without this a clause like "soft daylight" can be read as licence to restyle the seller's
 * stained grey chair into a clean cream one. The shot prompt carries the truth lock and has to
 * outrank the aesthetic direction in every arm, or the experiment is comparing which strategy
 * lies about the item most attractively.
 */
function withShot(contract: string, prompt: string): string {
  return `${contract}

======================================================================
THE SHOT -- this section outranks everything above it
======================================================================
Everything above describes how the photograph should be MADE. What follows describes the real
object being photographed and the facts about it that must not change. Where the two ever
conflict, what follows wins, without exception. Nothing above authorises altering the item's
shape, colour, materials, hardware, wear, damage, dirt, or completeness.

${prompt}`;
}

/**
 * Documentary contract, held constant across every arm.
 *
 * Evidence shots are not where these hypotheses differ -- an underside shot has one job, which is
 * to let a buyer verify a fact, and "stage it more beautifully" is the exact failure the truth
 * policy exists to prevent. Holding it fixed also gives the experiment an internal control: if an
 * evidence shot comes out visibly different between two arms, something is leaking.
 */
const SHARED_EVIDENCE = (prompt: string, preserveSetting: boolean) =>
  withPhotoContract(prompt, 'evidence', preserveSetting);

// ---------------------------------------------------------------------------
// control
// ---------------------------------------------------------------------------

const control: PromptStrategy = {
  id: 'control',
  name: 'Control (no photographic direction)',
  hypothesis:
    'The planner prompt alone is sufficient. This is the state that produced the soft, waxy ' +
    'output -- included so every other arm has something real to be measured against rather ' +
    'than being compared only to each other.',
  compose: (prompt) => prompt,
};

// ---------------------------------------------------------------------------
// current -- the shipping contract. "Specify the apparatus."
// ---------------------------------------------------------------------------

const current: PromptStrategy = {
  id: 'current',
  name: 'Apparatus (shipping contract)',
  hypothesis:
    'Generated images read as fake because they have no coherent physical origin -- no single ' +
    'lens, no consistent aperture, no real sensor, so optical consequences do not follow from ' +
    'any one setup. Fix it by specifying a complete and self-consistent capture chain and ' +
    'letting the optics fall out of it.',
  compose: (prompt, classification, preserveSetting) =>
    withPhotoContract(prompt, classification, preserveSetting),
};

// ---------------------------------------------------------------------------
// accident -- "imperfectly perfect"
// ---------------------------------------------------------------------------

const ACCIDENT = `
THE PHOTOGRAPHER
A person with a good eye who photographed this item properly -- but a person, in a real room, on
a real afternoon, working reasonably quickly. Not a studio, not a catalogue shoot, and not a
machine that has never had to stand somewhere awkward to get the shot.

WHAT MAKES A PHOTOGRAPH LOOK TAKEN RATHER THAN MADE
A generated image betrays itself through the absence of accident. Everything in it is centred,
level, evenly lit, and equidistant, because nothing was in anyone's way. Real photographs carry
evidence that a body was present. Include that evidence, deliberately and tastefully:

- The framing is composed but not surgical. The item sits slightly off dead-centre, with more
  room on one side than the other, the way it falls when someone frames by eye rather than grid.
- The camera is very slightly off perfectly square to the item -- a few degrees, not a tilt.
- Lighting is uneven in the way a real room is uneven: brighter nearer the window, falling off
  measurably across the frame, with one side of the item in noticeably more light than the other.
- One or two ordinary, non-distracting real-world elements are present at the frame's edge
  because they live there -- a baseboard join, the edge of a doorway, a floor vent, a power
  outlet. Not styled props. Things nobody would bother to move.
- Surfaces show use: the floor has real variation and minor marks, the wall is not a uniform
  field of colour, upholstery holds the creases and slight asymmetry of having been sat in.

BOUNDED, NOT SLOPPY
These are imperfections of CIRCUMSTANCE, never of craft. The photograph is still sharp, correctly
exposed, correctly white-balanced, and the item is completely and clearly visible. Nothing is
cut off, nothing is obscured, nothing is out of focus, nothing is dim or murky. The goal is a
picture that looks like a good photographer worked in a real room -- not one that looks careless.

MATERIALS
Fabric must read as woven fabric with visible weave, nap, and pile direction. Wood must show
grain. Metal must show real specular behaviour. If a surface looks smooth, waxy, or airbrushed,
the image has failed regardless of how well composed it is.

NEVER INCLUDE
No people, hands, or pets. No added text, logos, or signage not physically on the real item. No
borders, collages, or overlays. No duplicated, floating, or intersecting objects. No CGI or
3D-render look. A single photograph, nothing else in frame beyond what is described.
`.trim();

const accident: PromptStrategy = {
  id: 'accident',
  name: 'Accident (imperfectly perfect)',
  hypothesis:
    'The tell is not resolution or lighting quality -- it is that nothing in a generated frame ' +
    'was ever in anyone’s way. Prescribing specific, bounded imperfections of circumstance ' +
    '(off-centre framing, uneven falloff, incidental fixtures at the edge) buys believability ' +
    'that no amount of added polish can.',
  compose: (prompt, classification, preserveSetting) =>
    classification === 'evidence'
      ? SHARED_EVIDENCE(prompt, preserveSetting)
      : withShot(
          preserveSetting
            ? `${ACCIDENT}\n\nEDIT IN PLACE\nThis shot edits an existing photograph. The room, ground, walls, fixed surroundings, and\ncamera position stay exactly as they are. Apply the above as a description of what the result\nshould look like, not as licence to recompose or relocate.`
            : ACCIDENT,
          prompt,
        ),
};

// ---------------------------------------------------------------------------
// habitat -- spend the prompt on the world
// ---------------------------------------------------------------------------

const HABITAT = `
BUILD THE ROOM FIRST, THEN PUT THE ITEM IN IT
Most of what makes a listing photograph believable is not the object -- it is whether the space
around it behaves like a real space someone lives in. A generic backdrop reads as generated no
matter how well the item itself is rendered, because real rooms are specific and generic rooms
are not. So resolve the room concretely before anything else.

THE ROOM MUST BE SPECIFIC
Settle on one actual room in an ordinary, well-kept home, and commit to its particulars: a
definite wall colour with a definite undertone, a definite floor with a definite direction and
scale to its material, a skirting board of a definite profile, one window in a definite position
relative to the item. It is a room a household uses, not a set built to photograph furniture in.

REAL ROOMS CONTAIN INFRASTRUCTURE
Believability comes from things that exist for reasons other than looking good, and generated
rooms almost never have them. Include several, positioned as they really would be: a power
outlet at outlet height, a light switch beside a doorway, a floor register, the edge of a door
frame or its architrave, a slight gap where the flooring meets the skirting, a heating vent, the
nail-line of a floorboard. These are not decor and must not be arranged. They are simply what is
already on the walls and floor of any real room.

LIGHT BEHAVES LIKE ARCHITECTURE
Daylight enters from the window that was established, and everything follows from that one fact:
the item is brighter on the window side, the wall opposite carries bounced fill, shadows all run
the same direction and lengthen away from the source, and the far corner of the room is
measurably dimmer than the near one. There is no second light source, no fill from nowhere, no
glow.

RESTRAINT
Ordinary and tidy, not styled and not staged. At most one simple framed print, at most one
plant. Never a showroom, a luxury interior, or virtual staging. Nothing has been arranged for
the camera.

THE ITEM SITS IN THE WORLD
It makes proper contact with the floor and casts a soft-edged contact shadow at every contact
point. Its scale is correct against the skirting, the outlet, and the door frame -- a viewer must
be able to judge how big it is from the room alone. Its materials respond to the room's light:
fabric shows weave and nap, wood shows grain, metal shows specular highlights. No waxy or
airbrushed surfaces. The whole frame is in focus; do not blur the room to flatter the item.

NEVER INCLUDE
No people, hands, or pets. No added text, logos, or signage not physically on the real item. No
borders, collages, or overlays. No duplicated, floating, or intersecting objects. No CGI or
3D-render look. A single photograph, nothing else in frame beyond what is described.
`.trim();

const habitat: PromptStrategy = {
  id: 'habitat',
  name: 'Habitat (world-first)',
  hypothesis:
    'Believability lives in the environment, not the subject. Spend the entire prompt budget on ' +
    'making the room specific and physically consistent -- especially the infrastructure real ' +
    'rooms have and generated rooms never do -- and let the model handle optics on its own.',
  compose: (prompt, classification, preserveSetting) =>
    classification === 'evidence'
      ? SHARED_EVIDENCE(prompt, preserveSetting)
      : withShot(
          preserveSetting
            ? `${HABITAT}\n\nEDIT IN PLACE\nThis shot edits an existing photograph, so the room is already decided: it is the one in the\nphotograph. Do not build a new one and do not move the camera. Apply the above as a standard\nfor how that existing room should read -- its light, its contact shadows, its materials.`
            : HABITAT,
          prompt,
        ),
};

// ---------------------------------------------------------------------------
// retoucher -- say almost nothing
// ---------------------------------------------------------------------------

const retoucher: PromptStrategy = {
  id: 'retoucher',
  name: 'Retoucher (minimal work order)',
  hypothesis:
    'Every additional sentence is an invitation to regenerate, and regeneration is where the ' +
    'AI look enters. An edit model handed a long aesthetic essay rebuilds the frame; handed a ' +
    'short list of permitted operations it does those operations and leaves the photograph ' +
    'alone. Least instruction may beat best instruction.',
  compose: (prompt, classification, preserveSetting) => {
    if (classification === 'evidence') return SHARED_EVIDENCE(prompt, preserveSetting);
    const order = preserveSetting
      ? `You are retouching this photograph, not remaking it.

Permitted: exposure, white balance, colour accuracy, shadow and highlight recovery, noise
reduction, straightening, perspective correction, crop, and removing clutter that lies entirely
outside the item's outline.

Everything else stays: the item, the room, the camera position, the framing, every material, and
every mark and stain on it. Do not re-render surfaces. Keep the grain and texture of the original.

The result should look like the same photograph, corrected.`
      : `Photograph this item properly in a plain, ordinary, well-kept room, in daylight from one side.

Sharp throughout. Correct exposure and white balance. The item whole in frame and clearly
readable. Real fabric, real wood, real metal -- nothing smooth or waxy.

Keep it plain. Do not style it, do not decorate the room, and do not make it look like a
catalogue.`;
    return withShot(order, prompt);
  },
};

// ---------------------------------------------------------------------------
// forensic -- name the artifacts
// ---------------------------------------------------------------------------

const FORENSIC = `
THIS IMAGE WILL BE INSPECTED BY SOMEONE LOOKING FOR SIGNS IT WAS GENERATED
Marketplace buyers now actively check for this, and a listing photograph suspected of being fake
costs the seller the sale outright. Passing that inspection matters more than looking impressive.

A viewer decides an image is generated by finding specific artifacts. Each one below is a
verdict. Work through them and make sure none is present.

SURFACE AND MATERIAL
- Fabric rendered without weave, nap, or pile direction -- looking sprayed on rather than woven.
- Any surface with a smooth, waxy, airbrushed, or subtly glowing finish.
- Wood without grain, or with grain that does not follow the shape of the piece.
- Metal without real specular behaviour, or with highlights that do not agree with the light.
- Texture that is uniform across an entire surface, with no variation, dirt, or wear anywhere.

STRUCTURE AND GEOMETRY
- Seams, piping, and stitching that fade out, merge, or fail to run continuously to where they
  terminate.
- Detail that is suspiciously symmetrical left to right, where a real object is slightly not.
- Repeating elements -- buttons, tufts, slats, legs -- with inconsistent spacing, count, or size,
  or which are more regular than the real item's.
- Edges and corners that soften, melt, or lose definition where two surfaces meet.
- Joints, hardware, and fasteners that do not resolve into something that could actually be built.

LIGHT AND SPACE
- Shadows running in directions that disagree with each other or with the light source.
- An object with no contact shadow, or one that does not sit convincingly on the floor.
- Background blur that is soft but not optically soft -- painted-on depth of field.
- Illumination that is unnaturally even, with no falloff anywhere across the frame.
- Reflections that do not correspond to anything actually in the scene.

SCENE
- A room too clean, too empty, or too styled to be one anyone lives in.
- Backgrounds that dissolve into unresolvable mush instead of readable objects.
- Architecture that could not be built -- walls meeting wrongly, impossible corners, a floor that
  changes material or direction across the frame.
- Any text, lettering, numbering, or logo, which generated images render wrong and which a
  viewer reads as proof.

WHAT TO DO INSTEAD
A single sharp photograph, in focus front to back, correctly exposed, lit from one direction by
daylight, of a real object in a real room, with every material behaving as that material does and
every surface carrying the ordinary variation and wear that real surfaces carry.

NEVER INCLUDE
No people, hands, or pets. No borders, collages, or overlays. No duplicated, floating, or
intersecting objects. Nothing in frame beyond what is described.
`.trim();

const forensic: PromptStrategy = {
  id: 'forensic',
  name: 'Forensic (named artifacts)',
  hypothesis:
    'Models act on concrete prohibitions far more reliably than on positive aesthetic direction. ' +
    '"Photorealistic" is unfalsifiable; "seams that fade out before they terminate" is checkable. ' +
    'Build the brief almost entirely from the specific tells a suspicious buyer looks for.',
  compose: (prompt, classification, preserveSetting) =>
    classification === 'evidence'
      ? SHARED_EVIDENCE(prompt, preserveSetting)
      : withShot(
          preserveSetting
            ? `${FORENSIC}\n\nEDIT IN PLACE\nThis shot edits an existing photograph. Keep the room, the camera position, and the framing.\nThe checklist above applies to the result you produce, including to the parts you leave alone.`
            : FORENSIC,
          prompt,
        ),
};

export const STRATEGIES: PromptStrategy[] = [
  control,
  current,
  accident,
  habitat,
  retoucher,
  forensic,
];

export function strategyById(id: string): PromptStrategy | undefined {
  return STRATEGIES.find((s) => s.id === id);
}
