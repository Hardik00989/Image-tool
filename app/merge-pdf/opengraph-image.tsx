import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "Merge PDF – ImageTools";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogImage("Merge PDF", "Merge PDF files online for free");
}
