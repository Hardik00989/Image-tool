"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import ToolHero from "@/components/ToolHero";
import PdfDropzone from "@/components/pdf/PdfDropzone";
import ResultCard from "@/components/pdf/ResultCard";
import { usePdfPreviews } from "@/components/pdf/usePdfPreviews";
import {
  baseName,
  downloadBlob,
  loadPdfLib,
  parsePageRanges,
  pdfBlob,
  pdfErrorMessage,
  readFileBytes,
} from "@/lib/pdf";
import { pageFrame, toPageSpace, usePagePreview } from "@/components/pdf/pageGeometry";

type Side = "top" | "right" | "bottom" | "left";
type Margins = Record<Side, number>;

// Which part of the crop rectangle is being dragged
type Handle = "move" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

type ApplyTo = "all" | "current" | "range";

const MM = 72 / 25.4;

// Smallest crop we allow, in points (10 mm)
const MIN_SIZE = 10 * MM;

const NO_MARGINS: Margins = { top: 0, right: 0, bottom: 0, left: 0 };

const HANDLES: { handle: Handle; label: string; className: string }[] = [
  { handle: "nw", label: "top left corner", className: "-left-2 -top-2 cursor-nwse-resize" },
  { handle: "n", label: "top edge", className: "-top-2 left-1/2 -translate-x-1/2 cursor-ns-resize" },
  { handle: "ne", label: "top right corner", className: "-right-2 -top-2 cursor-nesw-resize" },
  { handle: "e", label: "right edge", className: "-right-2 top-1/2 -translate-y-1/2 cursor-ew-resize" },
  { handle: "se", label: "bottom right corner", className: "-bottom-2 -right-2 cursor-nwse-resize" },
  { handle: "s", label: "bottom edge", className: "-bottom-2 left-1/2 -translate-x-1/2 cursor-ns-resize" },
  { handle: "sw", label: "bottom left corner", className: "-bottom-2 -left-2 cursor-nesw-resize" },
  { handle: "w", label: "left edge", className: "-left-2 top-1/2 -translate-y-1/2 cursor-ew-resize" },
];

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

const toMm = (points: number) => Math.round((points / MM) * 10) / 10;

// New margins (in points) after dragging a handle by dx, dy points
function dragMargins(
  start: Margins,
  handle: Handle,
  dx: number,
  dy: number,
  width: number,
  height: number
): Margins {
  const next = { ...start };

  if (handle === "move") {
    next.left = clamp(start.left + dx, 0, start.left + start.right);
    next.right = start.left + start.right - next.left;
    next.top = clamp(start.top + dy, 0, start.top + start.bottom);
    next.bottom = start.top + start.bottom - next.top;
    return next;
  }

  if (handle.includes("n")) next.top = clamp(start.top + dy, 0, height - start.bottom - MIN_SIZE);
  if (handle.includes("s")) next.bottom = clamp(start.bottom - dy, 0, height - start.top - MIN_SIZE);
  if (handle.includes("w")) next.left = clamp(start.left + dx, 0, width - start.right - MIN_SIZE);
  if (handle.includes("e")) next.right = clamp(start.right - dx, 0, width - start.left - MIN_SIZE);

  return next;
}

// Number input in mm that doesn't fight the user while they type
function MarginInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <label className="block text-sm font-semibold text-gray-700">
      {label}
      <input
        type="number"
        min={0}
        step={0.5}
        inputMode="decimal"
        value={draft ?? String(toMm(value))}
        onChange={(event) => {
          const text = event.target.value;
          const mm = Number(text);

          setDraft(text);

          if (text !== "" && Number.isFinite(mm) && mm >= 0) {
            onChange(mm * MM);
          }
        }}
        onBlur={() => setDraft(null)}
        className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-normal text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

