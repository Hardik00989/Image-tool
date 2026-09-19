import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "PDF to JPG – ImageTools";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogImage("PDF to JPG", "Convert PDF to JPG or PNG online for free");
}
