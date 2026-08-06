import { PlaceholderImage } from './PlaceholderImage';

// The fan is laid out in fixed pixels against a design stage measured off the approved hero
// reference. Desktop and small screens get their own stage rather than one being a scaled copy
// of the other -- a CSS scale() doesn't shrink the layout box, which overflows the page on
// mobile, and the reference's five-card fan is unreadable at phone width anyway.
const DESKTOP_STAGE = { w: 660, h: 600 };
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
};

// Reads left-to-right as the product story: one ordinary source photo, the finished hero
// largest and frontmost, then the rest of the campaign cascading away behind it.
const DESKTOP_CARDS: FanCard[] = [
  {
    src: '/images/hero/original.jpg',
    alt: 'An ordinary, unedited seller photo of the item',
    left: 0,
    top: 122,
    width: 148,
    height: 282,
    rotateY: 13,
    z: 10,
    frame: 'thin',
    muted: true,
  },
  {
    src: '/images/hero/main.jpg',
    alt: 'The item, professionally presented in a clean, well-lit setting',
    left: 128,
    top: 78,
    width: 256,
    height: 352,
    rotateY: 0,
    z: 40,
    frame: 'thick',
  },
  {
    src: '/images/hero/alt-1.jpg',
    alt: 'An alternate angle from the finished listing campaign',
    left: 366,
    top: 118,
    width: 118,
    height: 286,
    rotateY: -26,
    z: 30,
    frame: 'thin',
  },
  {
    src: '/images/hero/alt-2.jpg',
    alt: 'A texture detail from the finished listing campaign',
    left: 448,
    top: 138,
    width: 112,
    height: 258,
    rotateY: -29,
    z: 20,
    frame: 'thin',
  },
  {
    src: '/images/hero/alt-3.jpg',
    alt: 'A further view from the finished listing campaign',
    left: 524,
    top: 158,
    width: 108,
    height: 232,
    rotateY: -32,
    z: 10,
    frame: 'thin',
  },
];

const MOBILE_CARDS: FanCard[] = [
  {
    src: '/images/hero/original.jpg',
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
    src: '/images/hero/main.jpg',
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
    src: '/images/hero/alt-1.jpg',
    alt: 'An alternate angle from the finished listing campaign',
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
  const frame =
    card.frame === 'thick'
      ? {
          outer: compact ? 'rounded-[16px] border-[5px] shadow-lift' : 'rounded-[22px] border-[7px] shadow-lift',
          inner: compact ? 'rounded-[11px]' : 'rounded-[15px]',
        }
      : {
          outer: compact ? 'rounded-[12px] border-[4px] shadow-soft' : 'rounded-[16px] border-[5px] shadow-soft',
          inner: compact ? 'rounded-[8px]' : 'rounded-[11px]',
        };

  const box = { width: card.width, height: card.height };

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
      <div className={`overflow-hidden border-white bg-white ${frame.outer}`} style={box}>
        <PlaceholderImage
          src={card.src}
          alt={card.alt}
          className={`h-full w-full ${frame.inner} ${card.muted ? 'saturate-[0.85]' : ''}`}
        />
      </div>

      {/* Mirror reflection on the glossy surface below, fading out with distance. No frame or
          shadow on the reflection itself -- a mirrored white border reads as a second card. */}
      <div
        aria-hidden="true"
        className="pointer-events-none mt-[5px] overflow-hidden opacity-50"
        style={{
          height: Math.round(card.height * 0.34),
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent 68%)',
          WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent 68%)',
        }}
      >
        <div className={`overflow-hidden ${frame.inner}`} style={{ ...box, transform: 'scaleY(-1)' }}>
          <PlaceholderImage src={card.src} alt="" decorative className={`h-full w-full ${frame.inner}`} />
        </div>
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
      className="absolute z-50 flex flex-col items-center"
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
          perspective: '1150px',
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
      {/* Desktop: the full five-card fan from the reference. */}
      <Stage size={DESKTOP_STAGE} className="hidden lg:block">
        {/* fine orbital arc tying the callouts together */}
        <svg
          className="pointer-events-none absolute left-0 top-0"
          width={DESKTOP_STAGE.w}
          height={70}
          viewBox={`0 0 ${DESKTOP_STAGE.w} 70`}
          fill="none"
          aria-hidden="true"
        >
          <path
            d={`M30 64 Q ${DESKTOP_STAGE.w / 2} -4 ${DESKTOP_STAGE.w - 30} 64`}
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
          style={{ top: 400 }}
          aria-hidden="true"
        />

        {DESKTOP_CARDS.map((card) => (
          <Card key={card.src} card={card} />
        ))}

        <Callout left={4} top={58} tail={26}>
          Your original photos
        </Callout>
        <Callout left={DESKTOP_STAGE.w / 2} top={26} tail={14} center>
          Cleaner first impression
        </Callout>
        <Callout left={476} top={62} tail={32}>
          More buyer confidence
        </Callout>
        <Callout left={392} top={474}>
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
