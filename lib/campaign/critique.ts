// The critic half of the refinement loop.
//
// WHAT IT IS
//
// A vision model looks at one generated image ALONGSIDE the seller's original photographs and
// reports what is wrong with it, in the voice of a demanding marketplace seller who knows exactly
// what the real object looks like.
//
// WHY IT SEES THE ORIGINALS
//
// A critic shown only the output can judge whether a picture is attractive. It cannot judge
// whether the picture is TRUE -- whether the stain was quietly cleaned up, whether a wheel gained
// a spoke, whether the seat lost a button. Those are the failures that get a listing reported, and
// they are invisible without the reference. So the originals are always attached, and the critic
// is asked to compare rather than admire.
//
// THE DISTINCTION THAT MAKES THIS SAFE
//
// Defects come back in two separate buckets, and they are separate because the fix for one is the
// opposite of the fix for the other:
//
//   truth defects  the image disagrees with the real item. The correction is always "preserve
//                  what the reference shows" -- NEVER "make it look better". A loop that treats
//                  "there is a stain on the seat" as a defect to be fixed will cheerfully
//                  optimise its way into fraud.
//   craft defects  the photograph itself is bad or reads as generated. These are the ones the
//                  prompt is allowed to chase.
//
// The refiner (refine.ts) is bound by that split. Nothing here may propose improving the item.

import type OpenAI from 'openai';
import type { ShotPlan, SourcePhoto } from './types';

export type Defect = {
  /** What is wrong, in one specific sentence. */
  what: string;
  /** Where in the frame, so a human can check the claim rather than take it on faith. */
  where: string;
  severity: 'critical' | 'major' | 'minor';
};

export type Critique = {
  verdict: 'pass' | 'revise';
  scores: {
    /** Does the item match the reference photographs in every particular? */
    truth: number;
    /** Would a suspicious buyer conclude this was generated? */
    believability: number;
    /** Is it a well-made photograph -- light, framing, exposure, materials? */
    craft: number;
    /** Does it do the job this shot was planned to do? */
    jobSuccess: number;
  };
  truthDefects: Defect[];
  craftDefects: Defect[];
  /** What is working, so the refiner does not throw it away chasing something else. */
  strengths: string[];
  /** One-sentence summary a human can read at a glance. */
  summary: string;
};

const critiqueSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    verdict: { type: 'string', enum: ['pass', 'revise'] },
    scores: {
      type: 'object',
      additionalProperties: false,
      properties: {
        truth: { type: 'integer' },
        believability: { type: 'integer' },
        craft: { type: 'integer' },
        jobSuccess: { type: 'integer' },
      },
      required: ['truth', 'believability', 'craft', 'jobSuccess'],
    },
    truthDefects: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          what: { type: 'string' },
          where: { type: 'string' },
          severity: { type: 'string', enum: ['critical', 'major', 'minor'] },
        },
        required: ['what', 'where', 'severity'],
      },
    },
    craftDefects: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          what: { type: 'string' },
          where: { type: 'string' },
          severity: { type: 'string', enum: ['critical', 'major', 'minor'] },
        },
        required: ['what', 'where', 'severity'],
      },
    },
    strengths: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
  },
  required: [
    'verdict',
    'scores',
    'truthDefects',
    'craftDefects',
    'strengths',
    'summary',
  ],
} as const;

