import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import type OpenAI from 'openai';
import { MAX_IMAGES, MIN_IMAGES } from '@/lib/config/pricing';
import { coverageBrief, profileFor, type CategoryProfile } from './categories';
import { sanitizePresentation } from './presentation';
import { productLockWeaknesses, readProductFromSources } from './productLock';
import {
  identifyItem,
  isUsable,
  productName,
  UNKNOWN_IDENTIFICATION,
  type Identification,
} from './identify';
import type { AnalysisResult, RequestedImageCount, SourcePhoto } from './types';

/**
 * Longest edge, in pixels, of the copies sent to the planner.
 *
 * A modern phone photograph is around 3000x4000, and at detail:'high' the vision encoder tiles it
 * into something like two thousand tokens EACH. Six uploads is then twelve thousand tokens of
 * image before a word of the brief, which is what put a six-photo couch over a 30k tokens-per-
 * minute ceiling. At 1024 the same photograph costs a few hundred, and nothing the planner decides
 * -- what the item is, what condition it is in, which shots the buyer needs -- turns on detail
 * finer than that. The full-resolution originals are untouched and still go to the image model,
 * which is the call where resolution actually buys something.
 */
const ANALYSIS_MAX_EDGE = 1024;

/**
 * How many uploads the planner is shown.
 *
 * Downscaling fixed the cost per photograph; this bounds the count, so a seller who uploads
 * twenty-five phone pictures of one sofa cannot walk the planning call back over the token
 * ceiling. Sampled evenly with the first and last always kept, because sellers tend to shoot the
 * overall view first and the detail they are worried about last.
 *
 * Only the PLANNER sees the trimmed set. Every original still reaches the image model, and a shot
 * can still name any of them by index -- `sourcePhotoIndex` and `referenceSourceIndices` continue
 * to refer to positions in the full array.
 */
const ANALYSIS_MAX_PHOTOS = 10;

function sampleForAnalysis<T>(items: T[], max: number): T[] {
  if (items.length <= max) return items;
  const picked = [items[0]];
  const step = (items.length - 1) / (max - 1);
  for (let i = 1; i < max - 1; i++) picked.push(items[Math.round(i * step)]);
  picked.push(items[items.length - 1]);
  return picked;
}

async function encodeForVision(source: SourcePhoto, maxEdge: number): Promise<string> {
  try {
    const resized = await sharp(source.data)
      // EXIF orientation is applied rather than carried, since the resize would otherwise drop the
      // tag and hand the planner a sideways sofa.
      .rotate()
      .resize(maxEdge, maxEdge, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
    return `data:image/jpeg;base64,${resized.toString('base64')}`;
  } catch {
    // A photo sharp cannot read is still worth showing the planner at whatever size it arrived.
    return `data:${source.mimeType};base64,${source.data.toString('base64')}`;
  }
}

/**
 * Retries the transient half of a 429 and refuses to retry the permanent half.
 *
 * "Rate limit reached" clears on its own within the minute and is worth waiting out. "Request too
 * large for gpt-4o ... Limit 30000, Requested 31996" is the same status code and will fail
 * identically forever, so retrying it just spends three minutes arriving at the same place with a
 * less useful error message.
 */
async function withRateLimitRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const delays = [20_000, 45_000, 75_000];
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const e = err as { status?: number; message?: string };
      if (e?.status !== 429) throw err;
      if (/request too large/i.test(e.message ?? '')) {
        throw new Error(
          `The ${label} request is larger than this OpenAI account's per-minute token limit ` +
            `(${e.message}). Fewer or smaller source photos will fit; raising the account's rate ` +
            'limit removes the ceiling entirely.',
        );
      }
      if (attempt >= delays.length) throw err;
      const seconds = delays[attempt] / 1000;
      console.warn(`[analyze] ${label} hit a rate limit; retrying in ${seconds}s`);
      await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
    }
  }
}

const MASTER_PROMPT = fs.readFileSync(
  path.join(process.cwd(), 'lib/campaign/master-improvement-logic.txt'),
  'utf-8',
);

