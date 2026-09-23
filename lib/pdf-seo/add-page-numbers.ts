import type { ToolSeo } from "@/lib/tools-seo";

export const addPageNumbersSeo: ToolSeo = {
  path: "/add-page-numbers",
  name: "Add Page Numbers",
  title: "Add Page Numbers to PDF Online Free",
  description:
    "Add page numbers to a PDF online for free. Choose the position, format, start number and first page to number, then download — it all runs in your browser.",
  keywords: [
    "add page numbers to pdf",
    "number pdf pages",
    "pdf page numbering",
    "insert page numbers in pdf",
    "add page numbers to pdf online",
    "page x of y pdf",
  ],
  howToTitle: "How to add page numbers to a PDF",
  steps: [
    {
      title: "Upload your PDF",
      text: "Click Choose PDF or drag and drop your file into the upload box.",
    },
    {
      title: "Choose the style",
      text: "Pick a position in the header or footer, a format like \"Page 1 of 12\", the font size, margin and colour.",
    },
    {
      title: "Skip cover pages if needed",
      text: "Set the page to start numbering from and the first number to use. The preview shows the result.",
    },
    {
      title: "Download the numbered PDF",
      text: "Click Add page numbers and your file downloads straight away.",
    },
  ],
  faqTitle: "Add Page Numbers FAQ",
  faqs: [
    {
      question: "Is it free to add page numbers to a PDF?",
      answer:
        "Yes. Number as many PDFs as you like for free, with no sign-up and no watermark.",
    },
    {
      question: "Can I skip the cover page?",
      answer:
        "Yes. Set \"Start numbering from page\" to 2 (or later) and the earlier pages get no number. You can also choose which number to start counting from.",
    },
    {
      question: "Which number formats can I use?",
      answer:
        "A plain number (1), \"Page 1\", \"Page 1 of 12\" or \"1 / 12\", in six positions: top or bottom, on the left, centre or right.",
    },
    {
      question: "Does it work with landscape and rotated pages?",
      answer:
        "Yes. Numbers are placed on each page as you see it, so they sit in the right corner and read upright on landscape, rotated and cropped pages too.",
    },
    {
      question: "Are my files uploaded to a server?",
      answer:
        "No. Your PDF is processed in your browser and never uploaded, so it stays on your device.",
    },
  ],
  related: ["/add-watermark", "/merge-pdf", "/split-pdf"],
};
