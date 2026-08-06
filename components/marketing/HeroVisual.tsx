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
const DESKTOP_CARDS: FanCard[] = [
  {
    src: '/images/hero/original.webp',
    objectPosition: '62% 50%',
    alt: 'An ordinary, unedited seller photo of the item',
    chip: { label: 'BEFORE', tone: 'dark' },
    left: 0,
    top: 142,
    width: 172,
    height: 328,
    rotateY: -16,
    z: 10,
    frame: 'thin',
    muted: true,
  },
  {
    src: '/images/hero/main.webp',
    objectPosition: '47% 50%',
    alt: 'The item, professionally presented in a clean, well-lit setting',
    chip: { label: 'AFTER', tone: 'accent' },
    left: 149,
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
    left: 432,
    top: 129,
    width: 138,
    height: 335,
    rotateY: 20,
    z: 40,
    frame: 'thin',
  },
  {
    src: '/images/hero/alt-2.webp',
    objectPosition: '42% 50%',
    alt: 'An alternate angle from the finished listing campaign',
    left: 527,
    top: 149,
    width: 131,
    height: 305,
    rotateY: 24,
    z: 30,
    frame: 'thin',
  },
  {
    src: '/images/hero/alt-3.webp',
    objectPosition: '50% 50%',
    alt: 'A rear view from the finished listing campaign',
    left: 615,
    top: 170,
    width: 124,
    height: 278,
    rotateY: 27,
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
    rotateY: 29,
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
    top: 78,
    width: 94,
    height: 176,
    rotateY: -16,
    z: 10,
    frame: 'thin',
    muted: true,
  },
  {
    src: '/images/hero/main.webp',
    objectPosition: '47% 50%',
    alt: 'The item, professionally presented in a clean, well-lit setting',
    chip: { label: 'AFTER', tone: 'accent' },
    left: 76,
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
    left: 228,
    top: 72,
    width: 80,
    height: 180,
    rotateY: 22,
    z: 30,
    frame: 'thin',
  },
];

const pctW = (v: number, s: Stage) => `${((v / s.w) * 100).toFixed(4)}%`;
const pctH = (v: number, s: Stage) => `${((v / s.h) * 100).toFixed(4)}%`;

function Card({ card, stage, compact }: { card: FanCard; stage: Stage; compact?: boolean }) {
  const thick = card.frame === 'thick';
  const pad = thick ? (compact ? 5 : 7) : compact ? 4 : 6;
  const outerRadius = thick ? (compact ? 16 : 20) : compact ? 13 : 16;
  const innerRadius = outerRadius - pad;

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
              className={`absolute left-1/2 top-0 z-10 -translate-x-1/2 translate-y-[10px] whitespace-nowrap rounded-full px-2.5 py-1 text-[0.6rem] font-[650] uppercase tracking-[0.12em] shadow-soft ${
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

      {/* Mirror reflection on the glossy surface below, fading out with distance. The frame is
          mirrored along with the photo -- reflecting only the image reads as a floating crop. */}
      <div
        aria-hidden="true"
        className="pointer-events-none mt-[2px] overflow-hidden opacity-[0.5]"
        style={{
          height: '40%',
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent 82%)',
          WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent 82%)',
        }}
      >
        <div
          style={{
            ...frameStyle,
            height: '250%', // the clipped window is 40% tall; the mirrored card is full height
            transform: 'scaleY(-1)',
            // no cast shadow or hard bevel on the reflection -- a mirrored drop shadow reads
            // as a second physical card rather than a reflection
            boxShadow: 'inset 0 0 0 1px rgba(12,13,18,0.04)',
          }}
        >
          {image(true)}
        </div>
      </div>
    </div>
  );
}

function Callout({
  children,
  left,
  top,
  stage,
  tail,
  center = false,
}: {
  children: React.ReactNode;
  left: number;
  top: number;
  stage: Stage;
  /** length of the hairline tying the label down to its card */
  tail?: number;
  center?: boolean;
}) {
  return (
    <div
      className="absolute z-[60] flex flex-col items-center"
      style={{
        left: pctW(left, stage),
        top: pctH(top, stage),
        transform: center ? 'translateX(-50%)' : undefined,
      }}
    >
      <div className="whitespace-nowrap rounded-full border border-marketplace-line/70 bg-white/95 px-4 py-2 text-[0.8125rem] font-medium text-marketplace-ink shadow-soft backdrop-blur">
        {children}
      </div>
      {tail ? (
        <>
          <span
            className="w-px bg-gradient-to-b from-marketplace-line to-transparent"
            style={{ height: tail }}
            aria-hidden="true"
          />
          <span className="h-1.5 w-1.5 rounded-full bg-marketplace-violet/70" aria-hidden="true" />
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
        <span
          className="pointer-events-none absolute h-2 w-2 -translate-x-1/2 rounded-full border-2 border-white bg-marketplace-violet/70 shadow-soft"
          style={{ left: '50%', top: pctH(12, DESKTOP_STAGE) }}
          aria-hidden="true"
        />

        <Floor top="64%" />

        {DESKTOP_CARDS.map((card) => (
          <Card key={card.src} card={card} stage={DESKTOP_STAGE} />
        ))}

        <Callout left={4} top={62} tail={44} stage={DESKTOP_STAGE}>
          Your original photos
        </Callout>
        <Callout left={DESKTOP_STAGE.w / 2} top={28} tail={20} center stage={DESKTOP_STAGE}>
          AI-enhanced results
        </Callout>
        <Callout left={578} top={70} tail={43} stage={DESKTOP_STAGE}>
          More buyer confidence
        </Callout>
        <Callout left={480} top={556} stage={DESKTOP_STAGE}>
          A complete listing set
        </Callout>
      </StageBox>

      {/* Small screens: a simplified three-card stack, per the reference's mobile guidance. */}
      <StageBox size={MOBILE_STAGE} className="lg:hidden">
        <Floor top="62%" />

        {MOBILE_CARDS.map((card) => (
          <Card key={card.src} card={card} stage={MOBILE_STAGE} compact />
        ))}

        <Callout left={MOBILE_STAGE.w / 2} top={2} tail={10} center stage={MOBILE_STAGE}>
          AI-enhanced results
        </Callout>
      </StageBox>
    </>
  );
}
