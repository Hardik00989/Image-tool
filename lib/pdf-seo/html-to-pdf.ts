import type { ToolSeo } from "@/lib/tools-seo";

export const htmlToPdfSeo: ToolSeo = {
  path: "/html-to-pdf",
  name: "HTML to PDF",
  title: "HTML to PDF Online – Convert HTML Code Free",
  description:
    "Convert HTML to PDF online for free. Paste HTML code or upload an .html file, preview it, pick A4 or Letter and download a PDF — processed in your browser.",
  keywords: [
    "html to pdf",
    "convert html to pdf",
    "html code to pdf",
    "html file to pdf",
    "html to pdf online free",
  ],
  howToTitle: "How to convert HTML to PDF",
  steps: [
    {
      title: "Add your HTML",
      text: "Paste HTML code into the editor, upload an .html file, or click Insert example to try it out.",
    },
    {
      title: "Check the preview",
      text: "The preview shows how your HTML looks. Choose the page size, orientation and margin.",
    },
    {
      title: "Convert and download",
      text: "Click Convert to PDF. Your PDF downloads straight away.",
    },
  ],
  faqTitle: "HTML to PDF FAQ",
  faqs: [
    {
      question: "Is this HTML to PDF converter free?",
      answer:
        "Yes. Convert as much HTML to PDF as you like for free, with no sign-up and no watermark.",
    },
    {
      question: "Can I convert a website by entering its URL?",
      answer:
        "No. Browsers can't load other websites for security reasons, so paste the page's HTML code or upload a saved .html file instead.",
    },
    {
      question: "Can I select the text in the PDF?",
      answer:
        "No. The HTML is rendered as images on the PDF pages, so the text can't be selected or searched.",
    },
    {
      question: "Does JavaScript in my HTML run?",
      answer:
        "No. Scripts are blocked for safety, so content built with JavaScript won't appear. HTML and CSS are rendered normally.",
    },
    {
      question: "Is my HTML uploaded to a server?",
      answer:
        "No. Your HTML is converted entirely in your browser and never uploaded, so it never leaves your device.",
    },
  ],
  related: ["/image-to-pdf", "/pdf-to-jpg", "/merge-pdf"],
};
