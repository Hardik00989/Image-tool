import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "Redact PDF – ImageTools";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogImage("Redact PDF", "Redact PDF files online for free");
}
