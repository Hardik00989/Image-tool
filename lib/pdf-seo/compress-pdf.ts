import type { ToolSeo } from "@/lib/tools-seo";

export const compressPdfSeo: ToolSeo = {
  path: "/compress-pdf",
  name: "Compress PDF",
  title: "Compress PDF Online – Reduce PDF Size Free",
  description:
    "Compress PDF files online for free. Shrink scanned and image-heavy PDFs for email and uploads with three compression levels — processed in your browser.",
  keywords: [
    "compress pdf",
    "reduce pdf size",
    "pdf compressor",
    "compress pdf online",
    "make pdf smaller",
    "shrink pdf for email",
  ],
  howToTitle: "How to compress a PDF",
  steps: [
    {
      title: "Upload your PDF",
      text: "Click Choose PDF or drag and drop your file into the upload box.",
    },
    {
      title: "Pick a compression level",
      text: "Light keeps text selectable. Recommended and Strong turn pages into compressed images for much bigger savings.",
    },
    {
      title: "Compress and download",
      text: "Click Compress PDF. You'll see the size before and after, and the smaller file downloads straight away.",
    },
  ],
  faqTitle: "Compress PDF FAQ",
  faqs: [
    {
      question: "Is this PDF compressor free?",
      answer:
        "Yes. Compress as many PDFs as you like for free, with no sign-up and no watermark.",
    },
    {
      question: "How much smaller will my PDF get?",
      answer:
        "It depends on the file. Scans and photo-heavy PDFs often shrink by 80–95% with Recommended or Strong. Text-only PDFs are usually small already, and Light only saves a few percent. If compressing wouldn't make your file smaller, we tell you and keep the original.",
    },
    {
      question: "Will the text still be selectable?",
      answer:
        "With Light, yes — text, links and form fields stay as they are. Recommended and Strong turn every page into an image, so text can no longer be selected or searched.",
    },
    {
      question: "What's the difference between Recommended and Strong?",
      answer:
        "Recommended renders pages at 110 DPI with good JPG quality, which stays easy to read on screen. Strong uses 80 DPI and lower quality for the smallest possible file.",
    },
    {
      question: "Are my files uploaded to a server?",
      answer:
        "No. Your PDF is processed entirely in your browser and never leaves your device.",
    },
  ],
  related: ["/merge-pdf", "/pdf-to-jpg", "/image-compressor"],
};
