import type { ToolSeo } from "@/lib/tools-seo";

export const redactPdfSeo: ToolSeo = {
  path: "/redact-pdf",
  name: "Redact PDF",
  title: "Redact PDF Online – Black Out Text Free",
  description:
    "Redact PDF files online for free. Black out names, numbers and private details by hand or by search. Hidden content is removed for good, in your browser.",
  keywords: [
    "redact pdf",
    "black out text in pdf",
    "pdf redaction tool",
    "redact pdf online free",
    "remove sensitive information from pdf",
    "censor pdf",
  ],
  howToTitle: "How to redact a PDF",
  steps: [
    {
      title: "Upload your PDF",
      text: "Click Choose PDF or drag and drop your file into the upload box.",
    },
    {
      title: "Mark what to hide",
      text: "Drag on a page to draw black boxes, or type a word or number into Find and redact to cover every match on every page.",
    },
    {
      title: "Apply and download",
      text: "Click Redact and download. The covered content is permanently removed from the new file.",
    },
  ],
  faqTitle: "Redact PDF FAQ",
  faqs: [
    {
      question: "Is this redaction tool free?",
      answer:
        "Yes. Redact as many PDFs as you like for free, with no sign-up and no watermark.",
    },
    {
      question: "Is the redaction permanent?",
      answer:
        "Yes. Each page with a black box is turned into an image with the box burned in, so the hidden text is really gone and can't be copied, searched or uncovered.",
    },
    {
      question: "What happens to pages I don't redact?",
      answer:
        "They are copied unchanged, so their text stays selectable and searchable. Only pages with boxes become images, at about 200 DPI.",
    },
    {
      question: "Can I redact every copy of a word at once?",
      answer:
        "Yes. Type the word, name or number into Find and redact and a box is added over each match on every page. Scanned pages have no text to search, so draw boxes on them by hand.",
    },
    {
      question: "Are my files uploaded to a server?",
      answer:
        "No. Your PDF is processed in your browser and never uploaded, which matters when it contains private information.",
    },
  ],
  related: ["/edit-pdf", "/protect-pdf", "/compress-pdf"],
};
