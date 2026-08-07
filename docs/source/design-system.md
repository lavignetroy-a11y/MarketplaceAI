# Marketplace / AI — Complete Website Design System

Use this file as the single source of truth for the Marketplace / AI website’s typography, color, spacing, visual style, motion, responsive behavior, and copy direction.

The website must feel deliberately designed by a premium human studio: editorial, calm, modern, trustworthy, product-focused, and visually restrained.

Do not use generic AI-startup styling.

---

## 1. FONT SYSTEM

Use three font families:

1. Geist — primary interface, navigation, buttons, body copy, headings, forms, pricing, and application UI.
2. Newsreader — selective editorial display font for major emotional or premium moments.
3. Geist Mono — only for real data such as file dimensions, image order, upload status, and technical metadata.

Do not use Special Elite for the Marketplace / AI wordmark.

Do not use plain Inter or system fonts as the entire visual identity.

### Google Fonts

Add this inside the document `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<link
  href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;550;600;650;700;800&family=Geist+Mono:wght@400;500;600&family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&display=swap"
  rel="stylesheet"
/>
```

### Font-family rules

```css
:root {
  --font-sans: "Geist", Arial, sans-serif;
  --font-editorial: "Newsreader", Georgia, serif;
  --font-mono: "Geist Mono", "SFMono-Regular", Consolas, monospace;
}

html {
  font-family: var(--font-sans);
  font-optical-sizing: auto;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-family: var(--font-sans);
}
```

---

## 2. BRAND WORDMARK

Wordmark:

`MARKETPLACE / AI`

Use Geist, not Newsreader.

```css
.brand-wordmark {
  font-family: var(--font-sans);
  font-size: 17px;
  font-weight: 650;
  line-height: 1;
  letter-spacing: 0.105em;
  text-transform: uppercase;
  color: #11120f;
}

.brand-wordmark-secondary {
  color: #999b96;
}

@media (max-width: 767px) {
  .brand-wordmark {
    font-size: 14px;
    letter-spacing: 0.08em;
  }
}
```

The word `MARKETPLACE` is near-black.

The slash and `AI` use muted gray.

Do not use a gradient in the logo.

Do not use an overly futuristic or cyberpunk wordmark.

---

## 3. COLOR SYSTEM

Use a warm editorial neutral palette with one terracotta accent and one deep moss tone.

Do not use purple, violet, indigo, or purple-to-blue gradients as the primary brand styling.

### Core colors

```css
:root {
  --color-ink: #11120f;
  --color-charcoal: #242620;

  --color-paper: #f7f4ed;
  --color-canvas: #ece8df;
  --color-white: #ffffff;

  --color-muted: #70746e;
  --color-muted-light: #92958f;
  --color-line: #d8d3c8;

  --color-accent: #b54e2e;
  --color-accent-hover: #943b24;
  --color-accent-soft: #f2ddd4;

  --color-moss: #344638;
  --color-moss-dark: #1f2b22;

  --color-success: #426649;
  --color-warning: #9b642f;
  --color-error: #9e3d34;
}
```

### Color usage

- `#11120F`: primary text, key headings, dark buttons.
- `#242620`: dark section backgrounds.
- `#F7F4ED`: primary website background.
- `#ECE8DF`: alternating section background.
- `#FFFFFF`: cards, inputs, gallery surfaces.
- `#70746E`: body copy and secondary information.
- `#D8D3C8`: borders and dividers.
- `#B54E2E`: primary accent, CTA, links, active states.
- `#943B24`: accent hover state.
- `#344638`: trust sections, premium dark accents.
- `#1F2B22`: deep dark backgrounds.

Use flat colors.

Do not use gradient-filled text.

Do not use purple-to-blue buttons.

Do not use glowing neon outlines.

---

## 4. TAILWIND CONFIGURATION

