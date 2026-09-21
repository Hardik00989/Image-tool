import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "Compare PDF – ImageTools";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogImage("Compare PDF", "Compare two PDF files online for free");
}
