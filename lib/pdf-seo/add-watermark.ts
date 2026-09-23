import type { ToolSeo } from "@/lib/tools-seo";

export const addWatermarkSeo: ToolSeo = {
  path: "/add-watermark",
  name: "Add Watermark",
  title: "Add Watermark to PDF Online – Free & Private",
  description:
    "Add a text or image watermark to a PDF for free. Set the size, opacity and angle, tile it across the page and preview it live — processed in your browser.",
  keywords: [
    "add watermark to pdf",
    "watermark pdf",
    "pdf watermark online",
    "add logo to pdf",
    "confidential watermark pdf",
    "draft watermark pdf",
  ],
  howToTitle: "How to watermark a PDF",
  steps: [
    {
      title: "Upload your PDF",
      text: "Click Choose PDF or drag and drop your file into the upload box.",
    },
    {
      title: "Create the watermark",
      text: "Type text such as CONFIDENTIAL or upload a PNG or JPG logo, then adjust size, colour, opacity and rotation.",
    },
    {
      title: "Choose the pages",
      text: "Watermark all pages or only the pages you list, like 1-3, 5. The preview shows how it will look.",
    },
    {
      title: "Download",
      text: "Click Add watermark and the watermarked PDF downloads straight away.",
    },
  ],
  faqTitle: "PDF Watermark FAQ",
  faqs: [
    {
      question: "Is adding a watermark free?",
      answer:
        "Yes. Watermark as many PDFs as you like for free, with no sign-up and no extra branding added.",
    },
    {
      question: "Can I use my logo as a watermark?",
      answer:
        "Yes. Switch to Image watermark and upload a PNG or JPG. A PNG with a transparent background looks best. You can set its size and opacity.",
    },
    {
      question: "Can the watermark repeat across the whole page?",
      answer:
        "Yes. Choose \"Tiled across the page\" to repeat the text in rows at any angle, or keep a single watermark in the centre.",
    },
    {
      question: "Can a watermark be removed?",
      answer:
        "The watermark is added to the page content, so it shows in every viewer and printout. Someone with a PDF editor could still remove it, so it deters copying rather than locking the file.",
    },
    {
      question: "Are my files uploaded to a server?",
      answer:
        "No. Your PDF and image are processed in your browser and never uploaded, so they stay on your device.",
    },
  ],
  related: ["/add-page-numbers", "/protect-pdf", "/sign-pdf"],
};
