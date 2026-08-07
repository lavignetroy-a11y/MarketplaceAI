import type { Metadata } from 'next';
import { LegalPage } from '@/components/marketing/LegalPage';

export const metadata: Metadata = { title: 'Acceptable use · Marketplace / AI' };

export default function AcceptableUsePage() {
  return (
    <LegalPage title="Acceptable use" updated="August 2026">
      <h2>The principle</h2>
      <p>
        This product exists to present real items honestly and well. Everything below follows
        from that. If a use would mislead a buyer about what they&rsquo;re getting, it&rsquo;s
        not allowed — no matter how good the images look.
      </p>

      <h2>Don&rsquo;t</h2>
      <ul>
        <li>
          <strong>Hide damage or wear.</strong> Don&rsquo;t upload photos chosen to conceal
          condition, and don&rsquo;t ask for results that erase it.
        </li>
        <li>
          <strong>Misrepresent the item.</strong> Don&rsquo;t use images of one item to sell a
          different one, or imply accessories and parts that aren&rsquo;t included.
        </li>
        <li>
          <strong>Upload photos that aren&rsquo;t yours.</strong> Manufacturer shots, other
          sellers&rsquo; listings, or stock photography of an item you don&rsquo;t have.
        </li>
        <li>
          <strong>Sell things you can&rsquo;t legally sell.</strong> Counterfeits, stolen goods,
          weapons, wildlife, or anything prohibited where you&rsquo;re listing.
        </li>
        <li>
          <strong>Upload images of people</strong> who haven&rsquo;t agreed to it, or anything
          sexual, hateful, or illegal.
        </li>
      </ul>

      <h2>What we do about it</h2>
      <p>
        We may refuse to process a set, remove content, or suspend an account that breaks these
        rules. Where the product itself can prevent a problem, it does — condition is preserved
        and unsupported details aren&rsquo;t invented, by design rather than by policy.
      </p>

      <h2>Reporting</h2>
      <p>
        If you&rsquo;ve seen our images used to mislead someone, <a href="/contact">tell us</a>.
      </p>
    </LegalPage>
  );
}
