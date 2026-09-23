import type { ToolSeo } from "@/lib/tools-seo";

export const cropPdfSeo: ToolSeo = {
  path: "/crop-pdf",
  name: "Crop PDF",
  title: "Crop PDF Online – Trim PDF Margins Free",
  description:
    "Crop PDF pages online for free. Drag a crop box or enter exact margins, apply it to all pages or just a few, and download — your file never leaves your browser.",
  keywords: [
    "crop pdf",
    "crop pdf online",
    "trim pdf margins",
    "crop pdf pages",
    "remove white margins pdf",
    "cut pdf page size",
  ],
  howToTitle: "How to crop a PDF",
  steps: [
    {
      title: "Upload your PDF",
      text: "Click Choose PDF or drag and drop your file into the upload box.",
    },
    {
      title: "Set the crop area",
      text: "Drag the crop box and its handles on the page, or type the margins to trim in millimetres.",
    },
    {
      title: "Choose the pages",
      text: "Apply the crop to all pages, the page you are viewing, or a list of pages like 1-3, 5.",
    },
    {
      title: "Download",
      text: "Click Crop PDF and the cropped file downloads straight away.",
    },
  ],
  faqTitle: "Crop PDF FAQ",
  faqs: [
    {
      question: "Is this PDF cropper free?",
      answer:
        "Yes. Crop as many PDFs as you like for free, with no sign-up and no watermark.",
    },
    {
      question: "Can I crop just one page?",
      answer:
        "Yes. Crop only the page you are viewing, or choose pages by number. Otherwise every page is cropped with the same margins.",
    },
    {
      question: "Is the cropped content deleted?",
      answer:
        "No. Cropping sets the visible area of each page, so the trimmed part is hidden but still in the file and can be restored with a PDF editor. Use a redaction tool to remove sensitive content.",
    },
    {
      question: "Does cropping lower the quality?",
      answer:
        "No. Text and images are not re-compressed or turned into pictures, so the pages stay sharp and searchable.",
    },
    {
      question: "Are my files uploaded to a server?",
      answer:
        "No. Your PDF is processed in your browser and never uploaded, so it stays on your device.",
    },
  ],
  related: ["/rotate-pdf", "/split-pdf", "/redact-pdf"],
};
