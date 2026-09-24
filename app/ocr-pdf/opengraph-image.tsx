import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "OCR PDF – ImageTools";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogImage("OCR PDF", "Free online OCR for PDFs and images");
}
