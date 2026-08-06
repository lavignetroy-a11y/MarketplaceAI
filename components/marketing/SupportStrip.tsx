import { Gem, ShieldCheck, Sparkles, Zap } from 'lucide-react';

const ITEMS = [
  {
    icon: Sparkles,
    title: 'Stand out faster',
    body: 'Stronger visuals help stop the scroll.',
  },
  {
    icon: Gem,
    title: 'Look more valuable',
    body: 'Cleaner presentation elevates perceived quality.',
  },
  {
    icon: ShieldCheck,
    title: 'Build buyer trust',
    body: 'Show the item clearly from multiple angles.',
  },
  {
    icon: Zap,
    title: 'No prompt work',
    body: 'Upload once and get a polished campaign.',
  },
];

// lucide icons draw with `stroke="currentColor"`, which can't take a gradient. Pointing their
// stroke at an SVG gradient defined once on the page gives the reference's violet-to-blue
// icon strokes. The <defs> carrier is zero-size and hidden from assistive tech.
const ICON_GRADIENT_ID = 'marketplace-icon-gradient';

function IconGradientDefs() {
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

export function SupportStrip() {
  return (
    <div className="rounded-brand-lg border border-marketplace-line/70 bg-white/70 p-6 shadow-soft backdrop-blur md:p-8">
      <IconGradientDefs />
      <div className="grid grid-cols-1 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map(({ icon: Icon, title, body }, i) => (
          <div
            key={title}
            className={`flex items-start gap-3.5 lg:px-7 ${
              // hairline separators between items, matching the reference strip
              i > 0 ? 'lg:border-l lg:border-marketplace-line/70' : ''
            } ${i === 0 ? 'lg:pl-1' : ''} ${i === ITEMS.length - 1 ? 'lg:pr-1' : ''}`}
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-marketplace-violet/[0.13] to-marketplace-blue/[0.13]">
              <Icon
                className="h-[1.3rem] w-[1.3rem]"
                stroke={`url(#${ICON_GRADIENT_ID})`}
                strokeWidth={2}
                aria-hidden="true"
              />
            </span>
            <div>
              <p className="text-[0.9375rem] font-semibold tracking-[-0.015em] text-marketplace-ink">
                {title}
              </p>
              <p className="mt-1 text-[0.8375rem] leading-[1.45] text-marketplace-muted">{body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
