import type { Metadata } from 'next';
import { LegalPage } from '@/components/marketing/LegalPage';

export const metadata: Metadata = { title: 'Terms · Marketplace / AI' };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of service" updated="August 2026">
      <h2>What we do</h2>
      <p>
        You upload photos of an item you&rsquo;re selling. We produce a coordinated set of
        listing images based on those photos, plus listing copy. We improve how the item is
        presented — lighting, framing, background, coverage. We do not change what the item is.
      </p>

      <h2>What you&rsquo;re responsible for</h2>
      <ul>
        <li>
          <strong>Owning your photos.</strong> Only upload images you took or have the right to
          use.
        </li>
        <li>
          <strong>Describing your item honestly.</strong> The generated images reflect your
          photos. If your photos misrepresent the item, the results will too.
        </li>
        <li>
          <strong>Your listings.</strong> How you use the images, and what you claim in your
          listing, is up to you and subject to the rules of wherever you sell.
        </li>
      </ul>

      <h2>What you get</h2>
      <p>
        You own the images we generate for you and can use them commercially in your listings.
        We keep a copy so you can re-download them from your account.
      </p>

      <h2>What we don&rsquo;t promise</h2>
      <p>
        We can&rsquo;t promise your item will sell, sell faster, or sell for more. Better
        presentation helps a listing get noticed and understood; it doesn&rsquo;t control what
        buyers do. Nothing on this site should be read as a guaranteed outcome.
      </p>
      <p>
        We also can&rsquo;t guarantee that every generated image will be usable. Where an image
        can&rsquo;t be produced truthfully from your photos, we&rsquo;ll tell you rather than
        deliver something misleading.
      </p>

      <h2>Acceptable use</h2>
      <p>
        Don&rsquo;t use the service to misrepresent an item, conceal damage, or create images of
        things you aren&rsquo;t actually selling. See <a href="/legal/acceptable-use">acceptable use</a>{' '}
        for detail.
      </p>

      <h2>Payment</h2>
      <p>
        Pricing is per finished image, charged once per set. See{' '}
        <a href="/legal/refunds">our refund policy</a> for what happens if something goes wrong.
      </p>

      <h2>Ending things</h2>
      <p>
        You can stop using the service and delete your account at any time. We may suspend
        accounts that break these terms.
      </p>
    </LegalPage>
  );
}