Use the following in `tailwind.config.ts`:

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],

  theme: {
    extend: {
      fontFamily: {
        sans: ["Geist", "Arial", "sans-serif"],
        display: ["Geist", "Arial", "sans-serif"],
        editorial: ["Newsreader", "Georgia", "serif"],
        mono: ["Geist Mono", "SFMono-Regular", "Consolas", "monospace"],
      },

      colors: {
        marketplace: {
          ink: "#11120F",
          charcoal: "#242620",
          paper: "#F7F4ED",
          canvas: "#ECE8DF",
          white: "#FFFFFF",
          muted: "#70746E",
          "muted-light": "#92958F",
          line: "#D8D3C8",
          accent: "#B54E2E",
          "accent-hover": "#943B24",
          "accent-soft": "#F2DDD4",
          moss: "#344638",
          "moss-dark": "#1F2B22",
          success: "#426649",
          warning: "#9B642F",
          error: "#9E3D34",
        },
      },

      fontSize: {
        "hero-mobile": [
          "3.5rem",
          {
            lineHeight: "0.94",
            letterSpacing: "-0.055em",
            fontWeight: "650",
          },
        ],

        hero: [
          "5.5rem",
          {
            lineHeight: "0.94",
            letterSpacing: "-0.058em",
            fontWeight: "650",
          },
        ],

        "section-display": [
          "4.5rem",
          {
            lineHeight: "0.99",
            letterSpacing: "-0.048em",
            fontWeight: "620",
          },
        ],

        "section-title": [
          "3.25rem",
          {
            lineHeight: "1.02",
            letterSpacing: "-0.042em",
            fontWeight: "620",
          },
        ],

        "editorial-display": [
          "4.75rem",
          {
            lineHeight: "0.98",
            letterSpacing: "-0.035em",
            fontWeight: "500",
          },
        ],

        "body-large": [
          "1.1875rem",
          {
            lineHeight: "1.6",
            letterSpacing: "-0.014em",
          },
        ],

        body: [
          "1rem",
          {
            lineHeight: "1.6",
            letterSpacing: "-0.008em",
          },
        ],

        supporting: [
          "0.875rem",
          {
            lineHeight: "1.5",
            letterSpacing: "-0.005em",
          },
        ],

        eyebrow: [
          "0.75rem",
          {
            lineHeight: "1",
            letterSpacing: "0.16em",
            fontWeight: "650",
          },
        ],
      },

      borderRadius: {
        "brand-sm": "12px",
        brand: "18px",
        "brand-lg": "28px",
        "brand-xl": "36px",
      },

      boxShadow: {
        soft: "0 12px 35px rgba(17, 18, 15, 0.07)",
        lift: "0 18px 50px rgba(17, 18, 15, 0.10)",
      },

      maxWidth: {
        page: "1440px",
        reading: "720px",
        copy: "620px",
      },
    },
  },

  plugins: [],
};

export default config;
```

---

## 5. GLOBAL CSS

Use the following in `globals.css`:

```css
:root {
  --font-sans: "Geist", Arial, sans-serif;
  --font-editorial: "Newsreader", Georgia, serif;
  --font-mono: "Geist Mono", "SFMono-Regular", Consolas, monospace;

  --color-ink: #11120f;
  --color-charcoal: #242620;

  --color-paper: #f7f4ed;
  --color-canvas: #ece8df;
  --color-white: #ffffff;

  --color-muted: #70746e;
  --color-muted-light: #92958f;
  --color-line: #d8d3c8;

  --color-accent: #b54e2e;
  --color-accent-hover: #943b24;
  --color-accent-soft: #f2ddd4;

  --color-moss: #344638;
  --color-moss-dark: #1f2b22;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
  background: var(--color-paper);
}

