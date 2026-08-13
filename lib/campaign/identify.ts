// Working out exactly what the thing is -- the step everything else depends on.
//
// WHY THIS IS ITS OWN MODULE, AND WHY IT LOOKS LIKE THIS
//
// Asked "what make model and year is this item?", a chat assistant answered "GE GTW460ASJWW,
// 4.2 cu ft, manufactured September 2015 to January 2021" -- and the trace of how it got there is
// the specification for this file:
//
//     Inspected appliance labels to identify the model
//     Enhanced and cropped the model label region
//     Searched 7 websites
//     Zoomed washer control panel knobs
//     Searched 2 websites
//     Verified the serial year code
//     Searched 8 websites
//
// Not one call. A loop: find the label, crop it, zoom in, read it, look it up, check the answer
// against a second source. Our identification was a single vision call over downscaled whole
// photographs, which is why it produced "GE washer and dryer set" and, once, a brand it had
// invented outright.
//
// WHY IT MATTERS MORE THAN ANYTHING ELSE HERE
//
// Naming the exact product converts image generation from RECONSTRUCTION into RECALL. Asked for
// "a white top-load washer", an image model averages every washer it has seen -- which is what
// produced a different control panel in every frame of a set. Asked for a GE GTW460ASJWW, it draws
// that one, with the right dials in the right order and the cycle names spelled correctly, because
// it has seen it thousands of times. That is the entire difference between the control panel image
// the chat assistant produced and the eight the pipeline produced.
//
// So identification is not a labelling nicety. It is the switch between the two quality regimes,
// and it is worth spending several calls and a minute of wall clock to get right.

import sharp from 'sharp';
import type OpenAI from 'openai';
import type { SourcePhoto } from './types';

export type IdentificationConfidence = 'confirmed' | 'probable' | 'unknown';

export type Identification = {
  itemType: string;
  category: string;
  isMatchingSet: boolean;
  brand: string | null;
  model: string | null;
  productionYears: string | null;
  confidence: IdentificationConfidence;
  /** How it was worked out, in a few words. Shown to the seller when it drives a claim. */
  basis: string;
  /**
   * Where readable lettering actually lives, as a fraction of each photo's area.
   *
   * Used to answer a question that decides production mode and cannot be answered any other way:
   * does a source photograph show this text CLOSE ENOUGH TO EDIT? A control panel occupying 2% of
   * a wide driveway shot technically "appears in" that photo, and editing it produces the wide
   * driveway shot again -- so anchoring a panel close-up to it is worse than useless. A panel
   * filling a third of the frame is a real close view and beats any amount of recall.
   */
  textRegions: { photoIndex: number; areaFraction: number; what: string }[];
  /**
   * What this exact product looks like, written from knowledge rather than from the photographs.
   *
   * This is what makes recall possible. A shot of a control panel nobody photographed can still be
   * produced correctly if the brief says "four rotary knobs, Load Size at far left, Temperature
   * second, the large cycle selector third with Deep Fill above it, Options at far right, GE badge
   * lower left, six progress lamps beneath the cycle dial" -- because that is a description of one
   * real product, not of a category.
   */
  knownDesign: string;
};

export const UNKNOWN_IDENTIFICATION: Identification = {
  itemType: '',
  category: '',
  isMatchingSet: false,
  brand: null,
  model: null,
  productionYears: null,
  confidence: 'unknown',
  basis: 'identification did not run',
  textRegions: [],
  knownDesign: '',
};

/** "GE GTW460ASJWW", or null when it was never pinned down. */
export function productName(id: Identification): string | null {
  return [id.brand, id.model].filter(Boolean).join(' ').trim() || null;
}

/**
 * Whether this identification is solid enough to draw from.
 *
 * "probable" is deliberately included. Waiting for certainty means never using the mechanism: a
 * model recognised from its control layout with no legible plate is exactly the case that carries
 * a set, and the cost of being wrong is bounded -- the photographs still govern everything
 * visible, and the seller is told the identification is probable rather than confirmed.
 */
export function isUsable(id: Identification): boolean {
  return id.confidence !== 'unknown' && Boolean(id.brand);
}

// ---------------------------------------------------------------------------
// step 1 -- find the labels
// ---------------------------------------------------------------------------

const regionsSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    regions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          photoIndex: { type: 'integer' },
          what: { type: 'string' },
          x: { type: 'number' },
          y: { type: 'number' },
          width: { type: 'number' },
          height: { type: 'number' },
        },
        required: ['photoIndex', 'what', 'x', 'y', 'width', 'height'],
      },
    },
  },
  required: ['regions'],
} as const;

