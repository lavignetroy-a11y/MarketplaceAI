# Marketing imagery

Every `<img>` on the site points at a real path here. Missing files render a quiet
"Image coming soon" placeholder rather than a broken icon, so the page is never broken by an
absent asset — drop a file in with the right name and it starts rendering, no code change.

**Always run new photos through a resize + WebP conversion before committing.** Source exports
are routinely 800KB+ each; the whole hero set is ~150KB after conversion. ~760px on the long
edge covers retina for every slot on the page.

## What each folder needs

| Folder | Files | Shape |
|---|---|---|
| `hero/` | `original`, `main`, `alt-1`…`alt-4` | See `hero/README.md` |
| `why/` | `listing-hero`, `thumb-1`…`thumb-4`, `detail-1`…`detail-4` | Listing card: 4:5 portrait. Thumbs: square. Details: ~4:3 |
| `reveal/{furniture,vehicles,tools,plants,collectibles}/` | `hero`, `alt`, `texture`, `rear`, `condition`, `context`, `source-1`…`source-4` | One folder per category tab. Hero: 4:5. Others: landscape-ish. Sources: 3:4 phone photos |
| `how/` | `source-1`…`source-4`, `result-hero`, `result-1`…`result-4` | Sources: 3:4. Result hero: 4:3. Results: square |
| `trust/` | `inspect`, `detail-1`, `detail-2` | Inspect: 4:5 portrait, item centred with room around it for callout pins. Details: 3:2 macro crops showing real texture and wear |
| `examples/` | `{furniture,vehicles,plants,tools}-source-1…4`, `-result-hero`, `-result-1…4` | Sources: square, deliberately ordinary. Results: hero 4:3, rest square |
| `pricing/` | `tile-1`…`tile-5` | Square. Cycled to fill the coverage preview grid |
| `cta/` | `card-1`…`card-5` | 3:4 portrait. Fanned above the upload surface on a dark background |

All are `.webp`.


## Category tabs

Two sections have working category tabs that swap the whole set:

- **Campaign reveal** reads `reveal/<category>/…` — one subfolder per tab
  (`furniture`, `vehicles`, `tools`, `plants`, `collectibles`).
- **Examples** reads `examples/<category>-…` — a filename prefix per tab
  (`furniture`, `vehicles`, `plants`, `tools`).

Until a category's files exist its tab shows placeholders. That's fine — the tab still works,
so you can add categories one at a time rather than all at once.