body {
  margin: 0;
  min-height: 100%;
  font-family: var(--font-sans);
  color: var(--color-ink);
  background: var(--color-paper);
  font-optical-sizing: auto;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

button,
input,
textarea,
select {
  font: inherit;
}

a {
  color: inherit;
  text-decoration: none;
}

img,
video {
  display: block;
  max-width: 100%;
}

::selection {
  color: var(--color-ink);
  background: var(--color-accent-soft);
}

:focus-visible {
  outline: 3px solid var(--color-accent);
  outline-offset: 3px;
}

.page-shell {
  width: min(100% - 40px, 1440px);
  margin-inline: auto;
}

.section {
  padding-block: clamp(80px, 9vw, 150px);
}

.section-compact {
  padding-block: clamp(60px, 7vw, 110px);
}

.section-paper {
  background: var(--color-paper);
}

.section-canvas {
  background: var(--color-canvas);
}

.section-dark {
  color: var(--color-paper);
  background: var(--color-moss-dark);
}

.section-charcoal {
  color: var(--color-paper);
  background: var(--color-charcoal);
}
```

---

## 6. TYPOGRAPHY CLASSES

### Hero headline

```css
.hero-title {
  max-width: 8.5ch;
  margin: 0;
  font-family: var(--font-sans);
  font-size: clamp(3.5rem, 5.1vw, 5.5rem);
  font-weight: 650;
  line-height: 0.94;
  letter-spacing: -0.058em;
  text-wrap: balance;
}

.hero-title-accent {
  color: var(--color-accent);
}
```

Do not use gradient text.

Recommended structure:

```html
<h1 class="hero-title">
  Make your<br>
  listing look<br>
  worth<br>
  <span class="hero-title-accent">clicking.</span>
</h1>
```

### Major section display

```css
.section-display {
  margin: 0;
  font-family: var(--font-sans);
  font-size: clamp(2.875rem, 4.2vw, 4.5rem);
  font-weight: 620;
  line-height: 0.99;
  letter-spacing: -0.048em;
  text-wrap: balance;
}
```

### Editorial display

```css
.editorial-display {
  margin: 0;
  font-family: var(--font-editorial);
  font-size: clamp(3rem, 4.5vw, 4.75rem);
  font-weight: 500;
  line-height: 0.98;
  letter-spacing: -0.035em;
  text-wrap: balance;
}
```

### Standard section heading

```css
.section-title {
  margin: 0;
  font-family: var(--font-sans);
  font-size: clamp(2.25rem, 3vw, 3.25rem);
  font-weight: 620;
  line-height: 1.02;
  letter-spacing: -0.042em;
  text-wrap: balance;
}
```

### Card heading

```css
.card-title {
  margin: 0;
  font-family: var(--font-sans);
  font-size: 1.3125rem;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.025em;
}
```

### Compact card heading

```css
.card-title-small {
  margin: 0;
  font-family: var(--font-sans);
  font-size: 1.0625rem;
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: -0.018em;
}
```

### Body large

```css
.body-large {
  max-width: 620px;
  margin: 0;
  font-family: var(--font-sans);
  font-size: clamp(1.0625rem, 1.5vw, 1.1875rem);
  font-weight: 400;
  line-height: 1.6;
  letter-spacing: -0.014em;
  color: var(--color-muted);
}
```

### Standard body

```css
.body-copy {
  margin: 0;
  font-family: var(--font-sans);
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.6;
  letter-spacing: -0.008em;
  color: var(--color-muted);
}
```

### Supporting text

```css
.supporting-copy {
  margin: 0;
  font-family: var(--font-sans);
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.5;
  letter-spacing: -0.005em;
  color: var(--color-muted-light);
}
```

### Eyebrow

```css
.eyebrow {
  margin: 0 0 20px;
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 650;
  line-height: 1;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-accent);
}
```

### Image caption

```css
.image-caption {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 550;
  line-height: 1.25;
  letter-spacing: 0;
  color: #464944;
}
```

### Data label

```css
.data-label {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1.4;
  letter-spacing: 0.025em;
}
```

Use Geist Mono only for real data.

---

## 7. NAVIGATION TYPOGRAPHY

```css
.nav-link {
  font-family: var(--font-sans);
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1;
  letter-spacing: -0.01em;
  color: #50534f;
  transition:
    color 180ms ease,
    opacity 180ms ease;
}

.nav-link:hover,
.nav-link:focus-visible {
  color: var(--color-ink);
}

.nav-link-active {
  color: var(--color-ink);
  font-weight: 600;
}
```

Navigation labels:

- How it works
- Examples
- Pricing
- Why it works
- Sign in

---

## 8. BUTTON SYSTEM

### Primary button

```css
.button-primary {
  display: inline-flex;
  min-height: 48px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 0 22px;
  border: 1px solid var(--color-ink);
  border-radius: 14px;
  font-family: var(--font-sans);
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.012em;
  color: var(--color-paper);
  background: var(--color-ink);
  cursor: pointer;
  transition:
    transform 180ms ease,
    background-color 180ms ease,
    border-color 180ms ease;
}

