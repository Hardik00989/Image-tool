import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "Protect PDF – ImageTools";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogImage("Protect PDF", "Password protect a PDF for free");
}
