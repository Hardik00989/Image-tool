"use client";

import { useState } from "react";
import Link from "next/link";
import ToolHero from "@/components/ToolHero";
import PdfDropzone from "@/components/pdf/PdfDropzone";
import { usePdfPreviews, type PagePreview } from "@/components/pdf/usePdfPreviews";
import { isPdfFile, readFileBytes } from "@/lib/pdf";
import {
  comparePages,
  countWords,
  extractPageTexts,
  type DiffPart,
  type PageComparison,
} from "./compare-text";

type Slot = { file: File; bytes: Uint8Array };

// Long unchanged stretches are shortened to this many words of context
const CONTEXT_WORDS = 12;

export default function ComparePdf() {
  const [original, setOriginal] = useState<Slot | null>(null);
  const [changed, setChanged] = useState<Slot | null>(null);

  const [progress, setProgress] = useState<string | null>(null);
  const [results, setResults] = useState<PageComparison[] | null>(null);
  const [compareError, setCompareError] = useState<string | null>(null);

  const originalPdf = usePdfPreviews(original?.bytes ?? null, { previewWidth: 160 });
  const changedPdf = usePdfPreviews(changed?.bytes ?? null, { previewWidth: 160 });

  const chooseFile = (which: "original" | "changed") => async ([file]: File[]) => {
    const slot = { file, bytes: await readFileBytes(file) };

    if (which === "original") setOriginal(slot);
    else setChanged(slot);

    setResults(null);
    setCompareError(null);
  };

  const ready = originalPdf.pdf !== null && changedPdf.pdf !== null;

  const handleCompare = async () => {
    if (!originalPdf.pdf || !changedPdf.pdf) return;

    setResults(null);
    setCompareError(null);

    try {
      const oldTexts = await extractPageTexts(originalPdf.pdf, (page, total) =>
        setProgress(`Reading original: page ${page} of ${total}...`)
      );
      const newTexts = await extractPageTexts(changedPdf.pdf, (page, total) =>
        setProgress(`Reading changed PDF: page ${page} of ${total}...`)
      );

      setProgress("Comparing...");
      setResults(await comparePages(oldTexts, newTexts));
    } catch (error) {
      console.error(error);
      setCompareError("The text of these PDFs couldn't be read. One of them may be damaged — try the Repair PDF tool.");
    } finally {
      setProgress(null);
    }
  };

  const handleReset = () => {
    setOriginal(null);
    setChanged(null);
    setResults(null);
    setCompareError(null);
  };

  // Summary numbers
  const changedPages = results?.filter((page) => page.status !== "same") ?? [];
  const wordsAdded = results?.reduce((sum, page) => sum + page.wordsAdded, 0) ?? 0;
  const wordsRemoved = results?.reduce((sum, page) => sum + page.wordsRemoved, 0) ?? 0;
  const textless = results !== null && results.every((page) => page.noText);
  const someTextless = results?.some((page) => page.noText) ?? false;

  return (
    <div className="bg-gray-50 px-6 py-12 text-gray-900 sm:px-10 lg:px-16 sm:py-16">

      <div className="mx-auto max-w-6xl">

        <ToolHero
          icon="⇄"
          badge="Compare PDF"
          title="Compare PDF Files"
          highlight="Online for Free"
          description="Upload two versions of a document and see exactly which words were added or removed, page by page."
        />

        {/* The two files */}

        <div className="grid gap-x-6 lg:grid-cols-2">

          {[
            { key: "original" as const, label: "Original PDF", slot: original, state: originalPdf, clear: () => setOriginal(null) },
            { key: "changed" as const, label: "Changed PDF", slot: changed, state: changedPdf, clear: () => setChanged(null) },
          ].map(({ key, label, slot, state, clear }) =>
            slot ? (
              <FileCard
                key={key}
                label={label}
                file={slot.file}
                pageCount={state.pageCount}
                preview={state.previews[0]}
                error={state.error}
                onReplace={chooseFile(key)}
                onRemove={() => {
                  clear();
                  setResults(null);
                }}
              />
            ) : (
              // Wrapper keeps the dropzone full width inside the grid cell
              <div key={key} className="min-w-0">
                <PdfDropzone
                  onFiles={chooseFile(key)}
                  title={label}
                  buttonLabel={key === "original" ? "Choose original" : "Choose changed PDF"}
                  hint={key === "original" ? "The older version of the document." : "The newer version to compare against."}
                />
              </div>
            )
          )}

        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          Both files are compared in your browser and never uploaded.
        </p>

        {(original || changed) && (
          <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">

            <div className="flex flex-col gap-3 sm:flex-row">

              <button
                type="button"
                onClick={handleCompare}
                disabled={!ready || progress !== null}
                className="flex-1 rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {progress ?? (ready ? "Compare PDFs" : "Add both PDFs to compare")}
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="rounded-xl border border-red-200 px-6 py-4 font-semibold text-red-600 transition hover:bg-red-50"
              >
                Start over
              </button>

            </div>

            {compareError && (
              <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {compareError}
              </p>
            )}

            {results && (
              <div className="mt-8">

                {/* Summary */}

                {textless ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
                    <p className="font-semibold">No text found in these PDFs.</p>
                    <p className="mt-1">
                      They are probably scanned images. Make them searchable with{" "}
                      <Link href="/ocr-pdf" className="font-semibold underline">OCR PDF</Link>{" "}
                      first, then compare the results.
                    </p>
                  </div>
                ) : changedPages.length === 0 ? (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-5">
                    <p className="text-lg font-bold text-green-900">✓ No text differences found</p>
                    <p className="mt-1 text-sm text-green-800">
                      All {results.length} {results.length === 1 ? "page has" : "pages have"} the same text in both PDFs.
                      Formatting, images and layout are not compared.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-3">
                    <SummaryTile
                      value={`${changedPages.length} of ${results.length}`}
                      label={results.length === 1 ? "page changed" : "pages changed"}
                      tone="blue"
                    />
                    <SummaryTile value={String(wordsRemoved)} label={wordsRemoved === 1 ? "word removed" : "words removed"} tone="red" />
                    <SummaryTile value={String(wordsAdded)} label={wordsAdded === 1 ? "word added" : "words added"} tone="green" />
                  </div>
                )}

                {someTextless && !textless && (
                  <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    Some pages have no selectable text (they may be scanned), so they can&apos;t be
                    compared. Use <Link href="/ocr-pdf" className="font-semibold underline">OCR PDF</Link> to
                    add text to them.
                  </p>
                )}

                {originalPdf.pageCount !== changedPdf.pageCount && (
                  <p className="mt-4 text-sm text-gray-600">
                    The original has {originalPdf.pageCount} {originalPdf.pageCount === 1 ? "page" : "pages"} and
                    the changed PDF has {changedPdf.pageCount}. Extra pages are shown as fully added or removed.
                  </p>
                )}

                {/* Legend */}

                {!textless && changedPages.length > 0 && (
                  <p className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-600">
                    <span>
                      <del className="rounded bg-red-100 px-1 text-red-700">Removed</del> from the original
                    </span>
                    <span>
                      <ins className="rounded bg-green-100 px-1 text-green-800 no-underline">Added</ins> in the changed PDF
                    </span>
                  </p>
                )}

                {/* Pages */}

                <div className="mt-6 space-y-3">
                  {results.map((page) => (
                    <PageResult
                      key={page.page}
                      page={page}
                      originalPreview={originalPdf.previews[page.page - 1]}
                      changedPreview={changedPdf.previews[page.page - 1]}
                    />
                  ))}
                </div>

              </div>
            )}

          </div>
        )}

      </div>

    </div>
  );
}

