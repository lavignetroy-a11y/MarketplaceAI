// Transactional email.
//
// WHY A LINK AND NOT ATTACHMENTS
//
// The obvious design is to attach the finished images. It does not survive contact with reality: a
// set of twenty images at a megabyte or two each is thirty megabytes, past Gmail's 25MB ceiling and
// past every transactional provider's limit. Mail that large is rejected, silently truncated, or
// filed as spam -- and a seller who paid finds out by not receiving anything.
//
// A link works, is re-openable, survives a lost phone, and lets someone download on a laptop what
// they bought on a phone. It does mean the link has to keep working, which is why this is only
// worth switching on once campaigns are actually persisted; with in-memory state a restart turns
// every emailed link into a dead one.
//
// WHY IT NEVER THROWS
//
// Email runs after the money has moved and after the images exist. A provider outage at that moment
// must not fail the request that delivers them. Everything here is best-effort and logged.

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export function emailConfigured(): boolean {
  return Boolean((process.env.RESEND_API_KEY ?? '').trim() && fromAddress());
}

/**
 * The From address. Must be on a domain verified with the provider, or delivery is refused.
 * Resend's shared onboarding sender works for testing before a domain exists.
 */
function fromAddress(): string {
  return (process.env.EMAIL_FROM ?? '').trim() || 'Marketplace / AI <onboarding@resend.dev>';
}

/** Sends, or explains in the log why it did not. Never throws. */
export async function sendEmail(message: EmailMessage): Promise<boolean> {
  const apiKey = (process.env.RESEND_API_KEY ?? '').trim();
  if (!apiKey) {
    console.warn(`[email] Not configured; skipping "${message.subject}" to ${message.to}`);
    return false;
  }
  if (!message.to.includes('@')) {
    console.warn(`[email] Refusing to send to an implausible address: ${message.to}`);
    return false;
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });

    if (!res.ok) {
      // The body carries the actual reason -- usually an unverified sending domain.
      console.error(`[email] Provider rejected (${res.status}): ${await res.text()}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[email] Send failed:', err);
    return false;
  }
}
