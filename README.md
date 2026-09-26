# Image-tool

Free online image and PDF tools that run entirely in the browser — files are never uploaded to a server.

## Image tools

| Tool | Route | What it does |
| --- | --- | --- |
| Background Remover | `/background-remover` | Removes the background automatically and adds a transparent, colour or gradient background |
| Image Resizer | `/image-resizer` | Resizes to any width and height, with optional compression to PNG, JPG or WebP |
| Image Compressor | `/image-compressor` | Reduces file size while keeping good quality |
| Image to PDF | `/image-to-pdf` | Combines images into one PDF with a maximum file size |
| Image Editor | `/crop-image` | Crops, rotates and flips images |

## PDF tools

| Category | Tool | Route | What it does |
| --- | --- | --- | --- |
| Organize | Merge PDF | `/merge-pdf` | Combines several PDFs in any order |
| Organize | Split PDF | `/split-pdf` | Extracts pages or splits into separate files (ZIP) |
| Organize | Rotate PDF | `/rotate-pdf` | Rotates single pages or all pages |
| Optimize | Compress PDF | `/compress-pdf` | Light (keeps text) or strong image-based compression |
| Optimize | Repair PDF | `/repair-pdf` | Rebuilds damaged files; falls back to page images |
| Optimize | OCR PDF | `/ocr-pdf` | Makes scanned PDFs and images searchable (Tesseract) |
| Convert | JPG to PDF | `/image-to-pdf` | Same tool as Image to PDF |
| Convert | HTML to PDF | `/html-to-pdf` | Converts pasted or uploaded HTML (pages become images) |
| Convert | PDF to JPG | `/pdf-to-jpg` | Exports pages as JPG or PNG at 72–300 DPI |
| Edit | Edit PDF | `/edit-pdf` | Adds text, images, rectangles, highlights and whiteout |
| Edit | Add page numbers | `/add-page-numbers` | Six positions, several formats, start number |
| Edit | Add watermark | `/add-watermark` | Text or image watermark, centred or tiled |
| Edit | Crop PDF | `/crop-pdf` | Drag a crop box or type margins |
| Edit | PDF Forms | `/pdf-forms` | Fills existing form fields, optional flatten |
| Security | Unlock PDF | `/unlock-pdf` | Removes a password you know |
| Security | Protect PDF | `/protect-pdf` | AES-256 password and permissions |
| Security | Sign PDF | `/sign-pdf` | Draw, type or upload an electronic signature |
| Security | Redact PDF | `/redact-pdf` | Blacks out content permanently (search or draw) |
| Security | Compare PDF | `/compare-pdf` | Shows text differences between two PDFs |

The OCR tool downloads its language data from a CDN on first use; the background remover downloads its AI model the same way. Files themselves never leave the browser.

## Tech stack

- [Next.js](https://nextjs.org) 16 (App Router) with React 19 and TypeScript
- [Tailwind CSS](https://tailwindcss.com) 4
- [@imgly/background-removal](https://github.com/imgly/background-removal-js) for background removal
- [jsPDF](https://github.com/parallax/jsPDF) for PDF creation
- [react-image-crop](https://github.com/dominictobias/react-image-crop) for cropping
- [@cantoo/pdf-lib](https://github.com/cantoo-scribe/pdf-lib) (maintained pdf-lib fork with encryption) for creating and editing PDFs
- [PDF.js](https://github.com/mozilla/pdf.js) (`pdfjs-dist`) for rendering pages and reading text
- [Tesseract.js](https://github.com/naptha/tesseract.js) for OCR, [html2canvas](https://github.com/niklasvh/html2canvas) for HTML to PDF
- [fflate](https://github.com/101arrowz/fflate) for ZIP downloads, [diff](https://github.com/kpdecker/jsdiff) for PDF comparison
- [Lucide](https://lucide.dev) icons

## Getting started

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

Copy `.env.example` to `.env.local` and set your domain:

```bash
NEXT_PUBLIC_SITE_URL=https://www.example.com
```

It's used for canonical URLs, Open Graph tags, `sitemap.xml` and `robots.txt`. Without it, those fall back to `http://localhost:3000`, so **set it before deploying**.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |

## Project structure

```
app/
  layout.tsx          Root layout: shared header, footer and site metadata
  page.tsx            Home page
  <tool>/page.tsx     Each tool page
  <tool>/layout.tsx   Per-tool SEO metadata
  about, contact, privacy, terms
  robots.ts           /robots.txt
  sitemap.ts          /sitemap.xml
components/
  SiteHeader.tsx      Header with mobile menu
  SiteFooter.tsx
  ToolHero.tsx        Heading block for tool pages
  ToolContent.tsx     How-to, FAQ and related tools under each tool
  JsonLd.tsx          Structured data for search engines
  pdf/                Shared PDF UI: upload box, page previews, page viewer, result card
lib/
  site.ts             Site URL, page metadata and structured-data helpers
  tools-seo.ts        SEO copy for image tools; registers the PDF tools
  pdf-seo/            SEO copy for each PDF tool
  tool-categories.ts  Tool list and categories for the home page, footer and About page
  pdf.ts              PDF helpers (loading, rendering, downloads, page ranges)
  og.tsx              Share-image generator
```

## Deployment

The easiest way to deploy is [Vercel](https://vercel.com/new): import this repository and add `NEXT_PUBLIC_SITE_URL` in the project's environment variables. Any host that supports Next.js works too (`npm run build` then `npm run start`).
