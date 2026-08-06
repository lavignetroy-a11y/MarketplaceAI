# Hero section images

These files don't exist yet on purpose -- the hero renders a quiet placeholder ("Image coming
soon") until a matching file is dropped in. No code changes are needed later; just add files
with these exact names:

- `original.jpg` -- an ordinary, unedited seller photo (the "before"). Portrait, ~1:2.
- `main.jpg` -- the large, centered polished hero image (the "after"). Portrait, ~3:4.
- `alt-1.jpg` -- an alternate angle from the campaign. Tall portrait, ~2:5.
- `alt-2.jpg` -- a texture/detail shot. Tall portrait, ~2:5. Desktop only.
- `alt-3.jpg` -- a further campaign view. Tall portrait, ~2:5. Desktop only.

All of them should depict the same item, matching the campaign story the hero visual tells.
Each card is rendered with `object-cover`, so exact dimensions don't need to match the ratios
above -- they'll be cropped to fit -- but staying close avoids awkward crops.
