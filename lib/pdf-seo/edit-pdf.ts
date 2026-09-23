import type { ToolSeo } from "@/lib/tools-seo";

export const editPdfSeo: ToolSeo = {
  path: "/edit-pdf",
  name: "Edit PDF",
  title: "Edit PDF Online – Add Text & Images Free",
  description:
    "Edit PDF files online for free. Add text, images, shapes, highlights and whiteout to any page, then download the edited PDF — processed in your browser.",
  keywords: [
    "edit pdf",
    "pdf editor online",
    "add text to pdf",
    "add image to pdf",
    "highlight pdf",
    "whiteout pdf",
    "free pdf editor",
  ],
  howToTitle: "How to edit a PDF online",
  steps: [
    {
      title: "Upload your PDF",
      text: "Click Choose PDF or drag and drop your file into the upload box.",
    },
    {
      title: "Add your changes",
      text: "Pick a tool and click or drag on the page to add text, an image, a rectangle, a highlight or a whiteout box. Drag items to move them and use the corner handle to resize.",
    },
    {
      title: "Save and download",
      text: "Click Save edited PDF. The new file downloads straight away.",
    },
  ],
  faqTitle: "Edit PDF FAQ",
  faqs: [
    {
      question: "Is this PDF editor free?",
      answer:
        "Yes. Edit as many PDFs as you like for free, with no sign-up and no watermark.",
    },
    {
      question: "Can I change the existing text in my PDF?",
      answer:
        "Existing text can't be edited in place. To replace it, cover the old text with a Whiteout box and type the new wording on top with Add text.",
    },
    {
      question: "Which fonts and languages are supported?",
      answer:
        "Text is added in Helvetica (regular or bold) in any colour and size. Characters Helvetica can't show, such as Hindi or Chinese, are added as a sharp image of the text instead.",
    },
    {
      question: "Can I add a logo or signature image?",
      answer:
        "Yes. Use Add image to place a PNG or JPG on any page, then move and resize it. Transparent PNGs keep their transparency.",
    },
    {
      question: "Are my files uploaded to a server?",
      answer:
        "No. Your PDF is processed in your browser and never uploaded, so it never leaves your device.",
    },
  ],
  related: ["/sign-pdf", "/redact-pdf", "/add-watermark"],
};
