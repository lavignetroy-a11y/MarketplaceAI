'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Accent, Eyebrow, Lede, SectionTitle } from './primitives';
import { MAX_SOURCE_PHOTOS, formatPrice, priceCents } from '@/lib/config/pricing';

// The objections that actually stop a marketplace seller from buying. Ordered by how early
// each one surfaces, not by how easy it is to answer.
const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: 'Will the finished images still show the real condition of my item?',
    a: (
      <>
        Yes. Wear, marks, scratches, and imperfections are preserved — they are part of what your
        item <em>is</em>. We improve lighting, framing, and background, not the item itself. Hiding
        condition would get you disputes, not sales.
      </>
    ),
  },
  {
    q: 'Will it change or invent parts of my item?',
    a: (
      <>
        No. Your uploaded photos are the only source of truth for what the item looks like. We
        never add accessories you don&rsquo;t have, invent angles your photos don&rsquo;t support,
        or alter materials, colour, or shape. If your photos don&rsquo;t show something, we
        won&rsquo;t make it up — we&rsquo;ll ask you for one more photo instead.
      </>
    ),
  },
  {
    q: 'How much does it cost?',
    a: (
      <>
        {formatPrice(priceCents(1))} per finished image, one time. A typical set is{' '}
        {formatPrice(priceCents(6))}. There&rsquo;s no subscription, and you see one finished
        image free before paying anything.
      </>
    ),
  },
  {
    q: 'Can I see a result before I pay?',
    a: (
      <>
        Yes. After you upload and choose your coverage, we generate one finished image from your
        own photos and show it to you watermarked, free. You only pay if you want the full set.
      </>
    ),
  },
  {
    q: 'Can I upload photos straight from my phone?',
    a: (
      <>
        That&rsquo;s what it&rsquo;s built for. Ordinary phone photos in ordinary lighting are
        exactly the input we expect — a garage, a spare room, whatever you have.
      </>
    ),
  },
  {
    q: 'How many photos should I upload?',
    a: (
      <>
        As many angles as you have, up to {MAX_SOURCE_PHOTOS} per item. More angles means better
        grounding, which means a more accurate finished set. Four to eight is usually plenty for a
        piece of furniture; a vehicle benefits from more.
      </>
    ),
  },
  {
    q: 'What types of items work?',
    a: (
      <>
        Furniture and home goods, vehicles, tools and equipment, plants, electronics,
        collectibles, and bundles or sets. The set is built around your specific item and
        category rather than a fixed template.
      </>
    ),
  },
  {
    q: 'How long does it take?',
    a: (
      <>
        Your free preview arrives in a couple of minutes. The full set follows after payment.
        Exact timing depends on how many images you chose and how busy the queue is — we
        won&rsquo;t promise a number we haven&rsquo;t measured.
      </>
    ),
  },
  {
    q: 'Can I use the images on Facebook Marketplace, eBay, Craigslist, or OfferUp?',
    a: (
      <>
        Yes — anywhere you list. You receive standard image files in listing order, ready to
        upload wherever you sell.
      </>
    ),
  },
  {
    q: 'Are my photos private?',
    a: (
      <>
        Your uploads are yours. They are used to create your set and nothing else — not shared,
        not sold, not published.
      </>
    ),
  },
  {
    q: 'What if my photos don&rsquo;t show enough?',
    a: (
      <>
        Rather than guessing, we tell you exactly what&rsquo;s missing — for example &ldquo;one
        straight-on photo of the back&rdquo;. One more photo, and we continue.
      </>
    ),
  },
  {
    q: 'What if an image doesn&rsquo;t come out right?',
    a: (
      <>
        We don&rsquo;t deliver images that misrepresent your item, and we don&rsquo;t pad a set
        with filler to hit a number. If something can&rsquo;t be produced truthfully, you&rsquo;ll
        be told rather than quietly given something else.
      </>
    ),
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="section relative overflow-hidden">
      <div className="page-shell mx-auto max-w-page">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:gap-16">
          <div>
            <Eyebrow>Questions</Eyebrow>
            <SectionTitle className="mt-5">
              Everything you might <Accent>want to ask.</Accent>
            </SectionTitle>
            <Lede className="mt-6 max-w-[380px]">
              If something isn&rsquo;t answered here, it should be. Tell us what&rsquo;s missing
              and we&rsquo;ll add it.
            </Lede>
          </div>

          <div className="divide-y divide-marketplace-line/70 border-y border-marketplace-line/70">
            {FAQS.map((faq, i) => {
              const isOpen = open === i;
              return (
                <div key={faq.q}>
                  <h3>
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : i)}
                      aria-expanded={isOpen}
                      aria-controls={`faq-panel-${i}`}
                      id={`faq-button-${i}`}
                      className="flex w-full items-center justify-between gap-6 py-5 text-left transition-colors hover:text-marketplace-violet"
                    >
                      <span className="text-[1.0625rem] font-semibold tracking-[-0.02em] text-marketplace-ink">
                        {faq.q}
                      </span>
                      <ChevronDown
                        className={`h-5 w-5 shrink-0 text-marketplace-muted transition-transform duration-200 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                  </h3>
                  <div
                    id={`faq-panel-${i}`}
                    role="region"
                    aria-labelledby={`faq-button-${i}`}
                    hidden={!isOpen}
                    className="pb-6 pr-10"
                  >
                    <p className="text-[0.9375rem] leading-[1.65] text-marketplace-muted">
                      {faq.a}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
