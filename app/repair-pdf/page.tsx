"use client";

import { useState } from "react";
import ToolHero from "@/components/ToolHero";
import PdfDropzone from "@/components/pdf/PdfDropzone";
import ResultCard from "@/components/pdf/ResultCard";
import {
  baseName,
  canvasToBlob,
  downloadBlob,
  formatFileSize,
  loadPdfLib,
  openPdfJs,
  pdfBlob,
  readFileBytes,
  renderPageToCanvas,
} from "@/lib/pdf";

// Resolution used when a file has to be rebuilt from page images
const REBUILD_DPI = 150;
const MAX_CANVAS_SIDE = 8000;

type Repair = {
  blob: Blob;
  method: "structure" | "images";
  pageCount: number;
  // Pages PDF.js could list but not render (image rebuild only)
  skippedPages: number;
  // Structure repair had to copy the readable pages into a new file
  rebuiltTree: boolean;
  // Pages whose content was cut off, so they come out blank (structure repair only)
  blankPages: number;
};

const PROTECTED_MESSAGE =
  "This PDF is password-protected, not damaged. Unlock it first with the Unlock PDF tool.";

const TOO_DAMAGED_MESSAGE =
  "Sorry, this file is too damaged to repair. No readable pages could be recovered — it may be incomplete or not a PDF at all. If you can, download or export the file again from its source.";

