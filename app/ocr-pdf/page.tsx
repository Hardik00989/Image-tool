"use client";

import { useEffect, useRef, useState } from "react";
import type Tesseract from "tesseract.js";
import ToolHero from "@/components/ToolHero";
import PdfDropzone from "@/components/pdf/PdfDropzone";
import ResultCard from "@/components/pdf/ResultCard";
import {
  canvasToBlob,
  downloadBlob,
  formatFileSize,
  isPdfFile,
  loadPdfLib,
  openPdfJs,
  pdfBlob,
  pdfErrorMessage,
  readFileBytes,
  renderPageToCanvas,
} from "@/lib/pdf";

const languages = [
  { code: "eng", name: "English" },
  { code: "hin", name: "Hindi" },
  { code: "spa", name: "Spanish" },
  { code: "fra", name: "French" },
  { code: "deu", name: "German" },
  { code: "por", name: "Portuguese" },
  { code: "ita", name: "Italian" },
];

// PDF pages are rendered at 2x (144 DPI) for recognition
const PDF_RENDER_SCALE = 2;
const MAX_CANVAS_SIDE = 8000;
const MANY_PAGES = 20;

type Kind = "pdf" | "image";

type Result = {
  blob: Blob;
  text: string;
  pageCount: number;
  // Pages that already had selectable text and were left unchanged
  skippedPages: number;
};

// A page with at least this much real text is treated as already searchable
const EXISTING_TEXT_MIN_CHARS = 50;

// "scan.pdf" / "photo.jpg" -> "scan" / "photo"
function outputBase(fileName: string) {
  return fileName.replace(/\.(pdf|png|jpe?g)$/i, "") || "document";
}

function isImageFile(file: File) {
  return /^image\/(png|jpeg)$/.test(file.type) || /\.(png|jpe?g)$/i.test(file.name);
}

