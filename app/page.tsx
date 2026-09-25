import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import {
  absoluteUrl,
  pageMetadata,
  siteDescription,
  siteName,
} from "@/lib/site";
import { pdfCategories } from "@/lib/tool-categories";
import { toolsSeo } from "@/lib/tools-seo";

const tools = [
  {
    title: "Background Remover",
    description:
      "Remove image backgrounds automatically and create transparent or custom backgrounds.",
    href: "/background-remover",
    icon: "✦",
    badge: "Popular",
  },
  {
    title: "Image Resizer & Compressor",
    description:
      "Resize images to any width and height and compress them to a smaller file size.",
    href: "/image-resizer",
    icon: "↔",
  },
  {
    title: "Image to PDF",
    description:
      "Convert one or multiple images into a clean PDF document.",
    href: "/image-to-pdf",
    icon: "▣",
  },
  {
    title: "Image Editor",
    description:
      "Crop, rotate and flip your images before downloading them.",
    href: "/crop-image",
    icon: "✎",
  },
];

export const metadata = pageMetadata({
  title: "Free Image & PDF Tools – Resize, Compress, Merge | ImageTools",
  description: siteDescription,
  path: "/",
  absoluteTitle: true,
  keywords: [
    "online image tools",
    "free image tools",
    "image resizer",
    "image compressor",
    "image to pdf",
    "crop image",
    "background remover",
    "merge pdf",
    "compress pdf",
    "split pdf",
    "pdf to jpg",
    "sign pdf",
  ],
});

const homeSchema = [
  {
    "@type": "WebSite",
    name: siteName,
    url: absoluteUrl("/"),
    description: siteDescription,
  },
  {
    "@type": "Organization",
    name: siteName,
    url: absoluteUrl("/"),
  },
  {
    "@type": "ItemList",
    name: "Free online image and PDF tools",
    itemListElement: Object.values(toolsSeo).map((tool, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: tool.name,
      url: absoluteUrl(tool.path),
    })),
  },
];

