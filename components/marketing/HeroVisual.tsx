import { PlaceholderImage } from './PlaceholderImage';

// The fan is composed against a fixed design stage measured off the approved hero reference,
// then expressed as percentages of that stage so it scales to whatever width the column gives
// it. (An earlier fixed-pixel stage got sliced by its own overflow guard on any viewport under
// ~1400px.) Desktop and small screens get separate compositions rather than one being a scaled
// copy of the other -- the six-card fan is unreadable at phone width.
const DESKTOP_STAGE = { w: 820, h: 656 };
const MOBILE_STAGE = { w: 330, h: 350 };

type Stage = { w: number; h: number };

type FanCard = {
  src: string;
  alt: string;
  left: number;
  top: number;
  width: number;
  height: number;
  /** Y-axis rotation in degrees. Negative leans the card's right edge away from the viewer. */
  rotateY: number;
  z: number;
  frame: 'thick' | 'thin';
  /** the unedited "before" photo reads slightly flatter than the finished campaign images */
  muted?: boolean;
  /** where the crop lands. These slots are much taller than the source photos, so a plain
   *  centre crop can slice past the subject; each value is aimed at its photo's chair. */
  objectPosition?: string;
  /** BEFORE / AFTER marker sitting on the image itself, naming the transformation directly. */
  chip?: { label: string; tone: 'dark' | 'accent' };
};

// Reads left-to-right as the product story: one ordinary source photo, the finished hero
// largest and frontmost, then the rest of the campaign cascading away behind it.
//
// The BEFORE card's visible width is the number that matters here. It is the "before" half of
// the whole proposition, so it has to read as a photograph in its own right rather than as a
// sliver peeking out from behind the hero. Measured against the reference, the visible portion
// sits at 0.61x the AFTER card's width; the card itself is wider than that, so the hero still
// overlaps its right edge and the two stay physically stacked.
const DESKTOP_CARDS: FanCard[] = [
  {
    src: '/images/hero/original.webp',
    objectPosition: '62% 50%',
    alt: 'An ordinary, unedited seller photo of the item',
    chip: { label: 'BEFORE', tone: 'dark' },
    left: 0,
    top: 122,
    width: 190,
    height: 341,
    rotateY: 16,
    z: 10,
    frame: 'thin',
    muted: true,
  },
  {
    src: '/images/hero/main.webp',
    objectPosition: '47% 50%',
    alt: 'The item, professionally presented in a clean, well-lit setting',
    chip: { label: 'AFTER', tone: 'accent' },
    left: 178,
    top: 84,
    width: 303,
    height: 414,
    rotateY: 0,
    z: 50,
    frame: 'thick',
  },
  {
    src: '/images/hero/alt-1.webp',
    objectPosition: '40% 50%',
    alt: 'A texture detail from the finished listing campaign',
    left: 461,
    top: 129,
    width: 138,
    height: 335,
    rotateY: -25,
    z: 40,
    frame: 'thin',
  },
  {
    src: '/images/hero/alt-2.webp',
    objectPosition: '42% 50%',
    alt: 'An alternate angle from the finished listing campaign',
    left: 546,
    top: 149,
    width: 131,
    height: 305,
    rotateY: -30,
    z: 30,
    frame: 'thin',
  },
  {
    src: '/images/hero/alt-3.webp',
    objectPosition: '50% 50%',
    alt: 'A rear view from the finished listing campaign',
    left: 624,
    top: 170,
    width: 124,
    height: 278,
    rotateY: -34,
    z: 20,
    frame: 'thin',
  },
  {
    src: '/images/hero/alt-4.webp',
    objectPosition: '52% 50%',
    alt: 'A further view from the finished listing campaign',
    left: 696,
    top: 188,
    width: 118,
    height: 253,
    rotateY: -38,
    z: 10,
    frame: 'thin',
  },
];

const MOBILE_CARDS: FanCard[] = [
  {
    src: '/images/hero/original.webp',
    objectPosition: '62% 50%',
    alt: 'An ordinary, unedited seller photo of the item',
    chip: { label: 'BEFORE', tone: 'dark' },
    left: 0,
    top: 70,
    width: 104,
    height: 183,
    rotateY: 16,
    z: 10,
    frame: 'thin',
    muted: true,
  },
  {
    src: '/images/hero/main.webp',
    objectPosition: '47% 50%',
    alt: 'The item, professionally presented in a clean, well-lit setting',
    chip: { label: 'AFTER', tone: 'accent' },
    left: 95,
    top: 46,
    width: 158,
    height: 220,
    rotateY: 0,
    z: 40,
    frame: 'thick',
  },
  {
    src: '/images/hero/alt-1.webp',
    objectPosition: '40% 50%',
    alt: 'A texture detail from the finished listing campaign',
    left: 247,
    top: 72,
    width: 80,
    height: 180,
    rotateY: -28,
    z: 30,
    frame: 'thin',
  },
];

