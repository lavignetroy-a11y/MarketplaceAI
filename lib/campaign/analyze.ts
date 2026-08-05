import fs from 'fs';
import path from 'path';
import type OpenAI from 'openai';
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

Requirements specific to this call:

- "shots" must contain EXACTLY the requested_final_image_count number of entries, numbered
  sequenceNumber 1..N with no gaps or repeats.
- shots[0] is always the hero: sequenceNumber 1, imageRole "hero", productionMode "independent".
- Every other shot must be assigned exactly one productionMode:
    "hero_edit" -- use ONLY when the shot keeps the exact same camera position, angle, and
      distance as the hero (e.g. a tighter crop on the same setup, a material/detail close-up
      within the same frame, a minor in-place arrangement change). This mode edits the hero
      image directly and therefore guarantees a pixel-identical background -- but that is only
      physically coherent when the camera has NOT moved. If this shot's job requires a
      different camera angle, height, or distance than the hero, do NOT use hero_edit.
    "hero_reference" -- use when the shot is a marketing shot that needs a genuinely different
      camera angle/position than the hero (rear, side, top, wider/narrower framing revealing a
      different part of the room, etc). The hero is attached only as a soft environment/material/
      lighting-consistency reference, per the DEPENDENT MARKETING SHOT RULE above -- it will not
      produce an identical background, only a visually consistent one.
    "independent" -- use for evidence/documentary shots and any marketing shot that does not
      need environmental continuity with the hero at all.
  For hero_edit shots, set "orientation" equal to the hero shot's orientation (the canvas is not
  being resized) and write the prompt as an edit instruction against the hero image itself (e.g.
  "keep this exact scene and background unchanged; only change ...").
- Each shot's "prompt" field must be one complete, self-contained image-generation prompt written
  for an image-editing model that will receive reference images appropriate to its
  productionMode (original source photos for independent/hero_reference shots, the hero image
  alone for hero_edit shots, plus the hero as an extra reference for hero_reference shots).
  Since the model receiving that prompt has no other context, the prompt text itself must
  restate the product truth lock, the permitted enhancements, the forbidden changes, and the
  never-generate list as they apply to that specific shot -- do not write a short prompt that
  assumes shared context.
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
          productionMode: { type: 'string', enum: ['independent', 'hero_edit', 'hero_reference'] },
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

  const imageParts = sources.map((source, i) => ({
    type: 'image_url' as const,
    image_url: {
      url: `data:${source.mimeType};base64,${source.data.toString('base64')}`,
      detail: 'high' as const,
    },
  }));

  const userText = [
    `requested_final_image_count: ${requestedCount}`,
    `seller_notes: ${sellerNotes.trim() || 'none provided'}`,
    `source photo count: ${sources.length} (attached below, in upload order -- the first image is SOURCE_01, and so on)`,
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
  }

  return parsed;
}
