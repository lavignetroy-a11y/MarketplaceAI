// The scene lock: what makes a set of images read as one photo shoot.
//
// THE PROBLEM THIS SOLVES
//
// A campaign's images kept coming back as several different rooms. A dining table present in the
// hero and gone from the next shot. A rug in one, bare wood in another. Different walls, different
// art, different light. Each image was individually plausible and the set was obviously fake,
// because no photographer shoots five pictures of one chair in five different houses.
//
// TWO CAUSES, BOTH ARCHITECTURAL
//
// 1. The analysis produces `environmentDescription` -- a deterministic campaign environment, which
//    the master logic document devotes a whole stage to -- and the pipeline never sent it to the
//    image model. It was computed, stored, and dropped. Each shot's prompt was written
//    independently by the planner, so each one imagined its own room.
//
// 2. The hero was passed to later shots as a REFERENCE IMAGE, on the theory that attaching it
//    would carry the room across. It does not. An edit model handed several references averages
//    them; it does not treat one as a set to be matched. The document even admits this about
//    hero_reference mode -- "it will not produce an identical background" -- and then relies on it
//    anyway.
//
// THE FIX
//
// Read the room out of the hero AFTER it exists, as text, and put that text in every subsequent
// prompt. Text transfers where a reference image does not: "matte off-white walls, wide plank
// white-oak floor running left to right, single window at frame left with sheer linen curtains" is
// reproducible, and gets reproduced. A picture of those things, attached alongside five others,
// is just more pixels to average.
//
// Deriving it from the generated hero rather than from the plan matters. The plan describes a room
// somebody intended; the hero is the room that actually got built. Everything downstream has to
// match what exists, not what was hoped for.

import type OpenAI from 'openai';
import type { AnalysisResult, SourcePhoto } from './types';

export type SceneLock = {
  /** Walls, ceiling, trim, doorways, windows -- the fixed shell of the room. */
  room: string;
  /** Floor or supporting surface: material, tone, direction, condition. */
  ground: string;
  /** Direction, quality, colour and source of the light, stated so it can be reproduced. */
  light: string;
  /**
   * Every object in the room besides the item, with its position. This is the clause that stops a
   * dining table existing in one frame and not the next.
   */
  contents: string[];
  /**
   * Things explicitly NOT in this room. Naming absences is what stops later shots quietly adding a
   * plant, a rug, or a second table to fill space the camera move opened up.
   */
  absent: string[];
  /** The item exactly as it appears in the hero, so it stays the same object across the set. */
  item: string;
  /** Where the item sits in the room and how it is arranged, so the camera can move around it. */
  placement: string;
};

const sceneSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    room: { type: 'string' },
    ground: { type: 'string' },
    light: { type: 'string' },
    contents: { type: 'array', items: { type: 'string' } },
    absent: { type: 'array', items: { type: 'string' } },
    item: { type: 'string' },
    placement: { type: 'string' },
  },
  required: ['room', 'ground', 'light', 'contents', 'absent', 'item', 'placement'],
} as const;

const READER_ROLE = `
You are writing the continuity notes for a photo shoot that is already underway.

The first photograph has been taken. Every remaining photograph must look like it was taken in the
same room, on the same afternoon, of the same object, by the same photographer who simply moved
around. Your notes are the only thing carrying that continuity, because the person taking the
remaining shots will never see this image -- they will only read what you write.

So describe what is actually in this photograph, precisely enough to rebuild it.

BE SPECIFIC IN THE WAY THAT REPRODUCES
"A nice living room" rebuilds nothing. "Matte off-white walls, a plain white skirting board about
four inches high, wide-plank white-oak flooring running left to right across the frame" rebuilds
the room. Give colours with undertones, materials with finishes, and directions and positions for
everything. Where something has a position, say where it is relative to the item.

CONTENTS AND ABSENCES BOTH MATTER
List every object in the room besides the item itself, with its position -- furniture, rugs, art,
plants, lamps, fixtures, outlets, doorways. Then list what is NOT there. The absences are not
padding: a later shot from a wider angle has empty space to fill, and without being told the room
contains no rug, no plant and no second table, it will invent them. If the hero has a dining table,
say so and describe it. If it does not, "no table of any kind" belongs in the absences.

THE ITEM
Describe the object being sold exactly as it appears here -- form, proportions, materials, colour,
hardware, stitching, and every visible mark, stain, scuff or wear with its location. This is what
keeps it the same object from shot to shot. Include the quantity and, if there are several, how
they are arranged relative to one another.

LIGHT
State the direction the light comes from, what it comes through, its colour and softness, and where
the shadows fall. Every later shot has to obey the same lighting, whatever angle it is taken from.

Write plainly and densely. No adjectives that carry no information. No commentary.
`.trim();

