// Helpers for drawing on PDF pages the way the reader sees them.
// A page can be rotated (/Rotate) and cropped (/CropBox), so the top left
// corner on screen is not always the top left of the page's own coordinates.

import { useEffect, useState } from "react";
import type { PDFPage } from "@cantoo/pdf-lib";
import { canvasToBlob, renderPageToCanvas, type PdfJsDocument } from "@/lib/pdf";

export type PageFrame = {
  // Visible area (CropBox limited to the MediaBox) in the page's own coordinates
  x: number;
  y: number;
  width: number;
  height: number;
  // Clockwise rotation applied by PDF viewers: 0, 90, 180 or 270
  rotation: number;
  // Size as the reader sees it (width and height swap at 90° and 270°)
  visibleWidth: number;
  visibleHeight: number;
};

type Box = { x: number; y: number; width: number; height: number };

// Boxes can be stored with their corners in any order
function normalizeBox({ x, y, width, height }: Box): Box {
  return {
    x: Math.min(x, x + width),
    y: Math.min(y, y + height),
    width: Math.abs(width),
    height: Math.abs(height),
  };
}

export function pageFrame(page: PDFPage): PageFrame {
  const media = normalizeBox(page.getMediaBox());
  const crop = normalizeBox(page.getCropBox());

  // Viewers only show the part of the CropBox that lies inside the MediaBox
  const left = Math.max(media.x, crop.x);
  const bottom = Math.max(media.y, crop.y);
  const right = Math.min(media.x + media.width, crop.x + crop.width);
  const top = Math.min(media.y + media.height, crop.y + crop.height);

  const box =
    right - left > 1 && top - bottom > 1
      ? { x: left, y: bottom, width: right - left, height: top - bottom }
      : media;

  const rotation = (((Math.round(page.getRotation().angle / 90) * 90) % 360) + 360) % 360;
  const sideways = rotation === 90 || rotation === 270;

  return {
    ...box,
    rotation,
    visibleWidth: sideways ? box.height : box.width,
    visibleHeight: sideways ? box.width : box.height,
  };
}

// Converts a point on the visible page (origin at the bottom left corner the
// reader sees, y pointing up) to the page's own coordinates
export function toPageSpace(frame: PageFrame, vx: number, vy: number) {
  const { x, y, width, height, rotation } = frame;

  switch (rotation) {
    case 90:
      return { x: x + width - vy, y: y + vx };
    case 180:
      return { x: x + width - vx, y: y + height - vy };
    case 270:
      return { x: x + vy, y: y + height - vx };
    default:
      return { x: x + vx, y: y + vy };
  }
}

// Wraps the page's existing drawing commands in a saved graphics state, so
// a transform left open by the original content can't shift what we add
export function isolateExistingContent(page: PDFPage) {
  page.translateContent(0, 0);
  page.resetPosition();
}

// Helvetica font metrics (per 1pt of font size)
export const CAP_HEIGHT = 0.718;
export const DESCENT = 0.207;

// Text width in points, measured in the browser with a Helvetica-like font.
// Only used for the on-screen preview; the saved PDF uses pdf-lib's metrics.
let measureContext: CanvasRenderingContext2D | null = null;

export function measureText(text: string, size: number, bold = false) {
  if (!measureContext) {
    measureContext = document.createElement("canvas").getContext("2d");
  }

  if (!measureContext) {
    return text.length * size * 0.55;
  }

  measureContext.font = `${bold ? "bold " : ""}${size}px Helvetica, Arial, sans-serif`;

  return measureContext.measureText(text).width;
}

export type PagePreviewImage = {
  url: string;
  // Visible page size in points (after rotation and cropping)
  width: number;
  height: number;
};

// Renders one page (1-based) as an image about `targetWidth` pixels wide
export function usePagePreview(
  pdf: PdfJsDocument | null,
  pageNumber: number,
  targetWidth: number
) {
  const [state, setState] = useState<
    (PagePreviewImage & { pdf: PdfJsDocument; pageNumber: number }) | null
  >(null);

  useEffect(() => {
    if (!pdf || pageNumber < 1 || pageNumber > pdf.numPages) return;

    let cancelled = false;
    let url: string | null = null;

    (async () => {
      try {
        const page = await pdf.getPage(pageNumber);
        const { width, height } = page.getViewport({ scale: 1 });

        // Keep the canvas well below browser limits
        const scale = Math.min(targetWidth / width, 8000 / Math.max(width, height));
        const canvas = await renderPageToCanvas(pdf, pageNumber, scale);
        const blob = await canvasToBlob(canvas, "image/jpeg", 0.85);

        if (cancelled) return;

        url = URL.createObjectURL(blob);
        setState({ pdf, pageNumber, url, width, height });
      } catch (error) {
        if (!cancelled) console.error(error);
      }
    })();

    return () => {
      cancelled = true;

      if (url) URL.revokeObjectURL(url);
    };
  }, [pdf, pageNumber, targetWidth]);

  // Ignore an image that belongs to another page or file
  return state && state.pdf === pdf && state.pageNumber === pageNumber ? state : null;
}

// "#2563eb" -> { r: 0.15, g: 0.39, b: 0.92 }
export function hexToRgb(hex: string) {
  const value = parseInt(hex.replace("#", ""), 16);

  return {
    r: ((value >> 16) & 255) / 255,
    g: ((value >> 8) & 255) / 255,
    b: (value & 255) / 255,
  };
}
