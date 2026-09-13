import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "Image Resizer – ImageTools";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogImage("Image Resizer", "Resize images online in seconds");
}
