// The style contract every generated site image shares.
//
// This is the single most important file in the studio. Site imagery fails not because any one
// picture is bad but because twenty good pictures don't look like they came from the same place.
// Every prompt is STYLE_CONTRACT + subject + shot role, so lighting, lens character, colour and
// realism stay locked across all 117 images while only the subject changes.
//
// Edit this and every image re-generates in the new style. That's the point.

export const STYLE_CONTRACT = `
PHOTOGRAPHIC STYLE — apply to this image exactly.

CAMERA AND LENS
Shot on a full-frame mirrorless camera with a 45mm prime at f/4. Natural, undistorted
perspective. Camera at chest height unless the shot specifies otherwise. Sharp throughout the
subject with only gentle background falloff — not a shallow-depth-of-field portrait look.

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
highlights and open shadows. Subtle film-like grain. No HDR, no glow, no vignette, no heavy colour grading, no
teal-and-orange look, no oversaturation.

SETTING
The default is an ordinary, well-kept modern home — the kind a real person actually lives in.
Uncluttered but not empty or staged-looking. A believable amount of restraint: bare walls with
at most one simple framed print, a plain floor, occasionally a single plant. Never a showroom,
never a luxury magazine interior, never an obviously virtual staging.
THIS SHOT may name a different location — a driveway, a workshop bench, a tabletop. When it
does, that location replaces this one entirely; carry the same restraint, the same ordinariness,
and the same warm neutral treatment across to it.

REALISM — non-negotiable
Correct scale and proportion. Objects rest convincingly on the floor with proper contact
shadows. Coherent single light direction across the whole frame. Straight vertical lines,
correct perspective, no warping. Real material response — fabric reads as fabric, wood as wood.
Subtle imperfection is welcome: a slight floor grain variation, a soft crease in upholstery.

NEVER INCLUDE
No people, no hands, no pets. No text, letters, numbers, logos, watermarks, or signage of any
kind. No borders, frames, collages, or split panels. No UI elements or graphic overlays. No
duplicated or intersecting objects. No floating items. No CGI, 3D-render, or plastic-looking
surfaces. No fisheye or wide-angle distortion. No visible AI artefacts.

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

/** Extra clause for the deliberately unpolished "before" photos. */
export const AMATEUR_CLAUSE = `
DELIBERATELY UNPOLISHED — this is a "before" photo and must look like one.
Shot casually on a phone in poor conditions: flat overhead lighting, slightly cool and dull
colour, mild underexposure, a little sensor noise, imperfect framing with the item slightly
off-centre and not quite straight. The setting is a cluttered garage, storage room, or
unfinished basement — visible boxes, bins, shelving, and household clutter in the background.
The item itself is unchanged and clearly visible, just badly photographed.
Override the CAMERA, LIGHT, and SETTING sections above; keep every REALISM and NEVER INCLUDE
rule in force.
`.trim();
