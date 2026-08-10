// The refiner half of the loop: turns critiques into a better brief.
//
// WHY IT REFINES ACROSS SEVERAL ITEMS AT ONCE
//
// A correction tuned against one object learns that object. Told repeatedly that upholstery looks
// sprayed on, it will write increasingly specific instructions about weave and nap -- and produce
// a contract that says nothing useful about white car paint, brushed steel, or a scuffed plastic
// control panel. Worse, the wins look real, because the thing it overfits to is the thing being
// measured.
//
// So a round generates one image PER ITEM, critiques them all, and synthesises ONE correction from
// the whole batch. A defect seen on three unrelated objects is a briefing problem worth fixing. A
// defect seen on one is probably that object.
//
// WHY CORRECTIONS REPLACE RATHER THAN ACCUMULATE
//
// Appending every round's advice produces a brief that is long, repetitive, and eventually
// self-contradictory -- and a contradictory brief generates worse images than no brief. Each round
// rewrites the whole block, sees what the previous one said, and is capped. The block is allowed
// to shrink. Sentences that stopped earning their place are meant to be dropped.

import type OpenAI from 'openai';
import type { Critique, Defect } from './critique';

/** Hard ceiling on the correction block. Prevents the slow slide into an unreadable essay. */
export const MAX_CORRECTION_CHARS = 1600;

export type RoundResult = {
  item: string;
  critique: Critique;
};

export type Refinement = {
  /** The new correction block, appended to the base contract on the next round. */
  correction: string;
  /** Which defects this revision is trying to fix, so a human can check it aimed correctly. */
  targeting: string[];
  /** What was dropped from the previous block and why. */
  dropped: string[];
  reasoning: string;
};

const refinementSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    correction: { type: 'string' },
    targeting: { type: 'array', items: { type: 'string' } },
    dropped: { type: 'array', items: { type: 'string' } },
    reasoning: { type: 'string' },
  },
  required: ['correction', 'targeting', 'dropped', 'reasoning'],
} as const;

const REFINER_ROLE = `
You are a prompt engineer improving the standing brief given to an image model that photographs
real second-hand items for marketplace listings.

You are given: the fixed base contract (which you cannot change), the correction block currently
appended to it, and the critiques of images generated this round across SEVERAL DIFFERENT objects.

Your job is to rewrite the correction block so the next round scores better.

THE ONE RULE THAT OVERRIDES EVERYTHING
You may only change how the PHOTOGRAPH is made. You may never propose changing the ITEM.
Truth defects -- where the generated image disagreed with the seller's real object -- are fixed by
instructing stronger preservation of what the reference photographs show. They are NEVER fixed by
making the item cleaner, newer, tidier, less worn, or less damaged. If a critique reports that a
stain, scratch, dent, or piece of wear was softened or removed, the correction must demand that it
be reproduced faithfully, at its real size and in its real position. Writing anything that would
improve the item's apparent condition is a total failure of this task, however much it might raise
a score.

WHAT MAKES A GOOD CORRECTION
- Address defects that appeared on MORE THAN ONE object. Those are briefing problems. A defect on
  a single object is usually that object, and chasing it overfits the brief.
- Be concrete and checkable. "More realistic" instructs nothing. "Fabric must show visible weave
  direction and nap, including in shadowed areas" instructs something.
- Say what to DO, not only what to avoid. A brief made only of prohibitions produces sterile,
  empty images that avoid every named failure and have no life.
- Do not restate the base contract. It is already being sent. Only add what is missing or what
  needs sharpening because the evidence shows it is not landing.
- Keep what is working. The strengths listed in the critiques came from somewhere -- if the
  current block is producing them, do not delete the sentences responsible.
- Drop what is not working. If a sentence has been in the block for rounds and the defect it
  targets keeps recurring, that wording is not landing. Replace it with a different formulation
  rather than repeating it louder.
- Prefer specific physical description over adjectives. Image models act on the former.

LENGTH
Hard limit ${MAX_CORRECTION_CHARS} characters. Shorter is better if it works. The block may shrink.

FORMAT
Plain imperative sentences, optionally in short labelled groups. No preamble, no headings that
duplicate the base contract, no markdown decoration.
`.trim();

