"use client";

import { useEffect, useRef, useState } from "react";
import ToolHero from "@/components/ToolHero";
import PdfDropzone from "@/components/pdf/PdfDropzone";
import ResultCard from "@/components/pdf/ResultCard";
import {
  baseName,
  canvasToBlob,
  downloadBlob,
  formatFileSize,
  openPdfJs,
  parsePageRanges,
  pdfErrorMessage,
  readFileBytes,
  renderPageToCanvas,
  type PdfJsDocument,
} from "@/lib/pdf";

type Format = "jpg" | "png";

type PageImage = {
  page: number;
  name: string;
  blob: Blob;
  url: string;
  width: number;
  height: number;
};

const DPI_OPTIONS = [
  { dpi: 72, label: "72 DPI", hint: "Screen" },
  { dpi: 150, label: "150 DPI", hint: "Recommended" },
  { dpi: 300, label: "300 DPI", hint: "Print" },
];

// Largest width or height of an output image, to stay within browser canvas limits
const MAX_SIDE = 8000;

export default function PdfToJpg() {
  const [file, setFile] = useState<File | null>(null);
  const [pdf, setPdf] = useState<PdfJsDocument | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [format, setFormat] = useState<Format>("jpg");
  const [quality, setQuality] = useState(90);
  const [dpi, setDpi] = useState(150);
  const [pageMode, setPageMode] = useState<"all" | "range">("all");
  const [rangeText, setRangeText] = useState("");

  const [progress, setProgress] = useState<string | null>(null);
  const [images, setImages] = useState<PageImage[]>([]);
  const [zip, setZip] = useState<Blob | null>(null);

  // Current image URLs, released when replaced or on unmount
  const imagesRef = useRef<PageImage[]>([]);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    return () => imagesRef.current.forEach((image) => URL.revokeObjectURL(image.url));
  }, []);

  // Close the PDF when it is replaced or the page is left
  useEffect(() => {
    return () => {
      void pdf?.loadingTask.destroy();
    };
  }, [pdf]);

  const base = file ? baseName(file.name) : "document";
  const extension = format === "jpg" ? "jpg" : "png";
  const zipName = `${base}-images.zip`;

  const clearImages = () => {
    images.forEach((image) => URL.revokeObjectURL(image.url));
    setImages([]);
    setZip(null);
  };

  const handleFiles = async ([selected]: File[]) => {
    clearImages();
    setFile(selected);
    setPdf(null);
    setPageCount(0);
    setLoadError(null);
    setRangeText("");

    try {
      const opened = await openPdfJs(await readFileBytes(selected));

      setPdf(opened);
      setPageCount(opened.numPages);
    } catch (openError) {
      console.error(openError);
      setLoadError(pdfErrorMessage(openError));
    }
  };

  // Pages to convert (0-based) or the reason the range is invalid
  let pages: number[] = [];
  let rangeError: string | null = null;

  if (pageCount > 0) {
    if (pageMode === "all") {
      pages = Array.from({ length: pageCount }, (_, i) => i);
    } else if (rangeText.trim() !== "") {
      try {
        pages = parsePageRanges(rangeText, pageCount);
      } catch (parseError) {
        rangeError = parseError instanceof Error ? parseError.message : String(parseError);
      }
    }
  }

  const isConverting = progress !== null;
  const canConvert = pdf !== null && pages.length > 0 && !isConverting;

  const handleConvert = async () => {
    if (!pdf || !canConvert) return;

    clearImages();

    const type = format === "jpg" ? "image/jpeg" : "image/png";
    const converted: PageImage[] = [];

    try {
      for (let i = 0; i < pages.length; i++) {
        const pageNumber = pages[i] + 1;

        setProgress(`Converting page ${i + 1} of ${pages.length}...`);

        // Scale for the chosen DPI, capped so no side is larger than MAX_SIDE
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1 });
        const scale = Math.min(dpi / 72, MAX_SIDE / viewport.width, MAX_SIDE / viewport.height);

        const canvas = await renderPageToCanvas(pdf, pageNumber, scale);
        const blob = await canvasToBlob(canvas, type, quality / 100);

        converted.push({
          page: pageNumber,
          name: `${base}-page-${pageNumber}.${extension}`,
          blob,
          url: URL.createObjectURL(blob),
          width: canvas.width,
          height: canvas.height,
        });

        // Free the canvas memory straight away
        canvas.width = 0;
        canvas.height = 0;
      }

      setImages(converted);

      if (converted.length === 1) {
        downloadBlob(converted[0].blob, converted[0].name);
      } else {
        setProgress("Creating ZIP...");

        const zipped = await buildZip(converted);

        setZip(zipped);
        downloadBlob(zipped, zipName);
      }
    } catch (convertError) {
      console.error(convertError);
      converted.forEach((image) => URL.revokeObjectURL(image.url));
      setImages([]);
      alert("Some pages couldn't be converted. Try a lower resolution.");
    } finally {
      setProgress(null);
    }
  };

  const handleReset = () => {
    clearImages();
    setFile(null);
    setPdf(null);
    setPageCount(0);
    setLoadError(null);
    setRangeText("");
  };

  const optionClass = (active: boolean) =>
    `rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition sm:px-4 ${
      active
        ? "border-blue-600 bg-blue-600 text-white"
        : "border-gray-200 bg-gray-50 text-gray-700 hover:border-blue-300 hover:bg-blue-50"
    }`;

  const totalSize = images.reduce((sum, image) => sum + image.blob.size, 0);

  return (
    <div className="bg-gray-50 px-6 py-12 text-gray-900 sm:px-10 lg:px-16 sm:py-16">

      <div className="mx-auto max-w-6xl">

        <ToolHero
          icon="🖼️"
          badge="PDF to JPG"
          title="Convert PDF to JPG"
          highlight="Online for Free"
          description="Turn every page of a PDF into a high-quality JPG or PNG image. Choose the resolution and download one page or all of them."
        />

        {!file && (
          <PdfDropzone onFiles={handleFiles} />
        )}

        {file && (
          <div className="mt-12 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">

            {/* Toolbar */}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div className="min-w-0">
                <p className="truncate font-semibold" title={file.name}>
                  {file.name}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  {pageCount > 0
                    ? `${pageCount} ${pageCount === 1 ? "page" : "pages"} · ${formatFileSize(file.size)}`
                    : loadError
                      ? "Couldn't read this file"
                      : "Reading PDF..."}
                </p>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="self-start rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 sm:self-auto"
              >
                Remove PDF
              </button>

            </div>

            {loadError && (
              <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {loadError}
              </p>
            )}

            {pageCount > 0 && (
              <div className="mt-8 grid gap-6 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-5 md:grid-cols-2">

                {/* Format */}

                <div>
                  <p className="text-sm font-semibold text-gray-700">
                    Image format
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2 sm:gap-3" role="group" aria-label="Image format">
                    <button
                      type="button"
                      onClick={() => setFormat("jpg")}
                      aria-pressed={format === "jpg"}
                      className={optionClass(format === "jpg")}
                    >
                      JPG
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormat("png")}
                      aria-pressed={format === "png"}
                      className={optionClass(format === "png")}
                    >
                      PNG
                    </button>
                  </div>

                  {format === "jpg" ? (
                    <div className="mt-4">
                      <label htmlFor="jpg-quality" className="flex justify-between text-sm font-medium text-gray-700">
                        <span>JPG quality</span>
                        <span>{quality}%</span>
                      </label>

                      <input
                        id="jpg-quality"
                        type="range"
                        min={10}
                        max={100}
                        step={5}
                        value={quality}
                        onChange={(event) => setQuality(Number(event.target.value))}
                        className="mt-2 w-full accent-blue-600"
                      />
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-gray-500">
                      PNG is lossless: sharper text, but larger files.
                    </p>
                  )}
                </div>

                {/* Resolution */}

                <div>
                  <p className="text-sm font-semibold text-gray-700">
                    Resolution
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2 sm:gap-3" role="group" aria-label="Resolution">
                    {DPI_OPTIONS.map((option) => (
                      <button
                        key={option.dpi}
                        type="button"
                        onClick={() => setDpi(option.dpi)}
                        aria-pressed={dpi === option.dpi}
                        className={optionClass(dpi === option.dpi)}
                      >
                        {option.label}
                        <span className={`ml-1.5 hidden font-normal min-[480px]:inline ${dpi === option.dpi ? "text-blue-100" : "text-gray-500"}`}>
                          {option.hint}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pages */}

                <div className="md:col-span-2">
                  <p className="text-sm font-semibold text-gray-700">
                    Pages
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2 sm:gap-3" role="group" aria-label="Pages to convert">
                    <button
                      type="button"
                      onClick={() => setPageMode("all")}
                      aria-pressed={pageMode === "all"}
                      className={optionClass(pageMode === "all")}
                    >
                      All pages
                    </button>

                    <button
                      type="button"
                      onClick={() => setPageMode("range")}
                      aria-pressed={pageMode === "range"}
                      className={optionClass(pageMode === "range")}
                    >
                      Choose pages
                    </button>
                  </div>

                  {pageMode === "range" && (
                    <div className="mt-4">
                      <label htmlFor="page-range" className="text-sm font-medium text-gray-700">
                        Page numbers
                      </label>

                      <input
                        id="page-range"
                        type="text"
                        value={rangeText}
                        onChange={(event) => setRangeText(event.target.value)}
                        placeholder="e.g. 1-3, 5"
                        className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:max-w-sm"
                      />

                      {rangeError && (
                        <p className="mt-2 text-sm font-medium text-red-600">
                          {rangeError}
                        </p>
                      )}
                    </div>
                  )}
                </div>

              </div>
            )}

            <button
              type="button"
              onClick={handleConvert}
              disabled={!canConvert}
              className="mt-8 w-full rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {progress ??
                (pages.length === 0
                  ? "Choose the pages to convert"
                  : `Convert ${pages.length} ${pages.length === 1 ? "page" : "pages"} to ${format.toUpperCase()}`)}
            </button>

            {/* Results */}

            {images.length > 0 && (
              <div className="mt-10">

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-xl font-bold">
                    {images.length} {images.length === 1 ? "image" : "images"}
                  </h2>

                  {zip && (
                    <button
                      type="button"
                      onClick={() => downloadBlob(zip, zipName)}
                      className="self-start rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 sm:self-auto"
                    >
                      Download all (ZIP)
                    </button>
                  )}
                </div>

                <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">

                  {images.map((image) => (
                    <div
                      key={image.url}
                      className="flex flex-col rounded-xl border border-gray-200 bg-gray-50 p-3"
                    >

                      <div className="flex h-44 w-full items-center justify-center overflow-hidden">
                        <img
                          src={image.url}
                          alt={`Page ${image.page}`}
                          className="max-h-40 max-w-[85%] shadow-sm"
                        />
                      </div>

                      <p className="mt-3 text-sm font-semibold">
                        Page {image.page}
                      </p>

                      <p className="mt-0.5 text-xs text-gray-500">
                        {image.width} × {image.height} px · {formatFileSize(image.blob.size)}
                      </p>

                      <button
                        type="button"
                        onClick={() => downloadBlob(image.blob, image.name)}
                        aria-label={`Download page ${image.page}`}
                        className="mt-3 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-blue-50 hover:text-blue-600"
                      >
                        Download
                      </button>

                    </div>
                  ))}

                </div>

              </div>
            )}

          </div>
        )}

        {images.length > 0 && (
          <ResultCard
            title={images.length === 1 ? "Your image is ready" : "Your images are ready"}
            fileName={zip ? zipName : images[0].name}
            size={zip ? zip.size : totalSize}
            note={zip ? `The ZIP contains ${images.length} images, one per page.` : undefined}
            onDownload={() => (zip ? downloadBlob(zip, zipName) : downloadBlob(images[0].blob, images[0].name))}
            onReset={handleReset}
            resetLabel="Convert another PDF"
          />
        )}

      </div>

    </div>
  );
}

// Packs the images into a ZIP (images are already compressed, so they are stored as-is)
async function buildZip(images: PageImage[]) {
  const { zipSync } = await import("fflate");

  const entries: Record<string, [Uint8Array, { level: 0 }]> = {};

  for (const image of images) {
    entries[image.name] = [new Uint8Array(await image.blob.arrayBuffer()), { level: 0 }];
  }

  const zipped = zipSync(entries);

  return new Blob([zipped as BlobPart], { type: "application/zip" });
}
