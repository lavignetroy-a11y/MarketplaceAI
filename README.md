# MarketplaceAI

Core MVP: upload a photo, pick how many improved versions you want, generate them
via the OpenAI image API (`gpt-image-1`), and download the results.

This is intentionally minimal — no design system, auth, or marketplace features yet.
Those come later. Right now it's just the upload → generate → download loop.

## Setup

```bash
npm install
cp .env.example .env.local   # then add your OPENAI_API_KEY
npm run dev
```

Open http://localhost:3000.

## How it works

- `app/page.tsx` — landing page: file upload, output count selector, optional custom
  instructions, and a results grid with download links.
- `app/api/generate/route.ts` — server route that receives the uploaded photo, calls
  `openai.images.edit` with `model: "gpt-image-1"`, and returns the generated images
  as base64 data URLs.

## Notes

- Requires an OpenAI API key with access to `gpt-image-1`.
- Output count is capped at 4 per request to keep costs/latency predictable.
