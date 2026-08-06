import Link from 'next/link';
import { Check, CloudUpload, Grid2x2, ShieldCheck, Star, Upload } from 'lucide-react';
import { Accent, Eyebrow, Lede, PhotoCard, SectionTitle, gradientStroke } from './primitives';
import { MAX_SOURCE_PHOTOS, coverageFor, formatPrice, priceCents } from '@/lib/config/pricing';

const STEPS = [
  {
    n: '01',
    title: 'Upload what you have',
    body: `Add up to ${MAX_SOURCE_PHOTOS} photos of one item, straight from your phone. We take care of the rest.`,
  },
  {
    n: '02',
    title: 'Choose your coverage',
    body: 'Pick how many finished images you want. You only pay for what you choose.',
  },
  {
    n: '03',
    title: 'See it free, then get the set',
    body: 'We show you one finished image free before you pay. Like it, and the full set follows.',
  },
];

/**
 * How it works. Each step panel is a miniature of the real interface rather than an
 * illustration -- someone who scrolls this section has effectively already seen the product,
 * which is the fastest way to answer "is this complicated?".
 */
export function HowItWorks() {
  return (
    <section id="how-it-works" className="section relative overflow-hidden bg-marketplace-canvas/40">
      <div className="page-shell mx-auto max-w-page">
        <div className="max-w-[620px]">
          <Eyebrow>How it works</Eyebrow>
          <SectionTitle className="mt-5">
            From camera roll to <Accent>ready to post.</Accent>
          </SectionTitle>
          <Lede className="mt-6 max-w-[500px]">
            Upload the photos you already have, choose the coverage you want, and receive a
            polished listing set. No editing skills, no prompt writing.
          </Lede>
        </div>

        <ol className="mt-12 grid gap-8 lg:grid-cols-3 lg:gap-6">
          {STEPS.map((step, i) => (
            <li key={step.n} className="relative">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-marketplace-line/70 bg-white font-mono text-[0.8125rem] font-medium text-marketplace-violet shadow-soft">
                  {step.n}
                </span>
                <div>
                  <h3 className="text-[1.0625rem] font-semibold tracking-[-0.02em] text-marketplace-ink">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-[0.875rem] leading-[1.5] text-marketplace-muted">
                    {step.body}
                  </p>
                </div>
              </div>
              <div className="mt-6">
                {i === 0 && <StepUpload />}
                {i === 1 && <StepCoverage />}
                {i === 2 && <StepResult />}
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-7 gap-y-4 rounded-brand-lg border border-marketplace-line/60 bg-white/75 px-7 py-6 shadow-soft backdrop-blur">
          <Link
            href="/upload"
            className="inline-flex min-h-[48px] items-center gap-2 rounded-[14px] bg-violet-blue px-6 text-[0.9375rem] font-semibold text-white shadow-[0_8px_22px_rgba(122,92,255,0.32)] transition-transform hover:-translate-y-px"
          >
            Start with your photos
            <Upload className="h-4 w-4" aria-hidden="true" />
          </Link>
          <span className="hidden h-6 w-px bg-marketplace-line md:block" />
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[0.875rem] text-marketplace-muted">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" {...gradientStroke} strokeWidth={2} />
              No editing experience needed
            </span>
            <span className="hidden h-4 w-px bg-marketplace-line sm:block" />
            <span>No prompt writing</span>
            <span className="hidden h-4 w-px bg-marketplace-line sm:block" />
            <span>See a result before you pay</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-brand-lg border border-marketplace-line/60 bg-white/85 p-5 shadow-soft backdrop-blur">
      {children}
    </div>
  );
}

function StepUpload() {
  return (
    <Panel>
      <div className="rounded-[18px] border border-dashed border-marketplace-line bg-marketplace-canvas/55 px-5 py-8 text-center">
        <CloudUpload className="mx-auto h-8 w-8" {...gradientStroke} strokeWidth={1.75} />
        <p className="mt-3 text-[0.9375rem] font-medium text-marketplace-ink">
          Drag and drop photos here
        </p>
        <p className="text-[0.875rem] font-medium text-marketplace-violet">or browse</p>
      </div>
      <div className="mt-4 flex gap-2">
        {[1, 2, 3, 4].map((n) => (
          <PhotoCard
            key={n}
            src={`/images/how/source-${n}.webp`}
            alt=""
            className="aspect-[3/4] flex-1 saturate-[0.85]"
            radius={10}
            pad={3}
          />
        ))}
      </div>
      <p className="mt-3 text-center text-[0.8125rem] text-marketplace-muted">
        Ordinary seller photos are perfect.
      </p>
    </Panel>
  );
}

function StepCoverage() {
  const options = [4, 6, 8, 10];
  return (
    <Panel>
      <div className="flex flex-col gap-2.5">
        {options.map((count) => {
          const selected = count === 8;
          return (
            <div
              key={count}
              className={`flex items-center gap-3 rounded-[14px] border px-4 py-3 transition-colors ${
                selected
                  ? 'border-marketplace-violet bg-marketplace-violet/[0.05]'
                  : 'border-marketplace-line/70 bg-white'
              }`}
            >
              <Grid2x2 className="h-4 w-4 shrink-0" {...gradientStroke} strokeWidth={2} />
              <span className="text-[0.9375rem] font-medium text-marketplace-ink">
                {count} images
              </span>
              <span className="ml-auto text-[0.8125rem] text-marketplace-muted">
                {coverageFor(count).label}
              </span>
              <span className="font-mono text-[0.8125rem] font-medium text-marketplace-ink">
                {formatPrice(priceCents(count))}
              </span>
              {selected && (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-blue">
                  <Check className="h-3 w-3 text-white" strokeWidth={3} />
                </span>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-center text-[0.8125rem] text-marketplace-muted">
        Just {formatPrice(priceCents(1))} per finished image.
      </p>
    </Panel>
  );
}

function StepResult() {
  return (
    <Panel>
      <div className="grid grid-cols-3 gap-2">
        <PhotoCard
          src="/images/how/result-hero.webp"
          alt="The strongest first photo from the finished set"
          className="col-span-2 row-span-2 min-h-[176px]"
          label={{
            text: 'Best for first photo',
            icon: <Star className="h-3.5 w-3.5" {...gradientStroke} strokeWidth={2} />,
          }}
          radius={12}
          pad={4}
        />
        {[1, 2, 3, 4].map((n) => (
          <PhotoCard
            key={n}
            src={`/images/how/result-${n}.webp`}
            alt=""
            className="aspect-square"
            radius={10}
            pad={3}
          />
        ))}
      </div>
      <p className="mt-3 text-center text-[0.8125rem] text-marketplace-muted">
        Your finished set, in listing order.
      </p>
    </Panel>
  );
}