.button-primary:hover {
  background: var(--color-accent-hover);
  border-color: var(--color-accent-hover);
  transform: translateY(-1px);
}
```

### Accent button

```css
.button-accent {
  display: inline-flex;
  min-height: 48px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 0 22px;
  border: 1px solid var(--color-accent);
  border-radius: 14px;
  font-family: var(--font-sans);
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.012em;
  color: #ffffff;
  background: var(--color-accent);
  cursor: pointer;
  transition:
    transform 180ms ease,
    background-color 180ms ease,
    border-color 180ms ease;
}

.button-accent:hover {
  background: var(--color-accent-hover);
  border-color: var(--color-accent-hover);
  transform: translateY(-1px);
}
```

### Secondary button

```css
.button-secondary {
  display: inline-flex;
  min-height: 48px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 0 22px;
  border: 1px solid var(--color-line);
  border-radius: 14px;
  font-family: var(--font-sans);
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.012em;
  color: var(--color-ink);
  background: transparent;
  cursor: pointer;
  transition:
    background-color 180ms ease,
    border-color 180ms ease;
}

.button-secondary:hover {
  border-color: var(--color-ink);
  background: rgba(17, 18, 15, 0.035);
}
```

Do not use uppercase button labels.

---

## 9. UPLOAD INTERFACE TYPOGRAPHY

```css
.upload-title {
  font-family: var(--font-sans);
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: -0.015em;
  color: var(--color-ink);
}

.upload-browse {
  font-family: var(--font-sans);
  font-size: 0.9375rem;
  font-weight: 550;
  color: var(--color-accent);
}

.upload-helper {
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  font-weight: 400;
  line-height: 1.5;
  color: var(--color-muted);
}

.file-metadata {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 400;
  line-height: 1.4;
  color: var(--color-muted);
}
```

---

## 10. PRICING TYPOGRAPHY

```css
.package-count {
  font-family: var(--font-sans);
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0.02em;
  color: var(--color-accent);
}

.package-name {
  font-family: var(--font-editorial);
  font-size: 1.8125rem;
  font-weight: 500;
  line-height: 1.05;
  letter-spacing: -0.025em;
  color: var(--color-ink);
}

.package-price {
  font-family: var(--font-sans);
  font-size: clamp(2.75rem, 4vw, 3.375rem);
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.055em;
  color: var(--color-ink);
  font-variant-numeric: tabular-nums;
}

.package-price-currency {
  display: inline-block;
  margin-right: 3px;
  font-size: 1.4375rem;
  font-weight: 500;
  vertical-align: top;
}

.package-feature {
  font-family: var(--font-sans);
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.5;
  color: var(--color-muted);
}
```

Do not use fake discount metrics.

Do not show unsupported percentage claims.

---

## 11. APPLICATION UI TYPOGRAPHY

```css
.processing-title {
  font-family: var(--font-sans);
  font-size: clamp(2rem, 3vw, 3rem);
  font-weight: 620;
  line-height: 1.05;
  letter-spacing: -0.04em;
}

.processing-stage-active {
  font-family: var(--font-sans);
  font-size: 1.0625rem;
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: -0.015em;
}

.processing-stage-complete {
  font-family: var(--font-sans);
  font-size: 0.9375rem;
  font-weight: 500;
  line-height: 1.4;
  color: var(--color-muted);
}

