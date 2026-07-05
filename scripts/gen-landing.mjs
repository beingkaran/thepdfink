// Generates crawlable, SEO-focused landing pages (one per high-intent PDF query)
// into public/tools/, a hub index at public/tools.html, and refreshes sitemap.xml.
//
//   node scripts/gen-landing.mjs
//
// Each page deep-links into the app via /?tool=<id> (handled in App.tsx), so a
// searcher who lands on "pdf to word online" is one click from the working tool.
// Content is written per-tool (not templated boilerplate) to avoid thin/doorway
// pages. Re-run after editing the TOOLS array below.

import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SITE = 'https://thepdf.ink'

/** @typedef {{q:string,a:string}} Faq */
const TOOLS = [
  {
    slug: 'pdf-to-word',
    id: 'pdf-to-word',
    category: 'Convert',
    title: 'PDF to Word Converter — Free & Private, Online (No Upload)',
    h1: 'Convert PDF to Word online — free, and private',
    desc: 'Convert a PDF to an editable Word (.docx) document right in your browser. Files never leave your device — no upload, no email, no sign-up. Free and unlimited.',
    keywords: 'pdf to word, pdf to docx, convert pdf to word free, pdf to word online, pdf to word no upload',
    lede: 'Turn any PDF into an editable Word document without uploading it to a server. The whole conversion runs in your browser, so your contract, resume or report stays on your machine.',
    steps: [
      ['Open the converter', 'Click “Convert to Word” below to launch the tool.'],
      ['Drop in your PDF', 'Drag a PDF onto the box or pick one from your device.'],
      ['Download the .docx', 'The text is extracted and reflowed into a Word file you can edit in Word, Google Docs or Pages.'],
    ],
    features: [
      'Runs 100% in your browser — nothing is uploaded',
      'Keeps text editable (not just a picture of the page)',
      'No watermark, no page limit, no account',
      'Works on Windows, macOS, Linux, iPhone and Android',
    ],
    faqs: [
      { q: 'Is my PDF uploaded anywhere?', a: 'No. The conversion happens entirely on your device using JavaScript in the browser. Your file is never sent to a server.' },
      { q: 'Will the layout be preserved exactly?', a: 'The text and reading order are preserved and reflowed as editable paragraphs. Complex multi-column layouts are simplified — the goal is an editable document, not a pixel-perfect clone.' },
      { q: 'It says “no selectable text found” — why?', a: 'Your PDF is likely a scan (an image of a page). Run OCR first to add a text layer, then convert to Word.' },
    ],
    related: ['edit-pdf', 'compress-pdf', 'merge-pdf'],
  },
  {
    slug: 'merge-pdf',
    id: 'merge',
    category: 'Organize',
    title: 'Merge PDF — Combine PDF Files Free & Private (No Upload)',
    h1: 'Merge PDF files online — free and private',
    desc: 'Combine multiple PDFs into one document in your browser. No upload, no sign-up, no watermark. Reorder files and merge instantly, entirely on your device.',
    keywords: 'merge pdf, combine pdf, join pdf files, merge pdf free, merge pdf online no upload',
    lede: 'Combine several PDFs into a single file without handing your documents to a website. The merge happens locally, so nothing is uploaded.',
    steps: [
      ['Open the merge tool', 'Click “Merge PDFs” below.'],
      ['Add your files', 'Drop in two or more PDFs in the order you want them combined.'],
      ['Download the result', 'One merged PDF is saved straight to your device.'],
    ],
    features: [
      'Merge unlimited PDFs with no watermark',
      'Files stay on your device — zero uploads',
      'No account or email required',
      'Free on the web; one-time $9 unlocks the offline app',
    ],
    faqs: [
      { q: 'Is there a limit on how many PDFs I can merge?', a: 'No fixed limit. Because it runs locally, the practical limit is your device’s memory.' },
      { q: 'Can I change the order of the files?', a: 'Yes — add them in the order you want, and they’re combined top to bottom.' },
    ],
    related: ['split-pdf', 'compress-pdf', 'rotate-pdf'],
  },
  {
    slug: 'split-pdf',
    id: 'split',
    category: 'Organize',
    title: 'Split PDF — Extract Pages Free & Private (No Upload)',
    h1: 'Split a PDF online — free and private',
    desc: 'Split a PDF by page range or into single pages, in your browser. Nothing is uploaded — your document stays on your device. Free, no watermark, no sign-up.',
    keywords: 'split pdf, extract pdf pages, split pdf online, separate pdf pages, split pdf free no upload',
    lede: 'Pull out the pages you need or break a PDF into separate files — all locally, with nothing uploaded to a server.',
    steps: [
      ['Open the split tool', 'Click “Split PDF” below.'],
      ['Choose how to split', 'Enter a page range like 1-3, 5 or split every page into its own file.'],
      ['Download your pages', 'Your extracted PDF(s) download straight away.'],
    ],
    features: [
      'Extract a range or burst every page apart',
      'Processed on your device — no uploads',
      'No watermark or page cap',
      'Works across desktop and mobile browsers',
    ],
    faqs: [
      { q: 'Can I extract just one page?', a: 'Yes — enter a single page number (e.g. 4) as the range.' },
      { q: 'Are my pages uploaded to convert?', a: 'No. Splitting runs entirely in your browser; the file never leaves your device.' },
    ],
    related: ['merge-pdf', 'rotate-pdf', 'pdf-to-jpg'],
  },
  {
    slug: 'compress-pdf',
    id: 'compress',
    category: 'Optimize',
    title: 'Compress PDF — Reduce PDF Size Free & Private (No Upload)',
    h1: 'Compress a PDF online — free and private',
    desc: 'Shrink a PDF’s file size in your browser without uploading it. No sign-up, no watermark, no email. Free and unlimited, right on your device.',
    keywords: 'compress pdf, reduce pdf size, shrink pdf, compress pdf online, compress pdf no upload',
    lede: 'Make a PDF smaller so it’s easy to email or upload elsewhere — without first uploading it to a stranger’s server.',
    steps: [
      ['Open the compressor', 'Click “Compress PDF” below.'],
      ['Add your PDF', 'Drop the file you want to slim down.'],
      ['Download the smaller file', 'The optimized PDF saves to your device with the size reduction shown.'],
    ],
    features: [
      'Optimizes structure to cut file size',
      'Everything happens locally — no uploads',
      'No watermark, no account',
      'Great for email attachments and web forms',
    ],
    faqs: [
      { q: 'Will compression ruin the quality?', a: 'The tool optimizes the PDF’s structure without degrading readable text. Savings depend on how the original was built.' },
      { q: 'Is the file uploaded to compress it?', a: 'No — it’s processed entirely in your browser.' },
    ],
    related: ['merge-pdf', 'pdf-to-jpg', 'pdf-to-word'],
  },
  {
    slug: 'pdf-to-jpg',
    id: 'pdf-to-images',
    category: 'Convert',
    title: 'PDF to JPG — Convert PDF to Images Free & Private (No Upload)',
    h1: 'Convert PDF to images online — free and private',
    desc: 'Export each PDF page as a high-quality PNG image in your browser. No upload, no sign-up, no watermark. Free and unlimited, on your device.',
    keywords: 'pdf to jpg, pdf to png, pdf to image, convert pdf to images, pdf to jpg online no upload',
    lede: 'Turn PDF pages into images you can drop into slides, docs or messages — converted locally, never uploaded.',
    steps: [
      ['Open the tool', 'Click “Convert to images” below.'],
      ['Add your PDF', 'Drop in the document you want to rasterize.'],
      ['Download the images', 'Each page is exported as a crisp PNG to your device.'],
    ],
    features: [
      'High-resolution page images',
      'On-device conversion — no uploads',
      'No watermark or page limit',
      'Perfect for slides, previews and thumbnails',
    ],
    faqs: [
      { q: 'What image format do I get?', a: 'Each page is exported as a high-quality PNG, which is lossless and ideal for text-heavy pages.' },
      { q: 'Do you upload my PDF to make the images?', a: 'No. Rendering happens in your browser with PDF.js.' },
    ],
    related: ['jpg-to-pdf', 'compress-pdf', 'split-pdf'],
  },
  {
    slug: 'jpg-to-pdf',
    id: 'images-to-pdf',
    category: 'Convert',
    title: 'JPG to PDF — Convert Images to PDF Free & Private (No Upload)',
    h1: 'Convert images to PDF online — free and private',
    desc: 'Combine JPG, PNG or WebP images into a single PDF in your browser. No upload, no sign-up, no watermark. Free and unlimited, on your device.',
    keywords: 'jpg to pdf, png to pdf, image to pdf, convert images to pdf, jpg to pdf online no upload',
    lede: 'Bundle photos or screenshots into one tidy PDF — assembled locally, with nothing uploaded.',
    steps: [
      ['Open the tool', 'Click “Convert to PDF” below.'],
      ['Add your images', 'Drop in one or more JPG, PNG or WebP files in order.'],
      ['Download the PDF', 'Your images become a single PDF, one per page.'],
    ],
    features: [
      'Combine many images into one PDF',
      'Runs on your device — no uploads',
      'No watermark or account',
      'Handy for receipts, IDs and photo sets',
    ],
    faqs: [
      { q: 'Which image formats are supported?', a: 'JPG and PNG are supported directly; each image becomes its own page.' },
      { q: 'Are my photos uploaded?', a: 'No — the PDF is built entirely in your browser.' },
    ],
    related: ['pdf-to-jpg', 'scan-to-pdf', 'merge-pdf'],
  },
  {
    slug: 'edit-pdf',
    id: 'edit',
    category: 'Edit',
    title: 'Edit PDF — Change Text & Add Images Free & Private (No Upload)',
    h1: 'Edit a PDF online — free and private',
    desc: 'Edit existing PDF text with automatic font matching and drop in images, right in your browser. No upload, no sign-up, no watermark. Free, on your device.',
    keywords: 'edit pdf, pdf editor, edit pdf text, change text in pdf, edit pdf online free no upload',
    lede: 'Fix a typo, update a date or add a logo without buying Acrobat or uploading your document anywhere. Click any text to edit it in place — the font and size are matched automatically.',
    steps: [
      ['Open the editor', 'Click “Edit PDF” below.'],
      ['Click the text to change', 'Select any line of text and type its replacement; add images anywhere on the page.'],
      ['Apply and download', 'Your edited PDF saves straight to your device.'],
    ],
    features: [
      'Inline text editing with automatic font matching',
      'Insert images (logos, stamps, photos) anywhere',
      'Nothing uploaded — edits happen locally',
      'No watermark, no subscription',
    ],
    faqs: [
      { q: 'Does it match the original font?', a: 'It picks the closest standard font (serif, sans or mono, with bold/italic) at the original size so edits blend in.' },
      { q: 'Is my document uploaded to edit it?', a: 'No. Editing runs entirely in your browser.' },
    ],
    related: ['pdf-to-word', 'redact-pdf', 'sign-pdf'],
  },
  {
    slug: 'sign-pdf',
    id: 'sign',
    category: 'Sign',
    title: 'Sign PDF — Add Your Signature Free & Private (No Upload)',
    h1: 'Sign a PDF online — free and private',
    desc: 'Draw, type or upload a signature and place it on any PDF page, in your browser. No upload, no sign-up, no watermark. Free and private, on your device.',
    keywords: 'sign pdf, esign pdf, add signature to pdf, sign pdf online, sign pdf free no upload',
    lede: 'Sign a contract or form without printing, scanning or uploading it. Your signature and document stay on your device.',
    steps: [
      ['Open the sign tool', 'Click “Sign PDF” below.'],
      ['Create your signature', 'Draw it, type it, or upload an image of it.'],
      ['Place it and download', 'Click where it should go on the page, then save the signed PDF.'],
    ],
    features: [
      'Draw, type or upload your signature',
      'Place it precisely on any page',
      'Signed locally — never uploaded',
      'No watermark or account',
    ],
    faqs: [
      { q: 'Is this a legally binding e-signature?', a: 'It places a visible signature image on the page, suitable for most everyday agreements. For qualified/certificate-based signatures, use a dedicated e-signature provider.' },
      { q: 'Does my document get uploaded?', a: 'No — signing happens entirely in your browser.' },
    ],
    related: ['fill-a-form', 'edit-pdf', 'redact-pdf'],
  },
  {
    slug: 'scan-to-pdf',
    id: 'scan',
    category: 'Create',
    title: 'Scan to PDF — Camera Document Scanner Free & Private (No Upload)',
    h1: 'Scan documents to PDF — free and private',
    desc: 'Use your camera to scan documents into a clean, enhanced PDF — right in your browser or app. No upload, no sign-up, no watermark. Free, on your device.',
    keywords: 'scan to pdf, document scanner, camera to pdf, scan document pdf, scan to pdf online no upload',
    lede: 'Capture a receipt, form or page with your camera and get a crisp, auto-enhanced PDF — processed entirely on your device.',
    steps: [
      ['Open the scanner', 'Click “Scan to PDF” below and allow camera access (or add photos instead).'],
      ['Capture your pages', 'Snap each page; pick Auto, Grayscale, B&W or Color enhancement.'],
      ['Save as PDF', 'Your scanned pages are combined into one PDF on your device.'],
    ],
    features: [
      'Camera capture with automatic clean-up (Otsu B&W)',
      'Multi-page scans in one PDF',
      'No cloud — images never leave your device',
      'Falls back to photo upload when there’s no camera',
    ],
    faqs: [
      { q: 'Do I need to install an app?', a: 'No — it works in the browser. The native apps add offline use and tighter camera integration on phones.' },
      { q: 'Are my scans uploaded to a server?', a: 'Never. Capture and enhancement happen locally.' },
    ],
    related: ['jpg-to-pdf', 'compress-pdf', 'pdf-to-word'],
  },
  {
    slug: 'redact-pdf',
    id: 'auto-redact',
    category: 'Protect',
    title: 'Redact PDF — Remove Sensitive Data Free & Private (No Upload)',
    h1: 'Redact a PDF online — free and private',
    desc: 'Automatically find and permanently remove emails, phone numbers, SSNs and card numbers from a PDF, in your browser. No upload, no sign-up. Free and secure.',
    keywords: 'redact pdf, remove sensitive info pdf, black out pdf text, auto redact pdf, redact pdf online no upload',
    lede: 'Permanently strip personal data out of a PDF before you share it. Matches are burned out of the page — not just covered — so nothing can be selected or recovered.',
    steps: [
      ['Open the redaction tool', 'Click “Auto-Redact” below.'],
      ['Pick what to remove', 'Toggle emails, phone numbers, SSNs, card numbers, or add your own pattern.'],
      ['Download the safe copy', 'A redacted PDF with the data irreversibly removed saves to your device.'],
    ],
    features: [
      'Auto-detects emails, phones, SSNs and card numbers',
      'True redaction — matched text is rasterized out, not hidden',
      'Runs locally — the sensitive file is never uploaded',
      'Add a custom pattern for anything else',
    ],
    faqs: [
      { q: 'Can the redacted text be recovered?', a: 'No. Matched pages are flattened to images with the text burned out, so redacted content can’t be selected, searched or extracted.' },
      { q: 'Is my sensitive PDF uploaded?', a: 'No — that would defeat the point. All detection and redaction happen in your browser.' },
    ],
    related: ['edit-pdf', 'sign-pdf', 'compress-pdf'],
  },
  {
    slug: 'rotate-pdf',
    id: 'rotate',
    category: 'Organize',
    title: 'Rotate PDF — Fix Page Orientation Free & Private (No Upload)',
    h1: 'Rotate PDF pages online — free and private',
    desc: 'Rotate PDF pages 90°, 180° or 270° in your browser and save the result. No upload, no sign-up, no watermark. Free and unlimited, on your device.',
    keywords: 'rotate pdf, turn pdf pages, fix pdf orientation, rotate pdf online, rotate pdf free no upload',
    lede: 'Straighten sideways or upside-down pages and keep the fix permanently — all done locally, with nothing uploaded.',
    steps: [
      ['Open the rotate tool', 'Click “Rotate PDF” below.'],
      ['Choose the angle', 'Pick 90° clockwise, 180°, or 90° counter-clockwise.'],
      ['Download the fixed PDF', 'The rotated document saves to your device.'],
    ],
    features: [
      'Rotate by 90°, 180° or 270°',
      'Processed on your device — no uploads',
      'No watermark or account',
      'Keeps the rotation saved in the file',
    ],
    faqs: [
      { q: 'Does the rotation stick when I reopen the file?', a: 'Yes — the new orientation is written into the PDF, so it opens correctly everywhere.' },
      { q: 'Is the file uploaded to rotate it?', a: 'No. Rotation is applied in your browser.' },
    ],
    related: ['split-pdf', 'merge-pdf', 'pdf-to-jpg'],
  },
]

