import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "Image to PDF – ImageTools";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogImage("Image to PDF", "Combine JPG & PNG images into one PDF");
}
