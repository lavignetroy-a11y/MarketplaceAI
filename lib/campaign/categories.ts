// What a buyer of THIS kind of thing needs to see.
//
// WHY THIS IS A TABLE AND NOT A PARAGRAPH IN THE MEGAPROMPT
//
// The planning document lists category coverage in prose, buried thousands of lines into a system
// prompt. A model asked to recall the right list from that position recalls it unevenly, and there
// is nowhere to tune a category without editing a wall of text and re-reading it to check nothing
// else moved. As a table it can be handed to the planner as a hard constraint for exactly one
// category, changed in one place, and read by a person in ten seconds.
//
// THE PRINCIPLE THE TABLE ENCODES
//
// A camera angle is not automatically worth an image. What earns an image is a buyer QUESTION the
// item raises and nothing else answers. Furniture raises questions about material, wear and
// construction, so it wants close-ups. A car raises questions about panels, interior and tyres, so
// it wants a full orbit and a cabin. Jewellery raises questions about setting and clasp, so it
// wants macro and almost no context. Applying furniture logic to a car produces four beautiful
// three-quarter views and no dashboard, which is a set that tells a buyer nothing they needed.
//
// `priority` is the order coverage should be spent in as the purchased count grows, so a 4-image
// set and a 20-image set of the same item are the same campaign at different depths rather than
// two unrelated plans.

export type SubjectScope =
  | 'full_set' // every unit visible; establishes quantity
  | 'representative' // one unit standing in for the set, shown whole
  | 'detail'; // part of one unit, close in

export type CategoryShot = {
  role: string;
  /** The buyer question this shot exists to answer. If it answers none, it should not be bought. */
  answers: string;
  scope: SubjectScope;
  /** Lower numbers are bought first as the image count grows. */
  priority: number;
};

export type CategoryProfile = {
  key: string;
  /** Words that should route an item here, to make classification less of a guess. */
  matches: string[];
  shots: CategoryShot[];
  /** Anything category-specific the planner would otherwise get wrong. */
  guidance: string;
  /**
   * The ten minutes a stylist spends on THIS kind of thing before the shutter -- see
   * lib/campaign/presentation.ts for the standard these are instances of.
   *
   * Category-specific for the same reason the shot list is: the preparation a sofa needs is
   * nothing like the preparation a necklace needs, and a general instruction to "present it well"
   * produces squared cushions on the sofa and nothing at all on the necklace, because only one of
   * those is what "tidy" obviously means. Every entry here must pass the ten-minute test -- the
   * seller's own hands, no tools, no parts, no repair.
   */
  grooming: string[];
};

const FURNITURE: CategoryProfile = {
  key: 'furniture',
  matches: ['furniture', 'chair', 'sofa', 'couch', 'table', 'desk', 'dresser', 'cabinet', 'bookcase', 'bed', 'stool', 'bench', 'nightstand', 'sectional', 'ottoman'],
  shots: [
    { role: 'hero_three_quarter', answers: 'What is it and does it look good?', scope: 'representative', priority: 1 },
    { role: 'front_square', answers: 'What are its true proportions?', scope: 'representative', priority: 2 },
    { role: 'opposite_three_quarter', answers: 'What does the other side look like?', scope: 'representative', priority: 3 },
    { role: 'side_profile', answers: 'How deep is it, and what is its silhouette?', scope: 'representative', priority: 4 },
    { role: 'material_detail', answers: 'What is it actually made of?', scope: 'detail', priority: 5 },
    { role: 'condition_detail', answers: 'How worn is it really?', scope: 'detail', priority: 6 },
    { role: 'rear_view', answers: 'What does the back look like from the room?', scope: 'representative', priority: 7 },
    { role: 'seat_or_surface_top', answers: 'What does the part I touch look like?', scope: 'detail', priority: 8 },
    { role: 'leg_and_foot_condition', answers: 'Are the legs scuffed, and is the finish intact?', scope: 'detail', priority: 9 },
    { role: 'scale_context', answers: 'How big is it in a room?', scope: 'representative', priority: 10 },
  ],
  guidance:
    'Upholstery and finish carry the sale, so close-ups earn their place early -- a buyer cannot ' +
    'judge fabric from across a room. DO NOT spend an image on joinery, frame construction, or ' +
    'the underside of ordinary mass-market furniture. Nobody buying a used dining chair inspects ' +
    'its joints, and a photograph of one reads as padding. Reserve construction detail for solid ' +
    'wood, antique, handmade or designer pieces where build quality is genuinely the selling ' +
    'point. Spend those images on fabric, wear, and the seat instead.',
  grooming: [
    'Seat and back cushions sat square in their frame, front edges aligned, plumped to the loft the foam still has -- a broken-down cushion keeps its collapsed profile.',
    'Loose covers and slipcovers pulled taut at the seams and tucked in; slump wrinkles and storage folds settled out.',
    'Napped fabric -- velvet, corduroy, chenille, suede, microfibre -- brushed in ONE direction across the whole piece so it reads as a single surface with one sheen, instead of the patchy handprinted shading a phone photo picks up.',
    'Throw pillows set upright in the corners, throws folded or removed rather than slumped over an arm.',
    'Dust, lint, crumbs and pet hair off every surface; the seat vacuumed.',
    'Wood and laminate wiped free of fingerprints and smears; the finish itself unchanged.',
    'Legs and feet straight, castors aligned, the piece standing square to the floor.',
    'Drawers pushed fully in, doors closed flush, hardware hanging straight.',
  ],
};

