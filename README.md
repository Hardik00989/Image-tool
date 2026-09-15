# Image-tool

Free online image tools that run entirely in the browser — images are never uploaded to a server.

## Tools

| Tool | Route | What it does |
| --- | --- | --- |
| Background Remover | `/background-remover` | Removes the background automatically and adds a transparent, colour or gradient background |
| Image Resizer | `/image-resizer` | Resizes to any width and height, with optional compression to PNG, JPG or WebP |
| Image Compressor | `/image-compressor` | Reduces file size while keeping good quality |
| Image to PDF | `/image-to-pdf` | Combines images into one PDF with a maximum file size |
| Image Editor | `/crop-image` | Crops, rotates and flips images |

## Tech stack

- [Next.js](https://nextjs.org) 16 (App Router) with React 19 and TypeScript
- [Tailwind CSS](https://tailwindcss.com) 4
- [@imgly/background-removal](https://github.com/imgly/background-removal-js) for background removal
- [jsPDF](https://github.com/parallax/jsPDF) for PDF creation
- [react-image-crop](https://github.com/dominictobias/react-image-crop) for cropping

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
  SiteHeader.tsx
  SiteFooter.tsx
lib/
  site.ts             Site URL and page metadata helper
```

## Deployment

The easiest way to deploy is [Vercel](https://vercel.com/new): import this repository and add `NEXT_PUBLIC_SITE_URL` in the project's environment variables. Any host that supports Next.js works too (`npm run build` then `npm run start`).
