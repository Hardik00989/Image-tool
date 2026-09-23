import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "Add Page Numbers – ImageTools";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogImage("Add Page Numbers", "Add page numbers to a PDF online for free");
}
