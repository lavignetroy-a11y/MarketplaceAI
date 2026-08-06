import { PlaceholderImage } from './PlaceholderImage';

function Callout({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`absolute z-20 whitespace-nowrap rounded-full border border-marketplace-line/70 bg-white/90 px-4 py-2 text-[0.8125rem] font-medium text-marketplace-ink shadow-soft backdrop-blur ${className}`}
    >
      {children}
    </div>
  );
}

function Connector({ className = '' }: { className?: string }) {
  return <div className={`absolute z-10 w-px bg-marketplace-line ${className}`} aria-hidden="true" />;
}

export function HeroVisual() {
  return (
    <div className="relative mx-auto h-[360px] w-full max-w-[400px] md:h-[520px] md:max-w-none">
      {/* faint orbital arc, purely decorative */}
      <div
        className="pointer-events-none absolute left-1/2 top-6 hidden h-[340px] w-[340px] -translate-x-1/2 rounded-full border border-marketplace-violet/15 md:block"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute left-1/2 top-0 hidden h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-marketplace-violet/60 md:block"
        aria-hidden="true"
      />

      {/* soft ground shadow suggesting a glossy surface beneath the stack */}
      <div
        className="pointer-events-none absolute bottom-6 left-1/2 h-14 w-[78%] -translate-x-1/2 rounded-full bg-marketplace-ink/10 blur-2xl"
        aria-hidden="true"
      />

      {/* original photo -- smallest, furthest left, slightly desaturated to read as "before" */}
      <div className="absolute left-2 top-20 z-10 -rotate-6 rounded-brand border-2 border-white bg-white p-1.5 shadow-soft md:left-0 md:top-20">
        <PlaceholderImage
          src="/images/hero/original.jpg"
          alt="An ordinary, unedited seller photo of the item"
          className="h-[110px] w-[86px] rounded-[10px] grayscale-[15%] md:h-[190px] md:w-[150px]"
        />
      </div>
      <Connector className="left-[15%] top-2 hidden h-12 md:block" />
      <Callout className="left-0 top-0 hidden md:block">Your original photos</Callout>

      {/* main hero image -- largest, centered, frontmost */}
      <div className="absolute left-1/2 top-8 z-30 -translate-x-1/2 rounded-brand-lg border-4 border-white bg-white p-2 shadow-lift md:top-10">
        <PlaceholderImage
          src="/images/hero/main.jpg"
          alt="The item, professionally presented in a clean, well-lit setting"
          className="h-[260px] w-[208px] rounded-brand md:h-[380px] md:w-[300px]"
        />
      </div>
      <Connector className="left-1/2 top-0 h-6 -translate-x-1/2" />
      <Callout className="left-1/2 top-0 -translate-x-1/2">Cleaner first impression</Callout>

      {/* cascading campaign images, fanning to the right */}
      <div className="absolute right-2 top-28 z-20 rotate-3 rounded-brand border-2 border-white bg-white p-1.5 shadow-soft md:right-10 md:top-28">
        <PlaceholderImage
          src="/images/hero/alt-1.jpg"
          alt="An alternate angle from the finished listing campaign"
          className="h-[125px] w-[98px] rounded-[10px] md:h-[210px] md:w-[168px]"
        />
      </div>
      <div className="absolute right-2 top-32 z-10 hidden rotate-6 rounded-brand border-2 border-white bg-white p-1.5 shadow-soft md:block md:top-40">
        <PlaceholderImage
          src="/images/hero/alt-2.jpg"
          alt="A detail shot from the finished listing campaign"
          className="h-[190px] w-[150px] rounded-[10px]"
        />
      </div>
      <Connector className="right-[18%] top-2 hidden h-16 md:block" />
      <Callout className="right-0 top-0 hidden md:block">More buyer confidence</Callout>

      <Callout className="bottom-1 right-0 md:bottom-14 md:right-2">A complete listing set</Callout>
    </div>
  );
}
