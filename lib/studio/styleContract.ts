// The style contract every generated site image shares.
//
// This is the single most important file in the studio. Site imagery fails not because any one
// picture is bad but because twenty good pictures don't look like they came from the same place.
// Every prompt is STYLE_CONTRACT + subject + shot role, so lighting, lens character, colour and
// realism stay locked across all images while only the subject changes.
//
// Edit this and every image re-generates in the new style. That's the point.

export const STYLE_CONTRACT = `
PHOTOGRAPHIC STYLE — apply to this image exactly.

CAMERA AND LENS
Shot on a full-frame mirrorless camera with a 45mm prime at f/8. Natural, undistorted
perspective. Camera at chest height unless the shot specifies otherwise.
DEEP FOCUS: the entire frame is in focus, front to back — the subject and the background alike.
Do not blur, soften, or smear the background. Background objects must be rendered with real,
resolvable detail: individual leaves, distinct blades of grass, readable brick and timber edges.
Simulated shallow depth of field is the most common failure in this set — a background that is
soft but not *optically* soft reads instantly as fake. When in doubt, render it sharp.

LIGHT
Single large window as the key light, positioned camera-left, out of frame. Soft, directional
midday daylight, slightly warm (about 5200K). Gentle fill from a pale wall camera-right so
shadows stay open and detailed rather than black. Soft-edged contact shadows where objects meet
the floor. No hard sun shafts, no visible artificial fixtures, no coloured gels, no rim lighting.
If THIS SHOT places the subject outdoors or names a different light source, follow the shot —
but keep the same soft, even, slightly warm daylight quality and the same single, consistent
light direction. The light must always feel like the same photographer on the same day.

COLOUR AND FINISH
Warm neutral palette: soft whites and greige, warm honey-toned wood, cream and oatmeal
textiles wherever such surfaces appear. Accurate white balance. Natural contrast with clean
highlights and open shadows. Subtle film-like grain. No HDR, no glow, no vignette, no heavy
colour grading, no teal-and-orange look, no oversaturation.

SETTING
The default is an ordinary, well-kept modern home — the kind a real person actually lives in.
Uncluttered but not empty or staged-looking. A believable amount of restraint: bare walls with
at most one simple framed print, a plain floor, occasionally a single plant. Never a showroom,
never a luxury magazine interior, never an obviously virtual staging.
THIS SHOT may name a different location — a driveway, a garage, a laundry alcove. When it does,
that location replaces this one entirely; carry the same restraint, the same ordinariness, and
the same warm neutral treatment across to it.
Outdoors, keep a simple built backdrop close behind the subject — a garage door, a fence, a
plain wall. Avoid deep views into distant tree lines and open foliage; that is where rendering
breaks down and the picture starts to look generated.

REALISM — non-negotiable
Correct scale and proportion. Objects rest convincingly on the floor with proper contact
shadows. Coherent single light direction across the whole frame. Straight vertical lines,
correct perspective, no warping. Real material response — fabric reads as fabric, wood as wood,
steel as steel. Subtle imperfection is welcome: a slight floor grain variation, a soft crease in
upholstery, a scuff on a skirting board.

NEVER INCLUDE
No people, no hands, no pets. No text, letters, numbers, logos, watermarks, badges, brand marks,
or signage of any kind — controls, dials, and panels are plain and unmarked. No borders, frames,
collages, or split panels. No UI elements or graphic overlays. No duplicated or intersecting
objects. No floating items. No CGI, 3D-render, or plastic-looking surfaces. No fisheye or
wide-angle distortion. No visible AI artefacts.

OUTPUT
A single photograph. Photorealistic. Nothing else in the frame beyond what is described.
`.trim();

/** Extra clause used when the shot must match an item already established elsewhere on the site. */
export const CONSISTENCY_CLAUSE = `
CONSISTENCY — this matters more than making the picture attractive.
The item shown must be the same physical object as in the reference photographs provided:
identical silhouette, proportions, upholstery pattern, stitching, seam placement, leg shape,
wood tone, and colour. Do not restyle, redesign, clean up, or "improve" the item. Change only
the camera position, framing, and surrounding room as this shot specifies.
`.trim();

// The "before" photo is the hardest image in the set to get right, and the one that carries the
// most weight. Two failure modes to design against:
//
//   1. It comes back mildly imperfect instead of bad. Then the after has nowhere to travel and
//      the comparison sells nothing.
//   2. It comes back set somewhere else -- a garage, a different room. Then the pair reads as
//      "we relocate your item", which is not what this product does and is exactly the fakery
//      buyers call out in listing comments.
//
// So: genuinely bad photography, same room, same item. The room and the object are constants;
// only the photography changes. That is the entire product promise in one image pair.
export function amateurClause(badLight: string, clutter: string): string {
  return `
THIS IS A "BEFORE" PHOTO — a bad one, deliberately. Getting this wrong ruins the comparison.

WHO TOOK IT
An ordinary seller holding a phone in one hand, not paying much attention, trying to get it
listed quickly. They are not a photographer and made no effort.

HOW IT LOOKS — apply all of these
Shot on an older phone camera. Held at standing eye height and angled down at the item, so the
verticals converge and the item looks squat. Visibly tilted a few degrees off level. The item is
awkwardly placed in the frame — pushed off-centre, sitting too low, with part of it clipped by
the frame edge and dead space where it isn't needed.
The light is bad and unflattering: ${badLight}. No clean white anywhere in the frame. Mildly
underexposed with murky, blocked-up shadows. Visible sensor noise in the darker areas. Slightly
soft from a small hand-shake, and lower resolution overall.

THE PLACE
Exactly the same location as the reference photograph — same walls, same ground, same
surroundings, same fixed features, viewed from a different spot. It has simply not been tidied
for the photo: everyday clutter is plainly in shot around and behind the item — ${clutter}.

OVERRIDE
This clause overrides the CAMERA AND LENS, LIGHT, COLOUR AND FINISH, and SETTING sections above
in full — including deep focus. Every REALISM and NEVER INCLUDE rule stays in force.

WHAT MUST NOT CHANGE
The item itself is identical to the reference: same object, same colour, same materials, same
wear, in the same place. Do not substitute a different or shabbier item. It is the photograph
that is bad, not the thing being sold.
`.trim();
}

/**
 * Binds a shot to a previously generated image of the same item. Used for the before/after pairs
 * and for alternate angles, so a category's shots show one object in one room rather than
 * several near-misses.
 */
export const SAME_SCENE_CLAUSE = `
SAME ITEM, SAME ROOM — treat the reference photograph as ground truth.
The object in the reference and the object here are the same physical thing, and the room is the
same room. Match the item's exact shape, colour, materials, hardware, and visible wear, and match
the room's wall colour, flooring, window position, and furniture. Only the camera position,
framing, and photographic treatment change.
`.trim();
