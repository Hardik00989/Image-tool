import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "Edit PDF – ImageTools";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogImage("Edit PDF", "Edit PDF files online for free");
}
