# Decisions

Durable record of what was decided and why. Chat history gets summarised; this doesn't.
If you're picking this project up cold — or I am, after a context reset — read this first.

---

## Product

| Decision | Detail |
|---|---|
| **Pricing** | **$1 per finished image.** Volume play, not margin play — low friction, repeat use, shareable. All values live in `lib/config/pricing.ts`; no price is hard-coded in a component. |
| **Package sizing** | Any count from **4 to 10**, chosen on a live counter. Not fixed packages — at $1/image four cards would differ by a dollar or two and read as arbitrary. |
| **Free preview** | **One image, watermarked**, generated *after* the customer picks their count. Only one image is generated for a visitor who never pays — that's what makes $1/image viable. |
| **Funnel order** | Upload set → pick count → free watermarked preview → pay → full clean set. Chosen over previewing before count selection. |
| **Upload cap** | **20 source photos** per set. One item per set. |
| **Accounts** | Real Supabase auth, real persisted campaign history. Optional — the site runs without credentials and shows a setup notice. |
| **Checkout** | Placeholder. Marks paid and starts phase 2. **Must become a signature-verified Stripe webhook before launch.** |
| **Headline** | "Make your listing / **worth clicking.**" Chosen over "worth buying": *listing/clicking* share a stressed vowel (real assonance; a shared `-ing` alone is not a rhyme), and "worth buying" implies the photos changed the item's value — contradicting the trust section on the same page. |
| **Language** | Always a **set** of photos, never "a photo". One upload of many angles of one item → one coordinated set out. That's the differentiator. |

---

## ⚠️ Needs resolving before launch

1. **`lib/config/claims.ts`** — the hero stat row, the "HUMAN APPROVED RESULTS" badge, and the
   testimonial are illustrative, not measured. Built as explicitly requested, isolated in one
   file. A named testimonial from a person who didn't give it is what the FTC's fake-testimonial
   rule targets. "Human approved" isn't true as built — the pipeline has no human review step.
2. **Checkout** — `app/api/campaigns/[id]/pay/route.ts` is client-callable and grants paid
   access. Fine for a demo, not for production.
3. **Legal pages** — readable drafts carrying a visible not-legally-reviewed banner. Need a
   lawyer.
4. **Supabase** — add the three keys to `.env.local` and run `supabase/migrations/0001_init.sql`.
   Live auth has never been tested; it was written against documented env var names and compiles,
   but the first real login will be the first real test.
5. **Contact addresses** — `app/contact/page.tsx` has `example.com` placeholders.

---

## Design source of truth

**The approved reference images are the authority**, above both source documents. Where the two
documents conflict, the reference image wins — that's an explicit instruction from the owner.

The two documents disagree on palette. `docs/source/design-system.md` specifies terracotta/moss
and bans purple; `docs/source/reconciled-master-prompt.txt` specifies violet/blue on pearl white.
**The violet/blue palette is correct** — it matches the approved imagery. The design system doc
is still authoritative for type scale, spacing, and radii.

### ⚠️ Reference images are not in this repo

They were shared inline in chat and exist nowhere on disk. **Save them into
`docs/reference-images/` if you want them to survive.** Without them, matching future sections
to the approved look means re-sharing them each time.

### Hero fan specifics (hard-won; don't undo casually)

- Cards **converge inward** on the hero — before card turns toward it, after cards turn back
  toward it. Sign convention matters and was corrected twice.
- Mounts are **padding carrying a gradient**, not a border, so they catch light across the face.
  5px thick card / 4px thin. Thinner than instinct suggests.
- **Reflections mirror the frame too**, and carry no cast shadow — a mirrored drop shadow reads
  as a second physical card.
- **Connector dots sit at the top**, directly under the label; the line fades downward and stops
  short of the card. Nothing touches a photo.
- The stage is **proportional with an aspect ratio**, not fixed pixels. A fixed-pixel stage got
  sliced by its own overflow guard below ~1400px.

---

## Architecture notes

- **Two-phase pipeline** around the payment gate (`lib/campaign/pipeline.ts`): `runPreview` is
  free, `runFullCampaign` refuses to run unless paid.
- **The payment gate is server-side** (`app/api/campaigns/[id]/route.ts`). An unpaid campaign
  only ever receives the watermarked copy — the clean file can't be pulled from the response.
- **Campaign state is split deliberately**: source photo buffers stay in process memory (large,
  only needed during generation); durable record goes to Postgres; generated images go to a
  private Storage bucket, served by short-lived signed URL.
- **`source_edit` production mode exists for a reason.** When a source photo already shows a
  shot's viewpoint, that photo is edited directly rather than reconstructed from references.
  Full reconstruction mirrors asymmetric geometry — it put a steering wheel on the wrong side of
  a boat. Editing a real photo can't mirror its own geometry.
- **Never invent a human figure** in a generated image unless one exists in the source photo
  being edited. A slightly-wrong person is the fastest way to make output read as AI.
- **`PlaceholderImage` tracks failure per-src**, not as a boolean. A sticky boolean strands the
  placeholder forever when src changes — it silently broke the category tabs.

---

## Working agreements

- Verify by **driving the app in a real browser**, not by assuming a passing type-check means it
  works. Every significant bug this project has hit was invisible to `tsc`.
- **Compress images before committing.** Source exports run 800KB+; the hero set is ~150KB after
  WebP conversion at ~760px on the long edge.
- Reasoning goes in **commit messages and code comments**, not only in chat.
