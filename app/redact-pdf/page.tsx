"use client";

import { useEffect, useRef, useState, type FormEvent, type PointerEvent } from "react";
import ToolHero from "@/components/ToolHero";
import PdfDropzone from "@/components/pdf/PdfDropzone";
import ResultCard from "@/components/pdf/ResultCard";
import { usePdfPreviews } from "@/components/pdf/usePdfPreviews";
import {
  baseName,
  canvasToBlob,
  downloadBlob,
  loadPdfLib,
  pdfBlob,
  pdfErrorMessage,
  readFileBytes,
  renderPageToCanvas,
} from "@/lib/pdf";
import PageCanvas from "@/components/pdf/PageCanvas";
import { findTextBoxes, type RedactBox } from "./find-text";

// Redacted pages are rendered at about 200 DPI (1 = 72 DPI)
const REDACT_SCALE = 200 / 72;
const MAX_CANVAS_SIDE = 8000;

type Drag = {
  mode: "move" | "draw";
  id: string;
  startX: number;
  startY: number;
  original: RedactBox;
};

let nextId = 1;
const newId = () => `box-${nextId++}`;

export default function RedactPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);

  const [pageIndex, setPageIndex] = useState(0);
  const [boxes, setBoxes] = useState<RedactBox[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const [progress, setProgress] = useState<string | null>(null);
  const [result, setResult] = useState<Blob | null>(null);

  const drag = useRef<Drag | null>(null);

  const { pdf, previews, pageCount, loading, error } = usePdfPreviews(bytes, { previewWidth: 120 });

  const outputName = file ? `${baseName(file.name)}-redacted.pdf` : "redacted.pdf";

  const pageBoxes = boxes.filter((box) => box.page === pageIndex);
  const redactedPages = new Set(boxes.map((box) => box.page)).size;
  const isWorking = progress !== null;

  const deleteBox = (id: string) => {
    setBoxes((previous) => previous.filter((box) => box.id !== id));
    setSelectedId(null);
    setResult(null);
  };

  // Delete key removes the selected box (but not while typing)
  useEffect(() => {
    if (!selectedId) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;

      if (target?.closest("input, textarea, select, [contenteditable]")) return;

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteBox(selectedId);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const handleFiles = async ([selectedFile]: File[]) => {
    setFile(selectedFile);
    setBytes(await readFileBytes(selectedFile));
    setBoxes([]);
    setSelectedId(null);
    setPageIndex(0);
    setSearchMessage(null);
    setResult(null);
  };

  const handleReset = () => {
    setFile(null);
    setBytes(null);
    setBoxes([]);
    setSelectedId(null);
    setPageIndex(0);
    setQuery("");
    setSearchMessage(null);
    setResult(null);
  };

  const goToPage = (index: number) => {
    setPageIndex(Math.max(0, Math.min(pageCount - 1, index)));
    setSelectedId(null);
  };

  // Find and redact: adds a box over every match on every page
  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();

    if (!pdf) return;

    if (!query.trim()) {
      setSearchMessage("Type a word or phrase to search for.");
      return;
    }

    setIsSearching(true);

    try {
      const found = await findTextBoxes(pdf, query);

      // Skip boxes that are already there (searching twice)
      const fresh = found.filter(
        (box) =>
          !boxes.some(
            (existing) =>
              existing.page === box.page &&
              Math.abs(existing.x - box.x) < 0.5 &&
              Math.abs(existing.y - box.y) < 0.5
          )
      );

      const pages = new Set(found.map((box) => box.page)).size;

      setBoxes((previous) => [...previous, ...fresh.map((box) => ({ ...box, id: newId() }))]);
      setResult(null);

      if (found.length === 0) {
        setSearchMessage(
          `No matches for "${query.trim()}". Scanned pages have no text to search — draw boxes by hand instead.`
        );
      } else {
        setSearchMessage(
          `Found ${found.length} ${found.length === 1 ? "match" : "matches"} on ${pages} ${pages === 1 ? "page" : "pages"}` +
            (fresh.length < found.length ? ` (${found.length - fresh.length} already marked).` : " — boxes added.")
        );
      }
    } catch (searchError) {
      console.error(searchError);
      setSearchMessage("The text of this PDF couldn't be searched.");
    } finally {
      setIsSearching(false);
    }
  };

  // Pointer handling on the page overlay (positions in PDF points)

  const pointerPosition = (event: PointerEvent<HTMLDivElement>, scale: number) => {
    const rect = event.currentTarget.getBoundingClientRect();

    return {
      x: (event.clientX - rect.left) / scale,
      y: (event.clientY - rect.top) / scale,
    };
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>, scale: number) => {
    if (event.button !== 0 || isWorking) return;

    const point = pointerPosition(event, scale);
    const boxNode = (event.target as HTMLElement).closest<HTMLElement>("[data-box-id]");

    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();

    // Drag an existing box to move it
    if (boxNode) {
      const original = boxes.find((box) => box.id === boxNode.dataset.boxId);

      if (!original) return;

      setSelectedId(original.id);
      drag.current = { mode: "move", id: original.id, startX: point.x, startY: point.y, original };
      return;
    }

    // Drag on an empty area to draw a new box
    const box: RedactBox = { id: newId(), page: pageIndex, x: point.x, y: point.y, w: 0, h: 0 };

    setBoxes((previous) => [...previous, box]);
    setSelectedId(box.id);
    setResult(null);
    drag.current = { mode: "draw", id: box.id, startX: point.x, startY: point.y, original: box };
  };

  const handlePointerMove = (
    event: PointerEvent<HTMLDivElement>,
    scale: number,
    pageWidth: number,
    pageHeight: number
  ) => {
    const current = drag.current;

    if (!current) return;

    const point = pointerPosition(event, scale);

    const update = (changes: Partial<RedactBox>) =>
      setBoxes((previous) =>
        previous.map((box) => (box.id === current.id ? { ...box, ...changes } : box))
      );

    if (current.mode === "move") {
      const { original } = current;

      update({
        x: Math.max(0, Math.min(pageWidth - original.w, original.x + point.x - current.startX)),
        y: Math.max(0, Math.min(pageHeight - original.h, original.y + point.y - current.startY)),
      });
      return;
    }

    const x = Math.max(0, Math.min(pageWidth, point.x));
    const y = Math.max(0, Math.min(pageHeight, point.y));

    update({
      x: Math.min(current.startX, x),
      y: Math.min(current.startY, y),
      w: Math.abs(x - current.startX),
      h: Math.abs(y - current.startY),
    });
  };

  const handlePointerUp = () => {
    const current = drag.current;

    drag.current = null;

    if (!current || current.mode !== "draw") return;

    // A click without dragging places a default-sized box
    setBoxes((previous) =>
      previous.map((box) =>
        box.id === current.id && (box.w < 3 || box.h < 3)
          ? { ...box, x: current.startX, y: Math.max(0, current.startY - 9), w: 120, h: 18 }
          : box
      )
    );
  };

  const handleApply = async () => {
    if (!bytes || !pdf || boxes.length === 0) return;

    setSelectedId(null);
    setProgress("Preparing...");

    try {
      const { PDFDocument } = await loadPdfLib();
      const source = await PDFDocument.load(bytes);
      const output = await PDFDocument.create();

      const total = source.getPageCount();

      for (let index = 0; index < total; index++) {
        const boxesOnPage = boxes.filter((box) => box.page === index);

        // Untouched pages are copied as they are, text included
        if (boxesOnPage.length === 0) {
          const [copied] = await output.copyPages(source, [index]);
          output.addPage(copied);
          continue;
        }

        setProgress(`Redacting page ${index + 1} of ${total}...`);

        // Redacted pages become an image with the boxes burned in,
        // so the covered text is really gone from the file
        const viewport = (await pdf.getPage(index + 1)).getViewport({ scale: 1 });
        const scale = Math.min(
          REDACT_SCALE,
          MAX_CANVAS_SIDE / viewport.width,
          MAX_CANVAS_SIDE / viewport.height
        );

        const canvas = await renderPageToCanvas(pdf, index + 1, scale);
        const context = canvas.getContext("2d")!;

        context.fillStyle = "#000000";

        boxesOnPage.forEach((box) => {
          const left = Math.floor(box.x * scale);
          const top = Math.floor(box.y * scale);

          context.fillRect(
            left,
            top,
            Math.ceil((box.x + box.w) * scale) - left,
            Math.ceil((box.y + box.h) * scale) - top
          );
        });

        const jpg = await canvasToBlob(canvas, "image/jpeg", 0.9);

        // Free the canvas memory before the next page
        canvas.width = 0;
        canvas.height = 0;

        const image = await output.embedJpg(new Uint8Array(await jpg.arrayBuffer()));
        const page = output.addPage([viewport.width, viewport.height]);

        page.drawImage(image, { x: 0, y: 0, width: viewport.width, height: viewport.height });
      }

      setProgress("Saving...");

      const blob = pdfBlob(await output.save());

      setResult(blob);
      downloadBlob(blob, outputName);
    } catch (applyError) {
      console.error(applyError);
      alert(pdfErrorMessage(applyError));
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="bg-gray-50 px-6 py-12 text-gray-900 sm:px-10 lg:px-16 sm:py-16">

      <div className="mx-auto max-w-6xl">

        <ToolHero
          icon="▮"
          badge="Redact PDF"
          title="Redact PDF Files"
          highlight="Online for Free"
          description="Black out names, numbers and other private details in your PDF. Draw boxes or search for text, and the covered content is permanently removed."
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
                  {pageCount > 0
                    ? `${pageCount} ${pageCount === 1 ? "page" : "pages"} · ${boxes.length} ${boxes.length === 1 ? "box" : "boxes"} on ${redactedPages} ${redactedPages === 1 ? "page" : "pages"}`
                    : "Reading PDF..."}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">

                <button
                  type="button"
                  onClick={() => {
                    setBoxes([]);
                    setSelectedId(null);
                    setSearchMessage(null);
                    setResult(null);
                  }}
                  disabled={boxes.length === 0 || isWorking}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Clear all boxes
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

            {pdf && pageCount > 0 && (
              <>
                <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                  Pages with black boxes are turned into images (about 200 DPI) so the hidden
                  content is truly removed — text on those pages can no longer be selected or
                  searched. Pages without boxes stay exactly as they are.
                </p>

                {/* Find and redact */}

                <form onSubmit={handleSearch} className="mt-6 flex flex-col gap-3 sm:flex-row">

                  <label htmlFor="redact-search" className="sr-only">
                    Text to find and redact
                  </label>

                  <input
                    id="redact-search"
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Find text to redact, e.g. a name or account number"
                    className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                  <button
                    type="submit"
                    disabled={isSearching || isWorking}
                    className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:opacity-50"
                  >
                    {isSearching ? "Searching..." : "Find and redact"}
                  </button>

                </form>

                {searchMessage && (
                  <p className="mt-3 text-sm text-gray-700" role="status">
                    {searchMessage}
                  </p>
                )}

                <p className="mt-3 text-sm text-gray-500">
                  Or drag on the page to draw a black box. Click a box to select it, drag to move
                  it, and press Delete to remove it.
                </p>

                <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">

                  {/* Page */}

                  <div className="min-w-0 flex-1">

                    <div className="rounded-xl border border-gray-200 bg-gray-100 p-2 sm:p-4">
                      <PageCanvas pdf={pdf} pageNumber={pageIndex + 1}>
                        {(scale, page) => (
                          <div
                            data-testid="page-overlay"
                            className="absolute inset-0 cursor-crosshair touch-none"
                            onPointerDown={(event) => handlePointerDown(event, scale)}
                            onPointerMove={(event) => handlePointerMove(event, scale, page.width, page.height)}
                            onPointerUp={handlePointerUp}
                            onPointerCancel={handlePointerUp}
                          >
                            {pageBoxes.map((box) => (
                              <div
                                key={box.id}
                                data-box-id={box.id}
                                aria-label="Redaction box"
                                className={`absolute cursor-move bg-black ${
                                  box.id === selectedId ? "outline-2 outline-offset-2 outline-blue-500 outline-dashed" : ""
                                }`}
                                style={{
                                  left: box.x * scale,
                                  top: box.y * scale,
                                  width: box.w * scale,
                                  height: box.h * scale,
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </PageCanvas>
                    </div>

                    {/* Page navigation */}

                    <div className="mt-4 flex items-center justify-between gap-3">

                      <button
                        type="button"
                        onClick={() => goToPage(pageIndex - 1)}
                        disabled={pageIndex === 0}
                        className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                      >
                        ← Previous
                      </button>

                      <span className="text-sm font-medium text-gray-600">
                        Page {pageIndex + 1} of {pageCount}
                      </span>

                      <button
                        type="button"
                        onClick={() => goToPage(pageIndex + 1)}
                        disabled={pageIndex >= pageCount - 1}
                        className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                      >
                        Next →
                      </button>

                    </div>

                    {pageCount > 1 && (
                      <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                        {previews.map((preview, index) => {
                          const count = boxes.filter((box) => box.page === index).length;

                          return (
                            <button
                              key={preview.url}
                              type="button"
                              onClick={() => goToPage(index)}
                              aria-label={`Go to page ${index + 1}${count > 0 ? ` (${count} ${count === 1 ? "box" : "boxes"})` : ""}`}
                              aria-current={index === pageIndex ? "page" : undefined}
                              className={`relative flex h-24 w-20 shrink-0 items-center justify-center rounded-lg border-2 bg-gray-50 p-1 transition ${
                                index === pageIndex ? "border-blue-600" : "border-gray-200 hover:border-blue-300"
                              }`}
                            >
                              <img src={preview.url} alt="" className="max-h-full max-w-full shadow-sm" />

                              <span className="absolute bottom-1 left-1 rounded bg-white/90 px-1.5 text-xs font-medium text-gray-700">
                                {index + 1}
                              </span>

                              {count > 0 && (
                                <span className="absolute right-1 top-1 rounded-full bg-gray-900 px-1.5 text-xs font-semibold text-white">
                                  {count}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                  </div>

                  {/* Boxes on this page */}

                  <aside className="w-full rounded-xl border border-gray-200 bg-gray-50 p-5 lg:w-72 lg:shrink-0">

                    <h2 className="font-semibold">
                      Boxes on page {pageIndex + 1}
                    </h2>

                    {pageBoxes.length === 0 ? (
                      <p className="mt-3 text-sm leading-6 text-gray-500">
                        No boxes on this page yet.
                      </p>
                    ) : (
                      <ul className="mt-3 space-y-2">
                        {pageBoxes.map((box, index) => (
                          <li
                            key={box.id}
                            className={`flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm ${
                              box.id === selectedId ? "border-blue-500" : "border-gray-200"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedId(box.id)}
                              className="font-medium text-gray-700"
                            >
                              Box {index + 1}
                            </button>

                            <button
                              type="button"
                              onClick={() => deleteBox(box.id)}
                              aria-label={`Delete box ${index + 1}`}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-red-50 hover:text-red-600"
                            >
                              ✕
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                  </aside>

                </div>
              </>
            )}

            {loading && !pdf && !error && (
              <p className="mt-6 text-center text-sm text-gray-500">
                Loading PDF...
              </p>
            )}

            <button
              type="button"
              onClick={handleApply}
              disabled={boxes.length === 0 || isWorking || !pdf}
              className="mt-8 w-full rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {progress ??
                (boxes.length > 0
                  ? `Redact ${boxes.length} ${boxes.length === 1 ? "area" : "areas"} and download`
                  : "Mark at least one area to redact")}
            </button>

          </div>
        )}

        {result && (
          <ResultCard
            fileName={outputName}
            size={result.size}
            note="Redacted pages are now images, so the blacked-out content can't be copied or recovered. Check the file before you share it."
            onDownload={() => downloadBlob(result, outputName)}
            onReset={handleReset}
            resetLabel="Redact another PDF"
          />
        )}

      </div>

    </div>
  );
}
