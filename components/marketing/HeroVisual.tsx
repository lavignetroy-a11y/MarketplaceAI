import { PlaceholderImage } from './PlaceholderImage';

// The fan is laid out in fixed pixels against a design stage measured off the approved hero
// reference. Desktop and small screens get their own stage rather than one being a scaled copy
// of the other -- a CSS scale() doesn't shrink the layout box, which overflows the page on
// mobile, and the reference's six-card fan is unreadable at phone width anyway.
const DESKTOP_STAGE = { w: 820, h: 656 };
const MOBILE_STAGE = { w: 330, h: 350 };

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
};

// Reads left-to-right as the product story: one ordinary source photo, the finished hero
// largest and frontmost, then the rest of the campaign cascading away behind it.
const DESKTOP_CARDS: FanCard[] = [
  {
    src: '/images/hero/original.webp',
    objectPosition: '62% 50%',
    alt: 'An ordinary, unedited seller photo of the item',
    left: 0,
    top: 142,
    width: 172,
    height: 328,
    rotateY: 13,
    z: 10,
    frame: 'thin',
    muted: true,
  },
  {
    src: '/images/hero/main.webp',
    objectPosition: '47% 50%',
    alt: 'The item, professionally presented in a clean, well-lit setting',
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
    rotateY: -25,
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
    rotateY: -28,
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
    rotateY: -30,
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
    rotateY: -32,
    z: 10,
    frame: 'thin',
  },
];

const MOBILE_CARDS: FanCard[] = [
  {
    src: '/images/hero/original.webp',
    objectPosition: '62% 50%',
    alt: 'An ordinary, unedited seller photo of the item',
    left: 0,
    top: 78,
    width: 94,
    height: 176,
    rotateY: 13,
    z: 10,
    frame: 'thin',
    muted: true,
  },
  {
    src: '/images/hero/main.webp',
    objectPosition: '47% 50%',
    alt: 'The item, professionally presented in a clean, well-lit setting',
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
    rotateY: -26,
    z: 30,
    frame: 'thin',
  },
];

function Card({ card, compact }: { card: FanCard; compact?: boolean }) {
  const thick = card.frame === 'thick';
  // The frame is padding rather than a border, so it can carry a gradient -- that soft
  // light-to-shadow fall across the mount is what makes it read as a physical print rather
  // than a flat white stroke. Kept deliberately thin, per the reference.
  const pad = thick ? (compact ? 4 : 5) : compact ? 3 : 4;
  const outerRadius = thick ? (compact ? 15 : 19) : compact ? 12 : 15;
  const innerRadius = outerRadius - pad;

  const frameStyle = {
    width: card.width,
    height: card.height,
    padding: pad,
    borderRadius: outerRadius,
    background: 'linear-gradient(152deg, #ffffff 0%, #ffffff 52%, #e9ecf4 100%)',
  } as const;

  const shadow = thick
    ? '0 22px 46px rgba(12,13,18,0.15), 0 3px 9px rgba(12,13,18,0.06)'
    : '0 14px 32px rgba(12,13,18,0.11), 0 2px 6px rgba(12,13,18,0.045)';

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
        left: card.left,
        top: card.top,
        zIndex: card.z,
        transform: `rotateY(${card.rotateY}deg)`,
      }}
    >
      <div style={{ ...frameStyle, boxShadow: shadow }}>{image(false)}</div>

      {/* Mirror reflection on the glossy surface below, fading out with distance. The frame is
          mirrored along with the photo -- reflecting only the image reads as a floating crop. */}
      <div
        aria-hidden="true"
        className="pointer-events-none mt-[6px] overflow-hidden opacity-[0.45]"
        style={{
          height: Math.round(card.height * 0.36),
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.62), transparent 70%)',
          WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.62), transparent 70%)',
        }}
      >
        <div style={{ ...frameStyle, transform: 'scaleY(-1)' }}>{image(true)}</div>
      </div>
    </div>
  );
}

function Callout({
  children,
  left,
  top,
  tail,
  center = false,
}: {
  children: React.ReactNode;
  left: number;
  top: number;
  /** length of the hairline tying the label down to its card */
  tail?: number;
  center?: boolean;
}) {
  return (
    <div
      className="absolute z-[60] flex flex-col items-center"
      style={{ left, top, transform: center ? 'translateX(-50%)' : undefined }}
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

function Stage({
  size,
  children,
  className,
}: {
  size: { w: number; h: number };
  children: React.ReactNode;
  className: string;
}) {
  return (
    // The stage is absolutely centred so its fixed pixel width never widens the page.
    <div className={`relative overflow-hidden ${className}`} style={{ height: size.h }}>
      <div
        className="absolute left-1/2 top-0 -translate-x-1/2"
        style={{
          width: size.w,
          height: size.h,
          perspective: '1250px',
          perspectiveOrigin: '42% 38%',
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function HeroVisual() {
  return (
    <>
      {/* Desktop: the full six-card fan from the reference. */}
      <Stage size={DESKTOP_STAGE} className="hidden lg:block">
        {/* fine orbital arc tying the callouts together */}
        <svg
          className="pointer-events-none absolute left-0 top-0"
          width={DESKTOP_STAGE.w}
          height={74}
          viewBox={`0 0 ${DESKTOP_STAGE.w} 74`}
          fill="none"
          aria-hidden="true"
        >
          <path
            d={`M30 68 Q ${DESKTOP_STAGE.w / 2} -4 ${DESKTOP_STAGE.w - 30} 68`}
            stroke="#DFE4EF"
            strokeWidth="1"
          />
        </svg>
        <span
          className="pointer-events-none absolute h-2 w-2 -translate-x-1/2 rounded-full border-2 border-white bg-marketplace-violet/70 shadow-soft"
          style={{ left: DESKTOP_STAGE.w / 2, top: 12 }}
          aria-hidden="true"
        />

        {/* glossy surface highlight the fan sits on */}
        <div
          className="pointer-events-none absolute left-[6%] right-[6%] h-24 rounded-[50%] bg-white/70 blur-2xl"
          style={{ top: 468 }}
          aria-hidden="true"
        />

        {DESKTOP_CARDS.map((card) => (
          <Card key={card.src} card={card} />
        ))}

        <Callout left={4} top={62} tail={44}>
          Your original photos
        </Callout>
        <Callout left={DESKTOP_STAGE.w / 2} top={28} tail={20} center>
          Cleaner first impression
        </Callout>
        <Callout left={578} top={70} tail={43}>
          More buyer confidence
        </Callout>
        <Callout left={480} top={556}>
          A complete listing set
        </Callout>
      </Stage>

      {/* Small screens: a simplified three-card stack, per the reference's mobile guidance. */}
      <Stage size={MOBILE_STAGE} className="lg:hidden">
        <div
          className="pointer-events-none absolute left-[6%] right-[6%] h-16 rounded-[50%] bg-white/70 blur-2xl"
          style={{ top: 240 }}
          aria-hidden="true"
        />

        {MOBILE_CARDS.map((card) => (
          <Card key={card.src} card={card} compact />
        ))}

        <Callout left={MOBILE_STAGE.w / 2} top={2} tail={10} center>
          Cleaner first impression
        </Callout>
      </Stage>
    </>
  );
}
