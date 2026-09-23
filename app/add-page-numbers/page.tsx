"use client";

import { useState } from "react";
import ToolHero from "@/components/ToolHero";
import PdfDropzone from "@/components/pdf/PdfDropzone";
import ResultCard from "@/components/pdf/ResultCard";
import { usePdfPreviews } from "@/components/pdf/usePdfPreviews";
import {
  baseName,
  downloadBlob,
  loadPdfLib,
  pdfBlob,
  pdfErrorMessage,
  readFileBytes,
} from "@/lib/pdf";
import {
  CAP_HEIGHT,
  DESCENT,
  hexToRgb,
  isolateExistingContent,
  measureText,
  pageFrame,
  toPageSpace,
  usePagePreview,
} from "@/components/pdf/pageGeometry";

type Vertical = "top" | "bottom";
type Horizontal = "left" | "center" | "right";
type Position = `${Vertical}-${Horizontal}`;

const POSITIONS: Position[] = [
  "top-left",
  "top-center",
  "top-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];

const FORMATS = [
  { id: "number", label: "1", make: (n: number) => `${n}` },
  { id: "page", label: "Page 1", make: (n: number) => `Page ${n}` },
  { id: "page-of", label: "Page 1 of 12", make: (n: number, total: number) => `Page ${n} of ${total}` },
  { id: "slash", label: "1 / 12", make: (n: number, total: number) => `${n} / ${total}` },
];

const COLORS = [
  { name: "Black", hex: "#111827" },
  { name: "Gray", hex: "#6b7280" },
  { name: "Blue", hex: "#2563eb" },
  { name: "Red", hex: "#dc2626" },
];

const MM = 72 / 25.4;

function positionLabel(position: Position) {
  const text = position.replace("-", " ");

  return text[0].toUpperCase() + text.slice(1);
}

// Where the text starts (left end of the baseline) on the visible page,
// measured from its bottom left corner in points
function numberOrigin(
  pageWidth: number,
  pageHeight: number,
  textWidth: number,
  size: number,
  margin: number,
  position: Position
) {
  const [vertical, horizontal] = position.split("-") as [Vertical, Horizontal];

  const x =
    horizontal === "left"
      ? margin
      : horizontal === "center"
        ? (pageWidth - textWidth) / 2
        : pageWidth - margin - textWidth;

  const y =
    vertical === "bottom"
      ? margin + size * DESCENT
      : pageHeight - margin - size * CAP_HEIGHT;

  return { x, y };
}

export default function AddPageNumbers() {
  const [file, setFile] = useState<File | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);

  const [position, setPosition] = useState<Position>("bottom-center");
  const [formatId, setFormatId] = useState("number");
  const [startNumber, setStartNumber] = useState("1");
  const [firstPage, setFirstPage] = useState("1");
  const [fontSize, setFontSize] = useState("12");
  const [marginMm, setMarginMm] = useState("10");
  const [color, setColor] = useState(COLORS[0].hex);

  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<Blob | null>(null);

  const { pdf, pageCount, error } = usePdfPreviews(bytes, { maxPages: 1 });

  const outputName = file ? `${baseName(file.name)}-numbered.pdf` : "numbered.pdf";
  const format = FORMATS.find((item) => item.id === formatId) ?? FORMATS[0];

  // Read and check the options
  const start = Number(startNumber);
  const from = Number(firstPage);
  const size = Number(fontSize);
  const margin = Number(marginMm);

  const problem =
    !Number.isInteger(start) || start < 0 || startNumber === ""
      ? "Start number must be a whole number (0 or more)."
      : pageCount > 0 && (!Number.isInteger(from) || from < 1 || from > pageCount)
        ? `"Start numbering from page" must be between 1 and ${pageCount}.`
        : !(size >= 6 && size <= 72)
          ? "Font size must be between 6 and 72."
          : !(margin >= 0 && margin <= 50) || marginMm === ""
            ? "Margin must be between 0 and 50 mm."
            : null;

  const numberedCount = pageCount > 0 && !problem ? pageCount - from + 1 : 0;
  const lastNumber = start + numberedCount - 1;

  // Preview the first page that gets a number
  const preview = usePagePreview(pdf, problem ? 1 : from, 600);
  const previewText = format.make(start, lastNumber);

  const resetResult = () => setResult(null);

  const handleFiles = async ([selected]: File[]) => {
    setFile(selected);
    setBytes(await readFileBytes(selected));
    setFirstPage("1");
    setResult(null);
  };

  const handleSave = async () => {
    if (!bytes || problem) return;

    setIsSaving(true);

    try {
      const { PDFDocument, StandardFonts, degrees, rgb } = await loadPdfLib();
      const doc = await PDFDocument.load(bytes);
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const { r, g, b } = hexToRgb(color);

      doc.getPages().forEach((page, index) => {
        if (index < from - 1) return;

        const text = format.make(start + index - (from - 1), lastNumber);
        const frame = pageFrame(page);
        const textWidth = font.widthOfTextAtSize(text, size);

        const origin = numberOrigin(
          frame.visibleWidth,
          frame.visibleHeight,
          textWidth,
          size,
          margin * MM,
          position
        );

        const point = toPageSpace(frame, origin.x, origin.y);

        isolateExistingContent(page);

        // Turn the text with the page so it reads upright in viewers
        page.drawText(text, {
          x: point.x,
          y: point.y,
          size,
          font,
          color: rgb(r, g, b),
          rotate: degrees(frame.rotation),
        });
      });

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
    setResult(null);
  };

  const inputClass =
    "mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-normal text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";

  return (
    <div className="bg-gray-50 px-6 py-12 text-gray-900 sm:px-10 lg:px-16 sm:py-16">

      <div className="mx-auto max-w-6xl">

        <ToolHero
          icon="#"
          badge="Add Page Numbers"
          title="Add Page Numbers to PDF"
          highlight="Online for Free"
          description="Number the pages of your PDF in the header or footer. Pick the position, style and first page, then download the numbered file."
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
                    ? `${pageCount} ${pageCount === 1 ? "page" : "pages"}${numberedCount > 0 ? ` · ${numberedCount} will be numbered` : ""}`
                    : error
                      ? "Could not read this PDF"
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

            {error && (
              <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </p>
            )}

            {!error && (
              <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">

                {/* Options */}

                <div className="space-y-6">

                  <fieldset>
                    <legend className="text-sm font-semibold text-gray-700">
                      Position
                    </legend>

                    <div className="mt-2 grid max-w-xs grid-cols-3 gap-2">
                      {POSITIONS.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => {
                            setPosition(item);
                            resetResult();
                          }}
                          aria-label={positionLabel(item)}
                          aria-pressed={position === item}
                          title={positionLabel(item)}
                          className={`flex h-14 rounded-lg border-2 p-2 transition ${
                            item.startsWith("top") ? "items-start" : "items-end"
                          } ${
                            item.endsWith("left")
                              ? "justify-start"
                              : item.endsWith("center")
                                ? "justify-center"
                                : "justify-end"
                          } ${
                            position === item
                              ? "border-blue-600 bg-blue-50"
                              : "border-gray-200 bg-white hover:border-blue-300"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-5 rounded-full ${
                              position === item ? "bg-blue-600" : "bg-gray-300"
                            }`}
                          />
                        </button>
                      ))}
                    </div>

                    <p className="mt-2 text-sm text-gray-500">
                      {positionLabel(position)}
                    </p>
                  </fieldset>

                  <div className="grid gap-5 sm:grid-cols-2">

                    <label className="block text-sm font-semibold text-gray-700">
                      Format
                      <select
                        value={formatId}
                        onChange={(event) => {
                          setFormatId(event.target.value);
                          resetResult();
                        }}
                        className={inputClass}
                      >
                        {FORMATS.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block text-sm font-semibold text-gray-700">
                      Start number
                      <input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={startNumber}
                        onChange={(event) => {
                          setStartNumber(event.target.value);
                          resetResult();
                        }}
                        className={inputClass}
                      />
                    </label>

                    <label className="block text-sm font-semibold text-gray-700">
                      Start numbering from page
                      <input
                        type="number"
                        min={1}
                        max={pageCount || undefined}
                        inputMode="numeric"
                        value={firstPage}
                        onChange={(event) => {
                          setFirstPage(event.target.value);
                          resetResult();
                        }}
                        className={inputClass}
                      />
                      <span className="mt-1 block text-xs font-normal text-gray-500">
                        Earlier pages (like a cover) get no number.
                      </span>
                    </label>

                    <label className="block text-sm font-semibold text-gray-700">
                      Font size (pt)
                      <input
                        type="number"
                        min={6}
                        max={72}
                        inputMode="numeric"
                        value={fontSize}
                        onChange={(event) => {
                          setFontSize(event.target.value);
                          resetResult();
                        }}
                        className={inputClass}
                      />
                    </label>

                    <label className="block text-sm font-semibold text-gray-700">
                      Margin from edge (mm)
                      <input
                        type="number"
                        min={0}
                        max={50}
                        inputMode="decimal"
                        value={marginMm}
                        onChange={(event) => {
                          setMarginMm(event.target.value);
                          resetResult();
                        }}
                        className={inputClass}
                      />
                    </label>

                    <fieldset>
                      <legend className="text-sm font-semibold text-gray-700">
                        Colour
                      </legend>

                      <div className="mt-2 flex gap-3">
                        {COLORS.map((item) => (
                          <button
                            key={item.hex}
                            type="button"
                            onClick={() => {
                              setColor(item.hex);
                              resetResult();
                            }}
                            aria-label={item.name}
                            aria-pressed={color === item.hex}
                            title={item.name}
                            className={`h-10 w-10 rounded-full border-2 transition ${
                              color === item.hex
                                ? "border-blue-600 ring-2 ring-blue-200"
                                : "border-white ring-1 ring-gray-300"
                            }`}
                            style={{ backgroundColor: item.hex }}
                          />
                        ))}
                      </div>
                    </fieldset>

                  </div>

                  {problem && (
                    <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      {problem}
                    </p>
                  )}

                </div>

                {/* Preview */}

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">

                  <p className="text-sm font-semibold text-gray-700">
                    Preview · page {problem ? 1 : from}
                  </p>

                  <div className="mt-3 flex min-h-64 items-center justify-center">
                    {preview ? (
                      <div className="relative w-full max-w-sm shadow-sm">

                        <img
                          src={preview.url}
                          alt={`Preview of page ${problem ? 1 : from}`}
                          className="block w-full"
                        />

                        {!problem && (
                          <svg
                            className="absolute inset-0 h-full w-full"
                            viewBox={`0 0 ${preview.width} ${preview.height}`}
                            preserveAspectRatio="none"
                            aria-hidden="true"
                          >
                            {(() => {
                              const origin = numberOrigin(
                                preview.width,
                                preview.height,
                                measureText(previewText, size),
                                size,
                                margin * MM,
                                position
                              );

                              return (
                                <text
                                  x={origin.x}
                                  y={preview.height - origin.y}
                                  fontSize={size}
                                  fill={color}
                                  fontFamily="Helvetica, Arial, sans-serif"
                                >
                                  {previewText}
                                </text>
                              );
                            })()}
                          </svg>
                        )}

                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">
                        Loading preview...
                      </p>
                    )}
                  </div>

                </div>

              </div>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={pageCount === 0 || !!problem || !!error || isSaving}
              className="mt-8 w-full rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Adding page numbers..." : "Add page numbers"}
            </button>

          </div>
        )}

        {result && (
          <ResultCard
            fileName={outputName}
            size={result.size}
            onDownload={() => downloadBlob(result, outputName)}
            onReset={handleReset}
            resetLabel="Number another PDF"
          />
        )}

      </div>

    </div>
  );
}