const SYSTEM_PROMPT = (INFERENCE_POLICY: string) => `${MASTER_PROMPT}

======================================================================
IMPLEMENTATION NOTE (read this section last, it overrides formatting only)
======================================================================

You are being called as one structured-analysis step inside an implementation of the system
described above. Apply every principle, audit, and constraint from the document above in full.

Ignore the document's own internal JSON contract examples (source IDs like SOURCE_01,
attachments_in_exact_order, etc.) -- this implementation uses a simpler output contract, defined
entirely by the JSON schema attached to this request. Produce your answer to conform exactly to
that schema.

WHAT TO SHOOT IS DECIDED BY WHAT SELLS THE ITEM, NOT BY WHAT THE SELLER HAPPENED TO PHOTOGRAPH.

This is the most important instruction here and it inverts how the document above reads.

The seller's photographs are EVIDENCE ABOUT THE ITEM -- its identity, its form, its materials, its
condition. They are not a shot list, not a menu, and not a limit on what the campaign may contain.
A seller photographs an item badly, from two angles, stacked in a garage; that tells you what the
thing IS, and almost nothing about what its listing should look like. The images this campaign
needs will usually be DIFFERENT from the images it was given. That difference is the entire product.

So plan in this order:
  1. Decide what a serious buyer of this specific kind of item needs to see. The category coverage
     model is that answer -- work down it.
  2. Select exactly the purchased number of shots by buyer value.
  3. THEN, for each shot already selected, ask how it gets produced: which photograph anchors it,
     what is interpolated, what is completed from knowledge of the product.

Evidence decides HOW a shot is produced. It does not decide WHETHER the shot exists.

Never drop a valuable shot because the seller did not photograph that angle -- that is the normal
case, not an obstacle. A rear view is not omitted because there is no rear photograph; it is
produced from the item's established form and labelled honestly. The only shots that should be
dropped are those that would require inventing a FACT rather than a view: condition on a surface
nobody photographed, text, serial numbers, specifications, or the contents of something closed
that was never opened.

And do not plan a shot merely because a source photograph exists of it. Items arrive photographed
stacked, tipped over, in storage, mid-move. Nobody wants to see that, and reproducing it because
it happens to be well evidenced is the failure this whole system exists to correct.

THE SET MUST READ AS ONE PHOTO SHOOT. This overrides any part of the document above that could be
read as licence to design a different scene per image.

Every marketing shot in this campaign happens in ONE room, with the item in ONE position, on ONE
afternoon. Between shots, only the camera moves. Plan the marketing shots as a photographer would
actually work: set the item down once, then walk around it -- front, three-quarter from one side,
profile, three-quarter from the other side, rear, then step in for the details that actually
decide the sale -- the material a buyer cannot judge from across a room, and the wear they need to
see before travelling. That sequence is what lets a buyer assemble the whole object in their head,
which is the entire job of a listing set.

Concretely, when planning:
- Do NOT plan two shots that require different rooms, different furniture, or different staging.
- Do NOT plan a separate "lifestyle" or "in use" scene alongside a plain one. If context helps,
  ONE shot establishes it and the rest are taken in that same context.
- Do NOT introduce or remove supporting furniture between shots. A table that appears in one frame
  is present in all of them, from whatever angle that frame is taken.
- Detail and close-up shots are taken in the same room, in the same light, of the item where it
  already stands -- not on a different surface or against a different background.
- Vary the shots by CAMERA POSITION, DISTANCE, and FOCUS TARGET. Do not vary them by location.
Write each shot's prompt so it describes where the camera is relative to the item, rather than
describing a new scene to build.

PRESENTATION -- THE TEN MINUTES BEFORE THE SHUTTER. THIS OVERRIDES THE DOCUMENT ABOVE.

The document above forbids improving "cleanliness", and lists wrinkle, compression, sagging and
soiling among the things that may never be removed. Read literally -- which is how an image model
reads -- that instructs a photographer to faithfully reproduce dust, a cushion somebody shoved
sideways on their way past, and a velvet nap rubbed four directions by a hand. That is not what the
document is protecting. This section resolves it.

It conflates two different things:

  CONDITION is what the item IS. It survives cleaning and tidying, because it is the item.
  STATE is how the item happened to be sitting in the minute somebody took a snapshot of it. It
  survives nothing, because it is not the item at all.

A dead cushion is condition; a cushion shoved sideways is state. A set-in stain is condition; dust
is state. Velvet worn bald on the arm is condition; velvet brushed the wrong way is state.
Condition is owed to the buyer in full. State is owed to nobody.

They are told apart by the seller's own hands. Anything the seller could put right in ten minutes
before the buyer arrives -- no tools, no parts, no money, no repair, no professional -- is state,
and the photographs may show it already put right, because that is genuinely how the item will be
handed over. Everything else is condition, and is photographed exactly as it is.

Produce a "presentation" object accordingly, and do not leave it thin -- this is not boilerplate,
it is a decision about this specific object, and it is the difference between a listing photograph
and a snapshot.

  presentation.groom -- the specific actions. Start from the PREPARATION list on the category you
  chose, then make every entry concrete to THIS item and ITS materials. "Tidy it up" is worthless.
  "Both seat cushions sat square in the frame, front edges level, and the crushed velvet brushed
  from the back rail toward the front edge so the whole seat reads one direction" is an
  instruction. Six to ten entries is normal. Name the materials you can actually see.

  presentation.leave -- the specific real faults that must survive all of it and be plainly
  visible in the finished photographs. Go through conditionSummary and truthLock.neverRemove and
  write down, in plain physical terms, every fault that grooming could plausibly erase, with WHERE
  it is: "the tear on the outer face of the left arm, about 10cm long, stays open and visible",
  "the dark stain on the right seat cushion stays", "the right cushion's foam is collapsed and it
  keeps its dished, flattened profile -- it is not plumped back up". If the item has visible
  faults, this list is never empty. An empty leave list beside a full groom list is the exact
  shape of a fraudulent set.

THE STRUCTURAL-SAG LINE, because it is the one that looks like tidying and is not. A cushion may
be sat square and plumped to the loft its foam still holds. A cushion whose foam is dead stays
dead: collapsed profile, dished seat, slack wrinkled cover. Same for a sunken seat, a drooping
arm, a bowed shelf, a sagging frame. Plumping restores the shape a sound cushion returns to on its
own; it does not give a broken-down one back its loft. If you are unsure which one you are looking
at, it is the broken-down one -- put it in leave, not groom.

NEVER put any of these in groom: repairing, restoring, refinishing, reupholstering, repainting,
resurfacing, replating, sanding, welding, shampooing, deep-cleaning or steam-cleaning anything;
removing, concealing, minimising, softening, filling, buffing out or touching up any stain,
scratch, scuff, dent, chip, crack, tear, hole, burn, rust, corrosion, fading, discolouration,
pilling or fraying; or any phrase amounting to a condition claim ("like new", "showroom",
"pristine"). Those are not preparation, they are a different object.

Every shot's own "prompt" text must restate the preparation and the surviving faults that apply to
that shot, in its own words, since the model generating it sees nothing else.

AUTHORITATIVE IMAGE-COUNT RANGE. This application sells any whole number of images from
${MIN_IMAGES} to ${MAX_IMAGES} inclusive. Where the document above states a different range or
names fixed packages, THIS overrides it. The count you are given is always valid; never argue
with it, round it, or treat it as one of a fixed set of tiers.

Requirements specific to this call:

- environmentDescription is THE ONE ROOM every marketing shot in this campaign happens in, and it
  is now actually used -- it is built into the hero, and the rest of the set is matched to the
  hero. Describe it concretely enough to build: wall colour with its undertone and finish, floor
  material and the direction it runs, where the daylight comes from, and what little else is in
  the room. Three or four sentences.

  IT IS A ROOM YOU ARE CHOOSING, NOT A DESCRIPTION OF WHERE THE SELLER WAS STANDING. Default hard
  to replacing their setting. Listing photographs are overwhelmingly taken in a garage, a
  driveway, a storage unit, a cluttered corner or a room mid-move, and none of those belong in a
  delivered set -- the seller's background is evidence about the ITEM and nothing else. Keep their
  setting only when it is already a clean, well-kept interior that suits the item, and say so
  explicitly when you do.

  Choose a room this kind of item actually lives in, because a buyer is judging fit as much as
  looks: a sofa in a living room, a dining set in a dining room, a washer in a laundry or utility
  room, a tool in a swept garage or workshop, a treadmill in a spare room. Keep it plain and
  ordinary -- an uncluttered home somebody really lives in, not a showroom or a magazine interior.

- "shots" must contain EXACTLY the requested_final_image_count number of entries, numbered
  sequenceNumber 1..N with no gaps or repeats.
- shots[0] is always the hero: sequenceNumber 1, imageRole "hero", productionMode "independent",
  sourcePhotoIndex null.
- Every other shot must be assigned exactly one productionMode. THE CAMPAIGN ENVIRONMENT IS THE
  ONLY SETTING. The seller's original background -- garage, driveway, storage room, cluttered floor
  -- is evidence about the ITEM and is never the setting of a delivered marketing image. Choose:
    1. "hero_edit" -- the camera has NOT moved from the hero. A tighter crop, a detail within the
       hero's own frame. Pixel-identical background, which is why it is preferred whenever the
       shot can be taken from where the hero was taken. sourcePhotoIndex null, orientation equal
       to the hero's.
    2. "hero_reference" -- the camera HAS moved: a different orbit position, a different distance,
       a view of another side. The hero is attached for the environment and the locked scene
       description carries the room. Use this for the majority of marketing shots, because a
       photographer walking around an item is exactly what this campaign is. Because reconstruction
       carries geometry risk, restate in the prompt the exact left/right layout of any asymmetric
       feature, drawn from the truth lock.
    3. "source_edit" -- a specific original photo is the sole input and is corrected rather than
       redrawn. THIS IS THE HIGHEST-FIDELITY MODE AVAILABLE AND IT IS UNDER-USED. Reconstruction
       averages the reference photographs; editing cannot, because the object is already in the
       frame. Every fidelity failure this system has produced came from reconstructing something a
       photograph already showed. Set sourcePhotoIndex.

       USE IT WHENEVER A SOURCE PHOTOGRAPH ALREADY COVERS THE VIEW, in either of these cases:
         - any documentary or evidence shot: labels, rating plates, specific damage, undersides,
           mechanisms, wear;
         - ANY CLOSE-UP, whatever its classification. A shot where the item fills the frame -- the
           inside of a drum or tub, a control panel, a fabric macro, a hallmark, a connector -- has
           no room in it to leak, so the objection below does not apply to it at all.

       ABOVE ALL, use it for anything carrying TEXT: control panels, badges, model plates, warning
       labels, dial markings, displays. Reconstruction garbles lettering, and garbled lettering is
       both the fastest way an image reads as fake and a false specification about goods for sale.
       A text-bearing close-up is produced from a photograph or it is not planned at all.

       THE ONE THING IT IS WRONG FOR: a WIDE marketing shot, where the seller's own room fills the
       background. A set with three images in a staged room and one on a driveway announces itself
       as fabricated instantly. That is about the background being visible -- not about the shot
       being "marketing".
    4. "known_product" -- drawn from KNOWLEDGE of the identified model, with no reference image
       at all. Available ONLY when visual_identification below names a specific model, and it is
       the right answer for a close view of factory design that no photograph covers: a control
       panel, a badge, a dial cluster, a connector, a fascia. You have seen that product; drawing
       it is recall, and recall gets the dial count, the order and the printed cycle names right,
       where reconstruction from unrelated wide shots invents all three.
       NEVER use it for anything disclosing CONDITION -- wear, damage, undersides, interiors that
       show grime, or any view whose job is to show what this used unit is actually like. What is
       recalled is the product as it left the factory, and this one did not leave the factory
       yesterday. Set sourcePhotoIndex null and inferenceLevel "model_completed", and write a
       coverage note telling the seller that image is a representation of their model rather than
       a photograph of their unit.
       ORDER OF PREFERENCE for a detail shot: a source photograph if one covers it (source_edit),
       otherwise known_product if the model is identified, otherwise do not plan the shot.
    5. "independent" -- the hero only.

- imageRole must NAME THE SHOT, using the role name from the category coverage table you chose
  ("representative_three_quarter", "interior_dashboard", "wheel_and_tyre", "material_detail"). It
  is what the seller sees as a filename and what a person reads to know what each image is.
  NEVER return a generic value. "standard", "marketing", "evidence", "secondary", "image", "shot",
  "primary" and "additional" are all rejected -- "marketing" and "evidence" in particular are the
  classification field, not the role, and restating one in the other loses the only label the
  campaign has. If a shot has no exact match in the table, name it descriptively in the same style.

- cameraPose ALWAYS begins with a clock bearing and a height, in that order, then distance:
  "4 o'clock, chest height, 1.5m back". The item's front is 12 o'clock. Prose like "inside, from
  the driver's seat" is not a pose -- for an interior shot the camera still has a bearing and a
  height, so write "12 o'clock, seated height, 0.6m from the dashboard". Every shot gets one.

- THE HERO IS NEVER SHOT FROM BEHIND. Its bearing must be between 9 and 3 o'clock through 12 --
  the front, or a front three-quarter. A hero taken at 5, 6 or 7 o'clock shows a buyer the back of
  the item as their first impression, which no photographer would do.

- referenceSourceIndices: list ONLY the source photographs this specific shot actually needs as
  evidence for the view it shows. Attaching every upload to every shot drags every source's
  background, lighting and camera position into the frame at once, and the model averages them.
  A rear view needs the photo showing the rear. A fabric close-up needs the photo showing the
  fabric. Two or three indices is normal; all of them is almost always wrong.

- subjectScope: "full_set" when every unit is visible together, "representative" when ONE unit is
  shown whole, "detail" when close in on part of one unit.
  FOR MULTI-UNIT LISTINGS THIS IS THE MOST IMPORTANT FIELD IN THE PLAN. Showing all units in every
  image is the standard failure: each unit ends up small and the buyer never sees any of them
  properly.

  How many full_set shots to buy is NOT a proportion of the count -- it is a question about what
  the hero already proves, and the answer is almost always one or two whatever the count is. A
  fifth photograph of four chairs standing together answers nothing the first one did not, and it
  costs a detail shot that would have shown the buyer something real.

  Buy the SECOND full_set shot only if the hero leaves a question open:
    - the hero is angled or styled such that some units are partly hidden or hard to compare;
    - the units differ enough that a buyer needs a flat, square-on view to confirm they match;
    - the quantity is high enough that counting them in the hero is genuinely difficult.
  If the hero is already flat and square-on with every unit fully visible and comparable, it has
  done both jobs -- identity and quantity -- and a second group shot is redundancy. Spend that
  image on the representative unit instead.

  Never buy a third full_set shot unless the set is large or mixed (different sizes or types in one
  lot) and grouping genuinely needs more than one view to explain.

  Everything else goes to ONE representative unit -- the same physical unit every time -- shown
  whole and close, plus details of it.

- cameraPose: where the photographer is standing, relative to the item's own front. Use clock
  bearings and a height, e.g. "10 o'clock, chest height, 2.5m back" or "12 o'clock, kneeling, 0.6m
  from the seat front". The item's front is 12 o'clock and NEVER MOVES between shots; the
  photographer walks around it. Vary pose meaningfully across the campaign -- orbit position,
  distance and height -- and never plan two shots from effectively the same standing position.

- Never invent a human figure in any shot's prompt unless that exact source photo (source_edit
  mode) already contains a real person being conservatively edited. Do not add a person to a
  hero_edit, hero_reference, or independent shot.
- Each shot's "prompt" field must be one complete, self-contained image-generation prompt written
  for an image-editing model that will receive reference images appropriate to its
  productionMode (the one named source photo for source_edit, the hero image alone for hero_edit,
  original source photos plus the hero for hero_reference, original source photos only for
  independent). Since the model receiving that prompt has no other context, the prompt text
  itself must restate the product truth lock, the permitted enhancements, the forbidden changes,
  and the never-generate list as they apply to that specific shot -- do not write a short prompt
  that assumes shared context.
${INFERENCE_POLICY}

- MISSING EVIDENCE: SUBSTITUTE, DO NOT REFUSE. If a shot you wanted cannot be supported by the
  photographs -- no rear view, no underside, no engine bay, no label -- do not stop the campaign
  and do not invent the view. Drop that candidate, take the next supported shot down the category
  list, and keep the count exactly as purchased. Record what you dropped and what replaced it in
  "coverageNotes", in plain language a seller would understand, e.g. "No underside photo was
  provided, so an extra upholstery close-up was included instead." Never mention prompts, source
  indices, or internal terminology there.
- Set readyForGeneration to false ONLY when the core listing truth itself cannot be established:
  the quantity is fundamentally ambiguous, the photographs appear to show different items, the
  subject is mostly concealed, or the purchased count cannot be filled without duplicating a shot
  or inventing an unseen view. One desirable view being unavailable is NOT a reason to refuse --
  it is a reason to substitute. When you do refuse, explain why in reasonNotReady, list the precise
  minimum additional evidence needed, and still return a best-effort "shots" array.
- Do not include any internal stage names, QA scores, or retry mechanics in listingTitle or
  listingDescription -- those are customer-facing text.`;

