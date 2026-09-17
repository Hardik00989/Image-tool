import type { ToolSeo } from "@/lib/tools-seo";

export const splitPdfSeo: ToolSeo = {
  path: "/split-pdf",
  name: "Split PDF",
  title: "Split PDF Online – Extract PDF Pages Free",
  description:
    "Split PDF files online for free. Extract selected pages into a new PDF or split a PDF into separate files by page or range — processed in your browser.",
  keywords: [
    "split pdf",
    "extract pages from pdf",
    "split pdf online",
    "separate pdf pages",
    "split pdf into multiple files",
    "pdf page extractor",
  ],
  howToTitle: "How to split a PDF",
  steps: [
    {
      title: "Upload your PDF",
      text: "Click Choose PDF or drag and drop your file into the upload box.",
    },
    {
      title: "Choose how to split",
      text: "Click pages or type a range like 1-3, 5 to extract them, or split into files by every page, every few pages or custom ranges.",
    },
    {
      title: "Download the result",
      text: "One PDF downloads directly. Several files download together as a ZIP.",
    },
  ],
  faqTitle: "Split PDF FAQ",
  faqs: [
    {
      question: "Is this PDF splitter free?",
      answer:
        "Yes. Split and extract pages from as many PDFs as you like for free, with no sign-up and no watermark.",
    },
    {
      question: "How do I extract only some pages?",
      answer:
        "Choose Extract pages, then click the pages you want or type them, for example 1-3, 5. They are saved as one new PDF.",
    },
    {
      question: "Can I split a PDF into several files?",
      answer:
        "Yes. Choose Split into files to save every page separately, every N pages, or custom ranges like 1-3, 4-6, 7-. The files download as a ZIP.",
    },
    {
      question: "Does splitting reduce the quality?",
      answer:
        "No. Pages are copied into the new PDFs unchanged, so text and images keep their original quality.",
    },
    {
      question: "Are my files uploaded to a server?",
      answer:
        "No. Your PDF is processed entirely in your browser and never uploaded, so it never leaves your device.",
    },
  ],
  related: ["/merge-pdf", "/pdf-to-jpg", "/rotate-pdf"],
};