function describeDefects(label: string, results: RoundResult[], pick: (c: Critique) => Defect[]) {
  const byText = new Map<string, { count: number; items: Set<string>; sample: Defect }>();
  for (const r of results) {
    for (const d of pick(r.critique)) {
      const key = d.what.toLowerCase().slice(0, 60);
      const hit = byText.get(key) ?? { count: 0, items: new Set<string>(), sample: d };
      hit.count += 1;
      hit.items.add(r.item);
      byText.set(key, hit);
    }
  }
  if (!byText.size) return `${label}: none reported.`;
  // Sorted by how many DIFFERENT objects showed it -- that ordering is the anti-overfitting signal.
  const lines = [...byText.values()]
    .sort((a, b) => b.items.size - a.items.size || b.count - a.count)
    .map(
      (h) =>
        `  [${h.sample.severity}] seen on ${h.items.size} object(s) (${[...h.items].join(', ')}): ` +
        `${h.sample.what} -- ${h.sample.where}`,
    );
  return `${label}:\n${lines.join('\n')}`;
}

export async function refineCorrection(
  client: OpenAI,
  baseContract: string,
  currentCorrection: string,
  results: RoundResult[],
  scoreHistory: number[],
): Promise<Refinement> {
  const model = process.env.OPENAI_TEXT_MODEL || 'gpt-4o';

  const scores = results.map(
    (r) =>
      `  ${r.item}: truth ${r.critique.scores.truth}, believability ` +
      `${r.critique.scores.believability}, craft ${r.critique.scores.craft}, job ` +
      `${r.critique.scores.jobSuccess} -- ${r.critique.summary}`,
  );

  const strengths = [...new Set(results.flatMap((r) => r.critique.strengths))];

  const userText = [
    '=== BASE CONTRACT (fixed -- do not restate or contradict) ===',
    baseContract,
    '',
    '=== CURRENT CORRECTION BLOCK (this is what you are rewriting) ===',
    currentCorrection || '(none yet -- this is the first round)',
    '',
    '=== THIS ROUND, ACROSS ALL OBJECTS ===',
    scores.join('\n'),
    '',
    describeDefects('TRUTH DEFECTS (fix by preserving harder -- NEVER by improving the item)', results, (c) => c.truthDefects),
    '',
    describeDefects('CRAFT DEFECTS (these are yours to chase)', results, (c) => c.craftDefects),
    '',
    `WORKING WELL (do not break these): ${strengths.length ? strengths.join('; ') : 'nothing noted'}`,
    '',
    `MEAN SCORE BY ROUND SO FAR: ${scoreHistory.length ? scoreHistory.map((s, i) => `r${i + 1}=${s.toFixed(2)}`).join('  ') : 'first round'}`,
    scoreHistory.length >= 2 && scoreHistory[scoreHistory.length - 1] <= scoreHistory[scoreHistory.length - 2]
      ? 'The last revision did NOT improve the score. Change approach rather than intensifying the same wording.'
      : '',
    '',
    'Rewrite the correction block.',
  ].join('\n');

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: REFINER_ROLE },
      { role: 'user', content: userText },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'refinement', strict: true, schema: refinementSchema },
    },
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error('Refiner returned no content.');
  const parsed = JSON.parse(raw) as Refinement;

  // The limit is enforced here rather than trusted to the instruction, because a block that
  // silently grows past it is exactly the failure the cap exists to prevent.
  if (parsed.correction.length > MAX_CORRECTION_CHARS) {
    parsed.correction = parsed.correction.slice(0, MAX_CORRECTION_CHARS);
  }
  return parsed;
}

/**
 * Guard against the one failure that matters. The refiner is told not to improve the item; this
 * checks whether it did anyway, because an instruction is not an enforcement mechanism and the
 * cost of missing it is a product that quietly misrepresents used goods.
 *
 * Deliberately crude and deliberately noisy: it flags for a human rather than editing silently.
 */
const BEAUTIFY_PATTERNS: { re: RegExp; why: string }[] = [
  { re: /\b(remove|erase|eliminate|hide|conceal|minimi[sz]e|reduce|soften)\b[^.]{0,60}\b(stain|scratch|scuff|dent|chip|crack|tear|wear|damage|rust|dirt|mark|blemish|fading)/i,
    why: 'proposes removing or downplaying real damage' },
  { re: /\b(clean|polish|restore|repair|refinish|renew|refresh|rejuvenate)\b[^.]{0,40}\b(the )?(item|product|surface|upholstery|paint|finish)/i,
    why: 'proposes restoring the item' },
  { re: /\bmake (it|the item|the product)[^.]{0,40}\b(look )?(new|newer|cleaner|pristine|immaculate|flawless)/i,
    why: 'proposes making the item look better than it is' },
  { re: /\b(like[- ]new|showroom condition|as[- ]new|mint condition)\b/i,
    why: 'introduces a condition claim' },
];

export function findBeautifyRisks(correction: string): string[] {
  return BEAUTIFY_PATTERNS.filter((p) => p.re.test(correction)).map((p) => p.why);
}
