// Shared helpers for the PDF tools. Everything runs in the browser.
// The PDF libraries are loaded on demand so they only download on PDF pages.

import type * as PdfJs from "pdfjs-dist";

export type PdfJsDocument = PdfJs.PDFDocumentProxy;

// pdf-lib (maintained fork with encryption support): create and modify PDFs
export function loadPdfLib() {
  return import("@cantoo/pdf-lib");
}

// PDF.js: render pages and read text
let pdfjsPromise: Promise<typeof PdfJs> | null = null;

export function loadPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();

      return pdfjs;
    });
  }

  return pdfjsPromise;
}

// Opens a PDF with PDF.js. A copy of the bytes is passed because
// PDF.js takes ownership of (detaches) the buffer it is given.
export async function openPdfJs(
  bytes: Uint8Array,
  password?: string
): Promise<PdfJsDocument> {
  const pdfjs = await loadPdfJs();

  return pdfjs.getDocument({
    data: bytes.slice(),
    password,
  }).promise;
}

// Renders one page (1-based) to a canvas at the given scale (1 = 72 DPI)
export async function renderPageToCanvas(
  pdf: PdfJsDocument,
  pageNumber: number,
  scale: number
): Promise<HTMLCanvasElement> {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not create canvas.");
  }

  // White background so transparent areas don't turn black in JPG
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvas, viewport }).promise;

  page.cleanup();

  return canvas;
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: "image/jpeg" | "image/png" = "image/jpeg",
  quality = 0.92
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not create image."))),
      type,
      quality
    );
  });
}

export async function readFileBytes(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

export function isPdfFile(file: File) {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

// "report.pdf" -> "report"
export function baseName(fileName: string) {
  return fileName.replace(/\.pdf$/i, "") || "document";
}

export function pdfBlob(bytes: Uint8Array) {
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;

  document.body.appendChild(link);
  link.click();
  link.remove();

  // Give the browser time to start the download before releasing the URL
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// Parses "1-3, 5, 8-" into sorted, unique 0-based page indexes.
// Throws with a readable message if the input is invalid.
export function parsePageRanges(input: string, pageCount: number): number[] {
  const pages = new Set<number>();
  const parts = input.split(",").map((part) => part.trim()).filter(Boolean);

  if (parts.length === 0) {
    throw new Error("Enter at least one page number.");
  }

  for (const part of parts) {
    const match = part.match(/^(\d+)?\s*(-)?\s*(\d+)?$/);

    if (!match || (!match[1] && !match[3])) {
      throw new Error(`"${part}" isn't a valid page or range.`);
    }

    const start = match[1] ? Number(match[1]) : 1;
    const end = match[2] ? (match[3] ? Number(match[3]) : pageCount) : start;

    if (start < 1 || end > pageCount || start > end) {
      throw new Error(`"${part}" is outside pages 1–${pageCount}.`);
    }

    for (let page = start; page <= end; page++) {
      pages.add(page - 1);
    }
  }

  return [...pages].sort((a, b) => a - b);
}

// Friendly message for errors thrown while opening a PDF
export function pdfErrorMessage(error: unknown) {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);

  if (/password|encrypt/i.test(text)) {
    return "This PDF is password-protected. Unlock it first with the Unlock PDF tool.";
  }

  return "This file couldn't be read as a PDF. It may be damaged — try the Repair PDF tool.";
}