const bySlug = Object.fromEntries(TOOLS.map((t) => [t.slug, t]))
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function head(t) {
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: t.faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
  const appLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: `${t.h1.replace(/ —.*$/, '')} · thepdf.ink`,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Web, Windows, macOS, Linux, iOS, Android',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  }
  const crumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Tools', item: `${SITE}/tools` },
      { '@type': 'ListItem', position: 2, name: t.category, item: `${SITE}/tools/${t.slug}` },
    ],
  }
  return `    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <title>${esc(t.title)}</title>
    <meta name="description" content="${esc(t.desc)}" />
    <meta name="keywords" content="${esc(t.keywords)}" />
    <link rel="canonical" href="${SITE}/tools/${t.slug}" />
    <meta name="robots" content="index, follow" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="thepdf.ink" />
    <meta property="og:title" content="${esc(t.title)}" />
    <meta property="og:description" content="${esc(t.desc)}" />
    <meta property="og:url" content="${SITE}/tools/${t.slug}" />
    <meta property="og:image" content="${SITE}/og-image.png" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Source+Sans+3:wght@400;500;600&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/page.css" />
    <script type="application/ld+json">${JSON.stringify(appLd)}</script>
    <script type="application/ld+json">${JSON.stringify(faqLd)}</script>
    <script type="application/ld+json">${JSON.stringify(crumbLd)}</script>`
}

