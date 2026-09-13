import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "Crop, Rotate & Flip – ImageTools";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogImage("Crop, Rotate & Flip", "Edit images online in seconds");
}
