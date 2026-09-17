// SEO copy for every tool page: metadata, how-to steps, FAQs and related tools.
// Used by each tool's layout.tsx, the ToolContent section and the sitemap.
// Image tools are defined below; each PDF tool has its own file in lib/pdf-seo/.

import { mergePdfSeo } from "@/lib/pdf-seo/merge-pdf";
import { splitPdfSeo } from "@/lib/pdf-seo/split-pdf";

export type ToolSeo = {
  path: string;
  name: string;
  // Page <title> (" | ImageTools" is added automatically)
  title: string;
  description: string;
  keywords: string[];
  howToTitle: string;
  steps: { title: string; text: string }[];
  faqTitle: string;
  faqs: { question: string; answer: string }[];
  related: string[];
};

const privacyFaq = {
  question: "Are my images uploaded to a server?",
  answer:
    "No. Your images are processed entirely in your browser and never leave your device, so nobody else can see them.",
};

const imageToolsSeo: Record<string, ToolSeo> = {
  "/image-resizer": {
    path: "/image-resizer",
    name: "Image Resizer",
    title: "Resize Image Online – Change Image Size Free",
    description:
      "Resize images online for free. Change the width and height of JPG, PNG or WebP images in pixels, keep the aspect ratio and choose a format — no upload needed.",
    keywords: [
      "resize image",
      "image resizer",
      "resize image online",
      "change image size",
      "resize photo",
      "resize image in pixels",
      "reduce image dimensions",
      "convert image format",
      "jpg to png",
      "png to jpg",
    ],
    howToTitle: "How to resize an image online",
    steps: [
      {
        title: "Upload your image",
        text: "Click Choose Image and select a JPG, PNG or WebP file from your device.",
      },
      {
        title: "Enter the new size",
        text: "Type a new width or height in pixels. Keep the aspect ratio lock on to avoid stretching the image.",
      },
      {
        title: "Pick format and quality",
        text: "Save as WebP, JPG or PNG, and lower the quality slider for a smaller file.",
      },
      {
        title: "Download",
        text: "Check the preview and new file size, then download your resized image.",
      },
    ],
    faqTitle: "Image resizer FAQ",
    faqs: [
      {
        question: "Is this image resizer free?",
        answer:
          "Yes. You can resize as many images as you like for free, with no sign-up and no watermark.",
      },
      {
        question: "Will resizing reduce image quality?",
        answer:
          "Making an image smaller keeps it sharp. Making it much larger than the original can look blurry, because no new detail can be added.",
      },
      {
        question: "How do I resize without stretching the image?",
        answer:
          "Keep the aspect ratio option turned on. When you change the width, the height updates automatically (and the other way round).",
      },
      {
        question: "Which formats can I save as?",
        answer:
          "WebP, JPG and PNG. WebP usually gives the smallest file, JPG works everywhere, and PNG keeps transparency.",
      },
      {
        question: "Can I convert JPG to PNG or PNG to JPG?",
        answer:
          "Yes. Upload your image, keep the original width and height, and choose PNG, JPG or WebP as the output format. Transparent areas become white when saving as JPG.",
      },
      {
        question: "What's the difference between resizing and compressing?",
        answer:
          "Resizing changes the width and height in pixels. Compressing keeps the same dimensions and makes the file smaller. To only reduce the file size, use the Image Compressor.",
      },
      privacyFaq,
    ],
    related: ["/image-compressor", "/crop-image", "/image-to-pdf"],
  },

  "/image-compressor": {
    path: "/image-compressor",
    name: "Image Compressor",
    title: "Compress Images Online – Reduce Image File Size",
    description:
      "Compress JPG, PNG and WebP images online for free. Reduce image file size with an adjustable quality slider while keeping good quality — no upload needed.",
    keywords: [
      "compress image",
      "image compressor",
      "reduce image size",
      "compress jpg",
      "compress png",
      "reduce photo file size",
      "image size reducer",
    ],
    howToTitle: "How to compress an image",
    steps: [
      {
        title: "Upload your image",
        text: "Click Choose Image and select the JPG, PNG or WebP file you want to make smaller.",
      },
      {
        title: "Choose the output format",
        text: "WebP usually gives the smallest file. JPG is best for compatibility with older apps.",
      },
      {
        title: "Adjust the quality",
        text: "Move the quality slider — around 70–80% keeps photos looking good at a much smaller size.",
      },
      {
        title: "Compress and download",
        text: "Click compress. The smaller image downloads straight away and you can see how much space you saved.",
      },
    ],
    faqTitle: "Image compressor FAQ",
    faqs: [
      {
        question: "Is this image compressor free?",
        answer:
          "Yes. It's completely free with no sign-up, no watermark and no limit on how many images you compress.",
      },
      {
        question: "How much smaller will my image be?",
        answer:
          "It depends on the image and the settings. Photos saved as WebP or JPG at 70–80% quality often shrink by half or more.",
      },
      {
        question: "Which format gives the smallest file?",
        answer:
          "WebP is usually the smallest, followed by JPG. PNG is lossless, so it may not get much smaller.",
      },
      {
        question: "Does compressing change the image dimensions?",
        answer:
          "No. The width and height stay the same. To make the image smaller in pixels, use the Image Resizer.",
      },
      privacyFaq,
    ],
    related: ["/image-resizer", "/image-to-pdf", "/crop-image"],
  },

  "/image-to-pdf": {
    path: "/image-to-pdf",
    name: "Image to PDF",
    title: "Image to PDF Converter – JPG & PNG to PDF Free",
    description:
      "Convert JPG, PNG and WebP images to PDF online for free. Combine multiple images into one PDF and set a maximum file size — processed in your browser.",
    keywords: [
      "image to pdf",
      "jpg to pdf",
      "png to pdf",
      "convert image to pdf",
      "photo to pdf",
      "combine images into pdf",
      "image to pdf under 100kb",
    ],
    howToTitle: "How to convert images to PDF",
    steps: [
      {
        title: "Add your images",
        text: "Click Choose Images and select one or more JPG, PNG or WebP files.",
      },
      {
        title: "Check the order",
        text: "Each image becomes one A4 page in the order shown. Remove any image you don't need.",
      },
      {
        title: "Set a maximum size",
        text: "Enter a size in KB or pick a preset such as 100 KB or 1 MB — useful for upload forms with a limit.",
      },
      {
        title: "Create and download",
        text: "Click Create PDF. Your PDF downloads automatically, and you can download it again at any time.",
      },
    ],
    faqTitle: "Image to PDF FAQ",
    faqs: [
      {
        question: "Is this image to PDF converter free?",
        answer:
          "Yes. It's completely free, with no account, no watermark and no limit on how many PDFs you create.",
      },
      {
        question: "Can I combine multiple images into one PDF?",
        answer:
          "Yes. Select as many images as you like — each one is placed on its own page of a single PDF.",
      },
      {
        question: "How does the maximum PDF size work?",
        answer:
          "The tool tries quality levels from high to low and keeps the first PDF that fits your limit. If it can't fit without becoming unreadable, you get the smallest readable version. The minimum is 50 KB.",
      },
      {
        question: "What page size does the PDF use?",
        answer:
          "A4 portrait with a 10 mm margin. Each image is scaled to fit the page and centred, keeping its proportions.",
      },
      privacyFaq,
    ],
    related: ["/image-compressor", "/image-resizer", "/crop-image"],
  },

  "/crop-image": {
    path: "/crop-image",
    name: "Image Editor",
    title: "Crop Image Online – Crop, Rotate & Flip Free",
    description:
      "Crop images online for free. Select any area, rotate left or right, flip horizontally or vertically, and download as PNG or JPG — no sign-up, no upload.",
    keywords: [
      "crop image",
      "crop image online",
      "image cropper",
      "rotate image",
      "flip image",
      "crop photo",
      "online image editor",
    ],
    howToTitle: "How to crop an image online",
    steps: [
      {
        title: "Upload your image",
        text: "Click Choose Image and select a JPG, PNG or WebP file.",
      },
      {
        title: "Select the crop area",
        text: "Drag the crop box and its corners to cover the part of the image you want to keep.",
      },
      {
        title: "Rotate or flip",
        text: "Rotate the image left or right by 90°, or flip it horizontally or vertically.",
      },
      {
        title: "Download",
        text: "Choose PNG or JPG and click Apply & Download to save the edited image.",
      },
    ],
    faqTitle: "Image cropper FAQ",
    faqs: [
      {
        question: "Is this image cropper free?",
        answer:
          "Yes. Crop, rotate and flip as many images as you like for free, with no sign-up and no watermark.",
      },
      {
        question: "Does cropping reduce image quality?",
        answer:
          "No. The area you keep is saved at its original resolution. Choose PNG for no quality loss at all.",
      },
      {
        question: "Can I crop to any shape or size?",
        answer:
          "The crop box starts as a square, but you can drag its edges to any rectangular size.",
      },
      {
        question: "Should I download as PNG or JPG?",
        answer:
          "PNG keeps full quality and transparency. JPG gives a smaller file and is best for photos.",
      },
      privacyFaq,
    ],
    related: ["/image-resizer", "/background-remover", "/image-compressor"],
  },

  "/background-remover": {
    path: "/background-remover",
    name: "Background Remover",
    title: "Remove Background from Image Free Online",
    description:
      "Remove the background from any image automatically and for free. Get a transparent PNG or add a white, black, colour or gradient background in seconds.",
    keywords: [
      "remove background",
      "background remover",
      "remove background from image",
      "transparent background",
      "remove bg",
      "white background photo",
      "background eraser",
    ],
    howToTitle: "How to remove the background from an image",
    steps: [
      {
        title: "Upload your photo",
        text: "Click Choose Image and select a JPG, PNG or WebP photo with a clear subject.",
      },
      {
        title: "Remove the background",
        text: "Click remove background. The AI finds the subject and cuts it out automatically.",
      },
      {
        title: "Choose a new background",
        text: "Keep it transparent or pick white, black, a gradient or any custom colour.",
      },
      {
        title: "Download",
        text: "Download the result as a high-quality PNG.",
      },
    ],
    faqTitle: "Background remover FAQ",
    faqs: [
      {
        question: "Is this background remover free?",
        answer:
          "Yes. Remove backgrounds from as many images as you like for free, with no sign-up and no watermark.",
      },
      {
        question: "Are my images uploaded to a server?",
        answer:
          "No. The AI model runs in your browser, so your photo never leaves your device. The model itself is downloaded the first time you use the tool.",
      },
      {
        question: "Why is the first removal slower?",
        answer:
          "The first time, your browser downloads the AI model. After that it's cached, so later removals are much faster.",
      },
      {
        question: "Which photos work best?",
        answer:
          "Photos with a clear main subject — people, products, animals or objects — that stands out from the background.",
      },
      {
        question: "Can I get a transparent PNG?",
        answer:
          "Yes. Leave the background set to transparent and download — the result is a PNG with a transparent background.",
      },
    ],
    related: ["/crop-image", "/image-resizer", "/image-compressor"],
  },
};

const pdfToolsSeo: ToolSeo[] = [
  mergePdfSeo,
  splitPdfSeo,
];

export const toolsSeo: Record<string, ToolSeo> = {
  ...imageToolsSeo,
  ...Object.fromEntries(pdfToolsSeo.map((tool) => [tool.path, tool])),
};