const topbar = `    <header class="topbar">
      <a class="brand" href="/"><span>the<strong>pdf</strong><span class="tld">.ink</span></span></a>
      <nav>
        <a href="/tools">Tools</a>
        <a href="/pricing">Pricing</a>
        <a href="/privacy">Privacy</a>
        <a href="/contact">Contact</a>
      </nav>
    </header>`

const foot = `    <footer class="site-foot">
      <nav>
        <a href="/tools">All tools</a>
        <a href="/pricing">Pricing</a>
        <a href="/about">About</a>
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <a href="/licenses">Licenses</a>
        <a href="/contact">Contact</a>
      </nav>
      <p>© 2026 thepdf.ink · Private, offline PDF tools. Every file is processed on your device.</p>
    </footer>
    <script src="/consent.js" defer></script>`

function page(t) {
  const ctaLabel = t.steps[0][0].replace(/^Open (the )?/i, '') // reuse verb-ish label
  const related = t.related
    .map((slug) => bySlug[slug])
    .filter(Boolean)
    .map(
      (r) =>
        `        <li><a href="/tools/${r.slug}"><strong>${esc(r.h1.replace(/ online.*$| — .*$/, ''))}</strong><span>${esc(r.category)}</span></a></li>`,
    )
    .join('\n')
  return `<!doctype html>
<html lang="en">
  <head>
${head(t)}
  </head>
  <body>
${topbar}

    <main class="wrap">
      <span class="pill">${esc(t.category)}</span>
      <h1>${esc(t.h1)}</h1>
      <p class="lede">${esc(t.lede)}</p>

      <div class="cta-row">
        <a class="btn" href="/?tool=${t.id}">Open the tool →</a>
        <a class="btn btn-ghost" href="/pricing">Get the offline app · $9</a>
      </div>
      <p class="trust-line"><strong>Private by design:</strong> nothing is uploaded, stored or tracked.</p>

      <h2>How to ${esc(t.h1.replace(/ online.*$| — .*$/, '').replace(/^(Convert|Merge|Split|Compress|Edit|Sign|Scan|Redact|Rotate)/, (m) => m.toLowerCase()))}</h2>
      <ol class="steps">
${t.steps.map(([s, d]) => `        <li><strong>${esc(s)}</strong>${esc(d)}</li>`).join('\n')}
      </ol>

      <h2>Why use thepdf.ink</h2>
      <ul>
${t.features.map((f) => `        <li>${esc(f)}</li>`).join('\n')}
      </ul>

      <div class="ad-slot">
        <small>Advertisement</small>
        <ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-XXXXXXXXXXXXXXXX" data-ad-slot="0000000000" data-ad-format="auto" data-full-width-responsive="true"></ins>
      </div>

      <h2 class="faq">Frequently asked questions</h2>
      <div class="faq">
${t.faqs.map((f) => `        <h3>${esc(f.q)}</h3>\n        <p>${esc(f.a)}</p>`).join('\n')}
      </div>

      <h2>Related tools</h2>
      <ul class="related-grid">
${related}
      </ul>

      <div class="cta-row">
        <a class="btn" href="/?tool=${t.id}">Open ${esc(ctaLabel)} →</a>
      </div>
    </main>

${foot}
  </body>
</html>
`
}

