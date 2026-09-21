import type { PdfJsDocument } from "@/lib/pdf";

// A run of text that is the same in both files, or a place where it differs
export type DiffPart =
  | { type: "same"; text: string }
  | { type: "change"; removed: string; added: string };

export type PageComparison = {
  page: number;
  // "added" / "removed": the page only exists in one of the files
  status: "same" | "changed" | "added" | "removed";
  parts: DiffPart[];
  wordsAdded: number;
  wordsRemoved: number;
  // Neither version of the page has any selectable text
  noText: boolean;
};

// Reads the text of every page, one normalised string per page
export async function extractPageTexts(
  pdf: PdfJsDocument,
  onProgress?: (page: number, total: number) => void
) {
  const texts: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    onProgress?.(pageNumber, pdf.numPages);

    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();

    const raw = content.items
      .map((item) => ("str" in item ? item.str + (item.hasEOL ? "\n" : "") : ""))
      .join("");

    texts.push(raw.replace(/\s+/g, " ").trim());
    page.cleanup();
  }

  return texts;
}

export function countWords(text: string) {
  return text.match(/\S+/g)?.length ?? 0;
}

// Word diff of two page texts. A single common word squeezed between two
// changes (like "in") is folded into the change, so a rewritten sentence
// reads as one removed phrase and one added phrase.
export async function diffTexts(oldText: string, newText: string): Promise<DiffPart[]> {
  const { diffWords } = await import("diff");
  const changes = diffWords(oldText, newText);

  const parts: DiffPart[] = [];

  changes.forEach((change, index) => {
    const last = parts[parts.length - 1];

    if (change.added || change.removed) {
      let target = last;

      if (target?.type !== "change") {
        target = { type: "change", removed: "", added: "" };
        parts.push(target);
      }

      if (change.removed) target.removed += change.value;
      if (change.added) target.added += change.value;
      return;
    }

    const next = changes[index + 1];
    const isBridge =
      last?.type === "change" && next && (next.added || next.removed) && countWords(change.value) <= 1;

    if (isBridge && last.type === "change") {
      last.removed += change.value;
      last.added += change.value;
      return;
    }

    parts.push({ type: "same", text: change.value });
  });

  return parts.map((part) =>
    part.type === "change"
      ? { type: "change", removed: part.removed.trim(), added: part.added.trim() }
      : part
  );
}

// Compares two documents page by page
export async function comparePages(oldTexts: string[], newTexts: string[]) {
  const results: PageComparison[] = [];
  const pageTotal = Math.max(oldTexts.length, newTexts.length);

  for (let index = 0; index < pageTotal; index++) {
    const oldText = oldTexts[index];
    const newText = newTexts[index];

    if (oldText === undefined || newText === undefined) {
      const text = oldText ?? newText ?? "";
      const words = countWords(text);

      results.push({
        page: index + 1,
        status: oldText === undefined ? "added" : "removed",
        parts: text
          ? [{ type: "change", removed: oldText ?? "", added: newText ?? "" }]
          : [],
        wordsAdded: oldText === undefined ? words : 0,
        wordsRemoved: newText === undefined ? words : 0,
        noText: !text,
      });
      continue;
    }

    const parts = oldText === newText ? [{ type: "same" as const, text: oldText }] : await diffTexts(oldText, newText);

    let wordsAdded = 0;
    let wordsRemoved = 0;

    parts.forEach((part) => {
      if (part.type === "change") {
        wordsAdded += countWords(part.added);
        wordsRemoved += countWords(part.removed);
      }
    });

    results.push({
      page: index + 1,
      status: parts.some((part) => part.type === "change") ? "changed" : "same",
      parts,
      wordsAdded,
      wordsRemoved,
      noText: !oldText && !newText,
    });
  }

  return results;
}