const FURNITURE_SET: CategoryProfile = {
  key: 'furniture_set',
  matches: ['set of', 'pair of', 'dining chairs', 'matching', 'four chairs', 'six chairs', 'dining set'],
  shots: [
    { role: 'hero_full_set', answers: 'What is it and how many do I get?', scope: 'full_set', priority: 1 },
    // Only worth buying when the hero is angled or styled enough that units are hidden or hard to
    // compare. A flat, square-on hero has already done this job.
    { role: 'quantity_confirmation', answers: 'Are all the units there and do they match?', scope: 'full_set', priority: 2 },
    { role: 'representative_three_quarter', answers: 'What does one of them actually look like?', scope: 'representative', priority: 3 },
    { role: 'representative_front', answers: 'What are one unit\'s true proportions?', scope: 'representative', priority: 4 },
    { role: 'material_detail', answers: 'What is it made of?', scope: 'detail', priority: 5 },
    { role: 'condition_detail', answers: 'How worn are they?', scope: 'detail', priority: 6 },
    { role: 'representative_side', answers: 'What is the silhouette from the side?', scope: 'representative', priority: 7 },
    { role: 'representative_rear', answers: 'What does the back look like?', scope: 'representative', priority: 8 },
    { role: 'seat_surface_detail', answers: 'What does the part I sit on look like?', scope: 'detail', priority: 9 },
    { role: 'leg_and_foot_condition', answers: 'Are the legs scuffed, and is the finish intact?', scope: 'detail', priority: 10 },
  ],
  guidance:
    'THE MOST COMMON FAILURE FOR SETS IS SHOWING THE WHOLE SET IN EVERY IMAGE. Four chairs in ' +
    'every frame means every chair is small and a buyer never sees any of them properly. ' +
    'Establish quantity in the first image or two, then spend everything else on ONE ' +
    'representative unit, close enough to judge. One or two group shots is right at ANY count, ' +
    'not a proportion of it -- the fifth picture of four chairs standing together answers nothing ' +
    'the first one did, and it costs a detail shot that would have shown the buyer something. Buy ' +
    'a second group shot only when the hero leaves the count or the matching genuinely in doubt. ' +
    'The representative unit must be the SAME physical unit in every detail shot. ' +
    'DO NOT spend images on joinery or frame construction for ordinary mass-market furniture -- ' +
    'buyers of used dining chairs do not inspect joints, and such a shot reads as filler. Fabric, ' +
    'wear, the seat surface, and leg finish are what they actually want.',
  grooming: [
    'Every unit prepared to the same standard -- one groomed chair beside three untouched ones looks worse than none of them being groomed.',
    'Units spaced evenly and squared to one another, all facing the same way, on a common line.',
    'Seat and back cushions sat square and plumped to the loft their foam still has.',
    'Napped or woven upholstery brushed in one consistent direction across every unit.',
    'Dust, lint, crumbs and pet hair off every seat and rail; wood wiped free of fingerprints.',
    'Legs straight and standing square, feet aligned, no unit leaning or tipped.',
  ],
};