/**
 * The two inference policies, switchable so they can be compared on the same photographs.
 *
 * v4 is the conservative position: anything not directly photographed is treated as invention and
 * the campaign substitutes a different supported shot instead. Safe, and it costs real coverage --
 * it is what made a five-photo car listing refuse outright rather than produce a set.
 *
 * v5 separates three things v4 conflates. Deciding two photographs show the same object is not
 * invention. Completing a partly visible or symmetric surface is not invention. Using knowledge of
 * an identified mass-produced product to complete a view is a real extrapolation, and it is allowed
 * under conditions -- established identity, condition carried across, no completed text, no
 * completed condition-disclosure shot -- with the seller told which images are representations.
 */
const INFERENCE_V5 = `EVIDENCE AND INFERENCE. This section overrides the document above wherever that document treats
any reconstruction beyond what is directly photographed as invention. It is not. There are three
tiers, and they carry very different risk.

TIER 1 -- CONTINUITY. ALWAYS ALLOWED.
If the uploads plausibly show the same object, they show the same object. Do not treat a different
angle, different lighting, different room, or a different level of zoom as evidence of a different
item, and do not refuse or hedge on identity because no single photograph shows everything. Resolve
them into one object unless something visible actually contradicts that -- a different colour, a
different form, a mark present in one and absent from a view that would have shown it.

TIER 2 -- INTERPOLATION. ALLOWED.
Where a surface is partly visible, or where the object's own structure makes the unseen part
determinate, complete it. A chair photographed from the front-left, whose front-right is partly in
frame, has a front-right that follows from what is already visible. Symmetric objects, repeating
elements, and continuous surfaces are all determinate in this way. This is reading the evidence,
not inventing beyond it.
Interpolation is bounded by symmetry and continuity ONLY. It does not extend to a face of the
object no view touches at all, or to anything that could differ without contradicting a photograph
-- a rear panel that might carry a vent, a label, or damage nobody photographed.

BE HONEST ABOUT WHICH TIER YOU ARE IN. "Interpolated" is not the safe-sounding default; it is a
specific claim that the unseen part FOLLOWS from what is visible. A whole corner, side, rear or
interior of an object that no photograph shows is NOT interpolation however confident you are
about its shape -- that is Tier 3, and it must be labelled model_completed so the seller is told.
Ask yourself, for each shot: could this surface differ from my guess without contradicting any
photograph I was given? If yes, it is model_completed, not interpolated.

Under-claiming is equally wrong. "Photographed" means a source photograph actually shows that view.
A rear three-quarter produced without any rear photograph is not photographed, however faithful the
result -- labelling it so hides from the seller that it is a representation. Label the tier you are
actually in, in both directions.

TIER 3 -- MODEL COMPLETION. ALLOWED, WITH CONDITIONS.
When the item is a mass-produced product whose exact identity is established -- year, make and
model of a vehicle; a named appliance or tool model -- general knowledge of what that product
looks like may be used to complete views the photographs do not cover, so the buyer gets a full
set instead of a partial one. Use it.
Conditions, all of which must hold:
  - The SELLER'S OWN STATEMENT of year, make and model establishes identity. A seller writing
    "2011 Porsche Panamera" has told you what the car is; you do not need to recognise it from the
    photographs, only to check that nothing visible contradicts it. Record it in productIdentity's
    brand and model fields -- leaving those null because no badge was legible in a photograph
    throws away the one fact that makes completion possible, and it is the seller's own listing.
  - Identity must be ESTABLISHED, not guessed. If the photographs and notes do not pin the model,
    and variants of that model differ in the area being completed, do not complete it. A 2011
    Panamera came in trims with different rear bumpers and exhaust outlets; completing a rear view
    without knowing the trim produces a different car's back end.
  - The item's own CONDITION carries over. A completed panel is not a clean panel. Whatever wear,
    fading, dirt, oxidation, and finish level the photographed surfaces show, the completed surface
    shows too, because it is the same object of the same age with the same history. A pristine
    inferred surface beside worn photographed ones is both a visual tell and a false impression.
  - Never complete anything that constitutes a CLAIM rather than a shape: number plates, VINs,
    serial numbers, odometer readings, hallmarks, model badges, capacity stamps, weight markings,
    or any lettering not legible in a source photograph. Those are specifications and identifiers,
    not geometry, and getting one wrong misstates what is being sold. Frame or crop so that
    unreadable text stays unreadable rather than resolving it into something invented.
  - Never complete a view whose whole purpose is to disclose condition. An underside, a damage
    close-up, or a wear detail exists to show what is actually there; a completed one shows what
    the factory shipped, which is the opposite of its job.

Set "inferenceLevel" on every shot: "photographed" when a source covers the view, "interpolated"
for Tier 2, "model_completed" for Tier 3.
coverageNotes are ONLY about images: which desirable shot could not be supported and what was
produced instead, or which view is a representation rather than a photograph. They are not a place
for observations about the analysis itself. "No distinct brand or model was identifiable" is not a
coverage note -- a seller does not need telling that their unbranded chairs are unbranded, and it
reads as the system apologising for nothing. Neither are remarks about staging, consistency, or how
carefully the condition was captured. If a note does not tell the seller something about a
SPECIFIC IMAGE they are receiving, do not write it.

Every shot at "model_completed" must also produce a plain-language entry in coverageNotes naming
what was completed and why, e.g. "No photo of the passenger side was provided, so that view is
based on the known shape of this model rather than a photograph of this specific car." The seller
needs to know which images are representations so they can say so.`;

