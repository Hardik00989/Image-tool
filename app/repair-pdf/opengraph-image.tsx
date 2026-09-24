import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "Repair PDF – ImageTools";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogImage("Repair PDF", "Repair damaged or corrupted PDF files online for free");
}