const VEHICLE: CategoryProfile = {
  key: 'vehicle',
  matches: ['vehicle', 'automobile', 'porsche', 'bmw', 'honda', 'toyota', 'ford', 'chevrolet', 'nissan', 'audi', 'mercedes', 'car', 'truck', 'suv', 'sedan', 'van', 'motorcycle', 'atv', 'boat', 'trailer', 'rv', 'jeep', 'coupe'],
  shots: [
    { role: 'front_left_three_quarter', answers: 'What is it and what condition is the body in?', scope: 'representative', priority: 1 },
    { role: 'front_right_three_quarter', answers: 'What does the other front corner look like?', scope: 'representative', priority: 2 },
    { role: 'rear_right_three_quarter', answers: 'What does the back end look like?', scope: 'representative', priority: 3 },
    { role: 'side_profile', answers: 'Are the panels straight and the stance right?', scope: 'representative', priority: 4 },
    { role: 'interior_dashboard', answers: 'What is the cabin like and what is the mileage?', scope: 'detail', priority: 5 },
    { role: 'front_seats', answers: 'How worn are the seats?', scope: 'detail', priority: 6 },
    { role: 'rear_left_three_quarter', answers: 'What does the fourth corner look like?', scope: 'representative', priority: 7 },
    { role: 'wheel_and_tyre', answers: 'How much tyre is left and is there curb damage?', scope: 'detail', priority: 8 },
    { role: 'rear_seats_or_cargo', answers: 'How much space is there and how worn is it?', scope: 'detail', priority: 9 },
    { role: 'body_condition_detail', answers: 'Where exactly is the damage?', scope: 'detail', priority: 10 },
  ],
  guidance:
    'All four corners matter more than beauty -- a buyer is checking panels for damage, and a ' +
    'corner you do not show is the corner they assume is bent. The interior is not optional: a ' +
    'car with no cabin photo reads as hiding something. NEVER generate a number plate, badge ' +
    'lettering, odometer reading, or VIN that is not legible in a source photo; invented text on ' +
    'a vehicle is both the most obvious artifact and a misrepresentation of a titled asset.',
  grooming: [
    'Washed and dried: road film, dust, pollen, bird mess and water spots gone, paint clean. The paint\'s own condition -- swirls, oxidation, fading, chips, scratches, dents, mismatched panels -- is untouched.',
    'Glass clean inside and out, wipers parked, no streaks.',
    'Wheels cleaned of brake dust, tyres dressed to a clean matte black, never glossy. Curb rash, cracking and worn tread stay exactly as they are.',
    'Wheels turned straight and the car standing level on a clean surface.',
    'Interior vacuumed; dashboard, console and door cards wiped free of dust and fingerprints. Floor mats straightened and seated square.',
    'Seats and carpet brushed in one direction; loose crumbs and debris gone. Cracking, splitting, staining, sun damage and worn bolsters all remain.',
    'Cabin and cargo area emptied of personal belongings, rubbish, chargers and paperwork.',
    'Doors, bonnet and boot closed, fuel flap shut, mirrors extended, aerial as it normally sits.',
  ],
};

