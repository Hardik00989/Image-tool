import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "Add Watermark – ImageTools";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogImage("Add Watermark", "Add a text or image watermark to a PDF for free");
}
