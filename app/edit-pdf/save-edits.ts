import { loadPdfLib, type PdfJsDocument } from "@/lib/pdf";

// Everything the user adds on top of a page. Positions and sizes are in
// PDF points on the page as it is displayed (rotation applied, top-left origin).
export type TextElement = {
  id: string;
  page: number;
  kind: "text";
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
  bold: boolean;
};

export type ImageElement = {
  id: string;
  page: number;
  kind: "image";
  x: number;
  y: number;
  w: number;
  h: number;
  src: string;
  bytes: Uint8Array;
  format: "png" | "jpg";
};

export type ShapeElement = {
  id: string;
  page: number;
  kind: "rect" | "highlight" | "whiteout";
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
};

export type EditElement = TextElement | ImageElement | ShapeElement;

export const LINE_HEIGHT = 1.2;

// Distance from the top of a text line to its baseline, as a share of the
// font size (matches CSS line-height 1.2 with Helvetica/Arial metrics)
export const BASELINE = 0.95;

export const FONT_FAMILY = "Helvetica, Arial, sans-serif";

export const HIGHLIGHT_COLOR = "#fde047";

export function textLines(text: string) {
  return text.split(/\r?\n/);
}

// Maps a display point back to PDF user space (inverse of the PDF.js matrix)
function toUserSpace(transform: number[], x: number, y: number) {
  const [a, b, c, d, e, f] = transform;
  const det = a * d - b * c;

  return {
    x: (d * (x - e) - c * (y - f)) / det,
    y: (-b * (x - e) + a * (y - f)) / det,
  };
}

// Angle (degrees) of the display's x axis in user space, so text and images
// drawn with this rotation look upright on rotated pages
function displayAngle(transform: number[]) {
  const origin = toUserSpace(transform, 0, 0);
  const unit = toUserSpace(transform, 1, 0);

  return Math.round((Math.atan2(unit.y - origin.y, unit.x - origin.x) * 180) / Math.PI);
}

// Axis-aligned rectangle in user space covering a display rectangle
function userRect(transform: number[], x: number, y: number, w: number, h: number) {
  const corners = [
    toUserSpace(transform, x, y),
    toUserSpace(transform, x + w, y),
    toUserSpace(transform, x, y + h),
    toUserSpace(transform, x + w, y + h),
  ];

  const xs = corners.map((point) => point.x);
  const ys = corners.map((point) => point.y);

  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
}

export function hexToRgb(hex: string) {
  const value = Number.parseInt(hex.replace("#", ""), 16) || 0;

  return {
    r: ((value >> 16) & 255) / 255,
    g: ((value >> 8) & 255) / 255,
    b: (value & 255) / 255,
  };
}

// Draws text with the browser's fonts into a PNG. Used for characters the
// built-in PDF fonts can't encode (e.g. Hindi, Chinese, emoji).
async function textToPng(element: TextElement) {
  const pixelsPerPoint = 4;
  const font = `${element.bold ? "bold " : ""}${element.fontSize * pixelsPerPoint}px ${FONT_FAMILY}`;
  const lines = textLines(element.text);

  const measure = document.createElement("canvas").getContext("2d");

  if (!measure) throw new Error("Could not create canvas.");

  measure.font = font;

  const width = Math.max(1, ...lines.map((line) => measure.measureText(line).width));
  const height = lines.length * LINE_HEIGHT * element.fontSize * pixelsPerPoint;

  const canvas = document.createElement("canvas");
  canvas.width = Math.min(8000, Math.ceil(width) + 4);
  canvas.height = Math.min(8000, Math.ceil(height));

  const context = canvas.getContext("2d");

  if (!context) throw new Error("Could not create canvas.");

  context.font = font;
  context.fillStyle = element.color;
  context.textBaseline = "alphabetic";

  lines.forEach((line, index) => {
    context.fillText(
      line,
      0,
      (index * LINE_HEIGHT + BASELINE) * element.fontSize * pixelsPerPoint
    );
  });

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));

  if (!blob) throw new Error("Could not create image.");

  return {
    bytes: new Uint8Array(await blob.arrayBuffer()),
    width: canvas.width / pixelsPerPoint,
    height: canvas.height / pixelsPerPoint,
  };
}