export default function RepairPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);

  const [isWorking, setIsWorking] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Repair | null>(null);

  const outputName = file ? `${baseName(file.name)}-repaired.pdf` : "repaired.pdf";

  // Damaged files often aren't recognised as PDFs, so accept anything here
  const handleFiles = async ([chosen]: File[]) => {
    setFile(chosen);
    setBytes(await readFileBytes(chosen));
    setError(null);
    setResult(null);
  };

  // Method 1: let pdf-lib parse what it can and write a fresh cross-reference table.
  // Keeps text, links and quality. Returns null if nothing usable came out.
  const repairStructure = async (data: Uint8Array) => {
    const { PDFDocument, PDFArray, PDFName, PDFRef } = await loadPdfLib();

    const pdf = await PDFDocument.load(data, {
      ignoreEncryption: true,
      throwOnInvalidObject: false,
      updateMetadata: false,
    });

    if (pdf.isEncrypted) {
      throw new Error("encrypted");
    }

    const pageCount = pdf.getPageCount();

    if (pageCount === 0) return null;

    // Pages that still exist but whose content stream is gone will be blank
    const blankPages = pdf.getPages().filter((page) => {
      const contents = page.node.get(PDFName.of("Contents"));
      const refs = contents instanceof PDFArray ? contents.asArray() : [contents];

      return refs.some((ref) => ref instanceof PDFRef && !pdf.context.lookup(ref));
    }).length;

    // Only trust a result that opens with strict parsing and in PDF.js
    const opensCleanly = async (saved: Uint8Array) => {
      try {
        const check = await PDFDocument.load(saved);
        const viewer = await openPdfJs(saved);

        try {
          for (let pageNumber = 1; pageNumber <= viewer.numPages; pageNumber++) {
            await viewer.getPage(pageNumber);
          }

          return check.getPageCount() === pageCount && viewer.numPages === pageCount;
        } finally {
          void viewer.loadingTask.destroy();
        }
      } catch {
        return false;
      }
    };

    // First try: same document, new cross-reference table (keeps bookmarks, forms, etc.)
    const saved = await pdf.save({ useObjectStreams: true });

    if (await opensCleanly(saved)) {
      return { saved, pageCount, rebuiltTree: false, blankPages };
    }

    // The page tree still points at missing pages: copy the readable pages into a new file
    const fresh = await PDFDocument.create();
    const pages = await fresh.copyPages(pdf, pdf.getPageIndices());

    pages.forEach((page) => fresh.addPage(page));

    const rebuilt = await fresh.save({ useObjectStreams: true });

    return (await opensCleanly(rebuilt)) ? { saved: rebuilt, pageCount, rebuiltTree: true, blankPages } : null;
  };

  // Method 2: PDF.js recovers many broken files. Render every page it can read
  // and build a new PDF from the images.
  const rebuildFromImages = async (data: Uint8Array) => {
    const { PDFDocument } = await loadPdfLib();
    const source = await openPdfJs(data);
    const output = await PDFDocument.create();
    let skippedPages = 0;

    try {
      for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber++) {
        setProgress(`Rebuilding page ${pageNumber} of ${source.numPages}...`);

        try {
          const page = await source.getPage(pageNumber);
          const { width, height } = page.getViewport({ scale: 1 });

          const scale = Math.min(REBUILD_DPI / 72, MAX_CANVAS_SIDE / Math.max(width, height));
          const canvas = await renderPageToCanvas(source, pageNumber, scale);
          const jpg = await canvasToBlob(canvas, "image/jpeg", 0.85);

          canvas.width = 0;
          canvas.height = 0;

          const image = await output.embedJpg(new Uint8Array(await jpg.arrayBuffer()));

          output.addPage([width, height]).drawImage(image, { x: 0, y: 0, width, height });
        } catch (pageError) {
          // Keep going: one unreadable page shouldn't lose the rest
          console.warn(`Page ${pageNumber} could not be recovered`, pageError);
          skippedPages++;
        }
      }
    } finally {
      void source.loadingTask.destroy();
    }

    const pageCount = output.getPageCount();

    if (pageCount === 0) return null;

    return { saved: await output.save({ useObjectStreams: true }), pageCount, skippedPages };
  };

  const handleRepair = async () => {
    if (!bytes) return;

    setIsWorking(true);
    setError(null);
    setResult(null);

    try {
      setProgress("Rebuilding the PDF structure...");

      let structure: Awaited<ReturnType<typeof repairStructure>> = null;

      try {
        structure = await repairStructure(bytes);
      } catch (structureError) {
        if (structureError instanceof Error && structureError.message === "encrypted") {
          setError(PROTECTED_MESSAGE);
          return;
        }

        console.warn("Structure repair failed, trying page images", structureError);
      }

      let repair: Repair | null = structure
        ? {
            blob: pdfBlob(structure.saved),
            method: "structure",
            pageCount: structure.pageCount,
            skippedPages: 0,
            rebuiltTree: structure.rebuiltTree,
            blankPages: structure.blankPages,
          }
        : null;

      if (!repair) {
        setProgress("Recovering pages...");

        try {
          const rebuilt = await rebuildFromImages(bytes);

          if (rebuilt) {
            repair = {
              blob: pdfBlob(rebuilt.saved),
              method: "images",
              pageCount: rebuilt.pageCount,
              skippedPages: rebuilt.skippedPages,
              rebuiltTree: false,
              blankPages: 0,
            };
          }
        } catch (imagesError) {
          const text = imagesError instanceof Error ? `${imagesError.name} ${imagesError.message}` : "";

          if (/password/i.test(text)) {
            setError(PROTECTED_MESSAGE);
            return;
          }

          console.warn("Image rebuild failed", imagesError);
        }
      }

      if (!repair) {
        setError(TOO_DAMAGED_MESSAGE);
        return;
      }

      setResult(repair);
      downloadBlob(repair.blob, outputName);
    } finally {
      setIsWorking(false);
      setProgress("");
    }
  };

  const handleReset = () => {
    setFile(null);
    setBytes(null);
    setError(null);
    setResult(null);
  };

  const resultNote = (repair: Repair) => {
    const pages = `${repair.pageCount} ${repair.pageCount === 1 ? "page" : "pages"} recovered`;

    if (repair.method === "structure") {
      const blank =
        repair.blankPages > 0
          ? ` ${repair.blankPages} ${repair.blankPages === 1 ? "page is" : "pages are"} blank because ${repair.blankPages === 1 ? "its" : "their"} content was missing from the file.`
          : "";

      return repair.rebuiltTree
        ? `${pages}. Parts of the file were missing, so the readable pages were copied into a new PDF. Text and quality are unchanged; bookmarks and form fields may be lost.${blank}`
        : `${pages}. Fixed by rebuilding the file structure (cross-reference table) — text, links and quality are unchanged.${blank}`;
    }

    const skipped =
      repair.skippedPages > 0
        ? ` ${repair.skippedPages} ${repair.skippedPages === 1 ? "page was" : "pages were"} too damaged to recover.`
        : "";

    return `${pages}. The structure couldn't be fixed, so each readable page was rebuilt as an image. Text in the repaired file can no longer be selected or searched.${skipped}`;
  };

  return (
    <div className="bg-gray-50 px-6 py-12 text-gray-900 sm:px-10 lg:px-16 sm:py-16">

      <div className="mx-auto max-w-6xl">

        <ToolHero
          icon="🛠"
          badge="Repair PDF"
          title="Repair PDF Files"
          highlight="Online for Free"
          description="Fix a damaged or corrupted PDF that won't open. We rebuild the file and recover as many pages as possible."
        />

        {!file && (
          <PdfDropzone
            onFiles={handleFiles}
            acceptPdfOnly={false}
            title="Upload a damaged PDF"
          />
        )}

        {file && (
          <div className="mt-12 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">

            {/* File info */}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div className="min-w-0">
                <p className="truncate font-semibold" title={file.name}>
                  {file.name}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  {formatFileSize(file.size)}
                </p>
              </div>

              <button
                type="button"
                onClick={handleReset}
                disabled={isWorking}
                className="self-start rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50 sm:self-auto"
              >
                Remove file
              </button>

            </div>

            {/* How it works */}

            <ol className="mt-8 grid gap-4 md:grid-cols-2">

              <li className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                <p className="font-semibold">1. Rebuild the structure</p>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Reads every object that is still intact and writes a new cross-reference
                  table. Text, links and quality stay the same.
                </p>
              </li>

              <li className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                <p className="font-semibold">2. Recover pages as images</p>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Only if step 1 fails: each readable page is rendered and saved into a new
                  PDF. Text is no longer selectable.
                </p>
              </li>

            </ol>

            {error && (
              <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleRepair}
              disabled={!bytes || isWorking}
              className="mt-8 w-full rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isWorking ? progress || "Repairing..." : "Repair PDF"}
            </button>

          </div>
        )}

        {result && (
          <ResultCard
            title={result.method === "structure" ? "PDF repaired" : "PDF recovered as images"}
            fileName={outputName}
            size={result.blob.size}
            note={resultNote(result)}
            onDownload={() => downloadBlob(result.blob, outputName)}
            onReset={handleReset}
            resetLabel="Repair another PDF"
          />
        )}

      </div>

    </div>
  );
}
