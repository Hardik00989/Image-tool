
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { siteDescription, siteName, siteUrl } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: "Free Online Image Tools – Resize, Compress & Convert | ImageTools",
    template: "%s | ImageTools",
  },

  description: siteDescription,

  applicationName: siteName,
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
  category: "technology",

  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  // Set NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION to the code from Google Search Console
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },

  openGraph: {
    title: "Free Online Image Tools – Resize, Compress & Convert | ImageTools",
    description: siteDescription,
    type: "website",
    siteName,
    locale: "en_US",
  },

  twitter: {
    card: "summary_large_image",
    title: "Free Online Image Tools – Resize, Compress & Convert | ImageTools",
    description: siteDescription,
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50">
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}

