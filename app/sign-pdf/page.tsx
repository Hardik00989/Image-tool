"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
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
import SignatureCreator from "./SignatureCreator";
import { dataUrlToBytes, displayToPdf, todayText, type Signature } from "./signature";

// A signature placed on a page. Position and size are in PDF points on the
// page as the reader sees it (rotation applied, origin top-left).
type Placement = {
  id: number;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  signature: Signature;
};

type PageView = {
  page: number;
  url: string;
  // Displayed page size in points (rotation applied)
  width: number;
  height: number;
};

// Date text size relative to the signature height
const dateSize = (height: number) => Math.max(7, Math.min(18, height * 0.22));

const MIN_WIDTH = 24;

export default function SignPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);

  const [signature, setSignature] = useState<Signature | null>(null);
  const [showCreator, setShowCreator] = useState(true);

  const [currentPage, setCurrentPage] = useState(0);
  const [pageView, setPageView] = useState<PageView | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  // Displayed page sizes (points) of every page that has been shown
  const [pageSizes, setPageSizes] = useState<Record<number, { width: number; height: number }>>({});

  const [placements, setPlacements] = useState<Placement[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [addDate, setAddDate] = useState(false);
  const nextId = useRef(1);

  // Pixels per PDF point of the large page preview
  const pageBox = useRef<HTMLDivElement>(null);
  const [displayWidth, setDisplayWidth] = useState(0);

  const drag = useRef<{
    id: number;
    mode: "move" | "resize";
    startX: number;
    startY: number;
    start: Placement;
  } | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<Blob | null>(null);

  const { pdf, previews, pageCount, error } = usePdfPreviews(bytes, { previewWidth: 120 });

  const outputName = file ? `${baseName(file.name)}-signed.pdf` : "signed.pdf";

  const handleFiles = async ([selected]: File[]) => {
    setFile(selected);
    setBytes(await readFileBytes(selected));
    setCurrentPage(0);
    setPageView(null);
    setPageSizes({});
    setPlacements([]);
    setSelectedId(null);
    setResult(null);
  };

  // Render the selected page large enough to look sharp
  useEffect(() => {
    if (!pdf) return;

    let cancelled = false;
    let url: string | null = null;

    (async () => {
      try {
        const page = await pdf.getPage(currentPage + 1);
        const viewport = page.getViewport({ scale: 1 });

        // About 1400 px wide, capped at 8000 px per side
        const scale = Math.min(1400 / viewport.width, 8000 / Math.max(viewport.width, viewport.height), 4);
        const canvas = await renderPageToCanvas(pdf, currentPage + 1, scale);
        const blob = await canvasToBlob(canvas, "image/jpeg", 0.9);

        if (cancelled) return;

        url = URL.createObjectURL(blob);
        setPageView({ page: currentPage, url, width: viewport.width, height: viewport.height });
        setPageSizes((previous) => ({ ...previous, [currentPage]: { width: viewport.width, height: viewport.height } }));
        setPageSizes((previous) => ({ ...previous, [currentPage]: { width: viewport.width, height: viewport.height } }));
        setPageError(null);
      } catch (renderError) {
        if (!cancelled) {
          console.error(renderError);
          setPageError("This page couldn't be displayed.");
        }
      }
    })();

    return () => {
      cancelled = true;

      if (url) URL.revokeObjectURL(url);
    };
  }, [pdf, currentPage]);

  // Track the displayed width of the page so points can be turned into pixels
  useEffect(() => {
    const element = pageBox.current;

    if (!element) return;

    const observer = new ResizeObserver(() => setDisplayWidth(element.clientWidth));
    observer.observe(element);
    setDisplayWidth(element.clientWidth);

    return () => observer.disconnect();
  }, [pageView]);

  const view = pageView && pageView.page === currentPage ? pageView : null;
  const pxPerPoint = view && displayWidth > 0 ? displayWidth / view.width : 0;

  const extraBelow = (placement: { height: number }) =>
    addDate ? dateSize(placement.height) * 1.4 : 0;

  // Keeps a placement fully on the page
  const clampPlacement = (placement: Placement, page: PageView): Placement => {
    const width = Math.max(MIN_WIDTH, Math.min(placement.width, page.width));
    const height = width * (placement.signature.height / placement.signature.width);
    const maxY = Math.max(0, page.height - height - extraBelow({ height }));

    return {
      ...placement,
      width,
      height,
      x: Math.max(0, Math.min(placement.x, page.width - width)),
      y: Math.max(0, Math.min(placement.y, maxY)),
    };
  };

  const updatePlacement = (id: number, change: (placement: Placement) => Placement) => {
    setPlacements((previous) => previous.map((placement) => (placement.id === id ? change(placement) : placement)));
    setResult(null);
  };

  const removePlacement = (id: number) => {
    setPlacements((previous) => previous.filter((placement) => placement.id !== id));
    setSelectedId((selected) => (selected === id ? null : selected));
    setResult(null);
  };

  // Click or tap on the page: place the current signature there
  const handlePageClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!view || !pxPerPoint) return;

    if (!signature) {
      setShowCreator(true);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const pointX = (event.clientX - rect.left) / pxPerPoint;
    const pointY = (event.clientY - rect.top) / pxPerPoint;

    const width = Math.min(view.width * 0.3, 180, (signature.width / signature.height) * view.height * 0.15);
    const height = width * (signature.height / signature.width);

    const placement = clampPlacement(
      {
        id: nextId.current++,
        page: currentPage,
        x: pointX - width / 2,
        y: pointY - height / 2,
        width,
        height,
        signature,
      },
      view
    );

    setPlacements((previous) => [...previous, placement]);
    setSelectedId(placement.id);
    setResult(null);
  };

  // Drag to move, or drag the corner handle to resize
  const startDrag = (event: PointerEvent<HTMLElement>, placement: Placement, mode: "move" | "resize") => {
    if (event.button !== 0) return;

    event.stopPropagation();
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    drag.current = { id: placement.id, mode, startX: event.clientX, startY: event.clientY, start: placement };
    setSelectedId(placement.id);
  };

  const moveDrag = (event: PointerEvent<HTMLElement>) => {
    const active = drag.current;

    if (!active || !view || !pxPerPoint) return;

    const dx = (event.clientX - active.startX) / pxPerPoint;
    const dy = (event.clientY - active.startY) / pxPerPoint;

    updatePlacement(active.id, () =>
      clampPlacement(
        active.mode === "move"
          ? { ...active.start, x: active.start.x + dx, y: active.start.y + dy }
          : {
              ...active.start,
              // Grow with whichever direction moved further, keeping the aspect ratio
              width: Math.min(
                active.start.width + Math.max(dx, dy * (active.start.width / active.start.height)),
                view.width - active.start.x
              ),
            },
        view
      )
    );
  };

  const endDrag = () => {
    drag.current = null;
  };

  // Arrow keys nudge the selected signature, Delete removes it
  const handlePlacementKey = (event: KeyboardEvent<HTMLDivElement>, placement: Placement) => {
    if (!view) return;

    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      removePlacement(placement.id);
      return;
    }

    const step = event.shiftKey ? 10 : 2;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = moves[event.key];

    if (move) {
      event.preventDefault();
      updatePlacement(placement.id, (current) =>
        clampPlacement({ ...current, x: current.x + move[0], y: current.y + move[1] }, view)
      );
    }
  };

  const selected = placements.find((placement) => placement.id === selectedId) ?? null;
  const pagePlacements = placements.filter((placement) => placement.page === currentPage);

  const handleSave = async () => {
    if (!bytes || placements.length === 0) return;

    setIsSaving(true);

    try {
      const { PDFDocument, StandardFonts, degrees, rgb } = await loadPdfLib();
      const doc = await PDFDocument.load(bytes);
      const pages = doc.getPages();
      const font = addDate ? await doc.embedFont(StandardFonts.Helvetica) : null;
      const images = new Map<string, Awaited<ReturnType<typeof doc.embedPng>>>();
      const date = todayText();

      for (const placement of placements) {
        const page = pages[placement.page];
        const rotation = (((page.getRotation().angle % 360) + 360) % 360) as number;
        const box = page.getCropBox();
        const sideways = rotation === 90 || rotation === 270;

        // Size of the page as displayed, in the same units as the placement
        const shownWidth = sideways ? box.height : box.width;
        const shownHeight = sideways ? box.width : box.height;
        const view = { width: shownWidth, height: shownHeight };

        // Placements are stored relative to the pdf.js view of the page; use
        // fractions so small differences between the two libraries don't matter
        const pageSize = pageSizes[placement.page] ?? view;
        const fx = placement.x / pageSize.width;
        const fy = placement.y / pageSize.height;
        const fw = placement.width / pageSize.width;
        const fh = placement.height / pageSize.height;

        let image = images.get(placement.signature.url);

        if (!image) {
          image = await doc.embedPng(dataUrlToBytes(placement.signature.url));
          images.set(placement.signature.url, image);
        }

        // Anchor = the image's bottom-left corner as the reader sees it
        const anchor = displayToPdf(fx, fy + fh, rotation, box);

        page.drawImage(image, {
          x: anchor.x,
          y: anchor.y,
          width: fw * shownWidth,
          height: fh * shownHeight,
          rotate: degrees(rotation),
        });

        if (font) {
          const heightPoints = fh * shownHeight;
          const size = dateSize(heightPoints);
          const baseline = displayToPdf(fx, fy + fh + (size * 1.1) / shownHeight, rotation, box);

          page.drawText(date, {
            x: baseline.x,
            y: baseline.y,
            size,
            font,
            color: rgb(0.13, 0.13, 0.16),
            rotate: degrees(rotation),
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
    setCurrentPage(0);
    setPageView(null);
    setPlacements([]);
    setSelectedId(null);
    setResult(null);
    setPageSizes({});
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(0, Math.min(pageCount - 1, page)));
    setSelectedId(null);
  };

  const buttonClass =
    "rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50";

  return (
    <div className="bg-gray-50 px-6 py-12 text-gray-900 sm:px-10 lg:px-16 sm:py-16">

      <div className="mx-auto max-w-6xl">

        <ToolHero
          icon="✍️"
          badge="Sign PDF"
          title="Sign PDF Online"
          highlight="Free Electronic Signature"
          description="Draw, type or upload your signature, place it anywhere on your PDF and download the signed file."
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
                    ? `${pageCount} ${pageCount === 1 ? "page" : "pages"} · ${
                        signature ? "click or tap the page to place your signature" : "create your signature first"
                      }`
                    : error
                      ? "Can't open this file"
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
              <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">

                {/* Page with placements */}

                <div className="min-w-0">

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 0}
                      className={buttonClass}
                    >
                      ← Previous
                    </button>

                    <span className="text-sm font-medium text-gray-600" aria-live="polite">
                      Page {currentPage + 1} of {pageCount || "…"}
                    </span>

                    <button
                      type="button"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage >= pageCount - 1}
                      className={buttonClass}
                    >
                      Next →
                    </button>
                  </div>

                  <div className="mt-4 rounded-xl bg-gray-100 p-3 sm:p-6">
                    {view ? (
                      <div
                        ref={pageBox}
                        onClick={handlePageClick}
                        className={`relative mx-auto select-none bg-white shadow-md ${signature ? "cursor-copy" : "cursor-default"}`}
                        style={{ maxWidth: `min(100%, ${(view.width / view.height) * 75}vh)` }}
                        data-testid="sign-page"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={view.url}
                          alt={`Page ${currentPage + 1}`}
                          draggable={false}
                          className="block h-auto w-full"
                        />

                        {pxPerPoint > 0 && pagePlacements.map((placement) => {
                          const isSelected = placement.id === selectedId;

                          return (
                            <div
                              key={placement.id}
                              role="button"
                              tabIndex={0}
                              aria-label={`Signature on page ${placement.page + 1}. Drag to move, arrow keys to nudge, Delete to remove.`}
                              data-placement={placement.id}
                              onClick={(event) => event.stopPropagation()}
                              onFocus={() => setSelectedId(placement.id)}
                              onKeyDown={(event) => handlePlacementKey(event, placement)}
                              onPointerDown={(event) => startDrag(event, placement, "move")}
                              onPointerMove={moveDrag}
                              onPointerUp={endDrag}
                              onPointerCancel={endDrag}
                              className={`absolute cursor-move touch-none outline-none ${
                                isSelected ? "ring-2 ring-blue-500" : "ring-1 ring-blue-300/60 hover:ring-blue-400"
                              }`}
                              style={{
                                left: placement.x * pxPerPoint,
                                top: placement.y * pxPerPoint,
                                width: placement.width * pxPerPoint,
                                height: placement.height * pxPerPoint,
                              }}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={placement.signature.url}
                                alt=""
                                draggable={false}
                                className="pointer-events-none h-full w-full"
                              />

                              {addDate && (
                                <span
                                  className="pointer-events-none absolute left-0 whitespace-nowrap font-sans text-gray-900"
                                  style={{
                                    top: "100%",
                                    fontSize: dateSize(placement.height) * pxPerPoint,
                                    lineHeight: 1.3,
                                  }}
                                >
                                  {todayText()}
                                </span>
                              )}

                              {isSelected && (
                                <>
                                  <button
                                    type="button"
                                    aria-label="Remove this signature"
                                    onPointerDown={(event) => event.stopPropagation()}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      removePlacement(placement.id);
                                    }}
                                    className="absolute -right-3 -top-3 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-sm font-bold text-white shadow"
                                  >
                                    ×
                                  </button>

                                  <span
                                    aria-hidden="true"
                                    data-resize-handle
                                    onPointerDown={(event) => startDrag(event, placement, "resize")}
                                    onPointerMove={moveDrag}
                                    onPointerUp={endDrag}
                                    onPointerCancel={endDrag}
                                    className="absolute -bottom-2.5 -right-2.5 h-5 w-5 cursor-nwse-resize touch-none rounded-full border-2 border-white bg-blue-600 shadow"
                                  />
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="py-24 text-center text-sm text-gray-500">
                        {pageError ?? "Loading page..."}
                      </p>
                    )}
                  </div>

                  {/* Page thumbnails */}

                  {previews.length > 1 && (
                    <div className="mt-2 flex gap-3 overflow-x-auto px-2 pb-2 pt-3">
                      {previews.map((preview, index) => {
                        const count = placements.filter((placement) => placement.page === index).length;

                        return (
                          <button
                            key={preview.url}
                            type="button"
                            onClick={() => goToPage(index)}
                            aria-label={`Go to page ${index + 1}`}
                            aria-current={index === currentPage ? "page" : undefined}
                            className={`relative flex h-24 w-20 shrink-0 items-center justify-center rounded-lg border-2 bg-gray-50 p-1 transition ${
                              index === currentPage ? "border-blue-500" : "border-gray-200 hover:border-blue-300"
                            }`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={preview.url} alt="" className="max-h-full max-w-full shadow-sm" />

                            <span className="absolute bottom-1 left-1 rounded bg-white/90 px-1 text-xs font-medium text-gray-600">
                              {index + 1}
                            </span>

                            {count > 0 && (
                              <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-xs font-bold text-white">
                                {count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                </div>

                {/* Signature + placements panel */}

                <div className="order-first min-w-0 space-y-6 lg:order-none">

                  <div className="rounded-xl border border-gray-200 p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="font-semibold">
                        1. Your signature
                      </h2>

                      {signature && !showCreator && (
                        <button
                          type="button"
                          onClick={() => setShowCreator(true)}
                          className="text-sm font-semibold text-blue-600 hover:underline"
                        >
                          Change
                        </button>
                      )}
                    </div>

                    {signature && !showCreator ? (
                      <div className="mt-4 flex h-24 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={signature.url} alt="Your signature" className="max-h-full max-w-full object-contain" />
                      </div>
                    ) : (
                      <div className="mt-4">
                        <SignatureCreator
                          onCreate={(created) => {
                            setSignature(created);
                            setShowCreator(false);
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-gray-200 p-4 sm:p-5">
                    <h2 className="font-semibold">
                      2. Place it on the page
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-gray-500">
                      {signature
                        ? "Click or tap the page to add your signature. Drag it to move it and use the corner handle or the slider to resize it. Go to other pages to sign them too."
                        : "Create your signature above, then click or tap the page where it should go."}
                    </p>

                    {selected && view && selected.page === currentPage && (
                      <div className="mt-4">
                        <label className="text-sm font-semibold text-gray-700" htmlFor="signature-size">
                          Size of selected signature
                        </label>

                        <input
                          id="signature-size"
                          type="range"
                          min={MIN_WIDTH}
                          max={Math.round(view.width)}
                          value={Math.round(selected.width)}
                          onChange={(event) =>
                            updatePlacement(selected.id, (current) =>
                              clampPlacement({ ...current, width: Number(event.target.value) }, view)
                            )
                          }
                          className="mt-2 w-full accent-blue-600"
                        />
                      </div>
                    )}

                    <label className="mt-4 flex cursor-pointer items-center gap-3 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={addDate}
                        onChange={(event) => {
                          setAddDate(event.target.checked);
                          setResult(null);
                        }}
                        className="h-4 w-4 accent-blue-600"
                      />
                      Add today&apos;s date under each signature ({todayText()})
                    </label>

                    {placements.length > 0 && (
                      <ul className="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-200">
                        {placements.map((placement, index) => (
                          <li key={placement.id} className="flex items-center gap-3 px-3 py-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={placement.signature.url} alt="" className="h-6 w-16 object-contain" />

                            <button
                              type="button"
                              onClick={() => {
                                goToPage(placement.page);
                                setSelectedId(placement.id);
                              }}
                              className="min-w-0 flex-1 truncate text-left text-sm text-gray-700 hover:text-blue-600"
                            >
                              Page {placement.page + 1}
                            </button>

                            <button
                              type="button"
                              onClick={() => removePlacement(placement.id)}
                              aria-label={`Delete signature ${index + 1} on page ${placement.page + 1}`}
                              className="rounded-lg px-2 py-1 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <p className="text-xs leading-5 text-gray-500">
                    This adds an electronic signature image to the page. It is not a certificate-based digital signature and doesn&apos;t lock the document against changes.
                  </p>

                </div>

              </div>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={placements.length === 0 || isSaving}
              className="mt-8 w-full rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving
                ? "Saving..."
                : placements.length > 0
                  ? `Save signed PDF (${placements.length} ${placements.length === 1 ? "signature" : "signatures"})`
                  : "Place your signature on a page"}
            </button>

          </div>
        )}

        {result && (
          <ResultCard
            title="Your PDF is signed"
            fileName={outputName}
            size={result.size}
            onDownload={() => downloadBlob(result, outputName)}
            onReset={handleReset}
            resetLabel="Sign another PDF"
          />
        )}

      </div>

    </div>
  );
}
