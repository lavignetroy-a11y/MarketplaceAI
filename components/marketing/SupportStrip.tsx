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
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex items-start gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-marketplace-violet/15 to-marketplace-blue/15">
              <Icon className="h-5 w-5 text-marketplace-violet" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[0.9375rem] font-semibold tracking-[-0.015em] text-marketplace-ink">
                {title}
              </p>
              <p className="mt-0.5 text-[0.875rem] leading-snug text-marketplace-muted">{body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
