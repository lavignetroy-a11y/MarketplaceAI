import type { Metadata } from 'next';
import { LegalPage } from '@/components/marketing/LegalPage';

export const metadata: Metadata = { title: 'Refund policy · Marketplace / AI' };

export default function RefundsPage() {
  return (
    <LegalPage title="Refund policy" updated="August 2026">
      <h2>See it before you buy</h2>
      <p>
        Every set starts with one finished image, generated from your own photos, shown to you
        free before you pay anything. That exists so you can judge the actual quality on your
        actual item rather than trusting a sample of someone else&rsquo;s.
      </p>

      <h2>If something goes wrong</h2>
      <p>
        If we fail to deliver the number of images you paid for, you&rsquo;re refunded for what
        wasn&rsquo;t delivered. If the set as a whole doesn&rsquo;t reflect the item you
        uploaded, get in touch and we&rsquo;ll make it right — either by regenerating it or
        refunding you.
      </p>

      <h2>What isn&rsquo;t refundable</h2>
      <ul>
        <li>
          Sets that were delivered as ordered, where you simply changed your mind afterwards —
          the free preview is there to prevent that.
        </li>
        <li>
          Results that accurately reflect photos that didn&rsquo;t show the item well. Better
          source photos produce better sets; we can&rsquo;t add detail your photos don&rsquo;t
          contain.
        </li>
        <li>
          Sales outcomes. We don&rsquo;t refund because an item didn&rsquo;t sell — that&rsquo;s
          not something photos alone control.
        </li>
      </ul>

      <h2>How to ask</h2>
      <p>
        <a href="/contact">Contact us</a> with your set and what went wrong. We&rsquo;d rather
        fix it than argue about it.
      </p>
    </LegalPage>
  );
}