const INFERENCE_V4 = `EVIDENCE AND INFERENCE -- CONSERVATIVE.

Only views the photographs actually cover may be produced. Where a view is not covered, do not
reconstruct it from the object's likely shape, from symmetry, or from knowledge of what this model
of product normally looks like. Drop that candidate and take the next supported shot down the
category list instead, keeping the purchased count unchanged, and record the substitution in
coverageNotes.

Where the photographs leave something ambiguous, keep it ambiguous: crop before the unsupported
information becomes material, or use natural occlusion. Do not resolve an uncertainty in the
direction that happens to look better.

Set "inferenceLevel" to "photographed" on every shot.`;

const analysisSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    readyForGeneration: { type: 'boolean' },
    reasonNotReady: { type: 'string' },
    minimumAdditionalEvidenceNeeded: { type: 'array', items: { type: 'string' } },
    productIdentity: {
      type: 'object',
      additionalProperties: false,
      properties: {
        category: { type: 'string' },
        itemType: { type: 'string' },
        quantity: { type: 'integer' },
        isMatchingSet: { type: 'boolean' },
        brand: { type: ['string', 'null'] },
        model: { type: ['string', 'null'] },
        confirmedFacts: { type: 'array', items: { type: 'string' } },
        probableFacts: { type: 'array', items: { type: 'string' } },
        unsupportedFacts: { type: 'array', items: { type: 'string' } },
      },
      required: [
        'category',
        'itemType',
        'quantity',
        'isMatchingSet',
        'brand',
        'model',
        'confirmedFacts',
        'probableFacts',
        'unsupportedFacts',
      ],
    },
    conditionSummary: { type: 'array', items: { type: 'string' } },
    truthLock: {
      type: 'object',
      additionalProperties: false,
      properties: {
        mustPreserve: { type: 'array', items: { type: 'string' } },
        neverInvent: { type: 'array', items: { type: 'string' } },
        neverRemove: { type: 'array', items: { type: 'string' } },
      },
      required: ['mustPreserve', 'neverInvent', 'neverRemove'],
    },
    campaignThesis: { type: 'string' },
    environmentDescription: { type: 'string' },
    // The ten minutes before the shutter, decided per item. `leave` is required alongside `groom`
    // so the plan cannot describe tidying without naming what the tidying must not reach.
    presentation: {
      type: 'object',
      additionalProperties: false,
      properties: {
        groom: { type: 'array', items: { type: 'string' } },
        leave: { type: 'array', items: { type: 'string' } },
      },
      required: ['groom', 'leave'],
    },
    shots: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          sequenceNumber: { type: 'integer' },
          imageRole: { type: 'string' },
          imageJob: { type: 'string' },
          classification: { type: 'string', enum: ['marketing', 'evidence'] },
          productionMode: {
            type: 'string',
            enum: ['independent', 'hero_edit', 'hero_reference', 'source_edit'],
          },
          sourcePhotoIndex: { type: ['integer', 'null'] },
          // Which uploads to attach to THIS shot. Attaching all of them drags every source's
          // garage, driveway and kitchen into the frame at once.
          referenceSourceIndices: { type: 'array', items: { type: 'integer' } },
          // full_set establishes quantity; representative shows one unit whole; detail goes close.
          subjectScope: { type: 'string', enum: ['full_set', 'representative', 'detail'] },
          // How much of this view comes from the photographs versus from reasoning about the
          // object. Drives what the seller is told about which images are representations.
          inferenceLevel: {
            type: 'string',
            enum: ['photographed', 'interpolated', 'model_completed'],
          },
          // Where the photographer is standing, relative to the item's fixed front.
          cameraPose: { type: 'string' },
          orientation: { type: 'string', enum: ['square', 'portrait', 'landscape'] },
          prompt: { type: 'string' },
          saveAs: { type: 'string' },
        },
        required: [
          'sequenceNumber',
          'imageRole',
          'imageJob',
          'classification',
          'productionMode',
          'sourcePhotoIndex',
          'referenceSourceIndices',
          'subjectScope',
          'inferenceLevel',
          'cameraPose',
          'orientation',
          'prompt',
          'saveAs',
        ],
      },
    },
    listingTitle: { type: 'string' },
    listingDescription: { type: 'string' },
    // Plain-language notes about shots that were wanted but could not be supported, and what was
    // used instead. Substituting and saying so beats refusing the whole campaign.
    coverageNotes: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'readyForGeneration',
    'reasonNotReady',
    'minimumAdditionalEvidenceNeeded',
    'productIdentity',
    'conditionSummary',
    'truthLock',
    'campaignThesis',
    'environmentDescription',
    'presentation',
    'shots',
    'listingTitle',
    'listingDescription',
    'coverageNotes',
  ],
} as const;

