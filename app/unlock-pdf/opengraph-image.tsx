import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "Unlock PDF – ImageTools";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogImage("Unlock PDF", "Unlock a PDF online for free");
}
