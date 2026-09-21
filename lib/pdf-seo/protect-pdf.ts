import type { ToolSeo } from "@/lib/tools-seo";

export const protectPdfSeo: ToolSeo = {
  path: "/protect-pdf",
  name: "Protect PDF",
  title: "Protect PDF – Add a Password to PDF Free",
  description:
    "Password protect a PDF for free. Encrypt it with AES-256 and choose if printing, copying or editing is allowed — processed in your browser, never uploaded.",
  keywords: [
    "protect pdf",
    "password protect pdf",
    "add password to pdf",
    "encrypt pdf",
    "lock pdf",
    "secure pdf with password",
  ],
  howToTitle: "How to password protect a PDF",
  steps: [
    {
      title: "Upload your PDF",
      text: "Click Choose PDF or drag and drop the file you want to protect.",
    },
    {
      title: "Choose a password",
      text: "Type a password twice, then choose whether people may print, copy text or edit the PDF.",
    },
    {
      title: "Download the protected PDF",
      text: "Click Protect PDF. The encrypted file downloads straight away and asks for the password when opened.",
    },
  ],
  faqTitle: "Protect PDF FAQ",
  faqs: [
    {
      question: "Is it free to password protect a PDF?",
      answer:
        "Yes. Protect as many PDFs as you like for free, with no sign-up and no watermark.",
    },
    {
      question: "How strong is the encryption?",
      answer:
        "Files are encrypted with AES-256 by default. If an older PDF reader can't open the file, you can switch on compatibility mode, which uses AES-128.",
    },
    {
      question: "Can I stop people from printing or copying my PDF?",
      answer:
        "Yes. Untick printing, copying or editing before you save. Most PDF readers respect these restrictions, but some software ignores them, so don't rely on them for highly sensitive documents.",
    },
    {
      question: "What happens if I forget the password?",
      answer:
        "The password can't be recovered or reset, and we never see it. Keep a copy of the original unprotected file or store the password somewhere safe.",
    },
    {
      question: "Are my files uploaded to a server?",
      answer:
        "No. Your PDF and password are processed entirely in your browser and never leave your device.",
    },
  ],
  related: ["/unlock-pdf", "/sign-pdf", "/redact-pdf"],
};
