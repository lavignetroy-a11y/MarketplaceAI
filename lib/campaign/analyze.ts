import fs from 'fs';
import path from 'path';
import type OpenAI from 'openai';
import { MAX_IMAGES, MIN_IMAGES } from '@/lib/config/pricing';
import { coverageCatalog, profileFor } from './categories';
import type { AnalysisResult, RequestedImageCount, SourcePhoto } from './types';

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

THE SET MUST READ AS ONE PHOTO SHOOT. This overrides any part of the document above that could be
read as licence to design a different scene per image.

Every marketing shot in this campaign happens in ONE room, with the item in ONE position, on ONE
afternoon. Between shots, only the camera moves. Plan the marketing shots as a photographer would
actually work: set the item down once, then walk around it -- front, three-quarter from one side,
profile, three-quarter from the other side, rear, then step in for details of material, joinery,
hardware and wear. That sequence is what lets a buyer assemble the whole object in their head,
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

AUTHORITATIVE IMAGE-COUNT RANGE. This application sells any whole number of images from
${MIN_IMAGES} to ${MAX_IMAGES} inclusive. Where the document above states a different range or
names fixed packages, THIS overrides it. The count you are given is always valid; never argue
with it, round it, or treat it as one of a fixed set of tiers.

Requirements specific to this call:

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
    3. "source_edit" -- ONLY for evidence/documentary shots, where a specific original photo must
       be preserved because reconstructing it would risk changing a fact (labels, serial plates,
       specific damage, undersides, mechanisms). Set sourcePhotoIndex. Never use this mode for a
       marketing shot: it keeps the original photo's room, and a set where three images are in a
       staged room and one is in the seller's garage announces itself as fabricated instantly.
    4. "independent" -- the hero only.

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

TIER 3 -- MODEL COMPLETION. ALLOWED, WITH CONDITIONS.
When the item is a mass-produced product whose exact identity is established -- year, make and
model of a vehicle; a named appliance or tool model -- general knowledge of what that product
looks like may be used to complete views the photographs do not cover, so the buyer gets a full
set instead of a partial one. Use it.
Conditions, all of which must hold:
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

  const imageParts = sources.flatMap((source, i) => [
    { type: 'text' as const, text: `SOURCE INDEX ${i}:` },
    {
      type: 'image_url' as const,
      image_url: {
        url: `data:${source.mimeType};base64,${source.data.toString('base64')}`,
        detail: 'high' as const,
      },
    },
  ]);

  const userText = [
    coverageCatalog(requestedCount),
    '',
    `requested_final_image_count: ${requestedCount}`,
    `seller_notes: ${sellerNotes.trim() || 'none provided'}`,
    `source photo count: ${sources.length} (attached below, each preceded by its 0-based ` +
      `"SOURCE INDEX" label -- use that exact number for any shot's sourcePhotoIndex)`,
    'Analyze these source photographs as one item or matching set and produce the structured campaign plan.',
  ].join('\n');

  const completion = await client.chat.completions.create({
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
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error('Analysis call returned no content.');
  }

  const parsed = JSON.parse(raw) as AnalysisResult;

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

    for (const shot of parsed.shots.slice(1)) {
      if (shot.productionMode === 'source_edit' && shot.classification === 'marketing') {
        // Repairable: the shot is fine, the mode is wrong. hero_reference keeps the campaign room.
        shot.productionMode = 'hero_reference';
        shot.sourcePhotoIndex = null;
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
    const profile = profileFor(
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
        if (!role || GENERIC_ROLES.has(role)) shot.imageRole = profile.shots[0]?.role ?? 'hero';
        continue;
      }
      if (!role || GENERIC_ROLES.has(role)) {
        // Walk the table for a role not already used, so repaired shots stay distinguishable.
        const used = new Set(parsed.shots.map((x) => x.imageRole));
        while (nextRole < profile.shots.length && used.has(profile.shots[nextRole].role)) nextRole++;
        shot.imageRole =
          profile.shots[nextRole]?.role ?? `${shot.subjectScope}_${shot.sequenceNumber}`;
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

    // A completed view of a condition-disclosure shot defeats the shot's entire purpose: it shows
    // what the factory shipped rather than what is actually there. Downgrade rather than ship it.
    for (const shot of parsed.shots) {
      if (shot.classification === 'evidence' && shot.inferenceLevel === 'model_completed') {
        problems.push(
          `shot ${shot.sequenceNumber} (${shot.imageRole}) is evidence but was planned as ` +
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

    for (const shot of parsed.shots) {
      if (shot.productionMode === 'source_edit') {
        if (
          shot.sourcePhotoIndex === null ||
          shot.sourcePhotoIndex < 0 ||
          shot.sourcePhotoIndex >= sources.length
        ) {
          throw new Error(
            `Shot ${shot.sequenceNumber} is source_edit but has an invalid sourcePhotoIndex.`,
          );
        }
      }
    }
  }

  return parsed;
}
