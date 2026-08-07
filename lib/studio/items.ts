import type { CategoryKey } from '../config/categories';
import type { ItemFacts, VocabularyKey } from './vocabularies';

// The item roster: five per category, each declaring how it behaves so it gets the shot list a
// real photographer would use on it.
//
// Five per category rather than one because a site that shows the same chair in six sections
// reads as one lucky result rather than a service. Every slot on the site can cycle through
// these, and no item needs to appear in more than two places.
//
// Note the vocabularies are not aligned to categories. A dresser is furniture but behaves like a
// cabinet; a boat is outdoor but behaves like a rideable; a treadmill is fitness but a buyer
// wants it folded and unfolded. What matters is how you photograph it, not which tab it's on.

export type Item = ItemFacts & {
  key: string;
  label: string;
  category: CategoryKey;
  vocabulary: VocabularyKey;
  /** how the "before" phone photo is badly lit, specific to where this thing lives */
  badLight: string;
  /** the everyday mess left in shot */
  clutter: string;
  /** real photographs of this exact item, when we have them */
  references?: string[];
};

const CHAIR_REFS = ['/images/hero/main.webp', '/images/hero/alt-1.webp', '/images/hero/alt-3.webp'];

const LIVING_ROOM =
  'a corner of an ordinary living room with a soft white wall, warm oak floorboards, a plain ' +
  'pale linen curtain at the window, and a simple low bookshelf against the far wall';
const BEDROOM =
  'an ordinary bedroom with pale grey walls, warm oak floorboards, and a plain window with the ' +
  'curtain drawn back';
const GARAGE =
  'the working corner of an ordinary attached garage with a plain grey breeze-block wall, a ' +
  'sealed concrete floor, and a simple timber workbench alongside';
const DRIVEWAY =
  'a plain concrete driveway directly in front of a closed sectional garage door, with a low ' +
  'brick house wall to one side and a narrow strip of mown lawn in the foreground';
const LAUNDRY =
  'a small domestic laundry alcove with pale grey painted walls, a plain grey tiled floor, a ' +
  'white shelf above holding two folded towels, and a shallow window at the far end';
const KITCHEN =
  'an ordinary domestic kitchen with plain light grey cabinet fronts, a pale worktop, and a ' +
  'window over the sink out of frame to the left';
const GYM_CORNER =
  'a cleared corner of an attached garage with interlocking black rubber floor matting, a plain ' +
  'painted breeze-block wall, and a small window high on the wall';

const INDOOR_BAD_LIGHT =
  'a single ceiling bulb burning against weak daylight from a half-drawn curtain, flat and ' +
  'top-down, giving the whole frame a muddy yellow-green cast';
const GARAGE_BAD_LIGHT =
  'a single bare fluorescent strip high on the garage ceiling, cold and flat, throwing a hard ' +
  'shadow straight down beneath the item';
const OUTDOOR_BAD_LIGHT =
  'flat colourless overcast at midday with the sun straight overhead, so the whole frame is grey ' +
  'and dull with no direction to the light and no shape on the item';

const INDOOR_CLUTTER =
  'a plastic laundry basket, flattened cardboard boxes leaning against the wall, a power cord ' +
  'trailing across the floor, and a coat slung over a chair back';
const GARAGE_CLUTTER =
  'part-used paint tins stacked on the floor, an open toolbox spilling its contents, timber ' +
  'offcuts in the corner, and a bicycle propped against the workbench';
const DRIVEWAY_CLUTTER =
  'a green wheelie bin, a coiled garden hose dumped on the concrete, a rake and a spade leaning ' +
  'against the house wall, and the garage door rolled half open with boxes visible in the dark';

