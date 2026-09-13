import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "Privacy Policy – ImageTools";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogImage("Privacy Policy", "Your images stay on your device");
}