function hub() {
  const cards = TOOLS.map(
    (t) =>
      `        <li><a href="/tools/${t.slug}"><strong>${esc(t.h1.replace(/ online.*$| — .*$/, ''))}</strong><span>${esc(t.desc.split('.')[0])}.</span></a></li>`,
  ).join('\n')
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <title>Free PDF Tools — Private, No Upload | thepdf.ink</title>
    <meta name="description" content="Every thepdf.ink tool in one place: convert, merge, split, compress, edit, sign, scan and redact PDFs — all in your browser, nothing uploaded." />
    <link rel="canonical" href="${SITE}/tools" />
    <meta name="robots" content="index, follow" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Source+Sans+3:wght@400;500;600&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/page.css" />
  </head>
  <body>
${topbar}
    <main class="wrap">
      <span class="pill">Free PDF tools</span>
      <h1>Every PDF tool, private by default.</h1>
      <p class="lede">Convert, edit, sign, scan and protect PDFs entirely in your browser — nothing is ever uploaded.</p>
      <ul class="related-grid">
${cards}
      </ul>
      <div class="cta-row"><a class="btn" href="/">Open the app →</a></div>
    </main>
${foot}
  </body>
</html>
`
}

function sitemap() {
  const staticUrls = [
    ['/', 'weekly', '1.0'],
    ['/tools', 'weekly', '0.9'],
    ['/pricing', 'monthly', '0.9'],
    ['/about', 'monthly', '0.7'],
    ['/licenses', 'yearly', '0.4'],
    ['/privacy', 'yearly', '0.4'],
    ['/terms', 'yearly', '0.4'],
    ['/contact', 'yearly', '0.4'],
  ]
  const toolUrls = TOOLS.map((t) => [`/tools/${t.slug}`, 'monthly', '0.8'])
  const rows = [...staticUrls, ...toolUrls]
    .map(
      ([loc, cf, pr]) =>
        `  <url>\n    <loc>${SITE}${loc}</loc>\n    <changefreq>${cf}</changefreq>\n    <priority>${pr}</priority>\n  </url>`,
    )
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows}\n</urlset>\n`
}

// ── write everything ──────────────────────────────────────
mkdirSync(resolve(ROOT, 'public/tools'), { recursive: true })
for (const t of TOOLS) {
  writeFileSync(resolve(ROOT, `public/tools/${t.slug}.html`), page(t))
}
writeFileSync(resolve(ROOT, 'public/tools.html'), hub())
writeFileSync(resolve(ROOT, 'public/sitemap.xml'), sitemap())

console.log(`✓ Generated ${TOOLS.length} tool pages + hub + sitemap`)
console.log('  ' + TOOLS.map((t) => `/tools/${t.slug}`).join('\n  '))
