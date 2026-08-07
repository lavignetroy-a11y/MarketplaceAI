import type { Metadata } from 'next';
import { LegalPage } from '@/components/marketing/LegalPage';

export const metadata: Metadata = { title: 'Privacy · Marketplace / AI' };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy" updated="August 2026">
      <h2>The short version</h2>
      <p>
        You upload photos of something you&rsquo;re selling. We use them to create your listing
        set, and for nothing else. We don&rsquo;t sell them, publish them, or hand them to
        advertisers.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>The photos you upload</strong>, plus any notes you add about the item.
        </li>
        <li>
          <strong>The images we generate</strong> for you, and the listing copy that goes with
          them.
        </li>
        <li>
          <strong>Your email address</strong>, if you create an account.
        </li>
        <li>
          <strong>Basic technical data</strong> your browser sends — the kind every website
          receives.
        </li>
      </ul>

      <h2>What we do with it</h2>
      <p>
        Your photos are sent to our image-generation provider to produce your set. They are
        processed to fulfil your order and are not used to train models on your behalf. Your
        finished set is stored so you can download it again from your account.
      </p>

      <h2>Who else sees it</h2>
      <ul>
        <li>
          <strong>Our image-generation provider</strong>, to create your set.
        </li>
        <li>
          <strong>Our hosting and database providers</strong>, who store the data on our behalf.
        </li>
        <li>
          <strong>A payment processor</strong>, when you pay. We never see or store your card
          details.
        </li>
      </ul>
      <p>That&rsquo;s the whole list. No advertisers, no data brokers.</p>

      <h2>How long we keep it</h2>
      <p>
        Your sets stay in your account until you delete them or close your account. Delete your
        account and we remove your photos, generated images, and account record.
      </p>

      <h2>Your choices</h2>
      <p>
        You can download your images any time, delete an individual set, or delete your account
        entirely. You can also ask us for a copy of what we hold about you, or ask us to delete
        it, by getting in touch.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about any of this? <a href="/contact">Get in touch</a>.
      </p>
    </LegalPage>
  );
}
