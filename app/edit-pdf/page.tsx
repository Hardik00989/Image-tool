"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import ToolHero from "@/components/ToolHero";
import PdfDropzone from "@/components/pdf/PdfDropzone";
import ResultCard from "@/components/pdf/ResultCard";
import { usePdfPreviews } from "@/components/pdf/usePdfPreviews";
import {
  baseName,
  downloadBlob,
  pdfBlob,
  pdfErrorMessage,
  readFileBytes,
} from "@/lib/pdf";
import PageCanvas from "@/components/pdf/PageCanvas";
import {
  FONT_FAMILY,
  HIGHLIGHT_COLOR,
  LINE_HEIGHT,
  saveEdits,
  textLines,
  type EditElement,
  type TextElement,
} from "./save-edits";

type Tool = "select" | "text" | "rect" | "highlight" | "whiteout";

const TOOLS: { id: Tool; label: string; icon: string; hint: string }[] = [
  { id: "select", label: "Select", icon: "↖", hint: "Click an item to select it, drag to move it, use the corner handle to resize." },
  { id: "text", label: "Add text", icon: "T", hint: "Click on the page where the text should go." },
  { id: "rect", label: "Rectangle", icon: "▭", hint: "Drag on the page to draw a rectangle outline." },
  { id: "highlight", label: "Highlight", icon: "🖍", hint: "Drag over text to highlight it in yellow." },
  { id: "whiteout", label: "Whiteout", icon: "⬜", hint: "Drag over content to cover it with white. Add text on top to replace it." },
];

// What the pointer is doing on the page right now
type Drag = {
  mode: "move" | "resize" | "draw";
  id: string;
  startX: number;
  startY: number;
  original: EditElement;
};

let nextId = 1;
const newId = () => `element-${nextId++}`;

// PNG or JPG, detected from the file's first bytes
function imageFormat(bytes: Uint8Array): "png" | "jpg" | null {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "jpg";
  return null;
}

