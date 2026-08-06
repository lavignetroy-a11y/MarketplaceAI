# Hero section images

The hero renders a quiet placeholder ("Image coming soon") for any file that's missing, so the
page never shows a broken-image icon.

Current files:

- `original.webp` -- an ordinary, unedited seller photo (the "before").
- `main.webp` -- the large, centered polished hero image (the "after").
- `alt-1.webp` -- a texture/detail shot from the campaign.
- `alt-2.webp` -- an alternate angle (side profile).
- `alt-3.webp` -- a further angle (rear view).
- `alt-4.webp` -- **NOT SUPPLIED YET.** The last card in the fan renders its
  "Image coming soon" placeholder until this file is added. It's the furthest-back card, so
  only a narrow sliver of it is visible.

## If you replace these

**Shape matters more than resolution.** The three supporting cards are tall and narrow
(roughly 2:5), so a square or landscape photo gets cropped to a narrow vertical slice of
itself. That works when the photo is already a detail shot or a tight profile; it looks like a
mistake when it's a wide shot of the whole item. Prefer portrait crops for `alt-1/2/3`.

Where the crop lands is tuned per image via `objectPosition` in `HeroVisual.tsx` -- if you swap
a photo and the subject drifts out of frame, adjust that value rather than re-cropping the file.

**Keep them small.** These are the first thing a visitor loads. The current set is ~150KB total.
Source photos straight from a phone or an image generator are frequently 800KB+ each; run them
through a resize + WebP conversion (e.g. `sharp`) before committing. ~760px on the long edge is
plenty -- the largest card only displays at ~250px wide, so that still covers retina.
