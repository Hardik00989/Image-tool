"use client";

import { useEffect, useState } from "react";
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
import {
  CAP_HEIGHT,
  hexToRgb,
  isolateExistingContent,
  measureText,
  pageFrame,
  toPageSpace,
  usePagePreview,
} from "@/components/pdf/pageGeometry";

type Mode = "text" | "image";

type WatermarkImage = {
  name: string;
  url: string;
  bytes: Uint8Array;
  isPng: boolean;
  width: number;
  height: number;
};

const COLORS = [
  { name: "Gray", hex: "#6b7280" },
  { name: "Red", hex: "#dc2626" },
  { name: "Blue", hex: "#2563eb" },
  { name: "Black", hex: "#111827" },
];

// Extra characters the standard PDF fonts (WinAnsi encoding) can draw
const WIN_ANSI_EXTRAS = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";

function canDrawText(text: string) {
  return [...text].every((char) => {
    const code = char.codePointAt(0) ?? 0;

    return (code >= 32 && code <= 126) || (code >= 160 && code <= 255) || WIN_ANSI_EXTRAS.includes(char);
  });
}

// Where each copy of the text starts (left end of the baseline) on the
// visible page, in points from its bottom left corner. The text is centred
// on each point and turned `angle` degrees counter-clockwise.
function textOrigins(
  pageWidth: number,
  pageHeight: number,
  textWidth: number,
  size: number,
  angle: number,
  tiled: boolean
) {
  const radians = (angle * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const halfHeight = (size * CAP_HEIGHT) / 2;

  const originFor = (cx: number, cy: number) => ({
    x: cx - (textWidth / 2) * cos + halfHeight * sin,
    y: cy - (textWidth / 2) * sin - halfHeight * cos,
  });

  const cx = pageWidth / 2;
  const cy = pageHeight / 2;

  if (!tiled) {
    return [originFor(cx, cy)];
  }

  // Rows of copies along the text direction, every other row shifted
  const stepX = textWidth + size * 2;
  const stepY = size * 3.5;
  const reach = Math.hypot(pageWidth, pageHeight) / 2 + textWidth;
  const columns = Math.ceil(reach / stepX) + 1;
  const rows = Math.ceil(reach / stepY) + 1;
  const origins: { x: number; y: number }[] = [];

  for (let row = -rows; row <= rows; row++) {
    for (let column = -columns; column <= columns; column++) {
      const along = column * stepX + (row % 2 === 0 ? 0 : stepX / 2);
      const across = row * stepY;
      const x = cx + along * cos - across * sin;
      const y = cy + along * sin + across * cos;

      // Skip copies that would fall completely outside the page
      if (Math.abs(x - cx) <= cx + textWidth / 2 && Math.abs(y - cy) <= cy + textWidth / 2) {
        origins.push(originFor(x, y));
      }
    }
  }

  // Very small text on a big page: keep the file size sensible
  return origins.slice(0, 600);
}

// Centred image box on the visible page, `sizePercent` of the page width
function imageBox(
  pageWidth: number,
  pageHeight: number,
  image: { width: number; height: number },
  sizePercent: number
) {
  let width = (pageWidth * sizePercent) / 100;
  let height = (width * image.height) / image.width;

  if (height > pageHeight) {
    width *= pageHeight / height;
    height = pageHeight;
  }

  return {
    x: (pageWidth - width) / 2,
    y: (pageHeight - height) / 2,
    width,
    height,
  };
}

export default function AddWatermark() {
  const [file, setFile] = useState<File | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);

  const [mode, setMode] = useState<Mode>("text");

  // Text watermark
  const [text, setText] = useState("CONFIDENTIAL");
  const [fontSize, setFontSize] = useState(60);
  const [color, setColor] = useState(COLORS[0].hex);
  const [angle, setAngle] = useState(45);
  const [tiled, setTiled] = useState(false);

  // Image watermark
  const [image, setImage] = useState<WatermarkImage | null>(null);
  const [imageSize, setImageSize] = useState(50);

  const [opacity, setOpacity] = useState(30);

  // Which pages get the watermark
  const [allPages, setAllPages] = useState(true);
  const [range, setRange] = useState("1");

  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<Blob | null>(null);

  const { pdf, pageCount, error } = usePdfPreviews(bytes, { maxPages: 1 });

  const outputName = file ? `${baseName(file.name)}-watermarked.pdf` : "watermarked.pdf";

  // Release the image preview URL when it is replaced or the page closes
  useEffect(() => {
    const url = image?.url;

    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [image]);

  // Work out the selected pages and anything that stops us saving
  let pages: number[] = [];
  let rangeError: string | null = null;

  if (pageCount > 0) {
    if (allPages) {
      pages = Array.from({ length: pageCount }, (_, index) => index);
    } else {
      try {
        pages = parsePageRanges(range, pageCount);
      } catch (parseError) {
        rangeError = parseError instanceof Error ? parseError.message : String(parseError);
      }
    }
  }

  const problem =
    rangeError ??
    (mode === "text" && text.trim() === ""
      ? "Enter the watermark text."
      : mode === "text" && !canDrawText(text)
        ? "The watermark text can only use Latin letters, numbers and common symbols (the standard PDF font can't show other scripts or emoji)."
        : mode === "image" && !image
          ? "Choose a PNG or JPG image for the watermark."
          : null);

  const previewPage = (pages[0] ?? 0) + 1;
  const preview = usePagePreview(pdf, previewPage, 600);

  const resetResult = () => setResult(null);

  const handleFiles = async ([selected]: File[]) => {
    setFile(selected);
    setBytes(await readFileBytes(selected));
    setResult(null);
  };

  const handleImage = async (selected: File | undefined) => {
    if (!selected) return;

    const imageBytes = await readFileBytes(selected);

    // Check the file signature rather than trusting the name
    const isPng = imageBytes[0] === 0x89 && imageBytes[1] === 0x50;
    const isJpg = imageBytes[0] === 0xff && imageBytes[1] === 0xd8;

    if (!isPng && !isJpg) {
      alert("Please choose a PNG or JPG image.");
      return;
    }

    const url = URL.createObjectURL(selected);

    try {
      const element = new Image();
      element.src = url;
      await element.decode();

      setImage({
        name: selected.name,
        url,
        bytes: imageBytes,
        isPng,
        width: element.naturalWidth,
        height: element.naturalHeight,
      });

      setResult(null);
    } catch {
      URL.revokeObjectURL(url);
      alert("This image couldn't be read. Try another PNG or JPG file.");
    }
  };

  const handleSave = async () => {
    if (!bytes || problem || pages.length === 0) return;

    setIsSaving(true);

    try {
      const { PDFDocument, StandardFonts, degrees, rgb } = await loadPdfLib();
      const doc = await PDFDocument.load(bytes);
      const docPages = doc.getPages();

      const font = mode === "text" ? await doc.embedFont(StandardFonts.HelveticaBold) : null;

      const embedded =
        mode === "image" && image
          ? image.isPng
            ? await doc.embedPng(image.bytes)
            : await doc.embedJpg(image.bytes)
          : null;

      const { r, g, b } = hexToRgb(color);

      for (const index of pages) {
        const page = docPages[index];
        const frame = pageFrame(page);

        isolateExistingContent(page);

        if (font) {
          const textWidth = font.widthOfTextAtSize(text, fontSize);

          const origins = textOrigins(
            frame.visibleWidth,
            frame.visibleHeight,
            textWidth,
            fontSize,
            angle,
            tiled
          );

          for (const origin of origins) {
            const point = toPageSpace(frame, origin.x, origin.y);

            // Add the page rotation so the text looks the same in viewers
            page.drawText(text, {
              x: point.x,
              y: point.y,
              size: fontSize,
              font,
              color: rgb(r, g, b),
              opacity: opacity / 100,
              rotate: degrees(angle + frame.rotation),
            });
          }
        }

        if (embedded) {
          const box = imageBox(frame.visibleWidth, frame.visibleHeight, embedded, imageSize);
          const point = toPageSpace(frame, box.x, box.y);

          page.drawImage(embedded, {
            x: point.x,
            y: point.y,
            width: box.width,
            height: box.height,
            opacity: opacity / 100,
            rotate: degrees(frame.rotation),
          });
        }
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
    setResult(null);
  };

  const inputClass =
    "mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-normal text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";

  const toggleClass = (active: boolean) =>
    `rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
      active
        ? "border-blue-600 bg-blue-50 text-blue-700"
        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
    }`;

  // Overlay drawn on top of the preview image, in PDF points
  const renderOverlay = (width: number, height: number) => {
    if (mode === "image") {
      if (!image) return null;

      const box = imageBox(width, height, image, imageSize);

      return (
        <image
          href={image.url}
          x={box.x}
          y={height - box.y - box.height}
          width={box.width}
          height={box.height}
          opacity={opacity / 100}
          preserveAspectRatio="none"
        />
      );
    }

    if (!text.trim()) return null;

    const origins = textOrigins(
      width,
      height,
      measureText(text, fontSize, true),
      fontSize,
      angle,
      tiled
    );

    return origins.map((origin, index) => (
      <text
        key={index}
        x={origin.x}
        y={height - origin.y}
        transform={`rotate(${-angle} ${origin.x} ${height - origin.y})`}
        fontSize={fontSize}
        fontWeight="bold"
        fill={color}
        fillOpacity={opacity / 100}
        fontFamily="Helvetica, Arial, sans-serif"
      >
        {text}
      </text>
    ));
  };

  return (
    <div className="bg-gray-50 px-6 py-12 text-gray-900 sm:px-10 lg:px-16 sm:py-16">

      <div className="mx-auto max-w-6xl">

        <ToolHero
          icon="💧"
          badge="Add Watermark"
          title="Add Watermark to PDF"
          highlight="Online for Free"
          description="Stamp text like CONFIDENTIAL or your logo on the pages of a PDF. Adjust size, opacity and angle with a live preview."
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
                    ? `${pageCount} ${pageCount === 1 ? "page" : "pages"}${pages.length > 0 ? ` · watermark on ${pages.length} ${pages.length === 1 ? "page" : "pages"}` : ""}`
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

                  <div className="flex flex-wrap gap-3" role="group" aria-label="Watermark type">
                    <button
                      type="button"
                      onClick={() => {
                        setMode("text");
                        resetResult();
                      }}
                      aria-pressed={mode === "text"}
                      className={toggleClass(mode === "text")}
                    >
                      Text watermark
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMode("image");
                        resetResult();
                      }}
                      aria-pressed={mode === "image"}
                      className={toggleClass(mode === "image")}
                    >
                      Image watermark
                    </button>
                  </div>

                  {mode === "text" && (
                    <>
                      <label className="block text-sm font-semibold text-gray-700">
                        Watermark text
                        <input
                          type="text"
                          value={text}
                          maxLength={80}
                          onChange={(event) => {
                            setText(event.target.value);
                            resetResult();
                          }}
                          className={inputClass}
                        />
                      </label>

                      <div className="grid gap-5 sm:grid-cols-2">

                        <label className="block text-sm font-semibold text-gray-700">
                          Font size: {fontSize} pt
                          <input
                            type="range"
                            min={12}
                            max={160}
                            value={fontSize}
                            onChange={(event) => {
                              setFontSize(Number(event.target.value));
                              resetResult();
                            }}
                            className="mt-3 w-full accent-blue-600"
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

                      <div>
                        <label className="block text-sm font-semibold text-gray-700">
                          Rotation: {angle}°
                          <input
                            type="range"
                            min={-90}
                            max={90}
                            value={angle}
                            onChange={(event) => {
                              setAngle(Number(event.target.value));
                              resetResult();
                            }}
                            className="mt-3 w-full accent-blue-600"
                          />
                        </label>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {[
                            { label: "Horizontal", value: 0 },
                            { label: "Diagonal", value: 45 },
                            { label: "Vertical", value: 90 },
                          ].map((preset) => (
                            <button
                              key={preset.value}
                              type="button"
                              onClick={() => {
                                setAngle(preset.value);
                                resetResult();
                              }}
                              aria-pressed={angle === preset.value}
                              className={toggleClass(angle === preset.value)}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <fieldset>
                        <legend className="text-sm font-semibold text-gray-700">
                          Layout
                        </legend>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setTiled(false);
                              resetResult();
                            }}
                            aria-pressed={!tiled}
                            className={toggleClass(!tiled)}
                          >
                            Once in the centre
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setTiled(true);
                              resetResult();
                            }}
                            aria-pressed={tiled}
                            className={toggleClass(tiled)}
                          >
                            Tiled across the page
                          </button>
                        </div>
                      </fieldset>
                    </>
                  )}

                  {mode === "image" && (
                    <>
                      <div>
                        <p className="text-sm font-semibold text-gray-700">
                          Watermark image
                        </p>

                        <label className="mt-2 flex cursor-pointer items-center justify-between gap-4 rounded-xl border-2 border-dashed border-gray-300 px-4 py-3 transition hover:border-blue-400">
                          <span className="min-w-0 truncate text-sm text-gray-600">
                            {image ? image.name : "PNG or JPG (a transparent PNG works best)"}
                          </span>

                          <span className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
                            {image ? "Change" : "Choose image"}
                          </span>

                          <input
                            type="file"
                            accept="image/png,image/jpeg"
                            className="sr-only"
                            onChange={(event) => {
                              const input = event.target;

                              void handleImage(input.files?.[0]);
                              input.value = "";
                            }}
                          />
                        </label>
                      </div>

                      <label className="block text-sm font-semibold text-gray-700">
                        Size: {imageSize}% of page width
                        <input
                          type="range"
                          min={10}
                          max={100}
                          value={imageSize}
                          onChange={(event) => {
                            setImageSize(Number(event.target.value));
                            resetResult();
                          }}
                          className="mt-3 w-full accent-blue-600"
                        />
                      </label>
                    </>
                  )}

                  <label className="block text-sm font-semibold text-gray-700">
                    Opacity: {opacity}%
                    <input
                      type="range"
                      min={5}
                      max={100}
                      value={opacity}
                      onChange={(event) => {
                        setOpacity(Number(event.target.value));
                        resetResult();
                      }}
                      className="mt-3 w-full accent-blue-600"
                    />
                  </label>

                  <fieldset>
                    <legend className="text-sm font-semibold text-gray-700">
                      Pages
                    </legend>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAllPages(true);
                          resetResult();
                        }}
                        aria-pressed={allPages}
                        className={toggleClass(allPages)}
                      >
                        All pages
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAllPages(false);
                          resetResult();
                        }}
                        aria-pressed={!allPages}
                        className={toggleClass(!allPages)}
                      >
                        Choose pages
                      </button>
                    </div>

                    {!allPages && (
                      <label className="mt-4 block text-sm font-semibold text-gray-700">
                        Page numbers
                        <input
                          type="text"
                          value={range}
                          placeholder="e.g. 1-3, 5"
                          onChange={(event) => {
                            setRange(event.target.value);
                            resetResult();
                          }}
                          className={inputClass}
                        />
                      </label>
                    )}
                  </fieldset>

                  {problem && (
                    <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      {problem}
                    </p>
                  )}

                </div>

                {/* Preview */}

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">

                  <p className="text-sm font-semibold text-gray-700">
                    Preview · page {previewPage}
                  </p>

                  <div className="mt-3 flex min-h-64 items-center justify-center">
                    {preview ? (
                      <div className="relative w-full max-w-sm overflow-hidden shadow-sm">

                        <img
                          src={preview.url}
                          alt={`Preview of page ${previewPage}`}
                          className="block w-full"
                        />

                        <svg
                          className="absolute inset-0 h-full w-full"
                          viewBox={`0 0 ${preview.width} ${preview.height}`}
                          preserveAspectRatio="none"
                          aria-hidden="true"
                        >
                          {renderOverlay(preview.width, preview.height)}
                        </svg>

                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">
                        Loading preview...
                      </p>
                    )}
                  </div>

                  <p className="mt-3 text-xs text-gray-500">
                    The watermark is added on top of the page content. It can be
                    removed by someone with a PDF editor, so it deters copying but
                    isn&apos;t a lock.
                  </p>

                </div>

              </div>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={pageCount === 0 || !!problem || !!error || isSaving}
              className="mt-8 w-full rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Adding watermark..." : "Add watermark"}
            </button>

          </div>
        )}

        {result && (
          <ResultCard
            fileName={outputName}
            size={result.size}
            onDownload={() => downloadBlob(result, outputName)}
            onReset={handleReset}
            resetLabel="Watermark another PDF"
          />
        )}

      </div>

    </div>
  );
}
