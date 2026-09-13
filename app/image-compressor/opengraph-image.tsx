import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "Image Compressor – ImageTools";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogImage("Image Compressor", "Reduce image file size online");
}
