import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "Contact Us – ImageTools";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogImage("Contact Us", "Questions, feedback or ideas? Get in touch");
}
