import type { ToolSeo } from "@/lib/tools-seo";

export const rotatePdfSeo: ToolSeo = {
  path: "/rotate-pdf",
  name: "Rotate PDF",
  title: "Rotate PDF Online – Rotate PDF Pages Free",
  description:
    "Rotate PDF pages online for free. Turn one page or every page left or right, preview the result and download the fixed PDF — files never leave your device.",
  keywords: [
    "rotate pdf",
    "rotate pdf pages",
    "rotate pdf online",
    "turn pdf pages",
    "fix upside down pdf",
    "rotate pdf and save",
  ],
  howToTitle: "How to rotate a PDF",
  steps: [
    {
      title: "Upload your PDF",
      text: "Click Choose PDF or drag and drop your file into the upload box.",
    },
    {
      title: "Rotate the pages",
      text: "Use the arrows under a page to rotate it, or rotate all pages at once.",
    },
    {
      title: "Save and download",
      text: "Click Save rotated PDF. Your fixed file downloads straight away.",
    },
  ],
  faqTitle: "Rotate PDF FAQ",
  faqs: [
    {
      question: "Is this PDF rotator free?",
      answer:
        "Yes. Rotate as many PDFs as you like for free, with no sign-up and no watermark.",
    },
    {
      question: "Can I rotate just one page?",
      answer:
        "Yes. Each page has its own rotate buttons, so you can fix a single sideways page and leave the rest as they are.",
    },
    {
      question: "Is the rotation permanent?",
      answer:
        "Yes. The rotation is saved in the new PDF, so it opens the right way up in every PDF viewer.",
    },
    {
      question: "Does rotating reduce the quality?",
      answer:
        "No. Rotating only changes the page orientation. Text, images and quality stay exactly the same.",
    },
    {
      question: "Are my files uploaded to a server?",
      answer:
        "No. Your PDF is processed entirely in your browser and never leaves your device.",
    },
  ],
  related: ["/merge-pdf", "/split-pdf", "/crop-pdf"],
};