// A chosen file: name, first page, replace/remove
function FileCard({
  label,
  file,
  pageCount,
  preview,
  error,
  onReplace,
  onRemove,
}: {
  label: string;
  file: File;
  pageCount: number;
  preview?: PagePreview;
  error: string | null;
  onReplace: (files: File[]) => void;
  onRemove: () => void;
}) {
  return (
    <div className="mt-12 flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">

      <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
        {label}
      </p>

      <div className="mt-4 flex min-w-0 gap-5">

        <div className="flex h-32 w-24 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-1.5">
          {preview ? (
            <img src={preview.url} alt={`First page of ${file.name}`} className="max-h-full max-w-full shadow-sm" />
          ) : (
            <span className="text-2xl" aria-hidden="true">📄</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold" title={file.name}>
            {file.name}
          </p>

          <p className="mt-1 text-sm text-gray-500">
            {error ? "Can't be read" : pageCount > 0 ? `${pageCount} ${pageCount === 1 ? "page" : "pages"}` : "Reading PDF..."}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">

            <label className="cursor-pointer rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 focus-within:ring-2 focus-within:ring-blue-500">
              Replace
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                aria-label={`Replace ${label}`}
                onChange={(event) => {
                  const input = event.target;
                  const chosen = input.files?.[0];

                  input.value = "";

                  if (!chosen) return;

                  if (!isPdfFile(chosen)) {
                    alert("Please choose a PDF file.");
                    return;
                  }

                  onReplace([chosen]);
                }}
              />
            </label>

            <button
              type="button"
              onClick={onRemove}
              className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
            >
              Remove
            </button>

          </div>
        </div>

      </div>

      {error && (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      )}

    </div>
  );
}

function SummaryTile({ value, label, tone }: { value: string; label: string; tone: "blue" | "red" | "green" }) {
  const colors = {
    blue: "border-blue-100 bg-blue-50 text-blue-900",
    red: "border-red-100 bg-red-50 text-red-900",
    green: "border-green-100 bg-green-50 text-green-900",
  };

  return (
    <div className={`rounded-xl border p-5 ${colors[tone]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="mt-1 text-sm">{label}</p>
    </div>
  );
}

// Keeps only a few words around changes in long unchanged stretches
function shorten(text: string, position: "first" | "middle" | "last" | "only") {
  const words = text.split(" ");

  if (position === "only" || words.length <= CONTEXT_WORDS * 2 + 4) return text;

  const head = words.slice(0, CONTEXT_WORDS).join(" ");
  const tail = words.slice(-CONTEXT_WORDS).join(" ");

  if (position === "first") return `… ${tail}`;
  if (position === "last") return `${head} …`;

  return `${head} … ${tail}`;
}

function DiffText({ parts }: { parts: DiffPart[] }) {
  return (
    <p className="whitespace-pre-wrap break-words text-sm leading-7 text-gray-700">
      {parts.map((part, index) => {
        if (part.type === "same") {
          const position =
            parts.length === 1 ? "only" : index === 0 ? "first" : index === parts.length - 1 ? "last" : "middle";

          return <span key={index}>{shorten(part.text, position)}</span>;
        }

        return (
          <span key={index}>
            {part.removed && (
              <del className="rounded bg-red-100 px-0.5 text-red-700" title="Removed">
                {part.removed}
              </del>
            )}
            {part.removed && part.added && " "}
            {part.added && (
              <ins className="rounded bg-green-100 px-0.5 text-green-800 no-underline" title="Added">
                {part.added}
              </ins>
            )}
          </span>
        );
      })}
    </p>
  );
}

function PageResult({
  page,
  originalPreview,
  changedPreview,
}: {
  page: PageComparison;
  originalPreview?: PagePreview;
  changedPreview?: PagePreview;
}) {
  const badge = {
    same: { text: "No changes", className: "bg-gray-100 text-gray-600" },
    changed: { text: `−${page.wordsRemoved} / +${page.wordsAdded} words`, className: "bg-amber-100 text-amber-800" },
    added: { text: "Only in changed PDF", className: "bg-green-100 text-green-800" },
    removed: { text: "Only in original", className: "bg-red-100 text-red-700" },
  }[page.status];

  return (
    <details
      open={page.status !== "same"}
      className="group rounded-xl border border-gray-200 bg-white"
      data-page-status={page.status}
    >

      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
        <span className="font-semibold">
          Page {page.page}
        </span>

        <span className="flex items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>
            {page.noText ? "No text" : badge.text}
          </span>

          <span aria-hidden="true" className="text-gray-400 transition group-open:rotate-180">
            ▾
          </span>
        </span>
      </summary>

      <div className="flex flex-col gap-5 border-t border-gray-100 px-5 py-5 sm:flex-row">

        <div className="min-w-0 flex-1">
          {page.noText ? (
            <p className="text-sm text-gray-500">
              This page has no selectable text. If it&apos;s a scan, run it through{" "}
              <Link href="/ocr-pdf" className="font-semibold text-blue-600 underline">OCR PDF</Link> first.
            </p>
          ) : page.status === "same" ? (
            <p className="text-sm leading-7 text-gray-600">
              {shorten(page.parts[0]?.type === "same" ? page.parts[0].text : "", "last")}
              <span className="ml-2 text-gray-400">({countWords(page.parts[0]?.type === "same" ? page.parts[0].text : "")} words, identical)</span>
            </p>
          ) : (
            <DiffText parts={page.parts} />
          )}
        </div>

        {(originalPreview || changedPreview) && (
          <div className="flex shrink-0 gap-3">
            {[
              { label: "Original", preview: originalPreview },
              { label: "Changed", preview: changedPreview },
            ].map(({ label, preview }) => (
              <figure key={label} className="w-24 text-center">
                <div className="flex h-32 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-1">
                  {preview ? (
                    <img src={preview.url} alt={`${label} page ${page.page}`} className="max-h-full max-w-full shadow-sm" />
                  ) : (
                    <span className="text-xs text-gray-400">No page</span>
                  )}
                </div>
                <figcaption className="mt-1 text-xs text-gray-500">{label}</figcaption>
              </figure>
            ))}
          </div>
        )}

      </div>

    </details>
  );
}