const APPLIANCE: CategoryProfile = {
  key: 'appliance',
  matches: ['appliance', 'washer', 'dryer', 'fridge', 'refrigerator', 'dishwasher', 'oven', 'stove', 'microwave', 'freezer', 'range'],
  shots: [
    { role: 'hero_front_closed', answers: 'What is it and what does it look like installed?', scope: 'representative', priority: 1 },
    { role: 'front_square', answers: 'What are its true dimensions?', scope: 'representative', priority: 2 },
    { role: 'door_open_interior', answers: 'What is the inside like, and is it clean?', scope: 'detail', priority: 3 },
    { role: 'control_panel', answers: 'What settings does it have and do they work?', scope: 'detail', priority: 4 },
    { role: 'three_quarter', answers: 'How deep is it?', scope: 'representative', priority: 5 },
    { role: 'model_label', answers: 'Exactly which model is this?', scope: 'detail', priority: 6 },
    { role: 'condition_detail', answers: 'Where are the dents and scratches?', scope: 'detail', priority: 7 },
    { role: 'seals_and_hinges', answers: 'Are the wearing parts intact?', scope: 'detail', priority: 8 },
    { role: 'rear_connections', answers: 'How does it hook up?', scope: 'detail', priority: 9 },
    { role: 'scale_context', answers: 'Will it fit my space?', scope: 'representative', priority: 10 },
  ],
  guidance:
    'The interior and the control panel decide the sale -- an appliance shown only from outside ' +
    'looks like it is hiding a filthy drum. Open what opens. Only reproduce a model label if it ' +
    'is legible in a source photo.',
  grooming: [
    'Exterior wiped clean of dust, smears and fingerprints. Stainless steel wiped along the grain, not across it.',
    'Drum, tub or cavity wiped out and free of loose debris, lint and residue. Burnt-on marks, staining, rust spots and limescale stay.',
    'Control panel and display wiped clean; the printing on it unchanged and never sharpened or re-lettered.',
    'Door or lid closed flush unless this shot is the interior; gasket seated in its channel.',
    'Hoses and power cord coiled neatly and tucked behind, not trailing across the floor.',
    'Standing level and square, feet down, pulled far enough out that the sides are visible.',
    'Magnets, stickers, notes and anything stored on top removed.',
  ],
};

const TOOL: CategoryProfile = {
  key: 'tool',
  matches: ['tool', 'machinery', 'equipment', 'drill', 'saw', 'mower', 'sander', 'grinder', 'compressor', 'welder', 'tool chest', 'toolbox', 'generator', 'wrench', 'lathe'],
  shots: [
    { role: 'hero_three_quarter', answers: 'What is it and what condition is it in?', scope: 'representative', priority: 1 },
    { role: 'front_square', answers: 'What is its size and form?', scope: 'representative', priority: 2 },
    { role: 'controls_and_switches', answers: 'How is it operated and do the controls look intact?', scope: 'detail', priority: 3 },
    { role: 'business_end', answers: 'What condition is the working part in?', scope: 'detail', priority: 4 },
    { role: 'included_accessories', answers: 'What exactly comes with it?', scope: 'full_set', priority: 5 },
    { role: 'model_label', answers: 'Which model and what are its specs?', scope: 'detail', priority: 6 },
    { role: 'opposite_angle', answers: 'What does the other side look like?', scope: 'representative', priority: 7 },
    { role: 'wear_detail', answers: 'How hard has it been used?', scope: 'detail', priority: 8 },
    { role: 'power_and_connections', answers: 'How does it get power, and is the cord good?', scope: 'detail', priority: 9 },
    { role: 'storage_or_case', answers: 'Does it come with its case?', scope: 'detail', priority: 10 },
  ],
  guidance:
    'Buyers of used tools are buying remaining life. The working surfaces, the cord, and the ' +
    'controls tell them more than any flattering overview. Show what comes with it -- ambiguity ' +
    'about accessories kills tool listings.',
  grooming: [
    'Loose dust, sawdust, swarf, grass clippings, grease film and cobwebs brushed and wiped off. Baked-on grime, staining, paint loss and rust remain.',
    'Cord, hose or lead unwound and coiled neatly, plug visible, no tangle.',
    'Guards, covers and fences seated in their normal working position; chuck closed, blade fitted straight.',
    'Housings and grips wiped clean of hand grease; the wear on them left alone.',
    'Standing square and level on a clean surface, not leaning against something or lying on its side.',
    'Accessories laid out in an ordered row alongside it -- aligned, evenly spaced, nothing overlapping -- rather than heaped in a box.',
    'Debris bag, hopper or collection tray emptied.',
  ],
};

