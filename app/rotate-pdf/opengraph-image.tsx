import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "Rotate PDF – ImageTools";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogImage("Rotate PDF", "Rotate PDF pages online for free");
}
