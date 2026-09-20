import type { ToolSeo } from "@/lib/tools-seo";

export const unlockPdfSeo: ToolSeo = {
  path: "/unlock-pdf",
  name: "Unlock PDF",
  title: "Unlock PDF – Remove PDF Password Online Free",
  description:
    "Unlock a PDF online for free. Enter the password you know once and save a copy without the password or restrictions — processed in your browser, never uploaded.",
  keywords: [
    "unlock pdf",
    "remove pdf password",
    "pdf password remover",
    "decrypt pdf",
    "remove password from pdf",
    "remove pdf restrictions",
  ],
  howToTitle: "How to remove a password from a PDF",
  steps: [
    {
      title: "Upload the protected PDF",
      text: "Click Choose PDF or drag and drop the password-protected file.",
    },
    {
      title: "Enter the password",
      text: "Type the password you use to open the file. PDFs that only have printing or copying restrictions unlock without one.",
    },
    {
      title: "Download the unlocked PDF",
      text: "Click Unlock PDF. A copy without the password downloads straight away.",
    },
  ],
  faqTitle: "Unlock PDF FAQ",
  faqs: [
    {
      question: "Is it free to unlock a PDF?",
      answer:
        "Yes. Unlock as many PDFs as you like for free, with no sign-up and no watermark.",
    },
    {
      question: "Can this tool unlock a PDF if I don't know the password?",
      answer:
        "No. It can't crack or guess passwords. You need the password that opens the file. Only unlock PDFs you own or have permission to unlock.",
    },
    {
      question: "Can I remove printing and copying restrictions?",
      answer:
        "Yes. If a PDF opens without a password but blocks printing, copying or editing, the tool removes those restrictions without asking for a password.",
    },
    {
      question: "Does unlocking change the content of my PDF?",
      answer:
        "No. Only the encryption is removed. Pages, text, images and form fields stay the same.",
    },
    {
      question: "Are my files uploaded to a server?",
      answer:
        "No. Your PDF and password are processed entirely in your browser and never leave your device.",
    },
  ],
  related: ["/protect-pdf", "/compress-pdf", "/merge-pdf"],
};