const CRITIC_ROLE = `
You are the quality bar for a marketplace listing-photo service. Think of yourself as the owner of
the business reviewing work before it goes to a paying seller: you know what the real object looks
like because the seller's own photographs are in front of you, and you are the last person who can
catch a problem before a buyer does.

You are shown:
  1. The seller's ORIGINAL photographs of the real item. These are the truth. They are badly shot;
     that is the point, and it is not a defect.
  2. ONE GENERATED image that is supposed to be a better photograph of that same item.

Judge the generated image only. Report what is wrong with it.

TWO KINDS OF WRONG, AND DO NOT CONFUSE THEM

TRUTH DEFECTS -- the generated image disagrees with the real item.
Compare against the originals feature by feature. Report anything that changed: silhouette or
proportion, component count (legs, buttons, tufts, spokes, slats, drawers, controls), material or
weave, colour or undertone, hardware, badging or lettering, and above all CONDITION. Wear, stains,
scratches, dents, fading, and dirt that are visible in the originals but softened, cleaned,
removed, moved, or hidden in the generated image are CRITICAL truth defects. So is an item that
has become newer, cleaner, or more expensive-looking than the one photographed.
Wrong quantity is always critical.

CRAFT DEFECTS -- the photograph itself is poor, or it reads as generated.
Specific things a suspicious buyer notices:
- surfaces that are smooth, waxy, airbrushed, or subtly glowing instead of showing real material
  (fabric without weave or nap, wood without grain, paint or metal without believable reflection);
- seams, stitching, piping, and panel lines that fade out, merge, or fail to run to where they end;
- edges and corners that soften or melt where two surfaces meet;
- repeating elements with wrong or impossibly regular count, spacing, or size;
- detail more symmetrical than a real object would be;
- shadows that disagree with each other or with the light, or an object with no contact shadow;
- background blur that is soft but not optically soft;
- illumination that is unnaturally even, with no falloff across the frame;
- a room too clean, too empty, or too styled for anyone to live in;
- backgrounds that dissolve into unresolvable mush;
- architecture that could not be built;
- any generated text, lettering, or logo;
- ordinary photographic faults: bad framing, clipped subject, wrong exposure, tilted horizon.

HOW TO REPORT
Be specific and locate every defect. "The fabric looks fake" is useless. "The seat cushion's weave
disappears entirely across the front third, reading as sprayed-on colour" is useful, because a
human can look and check whether you are right.
Do NOT invent defects to seem thorough. If the image is genuinely good, say so and pass it. An
empty defect list is a valid and useful answer.

SCORING, 0-10
  truth          10 = indistinguishable from the real item in every particular. Any critical truth
                 defect caps this at 3.
  believability  10 = no reasonable person would suspect this was generated.
  craft          10 = a skilled photographer's work: real light, real materials, clean framing.
  jobSuccess     10 = fully performs the job this specific shot was planned to do.

VERDICT
"pass" only when there are no critical or major truth defects, no critical craft defects, and every
score is 8 or above. Otherwise "revise".
`.trim();

/**
 * At low quality the model has too few pixels to render convincing texture, so judging material
 * fidelity there would generate defect reports about the tier rather than about the prompt -- and
 * the loop would spend its iterations chasing something no wording can fix.
 */
const LOW_QUALITY_CAVEAT = `
IMPORTANT -- THIS IMAGE WAS GENERATED AT LOW QUALITY, DELIBERATELY, TO ITERATE CHEAPLY.
It will look soft and coarse, and fine texture will be missing. That is the render tier, not the
briefing, and no change of wording can fix it. Therefore:
  - do NOT report softness, low detail, missing fine texture, or general fuzziness;
  - DO report everything structural and factual: wrong item, wrong quantity, wrong proportions,
    missing or altered condition, wrong component counts, bad composition, bad framing, wrong
    camera angle, impossible shadows, wrong setting, generated text, styling that is too clean.
Score craft on composition, light direction, and framing rather than on resolution.
`.trim();

export async function critiqueImage(
  client: OpenAI,
  shot: ShotPlan,
  sources: SourcePhoto[],
  generatedPng: Buffer,
  quality: 'low' | 'medium' | 'high',
): Promise<Critique> {
  const model = process.env.OPENAI_TEXT_MODEL || 'gpt-4o';

  const sourceParts = sources.flatMap((s, i) => [
    { type: 'text' as const, text: `ORIGINAL PHOTOGRAPH ${i + 1} (the truth):` },
    {
      type: 'image_url' as const,
      image_url: {
        url: `data:${s.mimeType};base64,${s.data.toString('base64')}`,
        detail: 'high' as const,
      },
    },
  ]);

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: quality === 'low' ? `${CRITIC_ROLE}\n\n${LOW_QUALITY_CAVEAT}` : CRITIC_ROLE },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text:
              `THIS SHOT'S JOB: ${shot.imageJob}\n` +
              `ROLE: ${shot.imageRole}   CLASSIFICATION: ${shot.classification}\n\n` +
              `Below are the seller's original photographs, then the generated image to judge.`,
          },
          ...sourceParts,
          { type: 'text', text: 'GENERATED IMAGE TO JUDGE:' },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${generatedPng.toString('base64')}`,
              detail: 'high',
            },
          },
        ],
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'image_critique', strict: true, schema: critiqueSchema },
    },
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error('Critique returned no content.');
  return JSON.parse(raw) as Critique;
}

/** Mean of the four scores -- the single number the loop uses to tell improvement from noise. */
export function overallScore(c: Critique): number {
  const s = c.scores;
  return (s.truth + s.believability + s.craft + s.jobSuccess) / 4;
}

export function countBySeverity(defects: Defect[], severity: Defect['severity']): number {
  return defects.filter((d) => d.severity === severity).length;
}
