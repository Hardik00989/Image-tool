import type { ToolSeo } from "@/lib/tools-seo";

export const pdfToJpgSeo: ToolSeo = {
  path: "/pdf-to-jpg",
  name: "PDF to JPG",
  title: "PDF to JPG Online – Convert PDF to Image Free",
  description:
    "Convert PDF to JPG or PNG online for free. Turn each page into a high-quality image at up to 300 DPI and download them as a ZIP — processed in your browser.",
  keywords: [
    "pdf to jpg",
    "convert pdf to jpg",
    "pdf to image",
    "pdf to png",
    "pdf to jpg high quality",
    "save pdf page as image",
  ],
  howToTitle: "How to convert a PDF to JPG",
  steps: [
    {
      title: "Upload your PDF",
      text: "Click Choose PDF or drag and drop your file into the upload box.",
    },
    {
      title: "Pick the options",
      text: "Choose JPG or PNG, the quality, a resolution of 72, 150 or 300 DPI, and all pages or only some.",
    },
    {
      title: "Convert and download",
      text: "Click Convert. Download single images or all of them at once as a ZIP.",
    },
  ],
  faqTitle: "PDF to JPG FAQ",
  faqs: [
    {
      question: "Is this PDF to JPG converter free?",
      answer:
        "Yes. Convert as many PDF pages to images as you like for free, with no sign-up and no watermark.",
    },
    {
      question: "Which resolution should I choose?",
      answer:
        "150 DPI suits most uses. Pick 72 DPI for small web images and 300 DPI for printing or sharp zooming.",
    },
    {
      question: "Can I convert only some pages?",
      answer:
        "Yes. Click Choose pages and type the page numbers, for example 1-3, 5. Each page becomes its own image.",
    },
    {
      question: "Should I choose JPG or PNG?",
      answer:
        "JPG gives smaller files. PNG is lossless, so text and lines stay crisper, but the files are larger.",
    },
    {
      question: "Are my files uploaded to a server?",
      answer:
        "No. Your PDF is converted entirely in your browser and never uploaded, so it never leaves your device.",
    },
  ],
  related: ["/image-to-pdf", "/split-pdf", "/image-compressor"],
};