const JEWELRY: CategoryProfile = {
  key: 'jewelry',
  matches: ['jewelry', 'jewellery', 'ring', 'necklace', 'bracelet', 'earring', 'pendant', 'watch', 'brooch', 'chain', 'gold', 'silver', 'diamond'],
  shots: [
    { role: 'hero_presentation', answers: 'What is it and is it beautiful?', scope: 'representative', priority: 1 },
    { role: 'straight_on', answers: 'What is its true shape and proportion?', scope: 'representative', priority: 2 },
    { role: 'setting_macro', answers: 'How are the stones set and are any missing?', scope: 'detail', priority: 3 },
    { role: 'side_profile', answers: 'How high does it sit and how thick is it?', scope: 'detail', priority: 4 },
    { role: 'clasp_or_back', answers: 'Is the fastening sound?', scope: 'detail', priority: 5 },
    { role: 'hallmark', answers: 'What is it actually made of?', scope: 'detail', priority: 6 },
    { role: 'scale_reference', answers: 'How big is it really?', scope: 'representative', priority: 7 },
    { role: 'wear_detail', answers: 'How scratched or worn is it?', scope: 'detail', priority: 8 },
    { role: 'alternate_angle', answers: 'What does it look like from another side?', scope: 'representative', priority: 9 },
    { role: 'included_packaging', answers: 'Does it come with a box or papers?', scope: 'full_set', priority: 10 },
  ],
  guidance:
    'Almost every image is a macro. Context is nearly worthless here -- a ring on a table in a ' +
    'nice room tells a buyer nothing. Scale is the exception and matters enormously, since a ' +
    'photograph gives no sense of size. Never invent or sharpen a hallmark, carat stamp, or ' +
    'maker mark that is not legible in a source photo; that is a material claim about value.',
  grooming: [
    'Finger oil, dust and smudges wiped off metal and stones with a soft cloth. Tarnish that has etched the surface, plating loss, and scratches all remain.',
    'Chains and necklaces laid out untangled, in one flowing curve, clasp closed and positioned deliberately rather than dropped in a heap.',
    'Stones wiped clear so they read as the stones they are; never brightened, re-cut, re-coloured, added to, or made to sparkle beyond what they do.',
    'The piece laid flat and square to the camera on a plain neutral surface, not tilted or slumped.',
    'Bracelets and rings turned so the front of the piece faces the camera and the clasp or join sits where the shot intends it.',
  ],
};

const FITNESS: CategoryProfile = {
  key: 'fitness',
  matches: ['fitness', 'exercise', 'gym', 'weights', 'dumbbell', 'barbell', 'kettlebell', 'treadmill', 'bench', 'rack', 'plates', 'bike', 'elliptical', 'rower'],
  shots: [
    { role: 'hero_full', answers: 'What is it and how much of it is there?', scope: 'full_set', priority: 1 },
    { role: 'quantity_layout', answers: 'Exactly what weights or pieces are included?', scope: 'full_set', priority: 2 },
    { role: 'markings_detail', answers: 'What weight is each piece?', scope: 'detail', priority: 3 },
    { role: 'surface_condition', answers: 'How chipped, rusted or worn is it?', scope: 'detail', priority: 4 },
    { role: 'three_quarter', answers: 'What is the overall form?', scope: 'representative', priority: 5 },
    { role: 'mechanism_or_adjustment', answers: 'Do the moving parts work?', scope: 'detail', priority: 6 },
    { role: 'scale_context', answers: 'How much room does it need?', scope: 'representative', priority: 7 },
    { role: 'contact_surfaces', answers: 'What condition are the grips and pads in?', scope: 'detail', priority: 8 },
    { role: 'opposite_angle', answers: 'What does the other side look like?', scope: 'representative', priority: 9 },
    { role: 'assembly_or_hardware', answers: 'Is all the hardware there?', scope: 'detail', priority: 10 },
  ],
  guidance:
    'Weight markings and total poundage are the whole listing -- a buyer is calculating price per ' +
    'pound. Show what is included unambiguously. Only reproduce weight numbers that are legible ' +
    'in a source photo; an invented number on a plate is a false specification.',
  grooming: [
    'Chalk dust, gym dust, rubber bloom and hand grease wiped off. Chipped paint, rust, pitting, tears in vinyl and worn knurling all remain.',
    'Pieces laid out in an ordered row or grid -- ascending by weight, evenly spaced, on a common line, none overlapping or stacked in a heap.',
    'Every piece rotated so its weight marking and logo face the camera the same way.',
    'Bars wiped down, collars fitted, plates seated flush against one another and squared on the bar.',
    'Cables, straps and resistance bands laid straight or coiled, not tangled.',
    'Machines standing level and square, adjustment pins seated, seats and pads set to a neutral position.',
  ],
};

