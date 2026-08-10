import fs from 'fs';
import path from 'path';
import type OpenAI from 'openai';
import { MAX_IMAGES, MIN_IMAGES } from '@/lib/config/pricing';
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
- Every other shot must be assigned exactly one productionMode, chosen in this priority order:
    1. "source_edit" -- ALWAYS PREFER THIS whenever a specific original source photo already
       shows the exact viewpoint this shot needs (per the ADDITIONAL OPERATING RULES section
       above: geometry reconstruction is a last resort, not a default). Set sourcePhotoIndex to
       the 0-based index of that exact photo (the attached images are labeled "SOURCE INDEX 0",
       "SOURCE INDEX 1", etc, in upload order -- use that number exactly). Write the prompt as an
       edit instruction against that specific photo (e.g. "keep this exact photo's product
       geometry, framing, and every control/feature position unchanged; only improve lighting,
       background, and crop"). This is mandatory for any shot showing asymmetric or
       handedness-critical mechanical detail (steering wheels, control panels, hinges, handles,
       ports, switches) when a source photo of that view exists, because reconstructing such
       detail from scratch is exactly what causes mirrored/backwards geometry errors.
    2. "hero_edit" -- use ONLY when no source photo covers this exact viewpoint, but the shot
       keeps the exact same camera position, angle, and distance as the hero (e.g. a tighter crop
       on the same setup, a material/detail close-up within the same frame). Guarantees a
       pixel-identical background, but only physically coherent when the camera has NOT moved
       relative to the hero. For these shots, set "orientation" equal to the hero shot's
       orientation and sourcePhotoIndex null.
    3. "hero_reference" -- use only when the shot truly requires a camera angle/position that
       is covered by NEITHER a source photo NOR the hero's framing, and reconstruction is
       therefore unavoidable. The hero is attached only as a soft environment/material/lighting
       reference per the DEPENDENT MARKETING SHOT RULE above -- it will not produce an identical
       background. sourcePhotoIndex null. Because this mode carries the highest geometry-error
       risk, explicitly restate in the prompt the exact left/right orientation and layout of any
       asymmetric feature, drawn from the truth lock, so the model cannot guess it wrong.
    4. "independent" -- use for evidence/documentary shots not covered by rule 1, and any
       marketing shot needing no continuity with the hero. sourcePhotoIndex null.
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
- If, and only if, truthful completion of the requested count is impossible with the given
  photos, set readyForGeneration to false, explain why in reasonNotReady, list the precise
  minimum additional evidence needed, and you may still return a best-effort "shots" array (it
  will not be used for generation in that case).
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
          'orientation',
          'prompt',
          'saveAs',
        ],
      },
    },
    listingTitle: { type: 'string' },
    listingDescription: { type: 'string' },
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
