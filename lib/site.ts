import type { Metadata } from "next";

// Set NEXT_PUBLIC_SITE_URL to your real domain in production,
// e.g. NEXT_PUBLIC_SITE_URL=https://www.example.com
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
).replace(/\/$/, "");

export const siteName = "ImageTools";

export const siteDescription =
  "Free online image tools to resize, compress, crop and convert images, remove backgrounds and create PDFs. Fast, private and processed in your browser.";

type PageMetadataOptions = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  // Use the title as-is instead of adding " | ImageTools"
  absoluteTitle?: boolean;
};

// Builds a page's metadata. Open Graph and Twitter tags are set here too,
// because they don't inherit the page title — without them every shared
// link would show the home page's title and description.
// The share image itself comes from each route's opengraph-image.tsx.
export function pageMetadata({
  title,
  description,
  path,
  keywords,
  absoluteTitle = false,
}: PageMetadataOptions): Metadata {
  const fullTitle = absoluteTitle ? title : `${title} | ${siteName}`;

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    keywords,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title: fullTitle,
      description,
      url: path,
      type: "website",
      siteName,
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
    },
  };
}

// ---------------------------------------------------------------------------
// Structured data (JSON-LD) for search engines
// ---------------------------------------------------------------------------

export const absoluteUrl = (path: string) =>
  `${siteUrl}${path === "/" ? "" : path}`;

export function breadcrumbSchema(name: string, path: string) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: absoluteUrl("/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name,
        item: absoluteUrl(path),
      },
    ],
  };
}

export function webAppSchema(
  name: string,
  description: string,
  path: string
) {
  return {
    "@type": "WebApplication",
    name,
    description,
    url: absoluteUrl(path),
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript and a modern web browser",
    isAccessibleForFree: true,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };
}

export function faqSchema(
  faqs: { question: string; answer: string }[]
) {
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}
