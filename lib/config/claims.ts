// Public claims shown on the marketing site.
//
// TWO KINDS OF THING LIVE HERE AND THEY CARRY DIFFERENT RISK.
//
// PRODUCT FACTS are true of the software as built and verifiable from the app in a minute -- what
// a set costs, what is free, how long it takes. Nothing to substantiate.
//
// PERFORMANCE CLAIMS say what happens to a seller who uses it. HERO_STATS are these. They are the
// commercial argument and the product owner has decided they stay, which is a legitimate call --
// but they need a source before launch, and the source has to be about photography rather than
// about this product until this product has measured its own outcomes.
//
// SOURCING THEM, in rough order of how well they hold up:
//   1. Marketplace and platform research on listing photography (eBay, Etsy and several real
//      estate portals have published figures on photo count versus views, offers and sale price).
//      Cite the study and match the wording to what it actually measured.
//   2. Your own measured outcomes, once enough sellers have run real listings through this and
//      reported sale price and time. That means tracking real sales, not asking sellers whether
//      they felt it helped.
// Whichever you use, the figure on screen must match what the source measured. "Listings with
// more photos receive more views" is a different claim from "our sellers get more views", and the
// second one needs data this product does not yet have.
//
// WHAT WAS REMOVED AND STAYS REMOVED: a testimonial attributed by name to a person who never gave
// one. That is the FTC's fake-endorsement rule directly and it carries civil penalties, and no
// amount of framing fixes it. TESTIMONIALS stays empty until a real seller gives a real,
// permissioned quote.
//
// Also removed: a badge promising results were "human approved" when the pipeline runs end to end
// with no human review step. That was a claim about a process that does not exist.

/** Describes what the software does. Every word of this is true of the pipeline as built. */
export const TRUST_BADGE = 'YOUR ITEM, HONESTLY SHOWN. BETTER PHOTOGRAPHED, NEVER ALTERED.';

/**
 * ⚠️ NEEDS A CITED SOURCE BEFORE LAUNCH. See the note at the top of this file.
 *
 * These are performance claims, not product facts. The wording is deliberately about what better
 * photographs do rather than about what this product delivered, because that is the claim a
 * photography study can actually support -- but it still needs the study behind it, and the
 * numbers below are placeholders standing in for whatever that source says.
 */
export const HERO_STATS: { label: string; value: string; note: string }[] = [
  { label: 'Typical price lift', value: '+$150–$500', note: 'with better photos' },
  { label: 'Sell up to', value: '2x faster', note: 'with a full set' },
  { label: 'More inquiries', value: '+138%', note: 'with better photos' },
];

/**
 * Empty until real sellers give real, permissioned quotes. The components below render nothing
 * when this is empty rather than falling back to a placeholder, because a placeholder testimonial
 * is the thing that got shipped last time.
 */
export const TESTIMONIALS: { quote: string; name: string; role: string }[] = [];
