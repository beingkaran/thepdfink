# thepdf.ink

Private, offline PDF tools for **macOS, Windows, Linux, iOS, Android and the web**. Every tool —
merge, split, rotate, organise, watermark, redact, auto-redact, find & replace, edit text & images,
scan, PDF → Word, annotate, fill forms, build forms, sign, images ↔ PDF, compress, metadata and the
viewer — runs **entirely on your device**. Files are never uploaded.

Built with **Tauri 2 + React 19 + Vite** and powered by `pdf-lib` and `PDF.js`.

## Business model

- The **web tools are free** (client-side).
- The **native apps** are unlocked with a **one-time $9 lifetime license** — "buy me a coffee and
  it's yours forever." No subscription.
- Content/marketing pages carry **Google AdSense**; the tool app itself stays ad-free and
  tracking-free.

## Develop

```bash
npm install
npm run dev            # web app on http://localhost:5173
npm run tauri:dev      # desktop app (Tauri)
```

## Build

```bash
npm run build                 # web bundle -> dist/
npm run build:native:macos    # macOS .dmg      -> releases/
npm run build:native:windows  # Windows .exe    -> releases/  (run scripts/build-windows.ps1 on Windows)
npm run build:native:linux    # Linux AppImage/.deb/.rpm -> releases/  (needs WebKitGTK, see script)
npm run build:native:android  # Android .apk    -> releases/
npm run build:native:ios      # iOS simulator   -> releases/
npm run deploy                # build + deploy web to Cloudflare Pages
```

### Mobile projects (regenerate after the rebrand)

The bundle identifier changed to `ink.thepdf.app`, so the generated native mobile projects were
removed and must be re-initialised once per machine:

```bash
bash scripts/setup-android.sh   # runs `tauri android init`
bash scripts/setup-ios.sh       # runs `tauri ios init`
```

## Go-live checklist

Everything below uses clearly-marked placeholders. Replace them before shipping:

1. **Checkout links (per tier)** — set `VITE_CHECKOUT_URL_PERSONAL`, `VITE_CHECKOUT_URL_PRO`
   and `VITE_CHECKOUT_URL_BUSINESS` in `.env` (see `.env.example`) to your
   Gumroad / Lemon Squeezy / Ko-fi / Stripe Payment Links, and replace the three
   `https://YOUR-CHECKOUT-LINK.example.com…` placeholders in `public/pricing.html`.
   Pricing tiers themselves live in `src/data/plans.ts`.
2. **Google AdSense** — replace `ca-pub-XXXXXXXXXXXXXXXX` in `public/consent.js` (the loader),
   in each `public/*.html` `<ins>` unit, and `pub-XXXXXXXXXXXXXXXX` in `public/ads.txt`.
   Ads are consent-gated: `public/consent.js` shows a cookie banner and loads no ad scripts
   until the visitor accepts (EEA/UK compliant). The tool app stays ad-free.
3. **Domain** — the code assumes `https://thepdf.ink` (canonical URLs, sitemap, OG tags).
4. **Rebuild native binaries** — the files in `releases/` are pre-rebrand; rebuild them with the
   commands above to get `thepdf.ink`-branded installers.

## Brand assets

- `public/logo.svg` — full lockup (mark + wordmark)
- `public/favicon.svg` — app/mark tile
- `public/og-image.png` / `.svg` — social share card
- `scripts/app-icon.svg` / `.png` — 1024px source used by `npx tauri icon` to regenerate all
  platform icons

## Pro tools

- **Batch** (`src/lib/batch.ts`) — runs any core op across many PDFs and returns one `.zip` (JSZip).
- **OCR** (`src/lib/ocr.ts`) — tesseract.js WASM, fully on-device; produces a searchable PDF
  (image + invisible text layer) and a `.txt`. Engine + English model download once from a CDN
  and are cached; your file is never uploaded.
- **AI Summarize** (`src/lib/summarize.ts`) — on-device extractive summariser, no model download,
  no network.
- **Ask AI** (`src/lib/ask.ts`) — on-device retrieval Q&A: builds a TF-IDF index over the PDF's
  sentences and answers questions with page citations. No model download, no network; the text
  never leaves the device. UI is a chat panel (`src/components/AskPanel.tsx`).
- **Secure redaction** (`redactTextSecure` in `src/lib/pdf.ts`) — rasterises matched pages and
  burns the text out, so redacted content cannot be selected, searched or recovered.

## Security

- HTTP security headers in `public/_headers` (CSP, HSTS, X-Frame-Options, nosniff,
  Referrer-Policy, Permissions-Policy, COOP).
- Tauri CSP in `src-tauri/tauri.conf.json` is scoped to allow only the OCR CDN — no ad domains in
  the native app.
- `npm audit` clean; no `dangerouslySetInnerHTML`; PDF content is rendered to canvas / plain text.

## Privacy

The tools never send your files anywhere. See `public/privacy.html`.

## Licenses

thepdf.ink © 2026. Third-party open-source notices are on the Licenses page
(`public/licenses.html`).
