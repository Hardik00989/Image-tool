import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "Sign PDF – ImageTools";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogImage("Sign PDF", "Sign a PDF online for free");
}