export default function EditPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);

  const [pageIndex, setPageIndex] = useState(0);
  const [tool, setTool] = useState<Tool>("select");
  const [elements, setElements] = useState<EditElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Style used for new text and rectangles
  const [fontSize, setFontSize] = useState(16);
  const [color, setColor] = useState("#111827");
  const [bold, setBold] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<Blob | null>(null);

  const drag = useRef<Drag | null>(null);
  const textInput = useRef<HTMLTextAreaElement>(null);
  const imageUrls = useRef(new Set<string>());

  const { pdf, previews, pageCount, loading, error } = usePdfPreviews(bytes, { previewWidth: 120 });

  const outputName = file ? `${baseName(file.name)}-edited.pdf` : "edited.pdf";

  const selected = elements.find((element) => element.id === selectedId) ?? null;
  const pageElements = elements.filter((element) => element.page === pageIndex);

  // Release uploaded image previews when leaving the page
  useEffect(() => {
    const urls = imageUrls.current;

    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const releaseImages = (list: EditElement[]) => {
    list.forEach((element) => {
      if (element.kind === "image") {
        URL.revokeObjectURL(element.src);
        imageUrls.current.delete(element.src);
      }
    });
  };

  const updateElement = (id: string, changes: Partial<EditElement>) => {
    setElements((previous) =>
      previous.map((element) =>
        element.id === id ? ({ ...element, ...changes } as EditElement) : element
      )
    );
    setResult(null);
  };

  const deleteElement = (id: string) => {
    releaseImages(elements.filter((element) => element.id === id));
    setElements((previous) => previous.filter((element) => element.id !== id));
    setSelectedId(null);
    setResult(null);
  };

  // Delete key removes the selected item (but not while typing)
  useEffect(() => {
    if (!selectedId) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;

      if (target?.closest("input, textarea, select, [contenteditable]")) return;

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteElement(selectedId);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const handleFiles = async ([selectedFile]: File[]) => {
    releaseImages(elements);
    setFile(selectedFile);
    setBytes(await readFileBytes(selectedFile));
    setElements([]);
    setSelectedId(null);
    setPageIndex(0);
    setTool("select");
    setResult(null);
  };

  const handleReset = () => {
    releaseImages(elements);
    setFile(null);
    setBytes(null);
    setElements([]);
    setSelectedId(null);
    setPageIndex(0);
    setResult(null);
  };

  const goToPage = (index: number) => {
    setPageIndex(Math.max(0, Math.min(pageCount - 1, index)));
    setSelectedId(null);
  };

  // Places an uploaded PNG/JPG in the middle of the current page
  const handleImage = async (imageFile: File | undefined) => {
    if (!imageFile || !pdf) return;

    const imageBytes = await readFileBytes(imageFile);
    const format = imageFormat(imageBytes);

    if (!format) {
      alert("Please choose a PNG or JPG image.");
      return;
    }

    const src = URL.createObjectURL(new Blob([imageBytes as BlobPart], { type: imageFile.type || "image/png" }));

    try {
      const image = new Image();
      image.src = src;
      await image.decode();

      const viewport = (await pdf.getPage(pageIndex + 1)).getViewport({ scale: 1 });
      const w = Math.min(200, viewport.width * 0.4);
      const h = (w * image.naturalHeight) / Math.max(1, image.naturalWidth);

      imageUrls.current.add(src);

      const element: EditElement = {
        id: newId(),
        page: pageIndex,
        kind: "image",
        x: (viewport.width - w) / 2,
        y: Math.max(0, (viewport.height - h) / 2),
        w,
        h,
        src,
        bytes: imageBytes,
        format,
      };

      setElements((previous) => [...previous, element]);
      setSelectedId(element.id);
      setTool("select");
      setResult(null);
    } catch (imageError) {
      console.error(imageError);
      URL.revokeObjectURL(src);
      alert("This image couldn't be read. Please try another PNG or JPG file.");
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
    if (event.button !== 0) return;

    const point = pointerPosition(event, scale);
    const target = event.target as HTMLElement;
    const elementNode = target.closest<HTMLElement>("[data-element-id]");

    if (tool === "select") {
      if (!elementNode) {
        setSelectedId(null);
        return;
      }

      const id = elementNode.dataset.elementId!;
      const original = elements.find((element) => element.id === id);

      if (!original) return;

      setSelectedId(id);
      drag.current = {
        mode: target.closest("[data-resize]") ? "resize" : "move",
        id,
        startX: point.x,
        startY: point.y,
        original,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
      return;
    }

    if (tool === "text") {
      const element: TextElement = {
        id: newId(),
        page: pageIndex,
        kind: "text",
        x: point.x,
        y: Math.max(0, point.y - fontSize * 0.6),
        text: "Your text",
        fontSize,
        color,
        bold,
      };

      setElements((previous) => [...previous, element]);
      setSelectedId(element.id);
      setTool("select");
      setResult(null);

      // Let the user type straight away
      setTimeout(() => {
        textInput.current?.focus();
        textInput.current?.select();
      }, 50);

      event.preventDefault();
      return;
    }

    // Rectangle, highlight and whiteout: start drawing
    const element: EditElement = {
      id: newId(),
      page: pageIndex,
      kind: tool,
      x: point.x,
      y: point.y,
      w: 0,
      h: 0,
      color,
    };

    setElements((previous) => [...previous, element]);
    setSelectedId(element.id);
    setResult(null);
    drag.current = { mode: "draw", id: element.id, startX: point.x, startY: point.y, original: element };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
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
    const dx = point.x - current.startX;
    const dy = point.y - current.startY;
    const original = current.original;

    if (current.mode === "move") {
      updateElement(current.id, {
        x: Math.max(0, Math.min(pageWidth - 10, original.x + dx)),
        y: Math.max(0, Math.min(pageHeight - 10, original.y + dy)),
      });
      return;
    }

    if (current.mode === "draw") {
      const x = Math.max(0, Math.min(pageWidth, point.x));
      const y = Math.max(0, Math.min(pageHeight, point.y));

      updateElement(current.id, {
        x: Math.min(current.startX, x),
        y: Math.min(current.startY, y),
        w: Math.abs(x - current.startX),
        h: Math.abs(y - current.startY),
      });
      return;
    }

    // Resize from the bottom-right handle
    if (original.kind === "text") {
      const lines = textLines(original.text).length;
      const startHeight = lines * LINE_HEIGHT * original.fontSize;
      const size = (original.fontSize * Math.max(4, startHeight + dy)) / startHeight;

      updateElement(current.id, { fontSize: Math.round(Math.max(6, Math.min(200, size))) });
    } else if (original.kind === "image") {
      // Images keep their proportions
      const w = Math.max(10, original.w + dx);

      updateElement(current.id, { w, h: (w * original.h) / original.w });
    } else {
      updateElement(current.id, {
        w: Math.max(4, original.w + dx),
        h: Math.max(4, original.h + dy),
      });
    }
  };

  const handlePointerUp = () => {
    const current = drag.current;

    drag.current = null;

    if (!current || current.mode !== "draw") return;

    // A click without dragging places a default-sized box
    setElements((previous) =>
      previous.map((element) => {
        if (element.id !== current.id || element.kind === "text" || element.kind === "image") {
          return element;
        }

        if (element.w >= 4 && element.h >= 4) return element;

        const w = 140;
        const h = element.kind === "highlight" ? 18 : 36;

        return { ...element, x: current.startX, y: Math.max(0, current.startY - h / 2), w, h };
      })
    );
    setTool("select");
  };

  const handleSave = async () => {
    if (!bytes || !pdf) return;

    setIsSaving(true);
    setSelectedId(null);

    try {
      const blob = pdfBlob(await saveEdits(bytes, pdf, elements));

      setResult(blob);
      downloadBlob(blob, outputName);
    } catch (saveError) {
      console.error(saveError);
      alert(pdfErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  };

  const activeTool = TOOLS.find((item) => item.id === tool)!;

  return (
    <div className="bg-gray-50 px-6 py-12 text-gray-900 sm:px-10 lg:px-16 sm:py-16">

      <div className="mx-auto max-w-6xl">

        <ToolHero
          icon="✎"
          badge="Edit PDF"
          title="Edit PDF Files"
          highlight="Online for Free"
          description="Add text, images, shapes, highlights and whiteout to your PDF pages, then download the edited file."
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
                    ? `${pageCount} ${pageCount === 1 ? "page" : "pages"} · ${elements.length} ${elements.length === 1 ? "edit" : "edits"}`
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

            {pdf && pageCount > 0 && (
              <>
                <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                  Existing text in a PDF can&apos;t be edited in place. To replace text, cover it
                  with <strong>Whiteout</strong>, then use <strong>Add text</strong> to type the new
                  wording on top.
                </p>

                {/* Tools */}

                <div className="mt-6 flex flex-wrap gap-2" role="toolbar" aria-label="Editing tools">

                  {TOOLS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTool(item.id)}
                      aria-pressed={tool === item.id}
                      className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                        tool === item.id
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span aria-hidden="true" className="mr-1.5">{item.icon}</span>
                      {item.label}
                    </button>
                  ))}

                  <label className="cursor-pointer rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 focus-within:ring-2 focus-within:ring-blue-500">
                    <span aria-hidden="true" className="mr-1.5">🖼</span>
                    Add image
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      className="sr-only"
                      data-testid="image-input"
                      onChange={(event) => {
                        const input = event.target;

                        void handleImage(input.files?.[0]);
                        input.value = "";
                      }}
                    />
                  </label>

                </div>

                <p className="mt-3 text-sm text-gray-500">
                  {activeTool.hint}
                </p>

                <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">

                  {/* Page */}

                  <div className="min-w-0 flex-1">

                    <div className="rounded-xl border border-gray-200 bg-gray-100 p-2 sm:p-4">
                      <PageCanvas pdf={pdf} pageNumber={pageIndex + 1}>
                        {(scale, page) => (
                          <div
                            data-testid="page-overlay"
                            className={`absolute inset-0 ${tool === "select" ? "" : "cursor-crosshair touch-none"}`}
                            onPointerDown={(event) => handlePointerDown(event, scale)}
                            onPointerMove={(event) => handlePointerMove(event, scale, page.width, page.height)}
                            onPointerUp={handlePointerUp}
                            onPointerCancel={handlePointerUp}
                          >
                            {pageElements.map((element) => (
                              <ElementView
                                key={element.id}
                                element={element}
                                scale={scale}
                                selected={element.id === selectedId}
                                interactive={tool === "select"}
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
                          const count = elements.filter((element) => element.page === index).length;

                          return (
                            <button
                              key={preview.url}
                              type="button"
                              onClick={() => goToPage(index)}
                              aria-label={`Go to page ${index + 1}`}
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
                                <span className="absolute right-1 top-1 rounded-full bg-blue-600 px-1.5 text-xs font-semibold text-white">
                                  {count}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                  </div>

                  {/* Properties */}

                  <aside className="w-full rounded-xl border border-gray-200 bg-gray-50 p-5 lg:w-72 lg:shrink-0">

                    <h2 className="font-semibold">
                      {selected ? elementLabel(selected) : "Style for new items"}
                    </h2>

                    {selected?.kind === "text" && (
                      <div className="mt-4">
                        <label htmlFor="edit-text" className="text-sm font-medium text-gray-700">
                          Text
                        </label>

                        <textarea
                          id="edit-text"
                          ref={textInput}
                          value={selected.text}
                          rows={3}
                          onChange={(event) => updateElement(selected.id, { text: event.target.value })}
                          className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                      </div>
                    )}

                    {(!selected || selected.kind === "text") && (
                      <div className="mt-4 grid grid-cols-2 gap-3">

                        <div>
                          <label htmlFor="edit-font-size" className="text-sm font-medium text-gray-700">
                            Font size
                          </label>

                          <input
                            id="edit-font-size"
                            type="number"
                            min={6}
                            max={200}
                            value={selected?.kind === "text" ? selected.fontSize : fontSize}
                            onChange={(event) => {
                              const size = Math.max(6, Math.min(200, Number(event.target.value) || 6));

                              setFontSize(size);

                              if (selected?.kind === "text") updateElement(selected.id, { fontSize: size });
                            }}
                            className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          />
                        </div>

                        <div className="flex items-end pb-2">
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <input
                              type="checkbox"
                              checked={selected?.kind === "text" ? selected.bold : bold}
                              onChange={(event) => {
                                setBold(event.target.checked);

                                if (selected?.kind === "text") updateElement(selected.id, { bold: event.target.checked });
                              }}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            Bold
                          </label>
                        </div>

                      </div>
                    )}

                    {(!selected || selected.kind === "text" || selected.kind === "rect") && (
                      <div className="mt-4">
                        <label htmlFor="edit-color" className="text-sm font-medium text-gray-700">
                          {selected?.kind === "rect" ? "Outline colour" : "Colour"}
                        </label>

                        <input
                          id="edit-color"
                          type="color"
                          value={selected && (selected.kind === "text" || selected.kind === "rect") ? selected.color : color}
                          onChange={(event) => {
                            setColor(event.target.value);

                            if (selected && (selected.kind === "text" || selected.kind === "rect")) {
                              updateElement(selected.id, { color: event.target.value });
                            }
                          }}
                          className="mt-1.5 block h-10 w-full cursor-pointer rounded-lg border border-gray-300 bg-white p-1"
                        />
                      </div>
                    )}

                    {selected ? (
                      <button
                        type="button"
                        onClick={() => deleteElement(selected.id)}
                        className="mt-5 w-full rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                      >
                        Delete {elementLabel(selected).toLowerCase()}
                      </button>
                    ) : (
                      <p className="mt-4 text-sm leading-6 text-gray-500">
                        Select an item on the page to change or delete it. You can also press the
                        Delete key.
                      </p>
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
              onClick={handleSave}
              disabled={elements.length === 0 || isSaving || !pdf}
              className="mt-8 w-full rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving
                ? "Saving..."
                : elements.length > 0
                  ? "Save edited PDF"
                  : "Add something to the page first"}
            </button>

          </div>
        )}

        {result && (
          <ResultCard
            fileName={outputName}
            size={result.size}
            onDownload={() => downloadBlob(result, outputName)}
            onReset={handleReset}
            resetLabel="Edit another PDF"
          />
        )}

      </div>

    </div>
  );
}

function elementLabel(element: EditElement) {
  switch (element.kind) {
    case "text":
      return "Text";
    case "image":
      return "Image";
    case "rect":
      return "Rectangle";
    case "highlight":
      return "Highlight";
    case "whiteout":
      return "Whiteout";
  }
}

// One added item drawn over the page preview
function ElementView({
  element,
  scale,
  selected,
  interactive,
}: {
  element: EditElement;
  scale: number;
  selected: boolean;
  interactive: boolean;
}) {
  const style: CSSProperties = {
    left: element.x * scale,
    top: element.y * scale,
    pointerEvents: interactive ? "auto" : "none",
  };

  let content;

  if (element.kind === "text") {
    content = (
      <div
        style={{
          fontFamily: FONT_FAMILY,
          fontSize: element.fontSize * scale,
          lineHeight: LINE_HEIGHT,
          fontWeight: element.bold ? 700 : 400,
          color: element.color,
          whiteSpace: "pre",
          minWidth: 8,
          minHeight: element.fontSize * scale * LINE_HEIGHT,
        }}
      >
        {element.text}
      </div>
    );
  } else {
    style.width = element.w * scale;
    style.height = element.h * scale;

    if (element.kind === "image") {
      content = (
        <img src={element.src} alt="" draggable={false} className="h-full w-full select-none" />
      );
    } else if (element.kind === "whiteout") {
      style.background = "#ffffff";
    } else if (element.kind === "highlight") {
      style.background = HIGHLIGHT_COLOR;
      style.opacity = 0.45;
      style.mixBlendMode = "multiply";
    } else {
      style.border = `${Math.max(1, 2 * scale)}px solid ${element.color}`;
    }
  }

  return (
    <div
      data-element-id={element.id}
      aria-label={elementLabel(element)}
      className={`absolute touch-none ${interactive ? "cursor-move" : ""} ${
        selected ? "outline-2 outline-offset-2 outline-blue-500 outline-dashed" : ""
      } ${element.kind === "whiteout" && !selected ? "outline-1 outline-dashed outline-gray-300" : ""}`}
      style={style}
    >
      {content}

      {selected && interactive && (
        <div
          data-resize
          aria-hidden="true"
          className="absolute -bottom-2.5 -right-2.5 h-5 w-5 cursor-nwse-resize rounded-full border-2 border-white bg-blue-600 shadow"
        />
      )}
    </div>
  );
}
