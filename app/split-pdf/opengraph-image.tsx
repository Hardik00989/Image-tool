import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "Split PDF – ImageTools";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogImage("Split PDF", "Split PDF files online for free");
}
