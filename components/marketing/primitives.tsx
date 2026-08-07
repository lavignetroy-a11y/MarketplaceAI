import { PlaceholderImage } from './PlaceholderImage';

/** Small uppercase kicker above a section heading. */
export function Eyebrow({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <p
      className={`text-[0.75rem] font-[650] uppercase tracking-[0.16em] ${
        dark ? 'text-marketplace-violet/90' : 'text-marketplace-violet'
      }`}
    >
      {children}
    </p>
  );
}

/** Section heading. `accent` renders in the violet-blue gradient. */
export function SectionTitle({
  children,
  className = '',
  dark,
}: {
  children: React.ReactNode;
  className?: string;
  dark?: boolean;
}) {
  return (
    <h2
      className={`text-[clamp(1.85rem,2.8vw,2.7rem)] font-[620] leading-[1.06] tracking-[-0.038em] [text-wrap:balance] ${
        dark ? 'text-white' : 'text-marketplace-ink'
      } ${className}`}
    >
      {children}
    </h2>
  );
}

export function Accent({ children }: { children: React.ReactNode }) {
  return <span className="bg-violet-blue bg-clip-text text-transparent">{children}</span>;
}

export function Lede({
  children,
  className = '',
  dark,
}: {
  children: React.ReactNode;
  className?: string;
  dark?: boolean;
}) {
  return (
    <p
      className={`text-[clamp(0.9688rem,1.05vw,1.0625rem)] leading-[1.6] tracking-[-0.012em] ${
        dark ? 'text-white/65' : 'text-marketplace-muted'
      } ${className}`}
    >
      {children}
    </p>
  );
}

/** A framed photo card matching the hero's mount treatment, reusable across sections. */
export function PhotoCard({
  src,
  alt,
  className = '',
  imgClassName = '',
  objectPosition,
  label,
  radius = 18,
  pad = 6,
  gridArea,
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  objectPosition?: string;
  label?: { text: string; icon?: React.ReactNode };
  radius?: number;
  pad?: number;
  /** CSS grid-area name, when the card is placed in a named-area grid. */
  gridArea?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        gridArea,
        padding: pad,
        borderRadius: radius,
        background: 'linear-gradient(143deg, #ffffff 0%, #fbfcfe 30%, #eceff7 66%, #d6dbe9 100%)',
        boxShadow:
          'inset 0 1.5px 0 rgba(255,255,255,1), inset 0 -2px 4px rgba(12,13,18,0.12), inset 0 0 0 1px rgba(12,13,18,0.05), 0 14px 32px rgba(12,13,18,0.10)',
      }}
    >
      <PlaceholderImage
        src={src}
        alt={alt}
        objectPosition={objectPosition}
        className={`h-full w-full ${imgClassName}`}
        style={{ borderRadius: radius - pad }}
      />
      {label && (
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/92 px-3 py-1.5 text-[0.75rem] font-medium text-marketplace-ink shadow-soft backdrop-blur">
          {label.icon}
          {label.text}
        </span>
      )}
    </div>
  );
}

/** Circular icon chip with the brand gradient stroke. */
export function IconChip({
  children,
  size = 'md',
  dark,
}: {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  dark?: boolean;
}) {
  const dims = size === 'lg' ? 'h-14 w-14' : size === 'sm' ? 'h-9 w-9' : 'h-11 w-11';
  return (
    <span
      className={`flex ${dims} shrink-0 items-center justify-center rounded-full ${
        dark
          ? 'bg-white/[0.07] ring-1 ring-white/10'
          : 'bg-gradient-to-br from-marketplace-violet/[0.13] to-marketplace-blue/[0.13]'
      }`}
    >
      {children}
    </span>
  );
}

/** Shared SVG gradient used to stroke lucide icons. Mount once per page. */
export const ICON_GRADIENT_ID = 'mp-icon-gradient';

export function IconGradientDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={ICON_GRADIENT_ID} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7A5CFF" />
          <stop offset="100%" stopColor="#4D82FF" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export const gradientStroke = { stroke: `url(#${ICON_GRADIENT_ID})` } as const;
