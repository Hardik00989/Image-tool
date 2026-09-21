import type { ToolSeo } from "@/lib/tools-seo";

export const comparePdfSeo: ToolSeo = {
  path: "/compare-pdf",
  name: "Compare PDF",
  title: "Compare PDF Online – Find Text Differences",
  description:
    "Compare two PDF files online for free. See which words were added or removed on each page, with a clear summary — both files are compared in your browser.",
  keywords: [
    "compare pdf",
    "compare two pdf files",
    "pdf diff",
    "find differences between pdfs",
    "compare pdf documents online",
    "pdf comparison tool",
  ],
  howToTitle: "How to compare two PDFs",
  steps: [
    {
      title: "Upload both versions",
      text: "Add the original PDF on the left and the changed PDF on the right.",
    },
    {
      title: "Compare",
      text: "Click Compare PDFs. The text of both files is read and compared page by page.",
    },
    {
      title: "Review the changes",
      text: "Removed words are shown in red strikethrough and added words in green. Pages without changes are collapsed.",
    },
  ],
  faqTitle: "Compare PDF FAQ",
  faqs: [
    {
      question: "Is this PDF comparison tool free?",
      answer:
        "Yes. Compare as many PDFs as you like for free, with no sign-up.",
    },
    {
      question: "What does the comparison check?",
      answer:
        "It compares the text on each page word by word. Changes in fonts, colours, images or layout are not detected.",
    },
    {
      question: "What if the PDFs have a different number of pages?",
      answer:
        "Pages are matched by number. Extra pages in either file are shown as fully added or fully removed.",
    },
    {
      question: "Can I compare scanned PDFs?",
      answer:
        "Scanned PDFs are images and have no text to compare. Run them through OCR PDF first to add a text layer, then compare them.",
    },
    {
      question: "Are my files uploaded to a server?",
      answer:
        "No. Both PDFs are processed in your browser and never uploaded, so they never leave your device.",
    },
  ],
  related: ["/ocr-pdf", "/merge-pdf", "/edit-pdf"],
};
