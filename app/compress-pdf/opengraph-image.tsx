import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "Compress PDF – ImageTools";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogImage("Compress PDF", "Compress PDF files online for free");
}
