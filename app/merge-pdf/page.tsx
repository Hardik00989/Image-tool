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
  isPdfFile,
  loadPdfLib,
  openPdfJs,
  pdfBlob,
  pdfErrorMessage,
  readFileBytes,
  renderPageToCanvas,
} from "@/lib/pdf";

type MergeItem = {
  id: number;
  file: File;
  bytes: Uint8Array | null;
  // null while the file is still being read
  pageCount: number | null;
  thumbnail: string | null;
  error: string | null;
};

const THUMBNAIL_WIDTH = 160;

let nextId = 1;

// Reads a PDF and renders a small image of its first page
async function readPdfInfo(file: File) {
  const bytes = await readFileBytes(file);
  const pdf = await openPdfJs(bytes);

  try {
    const page = await pdf.getPage(1);
    const { width } = page.getViewport({ scale: 1 });
    const canvas = await renderPageToCanvas(pdf, 1, THUMBNAIL_WIDTH / width);
    const thumbnail = URL.createObjectURL(await canvasToBlob(canvas, "image/jpeg", 0.8));

    return { bytes, pageCount: pdf.numPages, thumbnail };
  } finally {
    void pdf.loadingTask.destroy();
  }
}

export default function MergePdf() {
  const [items, setItems] = useState<MergeItem[]>([]);

  // Index of the card being dragged (for reordering)
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const [isMerging, setIsMerging] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [result, setResult] = useState<Blob | null>(null);

  const addInputRef = useRef<HTMLInputElement>(null);

  // Keep track of thumbnail URLs so they can be released on unmount
  const thumbnailUrls = useRef(new Set<string>());

  useEffect(() => {
    const urls = thumbnailUrls.current;

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  const outputName = items.length > 0 ? `${baseName(items[0].file.name)}-merged.pdf` : "merged.pdf";

  const updateItem = (id: number, changes: Partial<MergeItem>) => {
    setItems((previous) => previous.map((item) => (item.id === id ? { ...item, ...changes } : item)));
  };

  const handleFiles = (files: File[]) => {
    const pdfs = files.filter(isPdfFile);

    if (pdfs.length < files.length) {
      alert("Some files were skipped because they aren't PDFs.");
    }

    if (pdfs.length === 0) return;

    const added: MergeItem[] = pdfs.map((file) => ({
      id: nextId++,
      file,
      bytes: null,
      pageCount: null,
      thumbnail: null,
      error: null,
    }));

    setItems((previous) => [...previous, ...added]);
    setResult(null);
    setMergeError(null);

    // Read each file in the background and fill in its details
    added.forEach(async (item) => {
      try {
        const info = await readPdfInfo(item.file);

        thumbnailUrls.current.add(info.thumbnail);
        updateItem(item.id, info);
      } catch (readError) {
        console.error(readError);
        updateItem(item.id, { pageCount: 0, error: pdfErrorMessage(readError) });
      }
    });
  };

  const releaseThumbnail = (item: MergeItem) => {
    if (item.thumbnail) {
      URL.revokeObjectURL(item.thumbnail);
      thumbnailUrls.current.delete(item.thumbnail);
    }
  };

  const removeItem = (id: number) => {
    const item = items.find((entry) => entry.id === id);

    if (item) releaseThumbnail(item);

    setItems((previous) => previous.filter((entry) => entry.id !== id));
    setResult(null);
    setMergeError(null);
  };

  const moveItem = (from: number, to: number) => {
    if (from === to || to < 0 || to >= items.length) return;

    setItems((previous) => {
      const next = [...previous];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setResult(null);
  };

  const isReading = items.some((item) => item.pageCount === null);
  const hasBrokenFiles = items.some((item) => item.error !== null);
  const totalPages = items.reduce((sum, item) => sum + (item.pageCount ?? 0), 0);
  const canMerge = items.length >= 2 && !isReading && !hasBrokenFiles && !isMerging;

  const handleMerge = async () => {
    if (!canMerge) return;

    setIsMerging(true);
    setMergeError(null);

    // Name of the file being copied, to say which one failed
    let current = "";

    try {
      const { PDFDocument } = await loadPdfLib();
      const merged = await PDFDocument.create();

      for (const item of items) {
        current = item.file.name;

        const source = await PDFDocument.load(item.bytes!);
        const pages = await merged.copyPages(source, source.getPageIndices());
        pages.forEach((page) => merged.addPage(page));
      }

      current = "";

      const blob = pdfBlob(await merged.save());

      setResult(blob);
      downloadBlob(blob, outputName);
    } catch (error) {
      console.error(error);
      setMergeError(
        current
          ? `"${current}" couldn't be merged. ${pdfErrorMessage(error)}`
          : "The PDFs couldn't be merged. Please try again."
      );
    } finally {
      setIsMerging(false);
    }
  };

  const handleReset = () => {
    items.forEach(releaseThumbnail);
    setItems([]);
    setResult(null);
    setMergeError(null);
  };

  const buttonLabel = isMerging
    ? "Merging..."
    : items.length < 2
      ? "Add at least 2 PDF files"
      : isReading
        ? "Reading files..."
        : hasBrokenFiles
          ? "Remove the files that can't be read"
          : `Merge ${items.length} PDFs`;

  return (
    <div className="bg-gray-50 px-6 py-12 text-gray-900 sm:px-10 lg:px-16 sm:py-16">

      <div className="mx-auto max-w-6xl">

        <ToolHero
          icon="🗂️"
          badge="Merge PDF"
          title="Merge PDF Files"
          highlight="Online for Free"
          description="Combine several PDFs into one document. Drag the files into the order you want, then download the merged PDF."
        />

        {items.length === 0 && (
          <PdfDropzone onFiles={handleFiles} multiple />
        )}

        {items.length > 0 && (
          <div className="mt-12 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">

            {/* Toolbar */}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div className="min-w-0">
                <p className="font-semibold">
                  {items.length} {items.length === 1 ? "file" : "files"}
                  {!isReading && ` · ${totalPages} ${totalPages === 1 ? "page" : "pages"} in total`}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  Drag the files or use the arrows to change the order.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">

                <button
                  type="button"
                  onClick={() => addInputRef.current?.click()}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  + Add more files
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                >
                  Remove all
                </button>

              </div>

              <input
                ref={addInputRef}
                type="file"
                accept="application/pdf,.pdf"
                multiple
                aria-label="Add more PDF files"
                className="hidden"
                onChange={(event) => {
                  const input = event.target;

                  handleFiles(Array.from(input.files ?? []));

                  // Reset so the same file can be chosen again
                  input.value = "";
                }}
              />

            </div>

            {/* Files */}

            <ol
              className="mt-8 grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
              onDragOver={(event) => {
                // Allow dropping extra PDFs from the desktop onto the list
                if (dragIndex === null) event.preventDefault();
              }}
              onDrop={(event) => {
                if (dragIndex === null && event.dataTransfer.files.length > 0) {
                  event.preventDefault();
                  handleFiles(Array.from(event.dataTransfer.files));
                }
              }}
            >

              {items.map((item, index) => (
                <li
                  key={item.id}
                  draggable
                  onDragStart={(event) => {
                    setDragIndex(index);
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(event) => {
                    if (dragIndex === null) return;
                    event.preventDefault();
                    setDropIndex(index);
                  }}
                  onDrop={(event) => {
                    if (dragIndex === null) return;
                    event.preventDefault();
                    moveItem(dragIndex, index);
                    setDragIndex(null);
                    setDropIndex(null);
                  }}
                  onDragEnd={() => {
                    setDragIndex(null);
                    setDropIndex(null);
                  }}
                  className={`flex cursor-grab flex-col rounded-xl border p-3 transition active:cursor-grabbing ${
                    item.error
                      ? "border-red-200 bg-red-50"
                      : dropIndex === index && dragIndex !== index
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 bg-gray-50"
                  } ${dragIndex === index ? "opacity-50" : ""}`}
                >

                  <div className="relative flex h-44 w-full items-center justify-center overflow-hidden">

                    <span className="absolute left-0 top-0 flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-sm">
                      {index + 1}
                    </span>

                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt={`First page of ${item.file.name}`}
                        draggable={false}
                        className="max-h-40 max-w-[80%] shadow-sm"
                      />
                    ) : item.error ? (
                      <span className="text-4xl" aria-hidden="true">⚠️</span>
                    ) : (
                      <span className="text-sm text-gray-400">Loading...</span>
                    )}

                  </div>

                  <p className="mt-3 truncate text-sm font-semibold" title={item.file.name}>
                    {item.file.name}
                  </p>

                  {item.error ? (
                    <p className="mt-1 text-xs leading-5 text-red-700">
                      {item.error}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-gray-500">
                      {item.pageCount === null
                        ? "Reading..."
                        : `${item.pageCount} ${item.pageCount === 1 ? "page" : "pages"}`}
                      {" · "}
                      {formatFileSize(item.file.size)}
                    </p>
                  )}

                  <div className="mt-3 flex items-center justify-between gap-2">

                    <div className="flex gap-2">

                      <button
                        type="button"
                        onClick={() => moveItem(index, index - 1)}
                        disabled={index === 0}
                        aria-label={`Move ${item.file.name} up`}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-lg text-gray-700 shadow-sm transition hover:bg-blue-50 hover:text-blue-600 disabled:opacity-40"
                      >
                        ↑
                      </button>

                      <button
                        type="button"
                        onClick={() => moveItem(index, index + 1)}
                        disabled={index === items.length - 1}
                        aria-label={`Move ${item.file.name} down`}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-lg text-gray-700 shadow-sm transition hover:bg-blue-50 hover:text-blue-600 disabled:opacity-40"
                      >
                        ↓
                      </button>

                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      aria-label={`Remove ${item.file.name}`}
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-lg text-red-600 shadow-sm transition hover:bg-red-50"
                    >
                      ✕
                    </button>

                  </div>

                </li>
              ))}

            </ol>

            {mergeError && (
              <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {mergeError}
              </p>
            )}

            <button
              type="button"
              onClick={handleMerge}
              disabled={!canMerge}
              className="mt-8 w-full rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {buttonLabel}
            </button>

          </div>
        )}

        {result && (
          <ResultCard
            fileName={outputName}
            size={result.size}
            note={`${items.length} files combined into one PDF with ${totalPages} pages.`}
            onDownload={() => downloadBlob(result, outputName)}
            onReset={handleReset}
            resetLabel="Merge other PDFs"
          />
        )}

      </div>

    </div>
  );
}
