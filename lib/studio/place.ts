// A location, described once, as a place rather than as a list of props.
//
// This exists because of a specific and repeated failure. Shots were given surroundings as
// isolated facts -- "left: brick wall", "right: lawn and fence" -- and a model handed isolated
// facts renders isolated facts. Nothing said the brick wall and the garage were the same
// building, so one frame came back with brick on the left and white render on the right.
// Nothing said the lawn was a permanent feature of that address, so it disappeared when the
// camera turned. Nothing described how surfaces meet, so a brick corner appeared in a frame
// whose sightline made it impossible.
//
// None of those are prompt-obedience problems. They are all the same problem: the model was
// never given a place to be consistent ABOUT. So a Place is described the way a location scout
// describes a set -- one continuous environment, every surface named once with its material,
// the joins between them stated, and the fixed features listed as things that exist whether or
// not the camera happens to be pointing at them.
//
// Bearings are given on a clock face centred on the item, with 12 o'clock the direction the
// item's own front faces. That is unambiguous without needing real-world compass points, and it
// survives the item being described in any orientation.

export type Structure = {
  /** where it stands, as a clock bearing from the item: '12', '3', '4-8', etc. */
  at: string;
  /** what it is and what it is made of -- material stated every time, so it cannot drift */
  what: string;
  /** how it meets whatever is beside it, so corners and joins are renderable rather than invented */
  meets?: string;
};

export type Place = {
  /** one line naming the location as a whole */
  name: string;
  /** the surface underfoot, edge to edge */
  ground: string;
  /** everything standing in the location, at clock bearings from the item */
  structures: Structure[];
  /**
   * Things that are simply there, whatever the camera is doing. Listing them separately from
   * structures is what stops them evaporating when the camera turns away and then back.
   */
  fixtures: string[];
  /** where the light comes from, stated once so it cannot move between frames */
  light: string;
};

/**
 * The set description. Identical in every shot of a given item, which is the entire point --
 * consistency comes from every frame being handed the same place, not from each frame being
 * told to match the last one.
 */
export function describePlace(p: Place): string {
  const structures = p.structures
    .map((s) => `  · ${s.at} o'clock — ${s.what}${s.meets ? `. ${s.meets}` : ''}`)
    .join('\n');

  return `
THE SET — one real location. Every photograph of this item is taken here.

Bearings below are given on a clock face laid on the ground around the item, with 12 o'clock the
direction the item's own front faces, 3 o'clock off its right flank, 6 behind it, 9 off its left.
These do not change between photographs, because the item does not move.

LOCATION
${p.name}

GROUND
${p.ground}

WHAT STANDS AROUND IT
${structures}

ALWAYS PRESENT
These exist whether or not the camera is pointed at them. When the framing includes where they
are, they are in shot; they never vanish and never relocate.
${p.fixtures.map((f) => `  · ${f}`).join('\n')}

LIGHT
${p.light}
`.trim();
}

/**
 * The failure classes that give a fabricated set away -- stated as a checklist, because the
 * giveaways are systematic rather than random and a model can be asked to check for them.
 *
 * Each line here was earned by an actual defect in a generated set. Adding a rule for the
 * specific thing that went wrong last time is how you end up playing whack-a-mole forever;
 * naming the CLASS of error is what generalises.
 */
export const CONTINUITY_CONTRACT = `
CONTINUITY — check every one of these before settling on the image.

1. MATERIALS DO NOT CHANGE. A wall that is brick is brick along its whole length and in every
   photograph, including where it turns a corner and where only a sliver of it shows. A building
   is made of what it is made of; two walls of one building do not have different materials
   unless that is stated above.

2. NOTHING APPEARS THAT IS NOT LISTED. No extra fences, hedges, trees, vehicles, buildings,
   planters or paths. If it is not in the set description it is not at this location.

3. NOTHING VANISHES. If the framing includes the ground where a listed fixture stands, that
   fixture is in the picture. Things do not get tidied away between photographs.

4. THE SIGHTLINE MUST BE POSSIBLE. Work out what the camera can actually see from where it is
   standing, given what is between it and the horizon. A structure at 9 o'clock cannot appear in
   a frame shot from 9 o'clock looking inward -- the camera is standing where it is. If a corner
   of something is visible, the geometry has to allow that corner to be seen from here.

5. GROUND IS CONTINUOUS. The surface underfoot is the same material across every frame, meeting
   its neighbours at the same edges. Concrete does not become asphalt; a lawn edge does not move.

6. LIGHT DOES NOT MOVE. Same source, same direction, same time of day, same weather in every
   photograph. Shadows fall the same way relative to the location, which means they fall
   differently relative to the FRAME as the camera moves -- that is correct and expected.

7. THE ITEM DOES NOT MOVE. It stays on the same spot, at the same bearing, in the same
   orientation, for every photograph in the set. Only the camera moves.
`.trim();
