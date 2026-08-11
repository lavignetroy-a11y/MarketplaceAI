import fs from 'fs';
import path from 'path';
import type OpenAI from 'openai';
import { MAX_IMAGES, MIN_IMAGES } from '@/lib/config/pricing';
import { coverageCatalog } from './categories';
import type { AnalysisResult, RequestedImageCount, SourcePhoto } from './types';

const MASTER_PROMPT = fs.readFileSync(
  path.join(process.cwd(), 'lib/campaign/master-improvement-logic.txt'),
  'utf-8',
);

const SYSTEM_PROMPT = `${MASTER_PROMPT}

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

- referenceSourceIndices: list ONLY the source photographs this specific shot actually needs as
  evidence for the view it shows. Attaching every upload to every shot drags every source's
  background, lighting and camera position into the frame at once, and the model averages them.
  A rear view needs the photo showing the rear. A fabric close-up needs the photo showing the
  fabric. Two or three indices is normal; all of them is almost always wrong.

- subjectScope: "full_set" when every unit is visible together, "representative" when ONE unit is
  shown whole, "detail" when close in on part of one unit.
  FOR MULTI-UNIT LISTINGS THIS IS THE MOST IMPORTANT FIELD IN THE PLAN. Showing all units in every
  image is the standard failure: each unit ends up small and the buyer never sees any of them
  properly. Establish quantity in the first two or three images, then spend the remaining budget
  on ONE representative unit -- the same physical unit every time -- shown whole and close. Roughly
  a quarter of the campaign on group shots and the rest on the representative unit.

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

export async function analyzeCampaign(
  client: OpenAI,
  sources: SourcePhoto[],
  requestedCount: RequestedImageCount,
  sellerNotes: string,
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
      { role: 'system', content: SYSTEM_PROMPT },
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