export const ITEMS: Item[] = [
  // ---------------------------------------------------------------- furniture
  {
    key: 'accent-chair',
    label: 'Accent chair',
    category: 'furniture',
    vocabulary: 'freestanding',
    description:
      'a cream upholstered high-back wing accent chair with deep diamond button tufting on the ' +
      'backrest, a tone-on-tone damask weave in the fabric, rolled arms, a single box-edge seat ' +
      'cushion, and four tapered dark espresso-stained wooden legs',
    setting: LIVING_ROOM,
    texture:
      'the tufted upholstery — the button dimples, the woven damask pattern, and the piped seam ' +
      'along the arm',
    condition:
      'faint compression in the seat cushion and slight softening at the front arm edges',
    badLight: INDOOR_BAD_LIGHT,
    clutter: INDOOR_CLUTTER,
    references: CHAIR_REFS,
  },
  {
    key: 'sectional-sofa',
    label: 'Sectional sofa',
    category: 'furniture',
    vocabulary: 'freestanding',
    description:
      'a three-seat sectional sofa in oatmeal woven fabric with a chaise on the right end, ' +
      'squared-off arms, loose back cushions, and low dark tapered legs',
    setting: LIVING_ROOM,
    texture: 'the woven upholstery and the stitched seam running along the front of the seat cushion',
    condition:
      'settled seat cushions with a visible dip in the most-used seat and mild pilling on the ' +
      'front arm',
    badLight: INDOOR_BAD_LIGHT,
    clutter: INDOOR_CLUTTER,
  },
  {
    key: 'dresser',
    label: 'Solid wood dresser',
    category: 'furniture',
    vocabulary: 'cabinet',
    description:
      'a mid-century solid walnut six-drawer dresser, low and wide, with tapered splayed legs, ' +
      'recessed sculpted drawer pulls, and a warm satin finish showing the grain',
    setting: BEDROOM,
    texture: 'the walnut grain running across a drawer front and around a sculpted pull',
    condition:
      'a pale ring mark on the top surface, a small chip at one drawer edge, and light scuffing ' +
      'on the feet',
    opening: 'the top drawer and the third drawer',
    interior: 'the bare timber base of the drawer, its dovetailed corners, and the runners each side',
    badLight: INDOOR_BAD_LIGHT,
    clutter: INDOOR_CLUTTER,
  },
  {
    key: 'dining-set',
    label: 'Dining table and chairs',
    category: 'furniture',
    vocabulary: 'freestanding',
    description:
      'a rectangular solid oak dining table with four matching slat-back chairs tucked in, ' +
      'square tapered legs, and a warm mid-oak finish',
    setting: LIVING_ROOM,
    texture: 'the oak grain across the tabletop where the boards join',
    condition:
      'fine surface scratching across the tabletop catching the light, and worn finish on the ' +
      'chair seat fronts',
    badLight: INDOOR_BAD_LIGHT,
    clutter: INDOOR_CLUTTER,
  },
  {
    key: 'bookshelf',
    label: 'Bookshelf',
    category: 'furniture',
    vocabulary: 'freestanding',
    description:
      'a tall five-shelf open bookcase in warm oak veneer, standing empty, with a plain plinth ' +
      'base and square edges',
    setting: LIVING_ROOM,
    texture: 'the veneer grain and the front edge of one shelf where it meets the upright',
    condition: 'slight bowing in the longest shelf and a chipped veneer corner near the base',
    badLight: INDOOR_BAD_LIGHT,
    clutter: INDOOR_CLUTTER,
  },

  // ---------------------------------------------------------------- outdoor
  {
    key: 'riding-mower',
    label: 'Riding mower',
    category: 'outdoor',
    vocabulary: 'rideable',
    description:
      'a red and black riding lawn tractor with a wide mid-mounted cutting deck, a black moulded ' +
      'seat, a black steering wheel, chunky treaded rear tyres and smaller smooth front tyres, ' +
      'and plain unmarked bodywork with no badges or lettering anywhere',
    setting: DRIVEWAY,
    texture: 'the deep-treaded rear tyre and the steel wheel rim behind it',
    condition:
      'dried grass packed along the deck edge, dulled and scratched paint on the deck, and ' +
      'scuffing on the footplate',
    controls: 'the seat, steering wheel, and the blank unmarked control levers beside it',
    scrutiny: 'the underside edge of the cutting deck and the blade housing',
    badLight: OUTDOOR_BAD_LIGHT,
    clutter: DRIVEWAY_CLUTTER,
  },
  {
    key: 'fishing-boat',
    label: 'Boat and trailer',
    category: 'outdoor',
    vocabulary: 'rideable',
    description:
      'a small aluminium open fishing boat sitting on a galvanised single-axle trailer, with ' +
      'bench seats, a low windscreen, an outboard motor tilted up at the stern, and plain ' +
      'unmarked hull sides free of any lettering or numbers',
    setting: DRIVEWAY,
    texture: 'the riveted aluminium hull plating and the rubbing strake along the gunwale',
    condition:
      'oxidised dulling along the hull sides, scuffing on the keel line, and surface rust ' +
      'speckling on the trailer frame',
    controls: 'the helm seat, the wheel, and the blank unmarked throttle lever beside it',
    scrutiny: 'the outboard mounting bracket and the transom where it bolts through',
    badLight: OUTDOOR_BAD_LIGHT,
    clutter: DRIVEWAY_CLUTTER,
  },
  {
    key: 'atv',
    label: 'ATV / quad',
    category: 'outdoor',
    vocabulary: 'rideable',
    description:
      'a green and black utility quad bike with four knobbly tyres, a rack over the rear wheels, ' +
      'a straddle seat, handlebar steering, and plain unmarked plastics with no lettering',
    setting: DRIVEWAY,
    texture: 'the knobbly tread of a front tyre and the plastic mudguard edge above it',
    condition: 'mud dried into the tyre tread, scratched plastics, and a scuffed seat nose',
    controls: 'the handlebars, the seat, and the blank unmarked switch housings on the bars',
    scrutiny: 'the rear suspension arm and the underside of the rack mounting',
    badLight: OUTDOOR_BAD_LIGHT,
    clutter: DRIVEWAY_CLUTTER,
  },
  {
    key: 'patio-set',
    label: 'Patio furniture set',
    category: 'outdoor',
    vocabulary: 'freestanding',
    description:
      'a four-seat outdoor patio set in grey woven rattan with a tempered glass-topped table and ' +
      'cream seat cushions',
    setting:
      'a paved patio directly against a plain rendered house wall, with a closed back door to ' +
      'one side and a low fence behind',
    texture: 'the woven rattan strands and the aluminium frame edge beneath',
    condition:
      'sun-faded cushions with a faint water stain on one, and slight greying of the rattan on ' +
      'the most exposed side',
    badLight: OUTDOOR_BAD_LIGHT,
    clutter: DRIVEWAY_CLUTTER,
  },
  {
    key: 'pressure-washer',
    label: 'Pressure washer',
    category: 'outdoor',
    vocabulary: 'freestanding',
    description:
      'a compact upright electric pressure washer on two wheels, in blue and dark grey moulded ' +
      'plastic, with a coiled hose on the side, a lance clipped to the body, and plain unmarked ' +
      'panels free of lettering',
    setting: DRIVEWAY,
    texture: 'the coiled high-pressure hose and the moulded plastic body behind it',
    condition: 'scuffed plastics, a grubby hose, and dried water marks down one side',
    badLight: OUTDOOR_BAD_LIGHT,
    clutter: DRIVEWAY_CLUTTER,
  },

  // ---------------------------------------------------------------- appliances
  {
    key: 'washer',
    label: 'Washing machine',
    category: 'appliances',
    vocabulary: 'appliance',
    description:
      'a white front-loading washing machine with a large round chrome-rimmed glass door, a flat ' +
      'top, a recessed detergent drawer, and a plain control panel whose dials and buttons carry ' +
      'no lettering, numbers, or symbols',
    setting: LAUNDRY,
    texture: 'the chrome door rim meeting the white enamel front panel',
    condition:
      'chalky detergent residue in the drawer recess, a scuff on the lower front panel, and ' +
      'dulled enamel around the door edge',
    opening: 'the round glass door',
    interior: 'the stainless steel drum, its paddles, and the grey rubber door gasket around the opening',
    controls: 'the control panel with its blank dial and unmarked buttons',
    scrutiny: 'the rubber door gasket where it folds into the opening',
    badLight:
      'one bare ceiling bulb in a cramped alcove with the daylight behind the camera blocked, ' +
      'harsh from above and dropping straight into shadow below',
    clutter:
      'detergent bottles crowded on the machine top, a heap of unfolded laundry on the floor, a ' +
      'mop and bucket in the corner, and a towel hanging off the shelf',
  },
  {
    key: 'dryer',
    label: 'Tumble dryer',
    category: 'appliances',
    vocabulary: 'appliance',
    description:
      'a white front-loading tumble dryer with a wide flat-fronted door, a slim top control ' +
      'panel, and completely blank unmarked dials and buttons',
    setting: LAUNDRY,
    texture: 'the brushed edge of the door handle recess against the white enamel',
    condition: 'light scuffing along the door edge and faint scratching on the top surface',
    opening: 'the wide front door',
    interior: 'the ribbed metal drum and the lint filter slot at the mouth of the opening',
    controls: 'the top control panel with its blank dial and unmarked buttons',
    scrutiny: 'the lint filter pulled part way out of its slot',
    badLight:
      'one bare ceiling bulb in a cramped alcove, harsh from directly above with the shadows ' +
      'dropping away black beneath',
    clutter:
      'a laundry basket overflowing on the floor, detergent bottles on top, and a clothes airer ' +
      'folded against the wall',
  },
  {
    key: 'fridge',
    label: 'Fridge freezer',
    category: 'appliances',
    vocabulary: 'appliance',
    description:
      'a tall stainless steel french-door fridge freezer with two upper doors, a lower freezer ' +
      'drawer, plain bar handles, and no badges, lettering, or display panels of any kind',
    setting: KITCHEN,
    texture: 'the brushed stainless finish and the join where the door meets the body',
    condition:
      'fine scratching in the brushed steel around the handles and a small dent low on one door',
    opening: 'both upper doors',
    interior: 'the empty glass shelves, the clear crisper drawers, and the moulded door bins',
    controls: 'the plain interior control dial inside the fridge compartment, completely unmarked',
    scrutiny: 'the door seal along the inside edge of one open door',
    badLight:
      'a single ceiling downlight behind the camera and no window light, flat and yellow with ' +
      'the shadows falling straight down',
    clutter:
      'a cluttered worktop alongside with a bread bin, a stack of post, and a tea towel over ' +
      'the oven rail',
  },
  {
    key: 'dishwasher',
    label: 'Dishwasher',
    category: 'appliances',
    vocabulary: 'appliance',
    description:
      'a freestanding white dishwasher with a drop-down front door, a recessed handle along the ' +
      'top edge, and a control strip with entirely blank unmarked buttons',
    setting: KITCHEN,
    texture: 'the recessed handle channel along the top edge of the door',
    condition: 'scuffing on the door face and slight discolouration along the bottom edge',
    opening: 'the drop-down front door',
    interior: 'the pull-out wire baskets, the spray arm beneath, and the cutlery basket',
    controls: 'the control strip along the top edge of the door, its buttons completely blank',
    scrutiny: 'the door seal and the filter recess in the base of the tub',
    badLight: 'one ceiling downlight behind the camera, flat and yellow with no window light',
    clutter:
      'a crowded worktop above with washing-up stacked in the sink and a cloth draped over the tap',
  },
  {
    key: 'range-cooker',
    label: 'Range cooker',
    category: 'appliances',
    vocabulary: 'appliance',
    description:
      'a freestanding stainless steel range cooker with a five-burner gas hob, two oven doors ' +
      'with long bar handles, and a row of control knobs that are completely blank and unmarked',
    setting: KITCHEN,
    texture: 'a cast iron pan support and the burner cap beside it on the hob',
    condition:
      'heat discolouration around the most-used burner, light scratching on the steel front, and ' +
      'baked-on marks inside the oven door glass',
    opening: 'the main oven door',
    interior: 'the enamelled oven cavity with its wire shelves and side runners',
    controls: 'the row of control knobs along the front, every face blank and unmarked',
    scrutiny: 'the burner rings and the enamel around them on the hob surface',
    badLight: 'a single ceiling downlight behind the camera, flat, yellow, and unflattering',
    clutter: 'a crowded worktop beside it with pans stacked and a chopping board propped up',
  },

  // ---------------------------------------------------------------- tools
  {
    key: 'tool-chest',
    label: 'Rolling tool chest',
    category: 'tools',
    vocabulary: 'cabinet',
    description:
      'a red steel rolling tool chest about chest height, with seven drawers of varying depth, ' +
      'brushed metal drawer pulls, a flat black work surface on top, black rubber-tyred swivel ' +
      'castors, and plain unmarked drawer fronts',
    setting: GARAGE,
    texture: 'a drawer front and its brushed metal pull, with the drawer edges above and below',
    condition:
      'dings and paint chips along the drawer edges, grease marks around the pulls, and surface ' +
      'scratching on the black top',
    opening: 'the second, fourth, and bottom drawers',
    interior:
      'the drawer laid out with a few spanners and sockets resting on a black rubber liner, and ' +
      'the ball-bearing runners at each side',
    badLight: GARAGE_BAD_LIGHT,
    clutter: GARAGE_CLUTTER,
  },
  {
    key: 'table-saw',
    label: 'Table saw',
    category: 'tools',
    vocabulary: 'rig',
    description:
      'a benchtop table saw on a folding steel stand, with a cast aluminium table, a raised ' +
      'circular blade, a rip fence across the table, a blade guard, and plain unmarked housings',
    setting: GARAGE,
    texture: 'the cast aluminium table surface and the mitre slot machined into it',
    condition:
      'sawdust settled in the mitre slot, surface rust speckling on the table, and scratched paint ' +
      'on the stand legs',
    opening: 'the blade raised to full height and the fence slid across to the far side',
    interior: 'the push stick, the mitre gauge, and the blade guard laid out on the floor beside it',
    badLight: GARAGE_BAD_LIGHT,
    clutter: GARAGE_CLUTTER,
  },
  {
    key: 'air-compressor',
    label: 'Air compressor',
    category: 'tools',
    vocabulary: 'freestanding',
    description:
      'an upright red air compressor with a vertical tank, a motor and pump assembly on top, two ' +
      'pressure gauges with completely blank unmarked faces, a coiled air hose, and wheels at the base',
    setting: GARAGE,
    texture: 'the coiled air hose and the brass fitting where it screws into the manifold',
    condition: 'scratched tank paint, surface rust around the base, and a grubby hose',
    badLight: GARAGE_BAD_LIGHT,
    clutter: GARAGE_CLUTTER,
  },
  {
    key: 'workbench',
    label: 'Workbench',
    category: 'tools',
    vocabulary: 'cabinet',
    description:
      'a heavy timber-topped workbench with a steel frame, two drawers beneath the top, a lower ' +
      'shelf, and a bench vice bolted to one end',
    setting: GARAGE,
    texture: 'the scarred timber worktop grain and the edge of the bench vice jaw',
    condition:
      'saw cuts and stain marks across the worktop, and paint worn off the vice handle where it ' +
      'is gripped',
    opening: 'both drawers',
    interior: 'the drawer with a few hand tools resting in it and the runners each side',
    badLight: GARAGE_BAD_LIGHT,
    clutter: GARAGE_CLUTTER,
  },
  {
    key: 'generator',
    label: 'Portable generator',
    category: 'tools',
    vocabulary: 'freestanding',
    description:
      'a portable petrol generator in an orange tubular steel frame, with a horizontal engine, a ' +
      'pull-start handle, a control panel of blank unmarked sockets and switches, and small solid wheels',
    setting: GARAGE,
    texture: 'the tubular frame and the engine cooling fins behind it',
    condition: 'oil staining around the engine base, scuffed frame paint, and a grubby pull cord',
    badLight: GARAGE_BAD_LIGHT,
    clutter: GARAGE_CLUTTER,
  },

  // ---------------------------------------------------------------- fitness
  {
    key: 'weight-bench',
    label: 'Weight bench and barbell',
    category: 'fitness',
    vocabulary: 'rig',
    description:
      'an adjustable black steel weight bench with thick black vinyl padding, set beside an ' +
      'upright rack holding a knurled steel olympic barbell, with black rubber-coated weight ' +
      'plates on a small floor rack nearby, all unmarked',
    setting: GYM_CORNER,
    texture: 'the knurled grip section of the steel barbell',
    condition:
      'rust speckling in the barbell knurling, a scuffed crease in the vinyl bench padding, and ' +
      'chipped edges on the rubber plates',
    opening: 'the backrest raised to a steep incline',
    interior: 'the weight plates, the collars, and the bar laid out on the matting',
    badLight:
      'one dim bulb on the garage ceiling with the door shut, so the corner is gloomy, the ' +
      'shadows go flat black, and the frame reads cold and blue',
    clutter:
      'stacked plastic storage bins along the wall, a folded camping chair, and a bin bag of old clothes',
  },
  {
    key: 'treadmill',
    label: 'Treadmill',
    category: 'fitness',
    vocabulary: 'rig',
    description:
      'a folding motorised treadmill with a black running belt, side rails, an upright console ' +
      'mast, and a console whose screen is dark and whose buttons are completely blank and unmarked',
    setting: GYM_CORNER,
    texture: 'the textured running belt surface and the side rail edge beside it',
    condition: 'a worn strip down the centre of the belt and scuffing on the side rails',
    opening: 'the deck folded up into its upright storage position',
    interior: 'the safety key, the lubricant bottle, and the allen keys laid out on the matting',
    badLight: 'one dim garage bulb with the door shut, gloomy with flat black shadows and a cold cast',
    clutter: 'storage bins along the wall, a bag of old clothes, and a cardboard box with open flaps',
  },
  {
    key: 'rowing-machine',
    label: 'Rowing machine',
    category: 'fitness',
    vocabulary: 'rig',
    description:
      'a folding rowing machine with a long aluminium slide rail, a moulded seat, a pivoting ' +
      'footplate pair with straps, a chain-driven flywheel housing at the front, and a small ' +
      'monitor arm whose screen is dark and blank',
    setting: GYM_CORNER,
    texture: 'the moulded handle grip and the chain running back into the housing',
    condition: 'worn grip texture on the handle, scuffed footplates, and dust in the flywheel vents',
    opening: 'the rail folded upright against the flywheel housing for storage',
    interior: 'the seat, the footstraps, and the monitor arm shown separately on the matting',
    badLight: 'one dim garage bulb with the door shut, gloomy and cold with flat black shadows',
    clutter: 'storage bins stacked along the wall and a folded camping chair leaning beside them',
  },
  {
    key: 'squat-rack',
    label: 'Squat rack',
    category: 'fitness',
    vocabulary: 'rig',
    description:
      'a black powder-coated steel squat rack with two uprights, adjustable J-hooks, a pull-up ' +
      'bar across the top, a wide flat base, and rows of plain unnumbered adjustment holes',
    setting: GYM_CORNER,
    texture: 'the knurled pull-up bar and the powder-coated upright behind it',
    condition:
      'paint worn through to bare steel around the J-hook holes and scuffing along the base rails',
    opening: 'the J-hooks moved to a much lower setting',
    interior: 'the J-hooks, the safety pins, and the fixing bolts laid out on the matting',
    badLight: 'a dim garage bulb with the door shut, gloomy with black shadows and a cold cast',
    clutter: 'plastic storage bins along the wall and a bulging bin bag of old clothes',
  },
  {
    key: 'dumbbell-set',
    label: 'Dumbbell set and rack',
    category: 'fitness',
    vocabulary: 'rig',
    description:
      'a two-tier angled steel dumbbell rack holding five pairs of black rubber-hexagon ' +
      'dumbbells in ascending size, with knurled chrome handles and no numbers or markings on any face',
    setting: GYM_CORNER,
    texture: 'the knurled chrome handle of one dumbbell and the rubber hex head beside it',
    condition:
      'scuffing on the rubber hex faces, dulled chrome on the most-used handles, and chipped ' +
      'paint on the rack cradles',
    opening: 'one pair lifted out and set on the matting in front of the rack',
    interior: 'the full set of five pairs laid out in a row on the matting',
    badLight: 'one dim garage bulb with the door shut, gloomy and cold with flat black shadows',
    clutter: 'stacked storage bins, a folded camping chair, and a cardboard box with its flaps open',
  },
];

export const ITEMS_BY_CATEGORY = (category: CategoryKey): Item[] =>
  ITEMS.filter((i) => i.category === category);

export function itemByKey(key: string): Item | undefined {
  return ITEMS.find((i) => i.key === key);
}