const ELECTRONICS: CategoryProfile = {
  key: 'electronics',
  matches: ['electronics', 'macbook', 'iphone', 'ipad', 'xbox', 'playstation', 'laptop', 'computer', 'monitor', 'tv', 'television', 'phone', 'tablet', 'camera', 'speaker', 'console', 'printer'],
  shots: [
    { role: 'hero_three_quarter', answers: 'What is it and what condition is it in?', scope: 'representative', priority: 1 },
    { role: 'front_screen_or_face', answers: 'What does the screen or face look like?', scope: 'representative', priority: 2 },
    { role: 'ports_and_edges', answers: 'What will it connect to?', scope: 'detail', priority: 3 },
    { role: 'controls_or_keyboard', answers: 'How worn are the parts I touch?', scope: 'detail', priority: 4 },
    { role: 'included_accessories', answers: 'Does it come with its charger and cables?', scope: 'full_set', priority: 5 },
    { role: 'model_label', answers: 'Exactly which model and spec is it?', scope: 'detail', priority: 6 },
    { role: 'rear_or_underside', answers: 'What does the back look like?', scope: 'representative', priority: 7 },
    { role: 'condition_detail', answers: 'Where are the scratches and dents?', scope: 'detail', priority: 8 },
    { role: 'closed_or_off_state', answers: 'What is its footprint?', scope: 'representative', priority: 9 },
    { role: 'screen_condition', answers: 'Are there dead pixels or cracks?', scope: 'detail', priority: 10 },
  ],
  guidance:
    'Never generate a powered-on screen showing content, a boot screen, or a spec readout unless ' +
    'a source photo shows it -- that is a functionality claim. Ports, edges and included cables ' +
    'answer more buyer questions than any styled overview.',
  grooming: [
    'Dust, fingerprints, hand grease and smudges wiped off the body, screen and keyboard. Scratches, cracks, dents, worn key legends and discolouration all remain.',
    'Dust blown out of ports, vents, grilles and keyboard gaps.',
    'Screen wiped clean and left OFF and dark unless a source photo shows it powered on -- a lit screen is a functionality claim.',
    'Cables coiled loosely and evenly, connectors facing the same way; accessories laid out in an ordered row rather than a pile.',
    'Standing or lying square to the camera on a clean plain surface, lid at a deliberate angle rather than wherever it fell.',
    'Stickers and personal labels the seller would peel off before selling removed; anything printed by the manufacturer left alone.',
  ],
};

const GENERIC: CategoryProfile = {
  key: 'general',
  matches: [],
  shots: [
    { role: 'hero_three_quarter', answers: 'What is it?', scope: 'representative', priority: 1 },
    { role: 'front_square', answers: 'What are its true proportions?', scope: 'representative', priority: 2 },
    { role: 'opposite_three_quarter', answers: 'What does the other side look like?', scope: 'representative', priority: 3 },
    { role: 'side_profile', answers: 'What is its depth and silhouette?', scope: 'representative', priority: 4 },
    { role: 'material_detail', answers: 'What is it made of?', scope: 'detail', priority: 5 },
    { role: 'condition_detail', answers: 'How worn is it?', scope: 'detail', priority: 6 },
    { role: 'functional_detail', answers: 'How does it work or attach?', scope: 'detail', priority: 7 },
    { role: 'rear_view', answers: 'What does the back look like?', scope: 'representative', priority: 8 },
    { role: 'included_items', answers: 'What exactly do I get?', scope: 'full_set', priority: 9 },
    { role: 'scale_context', answers: 'How big is it?', scope: 'representative', priority: 10 },
  ],
  guidance:
    'No specific profile matched, so plan from first principles: what would a careful buyer of ' +
    'this exact thing want to inspect before travelling to see it?',
  grooming: [
    'Work out from first principles what ten minutes of the seller\'s own preparation would consist of for this specific object and these specific materials, and photograph it in that state.',
    'Dust, lint, cobwebs, fingerprints and loose debris off every surface.',
    'Standing square and level on a clean surface, the right way up, parts in their normal resting position.',
    'Anything hinged, folding or sliding set deliberately -- closed flush, or open to a purposeful angle -- rather than left wherever it happened to be.',
    'Fabric and napped surfaces brushed one consistent direction; flexible parts, cords and straps laid flat or coiled.',
    'Multiple pieces laid out in an ordered arrangement, aligned and evenly spaced, all oriented the same way.',
  ],
};

