import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "PDF Forms – ImageTools";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogImage("PDF Forms", "Fill in PDF forms online for free");
}
