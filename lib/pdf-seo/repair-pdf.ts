import type { ToolSeo } from "@/lib/tools-seo";

export const repairPdfSeo: ToolSeo = {
  path: "/repair-pdf",
  name: "Repair PDF",
  title: "Repair PDF Online – Fix Corrupted PDF Free",
  description:
    "Repair damaged or corrupted PDF files online for free. Rebuild a broken PDF and recover readable pages — it all runs in your browser, nothing is uploaded.",
  keywords: [
    "repair pdf",
    "fix corrupted pdf",
    "pdf repair online",
    "recover damaged pdf",
    "pdf won't open",
    "fix broken pdf",
  ],
  howToTitle: "How to repair a PDF",
  steps: [
    {
      title: "Upload the damaged PDF",
      text: "Choose the file that won't open or shows errors. It's accepted even if it can't be read yet.",
    },
    {
      title: "Click Repair PDF",
      text: "We first rebuild the file structure. If that isn't enough, readable pages are recovered as images.",
    },
    {
      title: "Download the repaired file",
      text: "You'll see which method worked and how many pages were recovered, and the fixed PDF downloads automatically.",
    },
  ],
  faqTitle: "Repair PDF FAQ",
  faqs: [
    {
      question: "Is Repair PDF free?",
      answer:
        "Yes. Repair as many PDFs as you like for free, with no sign-up and no watermark.",
    },
    {
      question: "How does the repair work?",
      answer:
        "First we read every object that is still intact and write a new cross-reference table, which keeps text and quality. If the structure is too broken, we open the file with a forgiving PDF reader and rebuild each readable page as an image.",
    },
    {
      question: "Will my text still be selectable after repair?",
      answer:
        "If the structure repair works, yes. If pages had to be recovered as images, the text can no longer be selected or searched — the result tells you which method was used.",
    },
    {
      question: "Can every PDF be repaired?",
      answer:
        "No. If a file is badly truncated or isn't really a PDF, there may be nothing left to recover. In that case we tell you, and the best option is to download or export the file again.",
    },
    {
      question: "Are my files uploaded to a server?",
      answer:
        "No. Your PDF is processed entirely in your browser and never leaves your device.",
    },
  ],
  related: ["/compress-pdf", "/unlock-pdf", "/merge-pdf"],
};