export type PlanningLogic = 'v4' | 'v5';

export async function analyzeCampaign(
  client: OpenAI,
  sources: SourcePhoto[],
  requestedCount: RequestedImageCount,
  sellerNotes: string,
  logic: PlanningLogic = 'v5',
): Promise<AnalysisResult> {
  const model = process.env.OPENAI_TEXT_MODEL || 'gpt-4o';

  // Indices are sampled rather than photos, so every SOURCE INDEX label the planner sees is still
  // that photo's real position in the full array -- sourcePhotoIndex and referenceSourceIndices
  // are resolved against the untrimmed sources at generation time.
  const shown = sampleForAnalysis(
    sources.map((source, index) => ({ source, index })),
    ANALYSIS_MAX_PHOTOS,
  );
  const encoded = await Promise.all(
    shown.map(({ source }) => encodeForVision(source, ANALYSIS_MAX_EDGE)),
  );

  const imageParts = shown.flatMap(({ index }, n) => [
    { type: 'text' as const, text: `SOURCE INDEX ${index}:` },
    { type: 'image_url' as const, image_url: { url: encoded[n], detail: 'high' as const } },
  ]);

  const identified: Identification = await withRateLimitRetry('identification', () =>
    identifyItem(client, model, sources, sellerNotes, (m) => console.log(`[identify] ${m}`)),
  ).catch((err) => {
    // Identification is a large quality lever, not a precondition. A campaign without it falls
    // back to reconstruction, which is where this system was a week ago -- worse, not broken.
    console.warn('[analyze] identification failed, routing from seller notes instead:', err);
    return {
      ...UNKNOWN_IDENTIFICATION,
      itemType: sellerNotes,
      category: sellerNotes,
      isMatchingSet: /\b(set|pair|both|matching)\b/i.test(sellerNotes),
      basis: 'identification failed',
    };
  });
  const profile = profileFor(identified.itemType, identified.category, identified.isMatchingSet);

  const userText = [
    coverageBrief(profile, requestedCount),
    '',
    `requested_final_image_count: ${requestedCount}`,
    `seller_notes: ${sellerNotes.trim() || 'none provided'}`,
    identified.brand
      ? `visual_identification: ${identified.brand} ${identified.model ?? ''}`.trim() +
        ` [${identified.confidence}]` +
        (identified.productionYears ? `, made ${identified.productionYears}` : '') +
        ` (${identified.basis}). The seller did not necessarily state this -- it was worked out ` +
        'from the photographs. Treat it as a probable fact, not a confirmed one: record it in ' +
        'productIdentity.brand/model so unseen views can be completed correctly, list it under ' +
        'probableFacts rather than confirmedFacts. Because the model is known, "known_product" ' +
        'production mode is available for close views of factory design that no photograph ' +
        'covers -- use it rather than dropping those shots.' +
        (identified.knownDesign
          ? `\n\nKNOWN DESIGN OF THIS PRODUCT (from product knowledge, not from these photos -- ` +
            `use it for geometry and layout, never for condition):\n${identified.knownDesign}`
          : '')
      : 'visual_identification: none -- no brand or model could be established from the photographs',
    `source photo count: ${sources.length}` +
      (shown.length < sources.length
        ? ` (${shown.length} of them attached below, sampled across the set; the indices are the ` +
          'real positions and are not consecutive)'
        : ' (attached below)') +
      ', each preceded by its 0-based "SOURCE INDEX" label -- use that exact number for any ' +
      "shot's sourcePhotoIndex",
    'Analyze these source photographs as one item or matching set and produce the structured campaign plan.',
  ].join('\n');

  const completion = await withRateLimitRetry('campaign planning', () =>
    client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT(logic === 'v4' ? INFERENCE_V4 : INFERENCE_V5) },
        {
          role: 'user',
          content: [{ type: 'text', text: userText }, ...imageParts],
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'campaign_analysis',
          strict: true,
          schema: analysisSchema,
        },
      },
    }),
  );

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error('Analysis call returned no content.');
  }

  const parsed = JSON.parse(raw) as AnalysisResult;

  // Its own call, after the plan, because it needs the established brand to know whether it is
  // allowed to name one -- and because as a field on the schema above it came back limp every
  // time. See the header of productLock.ts for why a small focused call beats a large brief here.
  //
  // A failure is not fatal. Without the lock the set drifts the way it did before the lock
  // existed, which is bad and is still better than refusing a campaign the seller has paid for.
  // The planner is conservative about brand and often returns null even when the identification
  // pass read a logo off the control panel. Losing that costs real coverage: the v5 inference
  // policy gates model-completion on an established identity, so a null brand silently downgrades
  // every shot that could have been completed from knowledge of the actual product.
  if (!parsed.productIdentity.brand && identified.brand) {
    parsed.productIdentity.brand = identified.brand;
    parsed.productIdentity.model = parsed.productIdentity.model ?? identified.model;
    const claim = `${identified.brand} ${identified.model ?? ''}`.trim();
    parsed.productIdentity.probableFacts = [
      ...(parsed.productIdentity.probableFacts ?? []),
      `Appears to be a ${claim} (${identified.basis}) -- worth confirming before listing`,
    ];
  }

  try {
    parsed.productLock = await withRateLimitRetry('product lock', () =>
      readProductFromSources(
        client,
        model,
        shown.map(({ index }, n) => ({ index, url: encoded[n] })),
        parsed.productIdentity,
        sellerNotes,
        productName(identified),
        identified.productionYears,
      ),
    );
    const weak = productLockWeaknesses(parsed.productLock);
    if (weak.length) console.warn(`Product lock is weak: ${weak.join('; ')}`);

    // Pointing a prompt at "the attached photograph labelled SOURCE 2" only works if SOURCE 2 is
    // actually attached. Every shot that reconstructs the object gets the photographs its faults
    // live in, so a mark can be copied instead of imagined -- which is the whole point of
    // recording where each one was photographed.
    //
    // Not applied to source_edit or hero_edit: those take exactly one input image by definition,
    // and the fault is already in it.
    const markSources = Array.from(
      new Set(
        parsed.productLock.marks
          .map((m) => m.sourcePhotoIndex)
          .filter((i): i is number => i !== null && i >= 0 && i < sources.length),
      ),
    );
    if (markSources.length) {
      for (const shot of parsed.shots) {
        if (shot.productionMode === 'source_edit' || shot.productionMode === 'hero_edit') continue;
        shot.referenceSourceIndices = Array.from(
          new Set([...(shot.referenceSourceIndices ?? []), ...markSources]),
        );
      }
    }
  } catch (err) {
    console.error('Product lock failed; the set will be less consistent:', err);
  }

  if (parsed.readyForGeneration) {
    if (parsed.shots.length !== requestedCount) {
      throw new Error(
        `Analysis returned ${parsed.shots.length} shots but ${requestedCount} were requested.`,
      );
    }
    const sequences = parsed.shots.map((s) => s.sequenceNumber).sort((a, b) => a - b);
    const expected = Array.from({ length: requestedCount }, (_, i) => i + 1);
    if (JSON.stringify(sequences) !== JSON.stringify(expected)) {
      throw new Error('Analysis returned shots with invalid or duplicate sequence numbers.');
    }
    // Deterministic checks on the plan, before a cent is spent. These are the mistakes that are
    // cheap to detect and expensive to discover in the output: a marketing shot in source_edit mode
    // puts the seller's garage in the middle of a staged set, and a multi-unit listing where every
    // shot is full_set gives a buyer four small chairs and no look at any of them.
    const problems: string[] = [];

    // Views whose whole job is to disclose condition, whatever the planner classified them as.
    const CONDITION_ROLES =
      /(engine|underside|undercarriage|wear|damage|condition|seal|hinge|carpet|rust|scratch|dent|stain|interior_floor|tyre|tire|tread|brake)/i;

    for (const shot of parsed.shots.slice(1)) {
      if (shot.productionMode !== 'source_edit' || shot.classification !== 'marketing') continue;
      // A close-up has no room in it to leak. The rule below exists because a wide marketing shot
      // in source_edit mode keeps the seller's garage, and a set with three staged images and one
      // driveway announces itself instantly -- but the inside of a washer tub, a control panel
      // filling the frame, a macro of a hallmark, all show the ITEM and nothing else. Converting
      // those to reconstruction threw away the real photograph for no gain, and reconstruction is
      // where every fidelity failure has come from.
      if (shot.subjectScope === 'detail') continue;
      shot.productionMode = 'hero_reference';
      shot.sourcePhotoIndex = null;
    }

    // Text is the fastest way to make an image read as AI, and a control panel, rating plate or
    // hallmark is mostly text. RECONSTRUCTION garbles it. The other two modes do not: editing a
    // photograph cannot, and recall of an identified product gets the real cycle names because it
    // has seen that product. So a text-bearing shot goes down a three-way preference and never
    // stays on reconstruction.
    const TEXT_ROLES = /(control_panel|model_label|badge|hallmark|serial|rating|sticker|display|markings|dial)/i;
    const canRecall = isUsable(identified);
    for (const shot of parsed.shots.slice(1)) {
      if (!TEXT_ROLES.test(shot.imageRole)) continue;
      if (shot.productionMode === 'source_edit' || shot.productionMode === 'known_product') continue;

      // "A photo contains this text" is not the same question as "a photo shows this text close
      // enough to edit". A control panel occupying 2% of a wide driveway shot satisfies the first
      // and fails the second -- and source_edit preserves composition, so anchoring a panel
      // close-up to that photo returns the driveway shot. A run did exactly that. The area
      // fractions from the label pass answer the question the plan alone cannot.
      const CLOSE_ENOUGH = 0.06;
      const closeShot = identified.textRegions
        .filter((r) => r.areaFraction >= CLOSE_ENOUGH && sources[r.photoIndex] !== undefined)
        .sort((a, b) => b.areaFraction - a.areaFraction)[0];

      if (closeShot) {
        // Best: the seller photographed this text close up. Nothing beats correcting the real thing.
        shot.productionMode = 'source_edit';
        shot.sourcePhotoIndex = closeShot.photoIndex;
        shot.inferenceLevel = 'photographed';
        problems.push(
          `shot ${shot.sequenceNumber} (${shot.imageRole}) shows lettering and was planned as ` +
            `reconstruction, so it was anchored to source photo ${closeShot.photoIndex}, which ` +
            'shows that text close up',
        );
      } else if (canRecall) {
        // Next best: no photograph, but the model is known, so draw the one we know.
        shot.productionMode = 'known_product';
        shot.sourcePhotoIndex = null;
        shot.inferenceLevel = 'model_completed';
        problems.push(
          `shot ${shot.sequenceNumber} (${shot.imageRole}) shows lettering that no photograph ` +
            `covers CLOSELY, so it is drawn from knowledge of ${productName(identified)} rather ` +
            'than reconstructed from a wide shot it appears in only distantly',
        );
      } else {
        problems.push(
          `shot ${shot.sequenceNumber} (${shot.imageRole}) shows lettering, no photograph covers ` +
            'it, and the product was not identified -- its text will be invented. A close ' +
            'photograph of that panel or label is the fix',
        );
      }
    }

    // Recall reproduces the product as it left the factory. A condition-disclosing view drawn that
    // way shows a clean example of the model rather than this eleven-year-old unit, which is the
    // exact inversion of that shot's purpose.
    for (const shot of parsed.shots) {
      if (shot.productionMode !== 'known_product') continue;
      const disclosesCondition =
        shot.classification === 'evidence' || CONDITION_ROLES.test(shot.imageRole);
      if (disclosesCondition) {
        problems.push(
          `shot ${shot.sequenceNumber} (${shot.imageRole}) discloses condition but was planned ` +
            'from product knowledge, which would show the factory version rather than this unit',
        );
        shot.productionMode = 'hero_reference';
        shot.inferenceLevel = 'interpolated';
      } else if (!canRecall) {
        problems.push(
          `shot ${shot.sequenceNumber} (${shot.imageRole}) asked to be drawn from product ` +
            'knowledge, but no product was identified',
        );
        shot.productionMode = 'hero_reference';
        shot.inferenceLevel = 'interpolated';
      }
    }

    // The presentation plan is the one place in the output where the system is deliberately
    // ALLOWED to change how the item looks, so it is the one place worth checking twice.
    if (!parsed.presentation) parsed.presentation = { groom: [], leave: [] };
    parsed.presentation.groom ??= [];
    parsed.presentation.leave ??= [];

    const { plan: cleanedPresentation, dropped } = sanitizePresentation(parsed.presentation);
    if (dropped.length) {
      problems.push(
        `${dropped.length} preparation step(s) would have repaired or restored the item rather ` +
          `than tidied it, and were dropped: ${dropped.join(' | ')}`,
      );
    }
    parsed.presentation = cleanedPresentation;

    // A full grooming list beside an empty "leave" list is the exact shape of a set that tidies
    // the faults away, so the faults are backfilled from what the analysis already established
    // rather than trusting an empty list to mean the item is genuinely flawless.
    if (!parsed.presentation.leave.length) {
      const known = [
        ...(parsed.conditionSummary ?? []),
        ...(parsed.truthLock?.neverRemove ?? []),
      ].filter((s) => s && s.trim());
      if (known.length) {
        problems.push(
          'the presentation plan listed no faults to preserve despite the analysis recording ' +
            `${known.length}, so they were carried over verbatim`,
        );
        parsed.presentation.leave = Array.from(new Set(known));
      }
    }

    // Generic roles came back in three runs out of four -- "standard", "marketing", "secondary".
    // The role is the only human-readable label the campaign has: it names the file, titles the
    // column in a comparison sheet, and is how anyone tells shot 7 from shot 11. Repair from the
    // category table rather than shipping a set of images called "standard".
    const GENERIC_ROLES = new Set([
      'standard', 'marketing', 'evidence', 'secondary', 'primary', 'image', 'shot',
      'additional', 'extra', 'other', 'general', 'default', 'main', 'photo',
    ]);
    // Re-routed from the planner's own identification rather than reusing the pre-pass profile:
    // the planner saw the photographs at full detail and its answer is the better one.
    const repairProfile = profileFor(
      parsed.productIdentity.itemType,
      parsed.productIdentity.category,
      parsed.productIdentity.isMatchingSet,
    );
    // Starts at 1: index 0 is the hero's own role, and a repaired shot 5 named "hero_full_set"
    // reads as a second hero.
    let nextRole = 1;
    for (const shot of parsed.shots) {
      const role = (shot.imageRole || '').trim().toLowerCase();
      if (shot.sequenceNumber === 1) {
        if (!role || GENERIC_ROLES.has(role)) shot.imageRole = repairProfile.shots[0]?.role ?? 'hero';
        continue;
      }
      if (!role || GENERIC_ROLES.has(role)) {
        // Walk the table for a role not already used, so repaired shots stay distinguishable.
        const used = new Set(parsed.shots.map((x) => x.imageRole));
        while (nextRole < repairProfile.shots.length && used.has(repairProfile.shots[nextRole].role)) nextRole++;
        shot.imageRole =
          repairProfile.shots[nextRole]?.role ?? `${shot.subjectScope}_${shot.sequenceNumber}`;
        nextRole++;
      }
    }

    // A source_edit takes a real photograph and corrects it, so by construction the view it shows
    // was photographed. Labelling one "interpolated" or "model_completed" is a contradiction, and
    // it inflates the count of images the seller is told are representations.
    for (const shot of parsed.shots) {
      if (shot.productionMode === 'source_edit' && shot.inferenceLevel !== 'photographed') {
        problems.push(
          `shot ${shot.sequenceNumber} edits a real photo but was labelled ${shot.inferenceLevel}`,
        );
        shot.inferenceLevel = 'photographed';
      }
    }

    // A hero from behind makes the back of the item a buyer's first impression.
    const heroPose = (parsed.shots[0]?.cameraPose ?? '').toLowerCase();
    const rearBearing = /\b([4-8])\s*o'?clock/.test(heroPose);
    if (rearBearing) {
      problems.push(`the hero is planned from behind the item (${parsed.shots[0].cameraPose})`);
    }

    // Tier 3 is completion from knowledge of a SPECIFIC mass-produced product. With no brand and
    // no model there is no such knowledge to draw on -- a set of unbranded dining chairs has no
    // canonical rear elevation to look up. The run that labelled six chair shots "model_completed"
    // was claiming a source that does not exist. Where symmetry or continuity genuinely carries
    // the view it is interpolation; that is the honest label, so demote rather than discard.
    const hasBrandAndModel = Boolean(parsed.productIdentity.brand && parsed.productIdentity.model);
    if (!hasBrandAndModel) {
      // known_product shots are gated separately, on the identification pass rather than on what
      // the planner echoed back into productIdentity, so they are not second-guessed here.
      const claimed = parsed.shots.filter(
        (s) => s.inferenceLevel === 'model_completed' && s.productionMode !== 'known_product',
      );
      if (claimed.length) {
        problems.push(
          `${claimed.length} shot(s) claimed model completion for an item with no identified ` +
            'brand and model, so they were downgraded to interpolation',
        );
        claimed.forEach((s) => {
          s.inferenceLevel = 'interpolated';
        });
      }
    }

    // Notes that comment on the analysis instead of on an image reached the seller: "no distinct
    // brand or model was identifiable", "the environment used is staged for consistency". They read
    // as the system apologising for nothing and bury the one note that matters.
    const NON_NOTES =
      /(no (distinct )?(brand|model|manufacturer)[^.]*identifi|staged for consistency|accurately (captured|represented)|maintaining alignment|ensure texture|given the source limitations)/i;
    if (Array.isArray(parsed.coverageNotes)) {
      const kept = parsed.coverageNotes.filter((n) => !NON_NOTES.test(n));
      if (kept.length !== parsed.coverageNotes.length) {
        problems.push(
          `${parsed.coverageNotes.length - kept.length} coverage note(s) were about the analysis ` +
            'rather than about an image the seller receives',
        );
        parsed.coverageNotes = kept;
      }
    }

    // Duplicate roles ship as duplicate filenames and identical column headings, and they are a
    // symptom too: two shots with one name are usually two shots doing one job.
    const seenRoles = new Map<string, number>();
    for (const shot of parsed.shots) {
      const n = (seenRoles.get(shot.imageRole) ?? 0) + 1;
      seenRoles.set(shot.imageRole, n);
      if (n > 1) shot.imageRole = `${shot.imageRole}_${n}`;
    }

    // "0 o'clock" is not a bearing. The front is 12.
    for (const shot of parsed.shots) {
      if (shot.cameraPose) shot.cameraPose = shot.cameraPose.replace(/\b0\s*(o'?clock)/gi, "12 $1");
    }

    // Some views disclose condition whatever they are classified as. An engine bay completed from
    // model knowledge is a factory-clean engine bay -- on a car with 125,000 miles that is not a
    // representation, it is a different engine. The classification check alone missed these,
    // because the planner files them as marketing detail.
    for (const shot of parsed.shots) {
      const disclosesCondition =
        shot.classification === 'evidence' || CONDITION_ROLES.test(shot.imageRole);
      if (disclosesCondition && shot.inferenceLevel === 'model_completed') {
        problems.push(
          `shot ${shot.sequenceNumber} (${shot.imageRole}) discloses condition but was planned as ` +
            'model-completed, which would show the factory condition rather than the real one',
        );
        shot.inferenceLevel = 'interpolated';
      }
    }

    // Anything completed beyond the photographs owes the seller a note. Silence here is how a
    // representation gets mistaken for a photograph of their own unit.
    const completed = parsed.shots.filter((s) => s.inferenceLevel === 'model_completed');
    if (completed.length && !parsed.coverageNotes?.length) {
      problems.push(
        `${completed.length} shot(s) were completed from model knowledge but no coverage note ` +
          'was written for the seller',
      );
    }

    const multiUnit = parsed.productIdentity.quantity > 1;
    if (multiUnit) {
      const fullSet = parsed.shots.filter((s) => s.subjectScope === 'full_set').length;
      if (fullSet === parsed.shots.length) {
        problems.push(
          'every shot shows the whole set, so no single unit is ever seen properly',
        );
      }
    }
    const poses = new Set(parsed.shots.map((s) => (s.cameraPose || '').trim().toLowerCase()));
    if (parsed.shots.length > 2 && poses.size < 2) {
      problems.push('every shot is planned from the same camera position');
    }
    if (problems.length) {
      console.warn(`Campaign plan is weak: ${problems.join('; ')}`);
    }

    // A source_edit naming a photo that does not exist used to throw, which discarded an entire
    // eighteen-shot plan over one bad integer. The shot is still perfectly producible without that
    // mode, so demote it and carry on.
    for (const shot of parsed.shots) {
      if (shot.productionMode !== 'source_edit') continue;
      const i = shot.sourcePhotoIndex;
      if (i === null || i < 0 || i >= sources.length) {
        problems.push(
          `shot ${shot.sequenceNumber} asked to edit source photo ${i}, which does not exist`,
        );
        shot.productionMode = 'hero_reference';
        shot.sourcePhotoIndex = null;
      }
    }

    if (problems.length) {
      console.warn(`Plan repaired: ${problems.join('; ')}`);
    }
  }

  return parsed;
}
