import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "HTML to PDF – ImageTools";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogImage("HTML to PDF", "Convert HTML to PDF online for free");
}
