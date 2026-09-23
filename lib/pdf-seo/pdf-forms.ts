import type { ToolSeo } from "@/lib/tools-seo";

export const pdfFormsSeo: ToolSeo = {
  path: "/pdf-forms",
  name: "PDF Forms",
  title: "Fill PDF Forms Online – Free PDF Form Filler",
  description:
    "Fill in PDF forms online for free. Type in text fields, tick checkboxes, choose options, flatten the form if you like and download it — all in your browser.",
  keywords: [
    "fill pdf form",
    "fill pdf online",
    "pdf form filler",
    "fillable pdf",
    "flatten pdf form",
    "complete pdf form online",
  ],
  howToTitle: "How to fill a PDF form",
  steps: [
    {
      title: "Upload your form",
      text: "Click Choose PDF or drag and drop a fillable PDF form into the upload box.",
    },
    {
      title: "Fill in the fields",
      text: "Every form field is listed with its current value. Type your answers, tick boxes and pick options.",
    },
    {
      title: "Save the filled PDF",
      text: "Optionally flatten the form so the answers can't be changed, then click Save filled PDF to download it.",
    },
  ],
  faqTitle: "Fill PDF Forms FAQ",
  faqs: [
    {
      question: "Is this PDF form filler free?",
      answer:
        "Yes. Fill in as many PDF forms as you like for free, with no sign-up and no watermark.",
    },
    {
      question: "Which form fields are supported?",
      answer:
        "Text fields (including multi-line boxes), checkboxes, radio buttons, dropdowns and option lists. Signature fields and buttons are not filled here.",
    },
    {
      question: "What does flattening a form do?",
      answer:
        "Flattening turns your answers into normal page content and removes the fields, so the form can no longer be edited and looks the same in every viewer.",
    },
    {
      question: "My PDF has no fillable fields. What can I do?",
      answer:
        "Scanned or flat forms only have printed lines. Use the Edit PDF tool to type text anywhere on the page instead.",
    },
    {
      question: "Are my files uploaded to a server?",
      answer:
        "No. Your form and your answers are processed in your browser and never uploaded, so they stay on your device.",
    },
  ],
  related: ["/edit-pdf", "/sign-pdf", "/protect-pdf"],
};
