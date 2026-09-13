import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "Background Remover – ImageTools";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogImage("Background Remover", "Remove image backgrounds automatically");
}