export default function Home() {
  return (
    <main className="flex-1 bg-gray-50 text-gray-900">
      <JsonLd data={homeSchema} />


      {/* Hero */}

      <section className="relative overflow-hidden bg-white">

        <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-100/60 blur-3xl" />

        <div className="relative mx-auto max-w-5xl px-6 py-24 text-center sm:px-10 lg:px-16 sm:py-32">

          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-5 py-2.5 text-base font-medium text-blue-700">
            <span>✦</span>
            Simple & powerful image and PDF tools
          </div>

          <h1 className="mx-auto max-w-5xl text-5xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-6xl lg:text-7xl">
            Free Online Image & PDF Tools
            <span className="block text-blue-600">
              Made Simple
            </span>
          </h1>

          <p className="mx-auto mt-7 max-w-3xl text-lg leading-8 text-gray-600 sm:text-xl">
            Resize, compress and edit images. Merge, split, convert,
            protect and sign PDFs — free, and all in your browser.
          </p>

          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">

            <a
              href="#tools"
              className="rounded-xl bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-700"
            >
              Explore Image Tools
            </a>

            <Link
              href="/background-remover"
              className="rounded-xl border border-gray-300 bg-white px-8 py-4 text-lg font-semibold text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
            >
              Try Background Remover
            </Link>

          </div>

          <div className="mt-12 flex flex-wrap justify-center gap-x-8 gap-y-4 text-base text-gray-500">

            <span className="flex items-center gap-2">
              <span className="text-lg text-green-600">✓</span>
              Easy to use
            </span>

            <span className="flex items-center gap-2">
              <span className="text-lg text-green-600">✓</span>
              No complicated setup
            </span>

            <span className="flex items-center gap-2">
              <span className="text-lg text-green-600">✓</span>
              Works in your browser
            </span>

          </div>

        </div>

      </section>

      {/* Tools */}

      <section
        id="tools"
        className="mx-auto max-w-7xl scroll-mt-24 px-6 py-20 sm:px-10 lg:px-16 sm:py-24"
      >

        <div className="mx-auto max-w-3xl text-center">

          <p className="text-base font-semibold uppercase tracking-wider text-blue-600">
            Image Tools
          </p>

          <h2 className="mt-3 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Everything you need
          </h2>

          <p className="mt-5 text-lg leading-8 text-gray-600">
            Choose a tool and get your image ready in just a few clicks.
          </p>

        </div>

        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">

          {tools.map((tool) => (
            <Link
              key={tool.title}
              href={tool.href}
              className="group relative rounded-2xl border border-gray-200 bg-white p-7 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
            >

              {tool.badge && (
                <span className="absolute right-6 top-6 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-600">
                  {tool.badge}
                </span>
              )}

              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-2xl font-bold text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
                {tool.icon}
              </div>

              <h3 className="mt-6 text-2xl font-bold text-gray-900">
                {tool.title}
              </h3>

              <p className="mt-3 min-h-[52px] text-base leading-7 text-gray-600">
                {tool.description}
              </p>

              <div className="mt-6 flex items-center gap-2 text-base font-semibold text-blue-600">
                Open Tool

                <span className="text-lg transition-transform group-hover:translate-x-1">
                  →
                </span>
              </div>

            </Link>
          ))}

        </div>

      </section>

      {/* PDF Tools */}

      <section
        id="pdf-tools"
        className="mx-auto max-w-7xl scroll-mt-24 px-6 pb-20 sm:px-10 lg:px-16 sm:pb-24"
      >

        <div className="mx-auto max-w-3xl text-center">

          <p className="text-base font-semibold uppercase tracking-wider text-blue-600">
            PDF Tools
          </p>

          <h2 className="mt-3 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Every tool for your PDFs
          </h2>

          <p className="mt-5 text-lg leading-8 text-gray-600">
            Merge, split, compress, convert, edit and protect PDF files —
            right in your browser.
          </p>

        </div>

        <div className="mt-12 grid gap-x-10 gap-y-12 rounded-3xl border border-gray-200 bg-white p-8 shadow-sm sm:grid-cols-2 sm:p-10 lg:grid-cols-3">

          {pdfCategories.map((category) => (
            <div key={category.id}>

              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                {category.title}
              </h3>

              <ul className="mt-5 space-y-1">
                {category.tools.map((tool) => {
                  const Icon = tool.icon;

                  return (
                    <li key={tool.href}>
                      <Link
                        href={tool.href}
                        className="group -mx-3 flex items-center gap-4 rounded-xl px-3 py-2.5 transition hover:bg-gray-50"
                      >
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${category.color}`}
                        >
                          <Icon
                            className="h-5 w-5"
                            aria-hidden="true"
                          />
                        </span>

                        <span className="text-base font-semibold text-gray-800 transition group-hover:text-blue-600">
                          {tool.label}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>

            </div>
          ))}

        </div>

      </section>

      {/* How It Works */}

      <section className="border-y border-gray-200 bg-white">

        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 lg:px-16 sm:py-24">

          <div className="mx-auto max-w-3xl text-center">

            <p className="text-base font-semibold uppercase tracking-wider text-blue-600">
              How It Works
            </p>

            <h2 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
              Simple as 1, 2, 3
            </h2>

          </div>

          <div className="mx-auto mt-12 grid max-w-5xl gap-8 md:grid-cols-3">

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-8 text-center">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                1
              </div>

              <h3 className="mt-5 text-lg font-bold">
                Choose a Tool
              </h3>

              <p className="mt-3 text-base leading-7 text-gray-600">
                Select the image or PDF tool that matches what you want to do.
              </p>

            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-8 text-center">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                2
              </div>

              <h3 className="mt-5 text-lg font-bold">
                Upload Your File
              </h3>

              <p className="mt-3 text-base leading-7 text-gray-600">
                Upload your image or PDF and adjust the available options.
              </p>

            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-8 text-center">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                3
              </div>

              <h3 className="mt-5 text-lg font-bold">
                Download
              </h3>

              <p className="mt-3 text-base leading-7 text-gray-600">
                Process your file and download the finished result.
              </p>

            </div>

          </div>

        </div>

      </section>

      {/* About */}

      <section
        id="about"
        className="mx-auto max-w-5xl scroll-mt-24 px-6 py-20 text-center sm:px-10 lg:px-16 sm:py-24"
      >

        <p className="text-base font-semibold uppercase tracking-wider text-blue-600">
          About ImageTools
        </p>

        <h2 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
          Useful image and PDF tools without the complexity
        </h2>

        <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-gray-600">
          ImageTools brings common image and PDF tasks together in one
          easy-to-use place. Whether you need to resize an image, remove a
          background, or merge, compress, sign or protect a PDF, you can get
          started in just a few clicks.
        </p>

        <Link
          href="/about"
          className="mt-8 inline-flex rounded-xl bg-blue-600 px-7 py-3.5 font-semibold text-white transition hover:bg-blue-700"
        >
          Read More About Us
        </Link>

      </section>

      {/* CTA */}

      <section className="px-6 pb-20 sm:px-10 lg:px-16 sm:pb-24">

        <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl bg-blue-600 px-6 py-14 text-center text-white shadow-lg sm:px-12 sm:py-16">

          <h2 className="text-4xl font-bold sm:text-5xl">
            Ready to get started?
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-blue-100">
            Choose one of our free image or PDF tools — no sign-up needed.
          </p>

          <a
            href="#tools"
            className="mt-8 inline-block rounded-xl bg-white px-8 py-4 text-lg font-semibold text-blue-600 transition hover:bg-gray-100"
          >
            Explore Tools
          </a>

        </div>

      </section>


    </main>
  );
}

