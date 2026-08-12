// Where customers reach a human.
//
// These were hardcoded as support@example.com and abuse@example.com behind a TODO. A live site
// whose support link goes to example.com takes the customer's money and then silently drops every
// message they send about it -- and the refund policy, the terms, and the acceptable-use page all
// point here, so the address is load-bearing for promises made elsewhere.
//
// Set in the environment rather than in code so the same build can run against a staging address
// and a production one, and so changing it is not a deploy.

const PLACEHOLDER = 'example.com';

function address(envValue: string | undefined, fallback: string): string {
  const value = (envValue ?? '').trim();
  return value || fallback;
}

/** General support: problems with a set, refunds, questions before buying. */
export const SUPPORT_EMAIL = address(
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
  `support@${PLACEHOLDER}`,
);

/** Reports of misuse -- listings misrepresenting an item, stolen photographs. */
export const ABUSE_EMAIL = address(
  process.env.NEXT_PUBLIC_ABUSE_EMAIL,
  `abuse@${PLACEHOLDER}`,
);

/**
 * False while either address still points at example.com.
 *
 * Exported because this failure is invisible in testing: every page renders perfectly and nothing
 * breaks until a paying customer emails a domain nobody owns. The launch checklist checks it, and
 * anything that wants to hard-fail a production build can read it.
 */
export const CONTACT_CONFIGURED =
  !SUPPORT_EMAIL.includes(PLACEHOLDER) && !ABUSE_EMAIL.includes(PLACEHOLDER);