/**
 * The hero's half of the scene story: the room the campaign CHOSE, before one exists to read.
 *
 * The comment at the top of this file records that `environmentDescription` was computed and
 * dropped. Reading the room back out of the hero fixed continuity across the set but not this,
 * because it can only propagate whatever the hero came back with -- and the hero is produced by an
 * edit call anchored on the seller's own photographs, which is an enormous pull toward the seller's
 * own garage. Continuity then faithfully carries the garage into all twelve images.
 *
 * So the room is prescribed first and read back second. The planner decides the room, the hero is
 * told to build it, and `readSceneFromHero` records whatever actually got built so the rest of the
 * set matches reality rather than intent.
 */
export function plannedSettingClause(environmentDescription: string): string {
  const description = environmentDescription.trim();
  if (!description) return '';
  return `
THE SET -- BUILD THIS ROOM, DO NOT INHERIT ONE
Every photograph in this series happens in one room, and that room is described below. It is not
taken from the reference photographs. Their backgrounds are evidence about the item and nothing
else, and whatever the seller happened to be standing in -- a garage, a driveway, a storage room,
a cluttered corner, a room mid-move -- is discarded.

Build this room instead:

${description}

Place the item in that room and photograph it there. Nothing from the reference photographs' own
surroundings appears in the frame: no garage door, no concrete slab, no driveway or yard, no
storage racks, boxes, bins, laundry, tools, other items for sale, or parked cars. If a reference
shows the item in one of those places, it is simply somewhere else today.
`.trim();
}

export async function readSceneFromHero(
  client: OpenAI,
  heroPng: Buffer,
  analysis: AnalysisResult,
): Promise<SceneLock> {
  const model = process.env.OPENAI_TEXT_MODEL || 'gpt-4o';

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: READER_ROLE },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text:
              `The item being sold is: ${analysis.productIdentity.itemType}, quantity ` +
              `${analysis.productIdentity.quantity}.\n` +
              `Known condition: ${analysis.conditionSummary.join('; ') || 'not specified'}.\n\n` +
              `Write the continuity notes for this photograph.`,
          },
          {
            type: 'image_url',
            image_url: { url: `data:image/png;base64,${heroPng.toString('base64')}`, detail: 'high' },
          },
        ],
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'scene_lock', strict: true, schema: sceneSchema },
    },
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error('Scene reader returned no content.');
  return JSON.parse(raw) as SceneLock;
}

/**
 * The clause injected into every shot after the hero.
 *
 * It goes into the SHOT half of the prompt rather than the style contract, because it must outrank
 * anything the photographic brief says about settings. A contract that suggests "an ordinary
 * well-kept home" and a scene lock that says "this specific room" cannot both be advisory.
 */
export function sceneClause(lock: SceneLock, includeItem = true): string {
  // The item half is suppressed whenever a product lock is carrying the object, and it should
  // always be. This description is read out of the GENERATED hero, so if the hero drifted from the
  // real item, this is a precise description of the drift -- and sitting next to a product lock
  // read from the actual photographs, it is a second, contradictory specification. Two of those in
  // one prompt is worse than either alone.
  const itemSection = includeItem
    ? `
THE ITEM -- the same physical object, unchanged
${lock.item}
`
    : '';
  return `
THE SET -- ALREADY BUILT, ALREADY LIT, DO NOT REDESIGN IT
This photograph belongs to a series. An earlier photograph in the same series has already been
taken, in a real room, and everything below is a record of that room as it exists. You are not
choosing a location. You are the same photographer, in the same room, on the same afternoon, who
has moved to a different position. Only the camera moves.

ROOM
${lock.room}

FLOOR / SUPPORTING SURFACE
${lock.ground}

LIGHT -- identical in every shot, whatever the camera angle
${lock.light}

WHAT IS IN THIS ROOM (each of these exists and stays put)
${lock.contents.length ? lock.contents.map((c) => `- ${c}`).join('\n') : '- nothing besides the item'}

WHAT IS NOT IN THIS ROOM (do not add any of it)
${lock.absent.length ? lock.absent.map((a) => `- ${a}`).join('\n') : '- nothing further'}
Anything not listed under WHAT IS IN THIS ROOM is not there. If moving the camera opens up empty
space, the space stays empty. Do not furnish it, decorate it, or fill it with plants, rugs, art, or
tables to improve the composition. An empty corner is correct.

${itemSection}
PLACEMENT
${lock.placement}
The item does not move between shots. It is not re-arranged, re-oriented, or re-staged. If this
shot needs a different view of it, the CAMERA goes to that view.

CONTINUITY IS NOT OPTIONAL
A buyer scrolling this listing sees these photographs one after another. If the floor changes, or a
table appears, or the light swings to the other side, they will conclude the photographs are fake
and stop reading. Matching the set matters more than making this individual frame attractive.
`.trim();
}
