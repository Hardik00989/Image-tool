import type { ToolSeo } from "@/lib/tools-seo";

export const ocrPdfSeo: ToolSeo = {
  path: "/ocr-pdf",
  name: "OCR PDF",
  title: "OCR PDF Online – Make Scans Searchable Free",
  description:
    "Free online OCR for PDFs and images. Turn scanned PDFs, JPGs and PNGs into searchable PDFs and copy the text — runs in your browser, files never uploaded.",
  keywords: [
    "ocr pdf",
    "make pdf searchable",
    "ocr pdf online free",
    "scanned pdf to text",
    "searchable pdf",
    "extract text from scanned pdf",
    "image to text",
  ],
  howToTitle: "How to OCR a scanned PDF",
  steps: [
    {
      title: "Upload a scan",
      text: "Choose a scanned PDF, or a JPG or PNG photo of a document.",
    },
    {
      title: "Choose the language",
      text: "Pick the document's language: English, Hindi, Spanish, French, German, Portuguese or Italian.",
    },
    {
      title: "Make it searchable",
      text: "Click Make PDF searchable. Each page is recognized in turn, with progress shown as it goes.",
    },
    {
      title: "Download or copy the text",
      text: "Download the searchable PDF, copy the recognized text, or save it as a .txt file.",
    },
  ],
  faqTitle: "OCR PDF FAQ",
  faqs: [
    {
      question: "Is this OCR tool free?",
      answer:
        "Yes. OCR as many PDFs and images as you like for free, with no sign-up and no watermark.",
    },
    {
      question: "Does OCR change how my pages look?",
      answer:
        "No. Your original pages are kept exactly as they are, and an invisible text layer is added on top so you can search, select and copy the text. Pages that already have selectable text are left unchanged.",
    },
    {
      question: "Which languages are supported?",
      answer:
        "English, Hindi, Spanish, French, German, Portuguese and Italian. Choose the document's language before you start for the best accuracy.",
    },
    {
      question: "Why is the first run slower?",
      answer:
        "The first time you use a language, the OCR engine and its language data (a few MB) are downloaded from a public CDN. After that, each page takes a few seconds.",
    },
    {
      question: "Are my files uploaded to a server?",
      answer:
        "No. Your file is processed in your browser and never uploaded. Only the OCR engine and language data are downloaded to your device.",
    },
  ],
  related: ["/compress-pdf", "/pdf-to-jpg", "/image-to-pdf"],
};