// Writes all elements into a copy of the PDF and returns the new file
export async function saveEdits(
  bytes: Uint8Array,
  pdfjs: PdfJsDocument,
  elements: EditElement[]
) {
  const { PDFDocument, StandardFonts, BlendMode, rgb, degrees } = await loadPdfLib();

  const doc = await PDFDocument.load(bytes);
  const pages = doc.getPages();

  const hasText = elements.some((element) => element.kind === "text");
  const regular = hasText ? await doc.embedFont(StandardFonts.Helvetica) : null;
  const bold = hasText ? await doc.embedFont(StandardFonts.HelveticaBold) : null;

  const pageIndexes = [...new Set(elements.map((element) => element.page))].sort((a, b) => a - b);

  for (const pageIndex of pageIndexes) {
    const page = pages[pageIndex];

    if (!page) continue;

    // Same display matrix as the editor, so rotation and CropBox offsets match
    const transform = (await pdfjs.getPage(pageIndex + 1)).getViewport({ scale: 1 }).transform;
    const angle = degrees(displayAngle(transform));

    // Draw in the order they were added, so later elements sit on top
    for (const element of elements.filter((item) => item.page === pageIndex)) {
      if (element.kind === "text") {
        const font = element.bold ? bold! : regular!;
        const lines = textLines(element.text);
        const { r, g, b } = hexToRgb(element.color);

        // The built-in fonts only cover Latin characters (they would turn
        // anything else into "?"), so check every character first
        const supported = new Set(font.getCharacterSet());
        const encodable = [...element.text.replace(/\r?\n/g, "")].every((character) =>
          supported.has(character.codePointAt(0)!)
        );

        if (encodable) {
          lines.forEach((line, index) => {
            if (!line) return;

            const origin = toUserSpace(
              transform,
              element.x,
              element.y + (index * LINE_HEIGHT + BASELINE) * element.fontSize
            );

            page.drawText(line, {
              x: origin.x,
              y: origin.y,
              size: element.fontSize,
              font,
              color: rgb(r, g, b),
              rotate: angle,
            });
          });
        } else {
          const png = await textToPng(element);
          const image = await doc.embedPng(png.bytes);
          const origin = toUserSpace(transform, element.x, element.y + png.height);

          page.drawImage(image, {
            x: origin.x,
            y: origin.y,
            width: png.width,
            height: png.height,
            rotate: angle,
          });
        }
      }

      if (element.kind === "image") {
        const image =
          element.format === "png"
            ? await doc.embedPng(element.bytes)
            : await doc.embedJpg(element.bytes);

        // Images are placed from their bottom-left corner
        const origin = toUserSpace(transform, element.x, element.y + element.h);

        page.drawImage(image, {
          x: origin.x,
          y: origin.y,
          width: element.w,
          height: element.h,
          rotate: angle,
        });
      }

      if (element.kind === "rect" || element.kind === "highlight" || element.kind === "whiteout") {
        const box = userRect(transform, element.x, element.y, element.w, element.h);

        if (element.kind === "whiteout") {
          page.drawRectangle({ ...box, color: rgb(1, 1, 1) });
        } else if (element.kind === "highlight") {
          const { r, g, b } = hexToRgb(HIGHLIGHT_COLOR);

          page.drawRectangle({
            ...box,
            color: rgb(r, g, b),
            opacity: 0.45,
            blendMode: BlendMode.Multiply,
          });
        } else {
          const { r, g, b } = hexToRgb(element.color);

          page.drawRectangle({
            ...box,
            borderColor: rgb(r, g, b),
            borderWidth: 2,
          });
        }
      }
    }
  }

  return doc.save();
}
