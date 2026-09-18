import type { ToolSeo } from "@/lib/tools-seo";

export const mergePdfSeo: ToolSeo = {
  path: "/merge-pdf",
  name: "Merge PDF",
  title: "Merge PDF Online – Combine PDF Files Free",
  description:
    "Merge PDF files online for free. Combine several PDFs into one, drag them into the right order and download the merged file — processed in your browser.",
  keywords: [
    "merge pdf",
    "combine pdf",
    "merge pdf files",
    "combine pdf files into one",
    "join pdf",
    "merge pdf online free",
  ],
  howToTitle: "How to merge PDF files",
  steps: [
    {
      title: "Upload your PDFs",
      text: "Click Choose PDF files or drag and drop two or more PDFs into the upload box.",
    },
    {
      title: "Put them in order",
      text: "Drag the files, or use the up and down arrows, to set the order. Add more files or remove any you don't need.",
    },
    {
      title: "Merge and download",
      text: "Click Merge PDFs. The combined PDF downloads straight away.",
    },
  ],
  faqTitle: "Merge PDF FAQ",
  faqs: [
    {
      question: "Is this PDF merger free?",
      answer:
        "Yes. Merge as many PDFs as you like for free, with no sign-up and no watermark.",
    },
    {
      question: "Can I change the order of the files?",
      answer:
        "Yes. Drag the files into a new order or use the up and down arrows. The pages are merged in the order shown.",
    },
    {
      question: "Does merging reduce the quality?",
      answer:
        "No. The original pages are copied into the new PDF unchanged, so text stays sharp and selectable.",
    },
    {
      question: "Can I merge password-protected PDFs?",
      answer:
        "Not directly. Remove the password first with the Unlock PDF tool, then merge the unlocked file.",
    },
    {
      question: "Are my files uploaded to a server?",
      answer:
        "No. Your PDFs are processed entirely in your browser and never uploaded, so nobody else can see them.",
    },
  ],
  related: ["/split-pdf", "/compress-pdf", "/rotate-pdf"],
};
