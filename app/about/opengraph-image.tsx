import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "About ImageTools – ImageTools";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogImage("About ImageTools", "Free, simple and private image tools");
}
