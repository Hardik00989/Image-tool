import type { LucideIcon } from "lucide-react";
import {
  Combine,
  Crop,
  Droplets,
  Eraser,
  FileDiff,
  FileImage,
  FileInput,
  FileLock,
  Hash,
  ImageDown,
  LockOpen,
  Minimize2,
  RotateCw,
  Scaling,
  ScanText,
  Scissors,
  Signature,
  SquarePen,
  Code,
  Wrench,
  EyeOff,
  Image as ImageIcon,
} from "lucide-react";

export type ToolLink = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type ToolCategory = {
  id: string;
  title: string;
  // Tailwind classes for the icon tile
  color: string;
  tools: ToolLink[];
};

export const imageCategory: ToolCategory = {
  id: "image",
  title: "Image tools",
  color: "bg-blue-50 text-blue-600",
  tools: [
    { href: "/background-remover", label: "Background Remover", icon: Eraser },
    { href: "/image-resizer", label: "Image Resizer", icon: Scaling },
    { href: "/image-compressor", label: "Image Compressor", icon: ImageDown },
    { href: "/crop-image", label: "Image Editor", icon: ImageIcon },
  ],
};

// Grouped like the categories on popular PDF sites
export const pdfCategories: ToolCategory[] = [
  {
    id: "organize",
    title: "Organize PDF",
    color: "bg-orange-50 text-orange-600",
    tools: [
      { href: "/merge-pdf", label: "Merge PDF", icon: Combine },
      { href: "/split-pdf", label: "Split PDF", icon: Scissors },
      { href: "/rotate-pdf", label: "Rotate PDF", icon: RotateCw },
    ],
  },
  {
    id: "optimize",
    title: "Optimize PDF",
    color: "bg-green-50 text-green-600",
    tools: [
      { href: "/compress-pdf", label: "Compress PDF", icon: Minimize2 },
      { href: "/repair-pdf", label: "Repair PDF", icon: Wrench },
      { href: "/ocr-pdf", label: "OCR PDF", icon: ScanText },
    ],
  },
  {
    id: "convert",
    title: "Convert PDF",
    color: "bg-amber-50 text-amber-600",
    tools: [
      { href: "/image-to-pdf", label: "JPG to PDF", icon: FileImage },
      { href: "/html-to-pdf", label: "HTML to PDF", icon: Code },
      { href: "/pdf-to-jpg", label: "PDF to JPG", icon: ImageDown },
    ],
  },
  {
    id: "edit",
    title: "Edit PDF",
    color: "bg-purple-50 text-purple-600",
    tools: [
      { href: "/edit-pdf", label: "Edit PDF", icon: SquarePen },
      { href: "/add-page-numbers", label: "Add page numbers", icon: Hash },
      { href: "/add-watermark", label: "Add watermark", icon: Droplets },
      { href: "/crop-pdf", label: "Crop PDF", icon: Crop },
      { href: "/pdf-forms", label: "PDF Forms", icon: FileInput },
    ],
  },
  {
    id: "security",
    title: "PDF security",
    color: "bg-sky-50 text-sky-700",
    tools: [
      { href: "/unlock-pdf", label: "Unlock PDF", icon: LockOpen },
      { href: "/protect-pdf", label: "Protect PDF", icon: FileLock },
      { href: "/sign-pdf", label: "Sign PDF", icon: Signature },
      { href: "/redact-pdf", label: "Redact PDF", icon: EyeOff },
      { href: "/compare-pdf", label: "Compare PDF", icon: FileDiff },
    ],
  },
];

export const pdfTools = pdfCategories.flatMap((category) => category.tools);