// Draws an uploaded image onto a canvas (applies EXIF orientation), optionally scaled
async function imageToCanvas(file: File, scale = 1) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");

  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));

  const context = canvas.getContext("2d");

  if (!context) {
    bitmap.close();
    throw new Error("Could not create canvas.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  return canvas;
}

export default function OcrPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<Kind>("pdf");
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [openError, setOpenError] = useState<string | null>(null);

  const [language, setLanguage] = useState("eng");

  const [isWorking, setIsWorking] = useState(false);
  const [progress, setProgress] = useState("");
  // 0-100 across the whole document
  const [percent, setPercent] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);

  // Kept so the OCR worker can be stopped if the user leaves the page
  const workerRef = useRef<Tesseract.Worker | null>(null);

  useEffect(() => {
    return () => {
      void workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const base = file ? outputBase(file.name) : "document";
  const outputName = `${base}-ocr.pdf`;

  const handleFiles = async ([chosen]: File[]) => {
    setFile(chosen);
    setBytes(null);
    setPageCount(0);
    setOpenError(null);
    setResult(null);

    if (isImageFile(chosen)) {
      setKind("image");
      setPageCount(1);
      setBytes(await readFileBytes(chosen));
      return;
    }

    if (!isPdfFile(chosen)) {
      setOpenError("Please choose a PDF, JPG or PNG file.");
      return;
    }

    setKind("pdf");

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

  const handleOcr = async () => {
    if (!file || !bytes) return;

    setIsWorking(true);
    setResult(null);
    setPercent(0);
    setProgress("Downloading OCR engine and language data...");

    // Updated by the loop so the progress logger knows where we are
    let currentPage = 1;
    const total = pageCount;

    try {
      const [{ createWorker }, { PDFDocument, degrees }] = await Promise.all([
        import("tesseract.js"),
        loadPdfLib(),
      ]);

      const worker = await createWorker(language, 1, {
        logger: (message) => {
          if (message.status === "recognizing text") {
            const pagePercent = Math.round(message.progress * 100);

            setProgress(`Page ${currentPage} of ${total} · ${pagePercent}%`);
            setPercent(Math.round(((currentPage - 1 + message.progress) / total) * 100));
          }
        },
      });

      workerRef.current = worker;

      // Output: the original pages (or the image) with an invisible text layer on top
      const output = kind === "pdf" ? await PDFDocument.load(bytes) : await PDFDocument.create();
      const source = kind === "pdf" ? await openPdfJs(bytes) : null;
      const texts: string[] = [];
      let skippedPages = 0;

      try {
        for (currentPage = 1; currentPage <= total; currentPage++) {
          setProgress(`Page ${currentPage} of ${total} · 0%`);

          let canvas: HTMLCanvasElement;
          let dpi: number;

          if (source) {
            const page = await source.getPage(currentPage);

            // Skip pages that already have a text layer, so text isn't duplicated
            const content = await page.getTextContent();
            const existing = content.items
              .map((item) => ("str" in item ? item.str : ""))
              .join(" ")
              .replace(/s+/g, " ")
              .trim();

            if (existing.replace(/s/g, "").length >= EXISTING_TEXT_MIN_CHARS) {
              texts.push(existing);
              skippedPages++;
              continue;
            }

            const { width, height } = page.getViewport({ scale: 1 });
            const scale = Math.min(PDF_RENDER_SCALE, MAX_CANVAS_SIDE / Math.max(width, height));

            canvas = await renderPageToCanvas(source, currentPage, scale);
            dpi = Math.round(72 * scale);
          } else {
            // Small images are upscaled: Tesseract reads larger text more reliably
            const original = await imageToCanvas(file);
            const longest = Math.max(original.width, original.height);
            const scale = Math.min(longest < 1600 ? 2 : 1, MAX_CANVAS_SIDE / longest);

            // The page shows the image at its own size (96 DPI)
            const pageWidth = original.width * 0.75;
            const pageHeight = original.height * 0.75;

            const isPng = file.type === "image/png" || /\.png$/i.test(file.name);
            const encoded = await canvasToBlob(original, isPng ? "image/png" : "image/jpeg", 0.92);
            const encodedBytes = new Uint8Array(await encoded.arrayBuffer());
            const image = isPng ? await output.embedPng(encodedBytes) : await output.embedJpg(encodedBytes);

            output
              .addPage([pageWidth, pageHeight])
              .drawImage(image, { x: 0, y: 0, width: pageWidth, height: pageHeight });

            canvas = scale === 1 ? original : await imageToCanvas(file, scale);
            dpi = Math.round(96 * scale);
          }

          const { data } = await worker.recognize(
            canvas,
            { pdfTextOnly: true, user_defined_dpi: String(dpi) } as Partial<Tesseract.RecognizeOptions>,
            { text: true, pdf: true }
          );

          canvas.width = 0;
          canvas.height = 0;

          texts.push(data.text.trim());

          if (!data.pdf) continue;

          // Tesseract's page holds only invisible text, sized like the image.
          // Scale it onto the visible area of the page, undoing the page rotation.
          const [layer] = await output.embedPdf(new Uint8Array(data.pdf), [0]);
          const page = output.getPage(currentPage - 1);
          const crop = page.getCropBox();
          const rotation = ((page.getRotation().angle % 360) + 360) % 360;
          const sideways = rotation === 90 || rotation === 270;

          const visibleWidth = sideways ? crop.height : crop.width;
          const visibleHeight = sideways ? crop.width : crop.height;

          const origin = {
            0: { x: crop.x, y: crop.y },
            90: { x: crop.x + crop.width, y: crop.y },
            180: { x: crop.x + crop.width, y: crop.y + crop.height },
            270: { x: crop.x, y: crop.y + crop.height },
          }[rotation as 0 | 90 | 180 | 270] ?? { x: crop.x, y: crop.y };

          page.drawPage(layer, {
            ...origin,
            xScale: visibleWidth / layer.width,
            yScale: visibleHeight / layer.height,
            rotate: degrees(rotation),
          });
        }
      } finally {
        void source?.loadingTask.destroy();
        await worker.terminate();
        workerRef.current = null;
      }

      setProgress("Saving searchable PDF...");

      const blob = pdfBlob(await output.save({ useObjectStreams: true }));

      const text =
        texts.length === 1
          ? texts[0]
          : texts.map((pageText, index) => `--- Page ${index + 1} ---\n${pageText}`).join("\n\n");

      setResult({ blob, text, pageCount: total, skippedPages });
      setPercent(100);
      downloadBlob(blob, outputName);
    } catch (ocrError) {
      console.error(ocrError);

      const message = ocrError instanceof Error ? ocrError.message : String(ocrError);

      alert(
        /fetch|network|load/i.test(message) && !/pdf/i.test(message)
          ? "The OCR language data couldn't be downloaded. Check your internet connection and try again."
          : pdfErrorMessage(ocrError)
      );
    } finally {
      setIsWorking(false);
      setProgress("");
    }
  };

  const handleCopy = async () => {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(result.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Couldn't copy automatically. Select the text and copy it instead.");
    }
  };

  const handleDownloadText = () => {
    if (!result) return;

    downloadBlob(new Blob([result.text], { type: "text/plain;charset=utf-8" }), `${base}-ocr.txt`);
  };

  const handleReset = () => {
    void workerRef.current?.terminate();
    workerRef.current = null;

    setFile(null);
    setBytes(null);
    setPageCount(0);
    setOpenError(null);
    setResult(null);
    setPercent(0);
  };

  return (
    <div className="bg-gray-50 px-6 py-12 text-gray-900 sm:px-10 lg:px-16 sm:py-16">

      <div className="mx-auto max-w-6xl">

        <ToolHero
          icon="🔍"
          badge="OCR PDF"
          title="OCR PDF & Images"
          highlight="Online for Free"
          description="Turn a scanned PDF or photo of a document into a searchable PDF with selectable text, and copy the recognized text."
        />

        {!file && (
          <PdfDropzone
            onFiles={handleFiles}
            accept="application/pdf,.pdf,image/png,image/jpeg"
            acceptPdfOnly={false}
            title="Upload a scanned PDF or image"
            buttonLabel="Choose PDF or image"
            hint="PDF, JPG or PNG. Files are processed in your browser and never uploaded."
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
                  {kind === "image" && " · image"}
                  {kind === "pdf" && pageCount > 0 && ` · ${pageCount} ${pageCount === 1 ? "page" : "pages"}`}
                  {!bytes && !openError && " · Reading file..."}
                </p>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="self-start rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 sm:self-auto"
              >
                Remove file
              </button>

            </div>

            {openError && (
              <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {openError}
              </p>
            )}

            {/* Options */}

            <div className="mt-8 grid gap-6 md:grid-cols-2 md:items-start">

              <div>
                <label htmlFor="ocr-language" className="block text-sm font-semibold text-gray-700">
                  Document language
                </label>

                <select
                  id="ocr-language"
                  value={language}
                  onChange={(event) => {
                    setLanguage(event.target.value);
                    setResult(null);
                  }}
                  disabled={isWorking}
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                >
                  {languages.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <p className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-600">
                OCR runs on your device. The first run downloads the OCR engine and
                language data (a few MB) from a public CDN — your file itself is never
                uploaded. Recognition takes a few seconds per page.
              </p>

            </div>

            {pageCount > MANY_PAGES && (
              <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                This PDF has {pageCount} pages. OCR takes a few seconds per page, so this could
                take several minutes. Keep this tab open until it finishes.
              </p>
            )}

            {isWorking && (
              <div className="mt-8">
                <div
                  className="h-2 w-full overflow-hidden rounded-full bg-gray-100"
                  role="progressbar"
                  aria-label="OCR progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={percent}
                >
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all"
                    style={{ width: `${percent}%` }}
                  />
                </div>

                <p className="mt-2 text-center text-sm text-gray-500" aria-live="polite">
                  {progress}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={handleOcr}
              disabled={!bytes || isWorking}
              className="mt-8 w-full rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isWorking ? "Recognizing text..." : "Make PDF searchable"}
            </button>

          </div>
        )}

        {result && (
          <>
            <ResultCard
              title="Your searchable PDF is ready"
              fileName={outputName}
              size={result.blob.size}
              note={`The pages look exactly the same, with an invisible text layer you can search, select and copy. OCR can make mistakes, so check important details.${
                result.skippedPages > 0
                  ? ` ${result.skippedPages} of ${result.pageCount} ${result.pageCount === 1 ? "page" : "pages"} already had selectable text and ${result.skippedPages === 1 ? "was" : "were"} left unchanged.`
                  : ""
              }`}
              onDownload={() => downloadBlob(result.blob, outputName)}
              onReset={handleReset}
              resetLabel="OCR another file"
            />

            {/* Extracted text */}

            <div className="mx-auto mt-6 max-w-4xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <h2 className="text-lg font-bold">
                  Recognized text
                </h2>

                <div className="flex flex-wrap gap-3">

                  <button
                    type="button"
                    onClick={handleCopy}
                    className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    {copied ? "Copied!" : "Copy text"}
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadText}
                    className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    Download .txt
                  </button>

                </div>

              </div>

              <label htmlFor="ocr-text" className="sr-only">
                Recognized text
              </label>

              <textarea
                id="ocr-text"
                readOnly
                value={result.text || "No text was found."}
                rows={12}
                className="mt-5 w-full rounded-xl border border-gray-200 bg-gray-50 p-4 font-mono text-sm leading-6 text-gray-800 outline-none focus:border-blue-500"
              />

            </div>
          </>
        )}

      </div>

    </div>
  );
}
