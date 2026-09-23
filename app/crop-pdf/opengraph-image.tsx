import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "Crop PDF – ImageTools";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogImage("Crop PDF", "Crop PDF pages online for free");
}