.result-image-number {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0.04em;
}
```

Do not show customers:

- raw prompts
- model names
- JSON
- attachment order
- provider IDs
- internal job IDs
- technical workflow terminology

---

## 12. LANDING PAGE SECTION FONT MAP

### Hero

- Heading: Geist
- Weight: 650
- Layout: asymmetrical
- Headline size: 58–88px desktop
- Supporting body: Geist 18–19px
- Accent: flat terracotta

Example:

`Make your listing look worth clicking.`

### Marketplace feed / attention section

- Heading: Geist
- Layout: image and interface-led
- UI labels: Geist 12–14px
- Keep typography compact
- Do not use Newsreader here

Example:

`What gets noticed gets clicked.`

### Benefits / why better photos matter

- Heading: Geist
- Weight: 620
- Size: 46–72px
- Benefits: compact Geist cards or editorial rows
- Avoid fake stats

Example:

`A better listing works before you answer a single message.`

### How it works

- Heading: Geist
- Step numbers: Geist Mono or Geist
- Numbering only because it is a true sequence
- Use real labels: Upload, choose, receive

Example:

`From camera roll to ready to post.`

### Full campaign reveal

- Heading: Geist
- Strong editorial scale
- Gallery labels: Geist 12px
- Image order may use Geist Mono

Example:

`Not one edited photo. The full visual story.`

### Trust section

- Heading: Newsreader
- Body: Geist
- Background: moss or deep neutral
- Minimal cards
- No excessive trust badges

Example:

`Better presented. Still the same item.`

### Categories

- Heading: Geist
- Image-first layout
- Minimal typography
- Category captions: Geist 14–16px

Example:

`Made for what you sell.`

### Examples / transformations / proof

- Heading: Newsreader
- Case-study metadata: Geist
- Real campaign details: Geist Mono where appropriate
- Do not invent testimonials or metrics

Example:

`See what the same item can look like online.`

### Pricing

- Heading: Newsreader
- Package names: Newsreader
- Prices and interface: Geist
- Features: Geist
- Active package state: flat terracotta or moss

Example:

`Choose the campaign that fits your listing.`

### FAQ

- Heading: Geist
- Question: Geist 18–20px, weight 600
- Answer: Geist 16px, line-height 1.6

### Final CTA

- Heading: Newsreader or Geist
- Use whichever creates contrast with the preceding section
- CTA button: terracotta
- Supporting copy: Geist

Example:

`Your next buyer will see the photos first.`

---

## 13. RESPONSIVE TYPOGRAPHY

### Mobile: 375px

```css
@media (max-width: 479px) {
  .page-shell {
    width: min(100% - 28px, 1440px);
  }

  .section {
    padding-block: 72px;
  }

  .hero-title {
    max-width: 9ch;
    font-size: 3.5rem;
    line-height: 0.94;
    letter-spacing: -0.055em;
  }

  .section-display,
  .editorial-display {
    font-size: 2.875rem;
  }

  .section-title {
    font-size: 2.25rem;
  }

  .body-large {
    font-size: 1.0625rem;
  }
}
```

### Tablet: 768px

```css
@media (min-width: 768px) and (max-width: 1023px) {
  .page-shell {
    width: min(100% - 48px, 1440px);
  }

  .hero-title {
    font-size: 4.5rem;
  }

  .section-display,
  .editorial-display {
    font-size: 3.75rem;
  }
}
```

### Desktop: 1024px+

```css
@media (min-width: 1024px) {
  .page-shell {
    width: min(100% - 72px, 1440px);
  }
}
```

### Large desktop: 1440px+

```css
@media (min-width: 1440px) {
  .hero-title {
    font-size: 5.5rem;
  }
}
```

---

## 14. SPACING RHYTHM

Use an 8px spacing system.

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;
  --space-32: 128px;
}
```

Recommended spacing:

- Eyebrow to heading: 20px
- Heading to body: 24–32px
- Body to primary CTA: 28–36px
- Major content columns: 48–80px
- Section-to-section breathing room: 80–150px
- Card internal padding: 24–36px
- Image-to-caption spacing: 10–14px

---

## 15. CARD AND SURFACE RULES

Use cards only where they organize real content.

Do not turn every section into a grid of floating cards.

```css
.surface {
  border: 1px solid var(--color-line);
  border-radius: 18px;
  background: var(--color-white);
}

.surface-soft {
  border: 1px solid rgba(216, 211, 200, 0.8);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.76);
}

.surface-dark {
  border: 1px solid rgba(247, 244, 237, 0.14);
  border-radius: 18px;
  background: var(--color-moss-dark);
}

.surface-lifted {
  box-shadow: 0 18px 50px rgba(17, 18, 15, 0.09);
}
```

Do not apply large soft glows to every card.

Do not use frosted glass everywhere.

Do not use blur effects unless there is a clear functional reason.

---

## 16. MOTION

Use motion only when it helps explain the product.

Recommended motion:

- Hero campaign images fan out once on page load.
- Marketplace feed item transforms on scroll.
- Campaign gallery reveals images sequentially.
- Upload previews appear immediately.
- Results images fill their slots as they become ready.

```css
:root {
  --motion-fast: 160ms;
  --motion-standard: 220ms;
  --motion-slow: 420ms;
  --ease-standard: cubic-bezier(0.22, 1, 0.36, 1);
}
```