export const CATEGORY_PROFILES: CategoryProfile[] = [
  FURNITURE_SET,
  FURNITURE,
  VEHICLE,
  APPLIANCE,
  TOOL,
  JEWELRY,
  FITNESS,
  ELECTRONICS,
  GENERIC,
];

/**
 * Best-effort routing from free text. The planner makes the real decision -- this exists so the
 * planner is handed one category's table rather than all of them, which is both cheaper and a
 * great deal more likely to be followed than a menu it has to choose from mid-task.
 */
export function profileFor(itemType: string, category: string, isSet: boolean): CategoryProfile {
  const hay = `${itemType} ${category}`.toLowerCase();
  const matched = CATEGORY_PROFILES.filter(
    (p) => p.matches.length && p.matches.some((m) => hay.includes(m)),
  );
  // A set of chairs matches both furniture_set and furniture; the set profile is the useful one,
  // and it is ordered first for exactly that reason.
  const best = matched[0] ?? GENERIC;
  if (isSet && best.key === 'furniture') return FURNITURE_SET;
  return best;
}

/**
 * The table, rendered for the planner, trimmed to the depth this purchase actually buys.
 *
 * ONE profile, not all nine. Sending the whole catalog was the original design, on the reasoning
 * that routing needs the category and the category comes out of the same call that needs the
 * table -- true, and a fair trade at four kilobytes. Adding a preparation list to every profile
 * took it to twenty, eight ninths of it a brief for something the seller is not selling. A
 * separate classification pass at low image detail now decides the route for a few hundred tokens
 * (see classifyItem in analyze.ts), which is both cheaper and a great deal more likely to be
 * followed than a menu the planner has to choose from mid-task.
 */
export function coverageBrief(profile: CategoryProfile, count: number): string {
  const rows = profile.shots
    .slice()
    .sort((a, b) => a.priority - b.priority)
    .map(
      (s) =>
        `  ${String(s.priority).padStart(2)}. ${s.role.padEnd(28)} [${s.scope}]  ${s.answers}`,
    )
    .join('\n');

  return `
CATEGORY COVERAGE MODEL -- "${profile.key}"

A buyer of this kind of item asks specific questions. These are the shots that answer them, in the
order they earn their place as the image count grows. The buyer is purchasing ${count} images, so
work down this list and stop when you have spent the budget, unless the actual photographs make a
lower-priority shot clearly more valuable than a higher one.

${rows}

SCOPE MEANS:
  full_set        every unit visible together; this is what establishes quantity
  representative  ONE unit, shown whole -- the same physical unit every time
  detail          part of one unit, close in

CATEGORY GUIDANCE
${profile.guidance}

PREPARATION BEFORE THE SHUTTER -- what ten minutes of the seller's own work looks like on this
kind of item. Apply it without being asked, and never let it touch the item's real condition.
${profile.grooming.map((g) => `  - ${g}`).join('\n')}

This table is a model of buyer priorities, not a template to fill. Adapt roles to what the source
photographs actually support, drop any shot the evidence cannot carry, and replace it with the
next supported shot down the list rather than reducing the count.
`.trim();
}
