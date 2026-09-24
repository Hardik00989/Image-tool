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
  pdfErrorMessage,
  readFileBytes,
  renderPageToCanvas,
} from "@/lib/pdf";

type Level = "light" | "recommended" | "strong";

const levels: {
  id: Level;
  name: string;
  summary: string;
  // Only used for the levels that turn pages into images
  dpi?: number;
  quality?: number;
}[] = [
  {
    id: "light",
    name: "Light",
    summary: "Keeps text selectable. Cleans up the file structure — small savings.",
  },
  {
    id: "recommended",
    name: "Recommended",
    summary: "Good quality, much smaller. Pages become images (110 DPI).",
    dpi: 110,
    quality: 0.7,
  },
  {
    id: "strong",
    name: "Strong",
    summary: "Smallest file, lower quality. Pages become images (80 DPI).",
    dpi: 80,
    quality: 0.5,
  },
];

// Largest canvas side we render, to keep memory use safe
const MAX_CANVAS_SIDE = 8000;

type Result = {
  blob: Blob;
  // False when the compressed file wasn't smaller than the original
  smaller: boolean;
};

export default function CompressPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [openError, setOpenError] = useState<string | null>(null);

  const [level, setLevel] = useState<Level>("recommended");

  const [isWorking, setIsWorking] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  const outputName = file ? `${baseName(file.name)}-compressed.pdf` : "compressed.pdf";
  const selected = levels.find((item) => item.id === level) ?? levels[1];

  const handleFiles = async ([chosen]: File[]) => {
    setFile(chosen);
    setBytes(null);
    setPageCount(0);
    setOpenError(null);
    setResult(null);

    try {
      const data = await readFileBytes(chosen);
      const pdf = await openPdfJs(data);

      setPageCount(pdf.numPages);
      setBytes(data);
      void pdf.loadingTask.destroy();
    } catch (error) {
      console.error(error);
      setOpenError(pdfErrorMessage(error));
    }
  };

  // Level 1: re-save with pdf-lib, dropping objects nothing refers to
  const compressLight = async (data: Uint8Array) => {
    const { PDFDocument, PDFArray, PDFDict, PDFRef, PDFStream } = await loadPdfLib();
    const pdf = await PDFDocument.load(data, { updateMetadata: false });

    setProgress("Removing unused data...");

    // Walk every object reachable from the trailer
    const reachable = new Set<string>();
    const pending: unknown[] = Object.values(pdf.context.trailerInfo);

    while (pending.length > 0) {
      const item = pending.pop();

      if (item instanceof PDFRef) {
        if (reachable.has(item.tag)) continue;

        reachable.add(item.tag);
        pending.push(pdf.context.lookup(item));
      } else if (item instanceof PDFDict) {
        pending.push(...item.values());
      } else if (item instanceof PDFStream) {
        pending.push(...item.dict.values());
      } else if (item instanceof PDFArray) {
        pending.push(...item.asArray());
      }
    }

    for (const [ref] of pdf.context.enumerateIndirectObjects()) {
      if (!reachable.has(ref.tag)) {
        pdf.context.delete(ref);
      }
    }

    setProgress("Saving...");

    return pdf.save({ useObjectStreams: true });
  };

  // Levels 2 and 3: render every page to a JPG and rebuild the PDF
  const compressToImages = async (data: Uint8Array, dpi: number, quality: number) => {
    const { PDFDocument } = await loadPdfLib();
    const source = await openPdfJs(data);
    const output = await PDFDocument.create();

    try {
      for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber++) {
        setProgress(`Compressing page ${pageNumber} of ${source.numPages}...`);

        // Visible page size in points (crop box and rotation applied)
        const page = await source.getPage(pageNumber);
        const { width, height } = page.getViewport({ scale: 1 });

        const scale = Math.min(dpi / 72, MAX_CANVAS_SIDE / Math.max(width, height));
        const canvas = await renderPageToCanvas(source, pageNumber, scale);
        const jpg = await canvasToBlob(canvas, "image/jpeg", quality);

        // Free the canvas memory straight away
        canvas.width = 0;
        canvas.height = 0;

        const image = await output.embedJpg(new Uint8Array(await jpg.arrayBuffer()));
        const newPage = output.addPage([width, height]);

        newPage.drawImage(image, { x: 0, y: 0, width, height });
      }
    } finally {
      void source.loadingTask.destroy();
    }

    setProgress("Saving...");

    return output.save({ useObjectStreams: true });
  };

  const handleCompress = async () => {
    if (!bytes) return;

    setIsWorking(true);
    setResult(null);

    try {
      const compressed =
        selected.dpi && selected.quality
          ? await compressToImages(bytes, selected.dpi, selected.quality)
          : await compressLight(bytes);

      const smaller = compressed.length < bytes.length;

      // Never hand back a bigger file than the one we were given
      const blob = pdfBlob(smaller ? compressed : bytes);

      setResult({ blob, smaller });

      if (smaller) {
        downloadBlob(blob, outputName);
      }
    } catch (compressError) {
      console.error(compressError);
      alert(pdfErrorMessage(compressError));
    } finally {
      setIsWorking(false);
      setProgress("");
    }
  };

  const handleReset = () => {
    setFile(null);
    setBytes(null);
    setPageCount(0);
    setOpenError(null);
    setResult(null);
  };

  const originalSize = file?.size ?? 0;
  const savedPercent =
    result && result.smaller && originalSize > 0
      ? Math.max(1, Math.round((1 - result.blob.size / originalSize) * 100))
      : 0;

  return (
    <div className="bg-gray-50 px-6 py-12 text-gray-900 sm:px-10 lg:px-16 sm:py-16">

      <div className="mx-auto max-w-6xl">

        <ToolHero
          icon="🗜"
          badge="Compress PDF"
          title="Compress PDF Files"
          highlight="Online for Free"
          description="Reduce the file size of your PDF so it's easier to email and upload. Pick a compression level and download the smaller file."
        />

        {!file && (
          <PdfDropzone onFiles={handleFiles} />
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
                  {pageCount > 0 && ` · ${pageCount} ${pageCount === 1 ? "page" : "pages"}`}
                  {!bytes && !openError && " · Reading PDF..."}
                </p>
              </div>

              <button
                type="button"
                onClick={handleReset}
                disabled={isWorking}
                className="self-start rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50 sm:self-auto"
              >
                Remove PDF
              </button>

            </div>

            {openError && (
              <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {openError}
              </p>
            )}

            {/* Compression level */}

            <h2 className="mt-8 text-lg font-bold">
              Compression level
            </h2>

            <div className="mt-4 grid gap-4 md:grid-cols-3">

              {levels.map((item) => {
                const active = item.id === level;

                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setLevel(item.id);
                      setResult(null);
                    }}
                    disabled={isWorking}
                    className={`rounded-xl border-2 p-5 text-left transition disabled:opacity-60 ${
                      active
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 bg-white hover:border-blue-300"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className={`font-semibold ${active ? "text-blue-700" : "text-gray-900"}`}>
                        {item.name}
                      </span>

                      <span
                        aria-hidden="true"
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                          active ? "border-blue-600 bg-blue-600" : "border-gray-300"
                        }`}
                      >
                        {active && <span className="h-2 w-2 rounded-full bg-white" />}
                      </span>
                    </span>

                    <span className="mt-2 block text-sm leading-6 text-gray-600">
                      {item.summary}
                    </span>
                  </button>
                );
              })}

            </div>

            {selected.dpi ? (
              <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                <strong>Heads up:</strong> with this level every page is turned into an image.
                Text in the compressed PDF can no longer be selected, searched or copied, and
                links and form fields are removed. Choose Light to keep the text.
              </p>
            ) : (
              <p className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-600">
                Light keeps everything as it is and only removes wasted space, so most files
                shrink by a few percent at most. For big savings on scans and photos, choose
                Recommended.
              </p>
            )}

            <button
              type="button"
              onClick={handleCompress}
              disabled={!bytes || isWorking}
              className="mt-8 w-full rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isWorking ? progress || "Compressing..." : "Compress PDF"}
            </button>

          </div>
        )}

        {result && file && (
          <>
            {/* Before / after */}

            <div className="mx-auto mt-10 grid max-w-4xl grid-cols-3 gap-3 text-center sm:gap-4">

              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 sm:text-sm">
                  Before
                </p>
                <p className="mt-1 text-lg font-bold sm:text-2xl">
                  {formatFileSize(originalSize)}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 sm:text-sm">
                  After
                </p>
                <p className="mt-1 text-lg font-bold sm:text-2xl">
                  {formatFileSize(result.blob.size)}
                </p>
              </div>

              <div
                className={`rounded-2xl border p-4 shadow-sm sm:p-5 ${
                  result.smaller ? "border-green-200 bg-green-50 text-green-700" : "border-gray-200 bg-white text-gray-500"
                }`}
              >
                <p className="text-xs font-medium uppercase tracking-wide sm:text-sm">
                  Saved
                </p>
                <p className="mt-1 text-lg font-bold sm:text-2xl">
                  {result.smaller ? `${savedPercent}% smaller` : "0%"}
                </p>
              </div>

            </div>

            {result.smaller ? (
              <ResultCard
                fileName={outputName}
                size={result.blob.size}
                onDownload={() => downloadBlob(result.blob, outputName)}
                onReset={handleReset}
                resetLabel="Compress another PDF"
                note={
                  selected.dpi
                    ? "Pages in this file are images, so the text can't be selected or searched."
                    : undefined
                }
              />
            ) : (
              <ResultCard
                title="Your PDF is already well optimized"
                fileName={file.name}
                size={originalSize}
                note={
                  selected.dpi
                    ? "Compressing this file would have made it bigger, so you can keep the original — nothing is lost."
                    : "This PDF couldn't be made any smaller without losing quality. Keep the original, or try the Recommended level if it contains scans or photos."
                }
                onDownload={() => downloadBlob(result.blob, file.name)}
                onReset={handleReset}
                resetLabel="Compress another PDF"
              />
            )}
          </>
        )}

      </div>

    </div>
  );
}