Respect reduced-motion preferences:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Do not use continuous floating animation.

Do not use decorative particle systems.

Do not animate every card independently.

---

## 17. COPY STYLE

Use plain, specific, outcome-focused language.

Preferred language:

- Make your listing look worth clicking.
- Better photos help your item stand out.
- Upload the photos you already have.
- Receive a complete coordinated listing campaign.
- Better presented. Still the same item.
- Condition stays visible.
- No prompt writing.
- Works with photos from your phone.
- Your next buyer will see the photos first.

Avoid:

- Revolutionize your marketplace journey.
- Unlock the power of AI.
- Transform your selling experience.
- Supercharge your listings.
- Cutting-edge AI technology.
- Seamless end-to-end solution.
- AI-powered excellence.
- Perfect guaranteed photos.
- Guaranteed faster sales.
- Guaranteed higher selling prices.

Do not claim unsupported performance metrics.

Use “can help attract more attention” instead of guaranteeing outcomes.

---

## 18. VISUAL QUALITY RULES

The website should feel:

- premium
- calm
- human-designed
- editorial
- contemporary
- trustworthy
- visually intelligent
- product-led

The website should not feel:

- neon
- cyberpunk
- generic SaaS
- over-carded
- overly rounded
- excessively animated
- gradient-heavy
- cluttered
- technically intimidating
- obviously AI-generated

Always use:

- generous whitespace
- strong product photography
- controlled type scale
- asymmetrical compositions
- alternating visual rhythm
- high-contrast CTAs
- restrained decoration
- accessible contrast
- responsive layouts

Never use:

- dominant purple
- purple-to-blue gradients
- gradient headline words
- fake statistics
- giant meaningless numbers
- emoji in headings
- glassmorphism everywhere
- pill badge clutter
- identical section layouts
- default Inter-only styling
- soft glow around every element
- unsupported testimonials
- fabricated sales claims

---

## 19. ACCESSIBILITY

Required:

- WCAG AA body-text contrast
- visible keyboard focus
- semantic headings
- labelled form inputs
- minimum 44px tap targets
- descriptive alt text
- status messages for screen readers
- no status communicated by color alone
- reduced-motion support
- no horizontal scrolling on mobile

Body text should be at least 16px.

Avoid muted gray text on light gray backgrounds when contrast is too low.

---

## 20. FINAL TYPE SUMMARY

```text
Primary font:
Geist

Editorial font:
Newsreader

Data font:
Geist Mono

Logo:
Geist 650
17px desktop
14px mobile
0.105em uppercase tracking

Hero:
Geist 650
58–88px desktop
56px mobile
0.94 line-height
-0.058em tracking

Major section display:
Geist 620
46–72px
0.99 line-height
-0.048em tracking

Editorial display:
Newsreader 500
48–76px
0.98 line-height
-0.035em tracking

Section heading:
Geist 620
36–52px
1.02 line-height
-0.042em tracking

Card heading:
Geist 600
17–21px

Large body:
Geist 400
17–19px
1.6 line-height

Standard body:
Geist 400
16px
1.6 line-height

Supporting copy:
Geist 400
14px
1.5 line-height

Eyebrow:
Geist 650
12px
0.16em uppercase tracking

Data and metadata:
Geist Mono
12px
```

---

## 21. FINAL COLOR SUMMARY

```text
Ink:
#11120F

Charcoal:
#242620

Paper:
#F7F4ED

Canvas:
#ECE8DF

White:
#FFFFFF

Muted:
#70746E

Muted light:
#92958F

Line:
#D8D3C8

Terracotta accent:
#B54E2E

Terracotta hover:
#943B24

Terracotta soft:
#F2DDD4

Moss:
#344638

Moss dark:
#1F2B22
```

---

## 22. FINAL RULE

The typography and color system must remain consistent across:

- landing page
- navigation
- upload flow
- package selection
- checkout
- processing screen
- results gallery
- dashboard
- settings
- admin console
- errors
- empty states
- evidence requests
- confirmation screens

The marketing site may use larger editorial typography and more expressive composition.

The application interface must use the same visual system in a calmer, more functional form.

Every page should look like it belongs to the same premium product.
