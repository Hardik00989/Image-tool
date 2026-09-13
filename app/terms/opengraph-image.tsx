import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "Terms & Conditions – ImageTools";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogImage("Terms & Conditions", "The rules for using ImageTools");
}
