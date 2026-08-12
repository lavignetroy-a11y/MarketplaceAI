// The emails a seller receives.
//
// Every one is sent in plain text as well as HTML. Not politeness -- a text part materially
// improves deliverability, and a transactional mail that lands in spam has failed at the one job
// it had, which is telling somebody their purchase is ready.
//
// Deliberately plain markup: inline styles only, a table-free single column, no web fonts, no
// images. Mail clients are a decade behind browsers and a layout that renders beautifully in one
// collapses in the next. What matters is that the link is obvious and works.

import { SUPPORT_EMAIL } from '@/lib/config/contact';
import type { EmailMessage } from './send';

function shell(bodyHtml: string): string {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
    font-size:16px;line-height:1.6;color:#1a1a1a;max-width:560px;margin:0 auto;padding:24px">
    ${bodyHtml}
    <hr style="border:none;border-top:1px solid #e6e6e9;margin:32px 0 16px">
    <p style="font-size:13px;color:#71717a;margin:0">
      Marketplace / AI &middot; Questions? Reply to this email or write to
      <a href="mailto:${SUPPORT_EMAIL}" style="color:#71717a">${SUPPORT_EMAIL}</a>.
    </p>
  </div>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:28px 0">
    <a href="${href}" style="background:#6d28d9;color:#ffffff;text-decoration:none;
      padding:13px 22px;border-radius:8px;display:inline-block;font-weight:600">${label}</a>
  </p>`;
}

/**
 * Sent when the paid set has finished generating -- not when payment clears.
 *
 * The distinction matters. An email on payment arrives while there is nothing yet to collect, so
 * its link opens a page mid-generation and the seller either waits on it or leaves and forgets.
 * Sending on completion means the link always leads to finished work.
 */
export function setReadyEmail(opts: {
  to: string;
  campaignUrl: string;
  imageCount: number;
  failedCount: number;
  itemDescription?: string | null;
}): EmailMessage {
  const { to, campaignUrl, imageCount, failedCount, itemDescription } = opts;
  const item = itemDescription ? ` of your ${itemDescription}` : '';

  // Said plainly rather than buried. A seller who paid for eight and got seven needs to know
  // before they build a listing around them, not after.
  const shortfall =
    failedCount > 0
      ? `<p style="background:#fef3c7;border-radius:8px;padding:14px 16px;margin:20px 0">
           <strong>${failedCount} of your images could not be generated.</strong> You have not been
           charged for those. Reply to this email and we will either finish them or refund the
           difference.</p>`
      : '';

  const html = shell(`
    <h1 style="font-size:22px;font-weight:650;margin:0 0 12px">Your listing images are ready</h1>
    <p style="margin:0">All ${imageCount} image${imageCount === 1 ? '' : 's'}${item} are finished
      and ready to download.</p>
    ${shortfall}
    ${button(campaignUrl, 'Download your images')}
    <p style="font-size:14px;color:#52525b;margin:0">
      Keep this email &mdash; the link above is how you get back to this set.
    </p>
  `);

  const text = [
    'Your listing images are ready',
    '',
    `All ${imageCount} image${imageCount === 1 ? '' : 's'}${item} are finished and ready to download.`,
    ...(failedCount > 0
      ? [
          '',
          `${failedCount} of your images could not be generated. You have not been charged for`,
          'those. Reply to this email and we will either finish them or refund the difference.',
        ]
      : []),
    '',
    'Download your images:',
    campaignUrl,
    '',
    'Keep this email -- the link above is how you get back to this set.',
    '',
    `Questions? Reply to this email or write to ${SUPPORT_EMAIL}.`,
  ].join('\n');

  return { to, subject: 'Your listing images are ready', html, text };
}

/**
 * Sent if generation fails outright after payment.
 *
 * Silence here is the worst possible outcome: the seller has paid, has nothing, and has no reason
 * to believe anyone knows. Saying so first, unprompted, is the difference between a refund and a
 * chargeback.
 */
export function setFailedEmail(opts: { to: string; campaignUrl: string }): EmailMessage {
  const html = shell(`
    <h1 style="font-size:22px;font-weight:650;margin:0 0 12px">Something went wrong with your set</h1>
    <p style="margin:0 0 16px">Your payment went through, but we were not able to generate your
      images. That is our fault, not yours.</p>
    <p style="margin:0 0 16px"><strong>Reply to this email and we will refund you in full</strong>,
      or try again with no further charge &mdash; whichever you prefer.</p>
    ${button(opts.campaignUrl, 'View your set')}
  `);

  const text = [
    'Something went wrong with your set',
    '',
    'Your payment went through, but we were not able to generate your images.',
    'That is our fault, not yours.',
    '',
    'Reply to this email and we will refund you in full, or try again with no',
    'further charge -- whichever you prefer.',
    '',
    opts.campaignUrl,
    '',
    `Questions? Reply to this email or write to ${SUPPORT_EMAIL}.`,
  ].join('\n');

  return { to: opts.to, subject: 'There was a problem with your images', html, text };
}