const pctW = (v: number, s: Stage) => `${((v / s.w) * 100).toFixed(4)}%`;
const pctH = (v: number, s: Stage) => `${((v / s.h) * 100).toFixed(4)}%`;

/** Shared by the card and its reflection so the mount matches in both. */
function frameMetrics(card: FanCard, compact?: boolean) {
  const thick = card.frame === 'thick';
  // Thinner than a mat board -- the reference mount is a hairline, and anything heavier reads as
  // a white stroke drawn around the photo rather than a physical edge.
  const pad = thick ? (compact ? 3 : 4) : compact ? 2 : 3;
  const outerRadius = thick ? (compact ? 13 : 16) : compact ? 10 : 13;
  return { thick, pad, outerRadius, innerRadius: outerRadius - pad };
}

function Card({ card, stage, compact }: { card: FanCard; stage: Stage; compact?: boolean }) {
  const { thick, pad, outerRadius, innerRadius } = frameMetrics(card, compact);

  // The frame is padding carrying a gradient rather than a flat border, plus inset edge
  // highlights and shading. That combination -- light catching the top and left edges, the
  // bottom and right falling into shadow -- is what gives the mount actual thickness instead
  // of reading as a white stroke drawn around the photo.
  const frameStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    padding: pad,
    borderRadius: outerRadius,
    background:
      'linear-gradient(143deg, #ffffff 0%, #fbfcfe 30%, #eceff7 66%, #d6dbe9 100%)',
  };

  // Light reads as coming from the upper left: the top and left edges catch it, the right and
  // bottom fall away. The hairline ring keeps the mount's outer edge defined against the pale
  // background so the thickness is legible rather than melting into it.
  const bevel = [
    'inset 0 1.5px 0 rgba(255,255,255,1)',
    'inset 2px 0 3px rgba(255,255,255,0.95)',
    'inset -2px 0 4px rgba(12,13,18,0.10)',
    'inset 0 -2.5px 5px rgba(12,13,18,0.15)',
    'inset 0 0 0 1px rgba(12,13,18,0.055)',
  ];
  const cast = thick
    ? ['0 26px 52px rgba(12,13,18,0.17)', '0 5px 12px rgba(12,13,18,0.07)']
    : ['0 16px 36px rgba(12,13,18,0.13)', '0 3px 8px rgba(12,13,18,0.055)'];

  const image = (decorative: boolean) => (
    <PlaceholderImage
      src={card.src}
      alt={decorative ? '' : card.alt}
      decorative={decorative}
      objectPosition={card.objectPosition}
      className={`h-full w-full ${card.muted ? 'saturate-[0.85]' : ''}`}
      style={{ borderRadius: innerRadius }}
    />
  );

  return (
    <div
      className="absolute"
      style={{
        left: pctW(card.left, stage),
        top: pctH(card.top, stage),
        width: pctW(card.width, stage),
        height: pctH(card.height, stage),
        zIndex: card.z,
        transform: `rotateY(${card.rotateY}deg)`,
      }}
    >
      <div className="relative h-full w-full">
        {/* contact shadow where the card meets the surface -- painted before the frame so the
            frame sits on top of it, with only the spill visible beneath the bottom edge */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute"
          style={{
            left: '4%',
            right: '4%',
            bottom: -7,
            height: 20,
            background:
              'radial-gradient(50% 50% at 50% 50%, rgba(12,13,18,0.34) 0%, rgba(12,13,18,0) 72%)',
            filter: 'blur(5px)',
          }}
        />
        <div className="relative" style={{ ...frameStyle, boxShadow: [...bevel, ...cast].join(', ') }}>
          {image(false)}
          {card.chip && (
            <span
              className={`absolute left-0 top-0 z-10 translate-x-[12px] translate-y-[12px] whitespace-nowrap rounded-[7px] px-2.5 py-1 text-[0.6rem] font-[650] uppercase tracking-[0.12em] shadow-soft ${
                card.chip.tone === 'accent'
                  ? 'bg-violet-blue text-white'
                  : 'bg-marketplace-ink/85 text-white backdrop-blur-sm'
              }`}
            >
              {card.chip.label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * The mirrored card on the surface below, as its own positioned element rather than a child of
 * the card.
 *
 * As a child it inherited the card's z-index, so a card standing behind another still painted
 * its reflection at that card's depth -- and because the cards sit at different heights, a back
 * card's reflection landed across the face of a front one. A real reflection cannot do that: it
 * begins where the card meets the surface and everything nearer the viewer occludes it. Giving
 * every reflection a z-index below every card restores that, and starting it at the card's exact
 * bottom edge makes the two halt where they meet.
 */
function Reflection({ card, stage, compact }: { card: FanCard; stage: Stage; compact?: boolean }) {
  const { pad, outerRadius, innerRadius } = frameMetrics(card, compact);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute overflow-hidden"
      style={{
        left: pctW(card.left, stage),
        top: pctH(card.top + card.height, stage),
        width: pctW(card.width, stage),
        height: pctH(card.height * 0.4, stage),
        // Relative order within the reflection layer follows the fan, so a reflection occludes
        // the ones behind it exactly as its card does.
        zIndex: Math.max(1, Math.round(card.z / 10)),
        transform: `rotateY(${card.rotateY}deg)`,
        // No mask and no opacity here on purpose: both are applied once to the whole layer.
        // A per-reflection fade tops out below full alpha, so every reflection stays partly
        // see-through and the one behind shows through it -- the bug this is fixing.
      }}
    >
      <div
        style={{
          width: '100%',
          height: '250%', // the clipped window is 40% tall; the mirrored card is full height
          padding: pad,
          borderRadius: outerRadius,
          background: 'linear-gradient(143deg, #ffffff 0%, #fbfcfe 30%, #eceff7 66%, #d6dbe9 100%)',
          transform: 'scaleY(-1)',
          // no cast shadow or hard bevel on the reflection -- a mirrored drop shadow reads
          // as a second physical card rather than a reflection
          boxShadow: 'inset 0 0 0 1px rgba(12,13,18,0.04)',
        }}
      >
        <PlaceholderImage
          src={card.src}
          alt=""
          decorative
          objectPosition={card.objectPosition}
          className={`h-full w-full ${card.muted ? 'saturate-[0.85]' : ''}`}
          style={{ borderRadius: innerRadius }}
        />
      </div>
    </div>
  );
}

/**
 * Composites every reflection as one opaque group, then fades the whole group.
 *
 * Fading each reflection individually is what produced the visible bug: at 50% opacity each one
 * is translucent, so a card standing in front showed the reflection of the card behind it
 * straight through its own. A real reflection cannot -- whatever occludes an object occludes its
 * reflection too. Compositing opaquely first makes the front reflection hide the back one, and
 * the single group opacity is then just how reflective the surface is.
 *
 * The layer re-declares the stage's perspective because it is a new containing block; without it
 * the rotateY on each reflection would project differently from its card.
 */
function ReflectionLayer({
  cards,
  stage,
  compact,
}: {
  cards: FanCard[];
  stage: Stage;
  compact?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 opacity-[0.5]"
      style={{
        zIndex: 1,
        perspective: '1250px',
        perspectiveOrigin: '42% 38%',
        // One fade for the whole floor. The cards all stand on the same surface, so the
        // reflection should weaken with distance across that surface rather than each card
        // carrying its own gradient -- and a single mask leaves the reflections fully opaque
        // against each other, which is what makes the front one hide the back one.
        maskImage: 'linear-gradient(to bottom, #000 0%, #000 62%, rgba(0,0,0,0.55) 72%, rgba(0,0,0,0.22) 82%, transparent 92%)',
        WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, #000 62%, rgba(0,0,0,0.55) 72%, rgba(0,0,0,0.22) 82%, transparent 92%)',
      }}
    >
      {cards.map((card) => (
        <Reflection key={`r-${card.src}`} card={card} stage={stage} compact={compact} />
      ))}
    </div>
  );
}

function Callout({
  children,
  left,
  top,
  stage,
  tail,
  tailAbove,
}: {
  children: React.ReactNode;
  left: number;
  top: number;
  stage: Stage;
  /** length of the connector below the dot, in stage px. Stops short of the card by design. */
  tail?: number;
  /** same connector, mirrored, for a label that sits below the fan and points up at it. */
  tailAbove?: number;
}) {
  const label = (
    <div className="whitespace-nowrap rounded-full border border-marketplace-line/70 bg-white/95 px-4 py-2 text-[0.8125rem] font-medium text-marketplace-ink shadow-soft backdrop-blur">
      {children}
    </div>
  );
  // The dot must be a direct flex child so the column blockifies it -- width/height do nothing on
  // an inline span, so wrapping it to carry a margin makes it disappear entirely.
  const dot = (margin: string) => (
    <span
      className={`${margin} h-[7px] w-[7px] shrink-0 rounded-full bg-marketplace-violet`}
      aria-hidden="true"
    />
  );
  // The line always fades out at the end furthest from the label, so it dissolves before it can
  // reach a photo. `to bottom` for a tail hanging below; reversed for one rising above.
  const line = (height: number, direction: 'down' | 'up') => (
    <span
      className="w-px shrink-0"
      style={{
        height,
        background:
          direction === 'down'
            ? 'linear-gradient(to bottom, #7A5CFF 0%, rgba(122,92,255,0.35) 45%, rgba(122,92,255,0) 100%)'
            : 'linear-gradient(to top, #7A5CFF 0%, rgba(122,92,255,0.35) 45%, rgba(122,92,255,0) 100%)',
      }}
      aria-hidden="true"
    />
  );

  return (
    <div
      className="absolute z-[60] flex flex-col items-center"
      style={{ left: pctW(left, stage), top: pctH(top, stage), transform: 'translateX(-50%)' }}
    >
      {tailAbove ? (
        <>
          {line(tailAbove, 'up')}
          {dot('mb-1.5')}
        </>
      ) : null}
      {label}
      {tail ? (
        <>
          {/* Dot sits directly under the label and terminates the connector at the top; the
              line then fades downward and stops short of the card, so nothing ever touches
              the photo. */}
          {dot('mt-1.5')}
          {line(tail, 'down')}
        </>
      ) : null}
    </div>
  );
}

function StageBox({
  size,
  children,
  className,
}: {
  size: Stage;
  children: React.ReactNode;
  className: string;
}) {
  return (
    <div className={className}>
      <div
        className="relative mx-auto w-full"
        style={{
          maxWidth: size.w,
          aspectRatio: `${size.w} / ${size.h}`,
          perspective: '1250px',
          perspectiveOrigin: '42% 38%',
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** The glossy surface the fan stands on: a bright sheen plus a soft horizon fade. */
function Floor({ top }: { top: string }) {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-x-0"
        style={{
          top,
          height: '22%',
          background:
            'linear-gradient(to bottom, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.45) 45%, rgba(255,255,255,0) 100%)',
          filter: 'blur(10px)',
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute left-[4%] right-[4%] h-[14%] rounded-[50%] bg-white/75 blur-2xl"
        style={{ top }}
        aria-hidden="true"
      />
    </>
  );
}

export function HeroVisual() {
  return (
    <>
      {/* Desktop: the full six-card fan from the reference. */}
      <StageBox size={DESKTOP_STAGE} className="hidden lg:block">
        {/* fine orbital arc tying the callouts together */}
        <svg
          className="pointer-events-none absolute inset-x-0 top-0"
          viewBox={`0 0 ${DESKTOP_STAGE.w} 74`}
          fill="none"
          preserveAspectRatio="none"
          style={{ height: pctH(74, DESKTOP_STAGE) }}
          aria-hidden="true"
        >
          <path
            d={`M30 68 Q ${DESKTOP_STAGE.w / 2} -4 ${DESKTOP_STAGE.w - 30} 68`}
            stroke="#DFE4EF"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <Floor top="64%" />

        <ReflectionLayer cards={DESKTOP_CARDS} stage={DESKTOP_STAGE} />
        {DESKTOP_CARDS.map((card) => (
          <Card key={card.src} card={card} stage={DESKTOP_STAGE} />
        ))}

        {/* Each callout is centred on the card it names, so widening the BEFORE card and
            re-spacing the fan moves all four with it. */}
        <Callout left={90} top={54} tail={40} stage={DESKTOP_STAGE}>
          Your original photos
        </Callout>
        {/* directly above the AFTER chip on the hero card, matching the other two */}
        <Callout left={332} top={4} tail={28} stage={DESKTOP_STAGE}>
          AI-enhanced results
        </Callout>
        <Callout left={609} top={62} tail={39} stage={DESKTOP_STAGE}>
          More buyer confidence
        </Callout>
        {/* sits below the fan, so its connector rises toward the cards instead of hanging */}
        <Callout left={560} top={534} tailAbove={34} stage={DESKTOP_STAGE}>
          A complete listing set
        </Callout>
      </StageBox>

      {/* Small screens: a simplified three-card stack, per the reference's mobile guidance. */}
      <StageBox size={MOBILE_STAGE} className="lg:hidden">
        <Floor top="62%" />

        <ReflectionLayer cards={MOBILE_CARDS} stage={MOBILE_STAGE} compact />
        {MOBILE_CARDS.map((card) => (
          <Card key={card.src} card={card} stage={MOBILE_STAGE} compact />
        ))}

        <Callout left={172} top={0} tail={12} stage={MOBILE_STAGE}>
          AI-enhanced results
        </Callout>
      </StageBox>
    </>
  );
}
