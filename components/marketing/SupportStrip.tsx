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

export function SupportStrip() {
  return (
    <div className="rounded-brand-lg border border-marketplace-line/70 bg-white/70 p-6 shadow-soft backdrop-blur md:p-8">
      <div className="grid grid-cols-1 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map(({ icon: Icon, title, body }, i) => (
          <div
            key={title}
            className={`flex items-start gap-3.5 lg:px-7 ${
              // hairline separators between items, matching the reference strip
              i > 0 ? 'lg:border-l lg:border-marketplace-line/70' : ''
            } ${i === 0 ? 'lg:pl-1' : ''} ${i === ITEMS.length - 1 ? 'lg:pr-1' : ''}`}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-marketplace-violet/15 to-marketplace-blue/15">
              <Icon className="h-[1.15rem] w-[1.15rem] text-marketplace-violet" aria-hidden="true" />
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
