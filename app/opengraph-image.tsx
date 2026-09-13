import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "ImageTools – Free Online Image Tools";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogImage("Free Online Image Tools", "Resize, compress, convert and edit images");
}