export default function CropPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);

  // Page shown in the editor (1-based)
  const [pageNumber, setPageNumber] = useState(1);

  // Space trimmed from each side, in points, as the page is seen on screen
  const [margins, setMargins] = useState<Margins>(NO_MARGINS);

  const [applyTo, setApplyTo] = useState<ApplyTo>("all");
  const [range, setRange] = useState("1");

  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<Blob | null>(null);

  const { pdf, pageCount, error } = usePdfPreviews(bytes, { maxPages: 1 });
  const preview = usePagePreview(pdf, pageNumber, 1000);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    handle: Handle;
    x: number;
    y: number;
    start: Margins;
    scale: number;
  } | null>(null);

  const outputName = file ? `${baseName(file.name)}-cropped.pdf` : "cropped.pdf";

  const hasCrop = Object.values(margins).some((value) => value > 0.01);

  // Size of the crop on the page being shown
  const cropWidth = preview ? preview.width - margins.left - margins.right : 0;
  const cropHeight = preview ? preview.height - margins.top - margins.bottom : 0;
  const tooSmall = preview !== null && (cropWidth < MIN_SIZE - 0.01 || cropHeight < MIN_SIZE - 0.01);

  let rangeError: string | null = null;

  if (applyTo === "range" && pageCount > 0) {
    try {
      parsePageRanges(range, pageCount);
    } catch (parseError) {
      rangeError = parseError instanceof Error ? parseError.message : String(parseError);
    }
  }

  const problem = tooSmall
    ? "The crop is too small. Keep at least 10 mm of the page in each direction."
    : rangeError;

  const updateMargins = (next: Margins) => {
    setMargins(next);
    setResult(null);
  };

  const handleFiles = async ([selected]: File[]) => {
    setFile(selected);
    setBytes(await readFileBytes(selected));
    setPageNumber(1);
    setMargins(NO_MARGINS);
    setResult(null);
  };

  // Dragging with pointer events works for mouse, pen and touch
  const startDrag = (event: ReactPointerEvent<HTMLElement>, handle: Handle) => {
    if (!preview || !containerRef.current) return;

    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);

    dragRef.current = {
      handle,
      x: event.clientX,
      y: event.clientY,
      start: margins,
      scale: preview.width / containerRef.current.clientWidth,
    };
  };

  const moveDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;

    if (!drag || !preview) return;

    const dx = (event.clientX - drag.x) * drag.scale;
    const dy = (event.clientY - drag.y) * drag.scale;

    updateMargins(dragMargins(drag.start, drag.handle, dx, dy, preview.width, preview.height));
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const handleSave = async () => {
    if (!bytes || problem || !hasCrop) return;

    setIsSaving(true);

    try {
      const { PDFDocument } = await loadPdfLib();
      const doc = await PDFDocument.load(bytes);
      const pages = doc.getPages();

      const targets =
        applyTo === "all"
          ? pages.map((_, index) => index)
          : applyTo === "current"
            ? [pageNumber - 1]
            : parsePageRanges(range, pages.length);

      // Check every page first, so we never save a half-cropped file
      const tooSmallPage = targets.find((index) => {
        const frame = pageFrame(pages[index]);

        return (
          frame.visibleWidth - margins.left - margins.right < MIN_SIZE - 0.01 ||
          frame.visibleHeight - margins.top - margins.bottom < MIN_SIZE - 0.01
        );
      });

      if (tooSmallPage !== undefined) {
        alert(`Page ${tooSmallPage + 1} is smaller than the other pages, so these margins would leave less than 10 mm of it. Use smaller margins or crop that page separately.`);
        return;
      }

      for (const index of targets) {
        const page = pages[index];
        const frame = pageFrame(page);

        // Corners of the crop as seen on screen, turned into page coordinates.
        // This takes care of rotated pages and existing crop offsets.
        const a = toPageSpace(frame, margins.left, margins.bottom);
        const b = toPageSpace(
          frame,
          frame.visibleWidth - margins.right,
          frame.visibleHeight - margins.top
        );

        page.setCropBox(
          Math.min(a.x, b.x),
          Math.min(a.y, b.y),
          Math.abs(b.x - a.x),
          Math.abs(b.y - a.y)
        );
      }

      const blob = pdfBlob(await doc.save());

      setResult(blob);
      downloadBlob(blob, outputName);
    } catch (saveError) {
      console.error(saveError);
      alert(pdfErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setBytes(null);
    setMargins(NO_MARGINS);
    setResult(null);
  };

  const toggleClass = (active: boolean) =>
    `rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
      active
        ? "border-blue-600 bg-blue-50 text-blue-700"
        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
    }`;

  // Crop rectangle position in % of the page shown (kept inside the page)
  const box = preview
    ? {
        left: clamp(margins.left / preview.width, 0, 1) * 100,
        top: clamp(margins.top / preview.height, 0, 1) * 100,
        width: clamp(cropWidth / preview.width, 0, 1) * 100,
        height: clamp(cropHeight / preview.height, 0, 1) * 100,
      }
    : null;

  return (
    <div className="bg-gray-50 px-6 py-12 text-gray-900 sm:px-10 lg:px-16 sm:py-16">

      <div className="mx-auto max-w-6xl">

        <ToolHero
          icon="✂"
          badge="Crop PDF"
          title="Crop PDF Pages"
          highlight="Online for Free"
          description="Trim white margins or cut a PDF down to the part you need. Drag the crop box or type exact margins, then download the cropped file."
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
                    ? `${pageCount} ${pageCount === 1 ? "page" : "pages"} · drag the box or its handles to crop`
                    : error
                      ? "Could not read this PDF"
                      : "Reading PDF..."}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">

                <button
                  type="button"
                  onClick={() => updateMargins(NO_MARGINS)}
                  disabled={!hasCrop}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Reset crop
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                >
                  Remove PDF
                </button>

              </div>

            </div>

            {error && (
              <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </p>
            )}

            {!error && (
              <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">

                {/* Page with crop box */}

                <div className="min-w-0 rounded-xl border border-gray-200 bg-gray-50 p-4">

                  <div className="flex items-center justify-between gap-3">

                    <button
                      type="button"
                      onClick={() => setPageNumber((page) => Math.max(1, page - 1))}
                      disabled={pageNumber <= 1}
                      aria-label="Previous page"
                      className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-lg text-gray-700 shadow-sm transition hover:bg-blue-50 hover:text-blue-600 disabled:opacity-40"
                    >
                      ‹
                    </button>

                    <span className="text-sm font-medium text-gray-600">
                      Page {pageNumber} of {pageCount || "…"}
                    </span>

                    <button
                      type="button"
                      onClick={() => setPageNumber((page) => Math.min(pageCount, page + 1))}
                      disabled={pageNumber >= pageCount}
                      aria-label="Next page"
                      className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-lg text-gray-700 shadow-sm transition hover:bg-blue-50 hover:text-blue-600 disabled:opacity-40"
                    >
                      ›
                    </button>

                  </div>

                  <div className="mt-4 flex justify-center px-2 pb-2">
                    {preview && box ? (
                      <div
                        ref={containerRef}
                        className="relative w-full max-w-xl touch-none select-none shadow-sm"
                        style={{ maxWidth: `min(36rem, ${(70 * preview.width) / preview.height}vh)` }}
                      >

                        <img
                          src={preview.url}
                          alt={`Page ${pageNumber}`}
                          draggable={false}
                          className="block w-full"
                        />

                        {/* Darken the trimmed area */}
                        <div className="pointer-events-none absolute inset-0 overflow-hidden">
                          <div
                            className="absolute shadow-[0_0_0_9999px_rgba(17,24,39,0.45)]"
                            style={{
                              left: `${box.left}%`,
                              top: `${box.top}%`,
                              width: `${box.width}%`,
                              height: `${box.height}%`,
                            }}
                          />
                        </div>

                        <div
                          data-crop-box
                          onPointerDown={(event) => startDrag(event, "move")}
                          onPointerMove={moveDrag}
                          onPointerUp={endDrag}
                          onPointerCancel={endDrag}
                          className="absolute cursor-move border-2 border-blue-600"
                          style={{
                            left: `${box.left}%`,
                            top: `${box.top}%`,
                            width: `${box.width}%`,
                            height: `${box.height}%`,
                          }}
                        >
                          {/* Moves from a captured handle bubble up to the box */}
                          {HANDLES.map(({ handle, label, className }) => (
                            <span
                              key={handle}
                              data-handle={handle}
                              title={`Drag the ${label}`}
                              onPointerDown={(event) => startDrag(event, handle)}
                              className={`absolute h-4 w-4 rounded-sm border-2 border-blue-600 bg-white before:absolute before:-inset-3 before:content-[''] ${className}`}
                            />
                          ))}
                        </div>

                      </div>
                    ) : (
                      <p className="flex h-80 items-center text-sm text-gray-500">
                        Loading page...
                      </p>
                    )}
                  </div>

                </div>

                {/* Options */}

                <div className="space-y-6">

                  <fieldset>
                    <legend className="text-sm font-semibold text-gray-700">
                      Margins to trim (mm)
                    </legend>

                    <div className="mt-2 grid grid-cols-2 gap-4">
                      {(["top", "right", "bottom", "left"] as Side[]).map((side) => (
                        <MarginInput
                          key={side}
                          label={side[0].toUpperCase() + side.slice(1)}
                          value={margins[side]}
                          onChange={(value) => updateMargins({ ...margins, [side]: value })}
                        />
                      ))}
                    </div>

                    {preview && !tooSmall && (
                      <p className="mt-3 text-sm text-gray-500">
                        Page {pageNumber} after cropping: {toMm(cropWidth)} × {toMm(cropHeight)} mm
                        (was {toMm(preview.width)} × {toMm(preview.height)} mm)
                      </p>
                    )}
                  </fieldset>

                  <fieldset>
                    <legend className="text-sm font-semibold text-gray-700">
                      Apply to
                    </legend>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {([
                        ["all", "All pages"],
                        ["current", `Page ${pageNumber} only`],
                        ["range", "Choose pages"],
                      ] as [ApplyTo, string][]).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            setApplyTo(value);
                            setResult(null);
                          }}
                          aria-pressed={applyTo === value}
                          className={toggleClass(applyTo === value)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {applyTo === "range" && (
                      <label className="mt-4 block text-sm font-semibold text-gray-700">
                        Page numbers
                        <input
                          type="text"
                          value={range}
                          placeholder="e.g. 1-3, 5"
                          onChange={(event) => {
                            setRange(event.target.value);
                            setResult(null);
                          }}
                          className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-normal text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                      </label>
                    )}

                    <p className="mt-3 text-xs leading-5 text-gray-500">
                      Margins are measured from each page&apos;s own edges, as you
                      see the page on screen.
                    </p>
                  </fieldset>

                  {problem && (
                    <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      {problem}
                    </p>
                  )}

                  <p className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
                    Cropping hides the trimmed area; it isn&apos;t deleted. The
                    content outside the crop box stays in the file and can be
                    brought back with a PDF editor, so use Redact PDF to remove
                    sensitive content.
                  </p>

                </div>

              </div>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={pageCount === 0 || !hasCrop || !!problem || !!error || isSaving}
              className="mt-8 w-full rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving
                ? "Cropping..."
                : hasCrop
                  ? "Crop PDF"
                  : "Drag the box or enter margins to crop"}
            </button>

          </div>
        )}

        {result && (
          <ResultCard
            fileName={outputName}
            size={result.size}
            onDownload={() => downloadBlob(result, outputName)}
            onReset={handleReset}
            resetLabel="Crop another PDF"
          />
        )}

      </div>

    </div>
  );
}
