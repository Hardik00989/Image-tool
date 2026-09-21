import type { ToolSeo } from "@/lib/tools-seo";

export const signPdfSeo: ToolSeo = {
  path: "/sign-pdf",
  name: "Sign PDF",
  title: "Sign PDF Online – Add Signature to PDF Free",
  description:
    "Sign a PDF online for free. Draw, type or upload your signature, place it on any page and add the date — processed in your browser, never uploaded to a server.",
  keywords: [
    "sign pdf",
    "sign pdf online",
    "add signature to pdf",
    "electronic signature pdf",
    "esign pdf free",
    "draw signature on pdf",
  ],
  howToTitle: "How to sign a PDF",
  steps: [
    {
      title: "Upload your PDF",
      text: "Click Choose PDF or drag and drop the document you need to sign.",
    },
    {
      title: "Create your signature",
      text: "Draw it with your mouse or finger, type your name in a handwriting font, or upload a photo of your signature.",
    },
    {
      title: "Place it on the page",
      text: "Tap the page where the signature should go, then drag and resize it. You can sign several pages.",
    },
    {
      title: "Download the signed PDF",
      text: "Click Save signed PDF. Your signed file downloads straight away.",
    },
  ],
  faqTitle: "Sign PDF FAQ",
  faqs: [
    {
      question: "Is it free to sign a PDF?",
      answer:
        "Yes. Sign as many PDFs as you like for free, with no sign-up and no watermark.",
    },
    {
      question: "Is this a legally binding signature?",
      answer:
        "It adds an electronic signature image to the page, which is accepted for many everyday documents. It is not a certificate-based digital signature, so check the requirements if a document needs one.",
    },
    {
      question: "Can I sign on my phone?",
      answer:
        "Yes. Draw your signature with your finger, then tap the page to place it and drag it into position.",
    },
    {
      question: "Can I add my signature to more than one page?",
      answer:
        "Yes. Go to another page and tap to place the signature again. Each placement can be moved, resized or removed before you save.",
    },
    {
      question: "Are my files uploaded to a server?",
      answer:
        "No. Your PDF and signature are processed entirely in your browser and never leave your device.",
    },
  ],
  related: ["/pdf-forms", "/protect-pdf", "/edit-pdf"],
};