type Region = {
  photoIndex: number;
  what: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

async function encode(source: SourcePhoto, maxEdge: number): Promise<string> {
  const buf = await sharp(source.data)
    .rotate()
    .resize(maxEdge, maxEdge, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

/**
 * Crops a fractional region out of the ORIGINAL photograph, at full resolution.
 *
 * The point of the whole exercise. A model plate occupying 3% of a 4000px photograph is roughly
 * 120px wide; downscale that photograph to 1024 for analysis and the plate is 30px and completely
 * unreadable. Cropped from the original and enlarged, the same plate is legible -- and it is the
 * difference between reading "GTW460ASJWW" and guessing a brand.
 */
async function cropRegion(source: SourcePhoto, region: Region): Promise<string | null> {
  try {
    const img = sharp(source.data).rotate();
    const meta = await img.metadata();
    const W = meta.width ?? 0;
    const H = meta.height ?? 0;
    if (!W || !H) return null;

    // A little margin, since a box drawn from a downscaled view tends to clip the edges.
    const pad = 0.04;
    const left = Math.max(0, Math.round((region.x - pad) * W));
    const top = Math.max(0, Math.round((region.y - pad) * H));
    const width = Math.min(W - left, Math.round((region.width + pad * 2) * W));
    const height = Math.min(H - top, Math.round((region.height + pad * 2) * H));
    if (width < 16 || height < 16) return null;

    const buf = await sharp(source.data)
      .rotate()
      .extract({ left, top, width, height })
      // Enlarge small crops rather than sending a postage stamp. Lanczos keeps stamped and
      // etched lettering readable in a way a plain upscale does not.
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: false, kernel: 'lanczos3' })
      .sharpen()
      .jpeg({ quality: 92 })
      .toBuffer();
    return `data:image/jpeg;base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

async function locateLabels(
  client: OpenAI,
  model: string,
  sources: SourcePhoto[],
): Promise<Region[]> {
  const images = await Promise.all(sources.map((s) => encode(s, 1024)));
  const completion = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content:
          'Find every region in these photographs that carries IDENTIFYING TEXT OR MARKINGS: ' +
          'model and serial plates, data labels, rating stickers, brand badges and logos, ' +
          'control panels with printed setting names, stamped or moulded lettering, warning ' +
          'labels that carry a model number, VIN plates, hallmarks.\n\n' +
          'Return each as a box in FRACTIONS of the image, where x and y are the top-left corner ' +
          'and 0,0 is the top-left of the photograph: x=0.5, y=0.1, width=0.2, height=0.05 means ' +
          'a wide thin strip starting halfway across, near the top.\n\n' +
          'Be generous -- include anything that MIGHT carry a model number, even if it is small, ' +
          'blurry, angled or partly hidden. It will be cropped and enlarged before being read, so ' +
          'illegible-at-this-size is not a reason to leave it out. That is the point. ' +
          'Return an empty list only if there is genuinely no lettering anywhere.',
      },
      {
        role: 'user',
        content: images.flatMap((url, i) => [
          { type: 'text' as const, text: `PHOTO ${i}:` },
          { type: 'image_url' as const, image_url: { url, detail: 'high' as const } },
        ]),
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'label_regions', strict: true, schema: regionsSchema },
    },
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) return [];
  const parsed = JSON.parse(raw) as { regions: Region[] };
  return (parsed.regions ?? []).filter(
    (r) =>
      sources[r.photoIndex] !== undefined &&
      r.width > 0 &&
      r.height > 0 &&
      r.x >= 0 &&
      r.y >= 0 &&
      r.x < 1 &&
      r.y < 1,
  );
}

// ---------------------------------------------------------------------------
// step 2 -- identify, with the crops and the web
// ---------------------------------------------------------------------------

const identifySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    itemType: { type: 'string' },
    category: { type: 'string' },
    isMatchingSet: { type: 'boolean' },
    brand: { type: ['string', 'null'] },
    model: { type: ['string', 'null'] },
    productionYears: { type: ['string', 'null'] },
    confidence: { type: 'string', enum: ['confirmed', 'probable', 'unknown'] },
    basis: { type: 'string' },
    knownDesign: { type: 'string' },
  },
  required: [
    'itemType',
    'category',
    'isMatchingSet',
    'brand',
    'model',
    'productionYears',
    'confidence',
    'basis',
    'knownDesign',
  ],
} as const;

const IDENTIFY_ROLE = `
You are identifying a specific second-hand item from photographs, so that images of it can be
produced accurately. Work like somebody who is going to be held to the answer.

WHY THIS MATTERS MORE THAN IT LOOKS
Naming the exact product turns image generation from guesswork into recall. "A white top-load
washer" makes an image model average every washer it has ever seen. "GE GTW460ASJWW" makes it draw
that one, with the right dials in the right order. Getting this right is worth real effort.

HOW TO WORK
1. Read the close-up crops first. They are label regions cut from the original photographs at full
   resolution and enlarged, so lettering that was unreadable in the wide shots is often legible
   here. Model plates, rating stickers, badges, moulded text.
2. Read the design. A mass-produced item is identified as reliably by its layout as by a badge:
   the number and order of the control knobs, the shape of a door or lid, the console profile, the
   trim, the proportions. Say what you recognise and from what.
3. SEARCH THE WEB when you have a candidate or a partial number. Confirm the model exists, that
   its appearance matches, and when it was produced. Search again to check the answer from a
   second source. A partial or blurry code is often enough to find the full one.
4. Then commit, and say how sure you are.

CONFIDENCE, HONESTLY
  confirmed -- a model number was legible, or a search confirmed a design match beyond doubt.
  probable  -- recognised from design with good reason, no legible plate.
  unknown   -- genuinely could not pin it down, or the item is unbranded (most furniture, most
               jewellery). Say so plainly and move on; do not strain to produce a number.
A wrong model number is a false specification about goods for sale. Prefer a confident brand with
a null model over an invented model number, and prefer "unknown" over a guess dressed up.

FORK BY WHAT THE ITEM IS
  vehicle     year, make, model AND trim -- trim changes bumpers, wheels, lights and exhausts.
  appliance   brand, model number, capacity, configuration (top or front load, gas or electric),
              and the production years of that model.
  tool        brand, model, and the variant that decides its appearance.
  electronics brand, model line and generation -- the generation decides the ports and the case.
  furniture   usually unbranded. Check for a maker's label, then say unknown without apology.

knownDesign IS THE PAYLOAD. When you have identified the product, write down what that exact
product LOOKS like, from your own knowledge rather than from these photographs -- this text is what
lets a view nobody photographed be drawn correctly. Be concrete and spatial: the number of controls
and their order left to right, what each is labelled, badge positions, door and lid shapes, handle
style, panel profiles, the finish. For an appliance, the control panel deserves a sentence of its
own naming the controls in order.
Describe the product AS SOLD AND NEW here. Its condition, wear and damage come only from the
photographs, never from this. Leave knownDesign empty if confidence is "unknown".
`.trim();

/**
 * The identification pass, with web search when the account supports it.
 *
 * Falls back to a plain vision call if the Responses API or the search tool is unavailable, since
 * an identification without search still beats no identification, and a hard failure here would
 * take down a campaign over an optional capability.
 */
async function identifyWithSearch(
  client: OpenAI,
  model: string,
  overview: string[],
  crops: { what: string; url: string }[],
  sellerNotes: string,
): Promise<Identification | null> {
  const content = [
    {
      type: 'input_text' as const,
      text:
        `Seller notes: ${sellerNotes.trim() || 'none provided'}\n\n` +
        `${crops.length} close-up crop(s) of label and marking regions are attached first, ` +
        'cut from the original photographs at full resolution and enlarged. Then the wide ' +
        'photographs. Identify the item.',
    },
    ...crops.flatMap(({ what, url }) => [
      { type: 'input_text' as const, text: `CROP -- ${what}:` },
      { type: 'input_image' as const, image_url: url, detail: 'high' as const },
    ]),
    { type: 'input_text' as const, text: 'WIDE PHOTOGRAPHS:' },
    ...overview.map((url) => ({
      type: 'input_image' as const,
      image_url: url,
      detail: 'high' as const,
    })),
  ];

  const response = await client.responses.create({
    model,
    instructions: IDENTIFY_ROLE,
    input: [{ role: 'user', content }],
    tools: [{ type: 'web_search_preview' }],
    text: {
      format: {
        type: 'json_schema',
        name: 'identification',
        strict: true,
        schema: identifySchema as unknown as Record<string, unknown>,
      },
    },
  });

  const text = response.output_text;
  if (!text) return null;
  return JSON.parse(text) as Identification;
}

async function identifyWithoutSearch(
  client: OpenAI,
  model: string,
  overview: string[],
  crops: { what: string; url: string }[],
  sellerNotes: string,
): Promise<Identification> {
  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: `${IDENTIFY_ROLE}\n\n(No web search is available on this call.)` },
      {
        role: 'user',
        content: [
          {
            type: 'text' as const,
            text: `Seller notes: ${sellerNotes.trim() || 'none provided'}`,
          },
          ...crops.flatMap(({ what, url }) => [
            { type: 'text' as const, text: `CROP -- ${what}:` },
            { type: 'image_url' as const, image_url: { url, detail: 'high' as const } },
          ]),
          { type: 'text' as const, text: 'WIDE PHOTOGRAPHS:' },
          ...overview.map((url) => ({
            type: 'image_url' as const,
            image_url: { url, detail: 'high' as const },
          })),
        ],
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'identification',
        strict: true,
        schema: identifySchema as unknown as Record<string, unknown>,
      },
    },
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error('Identification returned no content.');
  return JSON.parse(raw) as Identification;
}

/** How many label crops are worth sending. Beyond this they are mostly duplicates. */
const MAX_CROPS = 6;

/**
 * Which regions to actually crop, best first.
 *
 * A run found twelve regions and cropped "the first six" -- in whatever order they happened to be
 * returned. On an appliance most regions are warning stickers and cycle names; the ONE that
 * settles the model is the data plate, and taking an arbitrary six can miss it entirely. That is
 * not a small loss: three runs of this pass produced three different washer model numbers, which
 * is what an identification made from styling rather than from a plate looks like.
 *
 * So rank by what the region claims to be, then by size, since a bigger crop enlarges better.
 */
const PLATE_WORDS = /(model|serial|data|rating|plate|nameplate|spec|number|sticker|tag|badge|logo)/i;

function rankRegions(regions: Region[]): Region[] {
  return regions
    .slice()
    .sort((a, b) => {
      const plate = Number(PLATE_WORDS.test(b.what)) - Number(PLATE_WORDS.test(a.what));
      if (plate !== 0) return plate;
      return b.width * b.height - a.width * a.height;
    });
}

function summarise(regions: Region[]): Identification['textRegions'] {
  return regions.map((r) => ({
    photoIndex: r.photoIndex,
    areaFraction: Math.max(0, Math.min(1, r.width * r.height)),
    what: r.what,
  }));
}

export async function identifyItem(
  client: OpenAI,
  model: string,
  sources: SourcePhoto[],
  sellerNotes: string,
  log: (message: string) => void = () => {},
): Promise<Identification> {
  const overview = await Promise.all(sources.slice(0, 4).map((s) => encode(s, 1536)));

  // Step 1: where is the lettering?
  let crops: { what: string; url: string }[] = [];
  let found: Region[] = [];
  try {
    const regions = await locateLabels(client, model, sources);
    found = regions;
    const ranked = rankRegions(regions);
    log(
      `found ${regions.length} label region(s); reading ${Math.min(ranked.length, MAX_CROPS)}, ` +
        `plates first: ${ranked.slice(0, MAX_CROPS).map((r) => r.what).join(', ')}`,
    );
    const cropped = await Promise.all(
      ranked.slice(0, MAX_CROPS).map(async (r) => {
        const url = await cropRegion(sources[r.photoIndex], r);
        return url ? { what: `${r.what} (photo ${r.photoIndex})`, url } : null;
      }),
    );
    crops = cropped.filter((c): c is { what: string; url: string } => c !== null);
    log(`cropped ${crops.length} region(s) at full resolution`);
  } catch (err) {
    // Not fatal: identification from the wide shots alone is still worth having.
    log(`label detection failed (${err instanceof Error ? err.message : 'unknown'})`);
  }

  // Step 2: identify, preferring the path that can look things up.
  try {
    const withSearch = await identifyWithSearch(client, model, overview, crops, sellerNotes);
    if (withSearch) {
      log(
        `identified with web search: ${productName(withSearch) ?? 'nothing conclusive'} ` +
          `[${withSearch.confidence}]`,
      );
      return { ...withSearch, textRegions: summarise(found) };
    }
  } catch (err) {
    log(`web search unavailable, identifying without it (${err instanceof Error ? err.message : 'unknown'})`);
  }

  const plain = await identifyWithoutSearch(client, model, overview, crops, sellerNotes);
  log(`identified: ${productName(plain) ?? 'nothing conclusive'} [${plain.confidence}]`);
  return { ...plain, textRegions: summarise(found) };
}
