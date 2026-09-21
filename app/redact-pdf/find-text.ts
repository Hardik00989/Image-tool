import type { PdfJsDocument } from "@/lib/pdf";

// A black box on a page, in PDF points on the page as it is displayed
// (rotation applied, top-left origin)
export type RedactBox = {
  id: string;
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
};

type TextContent = Awaited<ReturnType<Awaited<ReturnType<PdfJsDocument["getPage"]>>["getTextContent"]>>;

// A text run (the items list also holds marked-content markers)
type TextItem = Extract<TextContent["items"][number], { str: string }>;

// Applies a PDF.js matrix [a, b, c, d, e, f] to a point
function apply(m: number[], x: number, y: number) {
  return { x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] };
}

// Finds every case-insensitive match of `query` on every page and returns
// boxes that cover them. Match positions inside a text run are estimated
// from the browser's font metrics, with a little padding on each side.
export async function findTextBoxes(
  pdf: PdfJsDocument,
  query: string,
  onProgress?: (page: number, total: number) => void
): Promise<Omit<RedactBox, "id">[]> {
  const needle = query.trim().toLowerCase();

  if (!needle) return [];

  const measure = document.createElement("canvas").getContext("2d");
  const boxes: Omit<RedactBox, "id">[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    onProgress?.(pageNumber, pdf.numPages);

    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();

    const items = content.items.filter((item): item is TextItem => "str" in item);

    // Page text with a map from each character back to its text item
    let text = "";
    const owners: ({ item: number; char: number } | null)[] = [];

    items.forEach((item, itemIndex) => {
      for (let char = 0; char < item.str.length; char++) {
        text += item.str[char];
        owners.push({ item: itemIndex, char });
      }

      if (item.hasEOL) {
        text += " ";
        owners.push(null);
      }
    });

    const haystack = text.toLowerCase();
    let start = haystack.indexOf(needle);

    while (start !== -1) {
      // A match can span several text items: one box per item
      const spans = new Map<number, { from: number; to: number }>();

      for (let index = start; index < start + needle.length; index++) {
        const owner = owners[index];

        if (!owner) continue;

        const span = spans.get(owner.item);

        spans.set(owner.item, {
          from: Math.min(span?.from ?? owner.char, owner.char),
          to: Math.max(span?.to ?? owner.char + 1, owner.char + 1),
        });
      }

      spans.forEach(({ from, to }, itemIndex) => {
        const item = items[itemIndex];
        const style = content.styles[item.fontName];
        const [a, b, c, d, e, f] = item.transform;

        const runLength = Math.hypot(a, b) || 1;
        const fontHeight = Math.hypot(c, d) || runLength;

        // Share of the run's width before and after the match
        let startShare = from / item.str.length;
        let endShare = to / item.str.length;

        if (measure) {
          measure.font = `100px ${style?.fontFamily ?? "sans-serif"}`;
          const full = measure.measureText(item.str).width;

          if (full > 0) {
            startShare = measure.measureText(item.str.slice(0, from)).width / full;
            endShare = measure.measureText(item.str.slice(0, to)).width / full;
          }
        }

        const ascent = style?.ascent && style.ascent > 0 ? style.ascent : 0.8;
        const descent = style?.descent && style.descent < 0 ? style.descent : -0.25;

        // Unit vectors along and across the text (handles rotated text)
        const ux = a / runLength;
        const uy = b / runLength;
        const vx = c / fontHeight;
        const vy = d / fontHeight;

        const pad = fontHeight * 0.12;
        const x0 = item.width * startShare - pad;
        const x1 = item.width * endShare + pad;
        const y0 = descent * fontHeight - pad;
        const y1 = ascent * fontHeight + pad;

        const corners = [
          [x0, y0],
          [x1, y0],
          [x0, y1],
          [x1, y1],
        ].map(([along, across]) =>
          apply(viewport.transform, e + ux * along + vx * across, f + uy * along + vy * across)
        );

        const xs = corners.map((point) => point.x);
        const ys = corners.map((point) => point.y);

        boxes.push({
          page: pageNumber - 1,
          x: Math.min(...xs),
          y: Math.min(...ys),
          w: Math.max(...xs) - Math.min(...xs),
          h: Math.max(...ys) - Math.min(...ys),
        });
      });

      start = haystack.indexOf(needle, start + needle.length);
    }

    page.cleanup();
  }

  return boxes;
}
