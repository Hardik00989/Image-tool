"use client";

import { useMemo, useState } from "react";
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

type Mode = "extract" | "split";
type SplitMode = "each" | "every" | "ranges";

// [0, 1, 2, 4] -> "1-3, 5"
function formatRanges(indexes: number[]) {
  const parts: string[] = [];
  let start = -1;
  let previous = -2;

  for (const index of [...indexes].sort((a, b) => a - b)) {
    if (index !== previous + 1) {
      if (start >= 0) parts.push(start === previous ? `${start + 1}` : `${start + 1}-${previous + 1}`);
      start = index;
    }

    previous = index;
  }

  if (start >= 0) parts.push(start === previous ? `${start + 1}` : `${start + 1}-${previous + 1}`);

  return parts.join(", ");
}

// File name part for a group of pages: "page-5" or "pages-1-3" or "pages-1-3_5"
function pagesLabel(indexes: number[]) {
  return indexes.length === 1
    ? `page-${indexes[0] + 1}`
    : `pages-${formatRanges(indexes).replace(/, /g, "_")}`;
}

export default function SplitPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);

  const [mode, setMode] = useState<Mode>("extract");

  // Extract mode: typed ranges and the pages selected by clicking
  const [selected, setSelected] = useState<number[]>([]);
  const [rangeText, setRangeText] = useState("");

  // Split mode
  const [splitMode, setSplitMode] = useState<SplitMode>("each");
  const [everyN, setEveryN] = useState(2);
  const [customRanges, setCustomRanges] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; name: string; count: number } | null>(null);

  const { previews, pageCount, loading, error } = usePdfPreviews(bytes);

  const base = file ? baseName(file.name) : "document";

  const handleFiles = async ([selectedFile]: File[]) => {
    setFile(selectedFile);
    setBytes(await readFileBytes(selectedFile));
    setSelected([]);
    setRangeText("");
    setCustomRanges("");
    setResult(null);
  };

  // Output files as groups of 0-based page indexes, or an error to show
  const plan = useMemo((): { groups: number[][]; error: string | null } => {
    if (pageCount === 0) return { groups: [], error: null };

    try {
      if (mode === "extract") {
        if (selected.length === 0) return { groups: [], error: null };
        return { groups: [selected], error: null };
      }

      if (splitMode === "each") {
        return { groups: Array.from({ length: pageCount }, (_, i) => [i]), error: null };
      }

      if (splitMode === "every") {
        if (!Number.isInteger(everyN) || everyN < 1) {
          return { groups: [], error: "Enter a whole number of pages (1 or more)." };
        }

        const groups: number[][] = [];

        for (let start = 0; start < pageCount; start += everyN) {
          groups.push(
            Array.from({ length: Math.min(everyN, pageCount - start) }, (_, i) => start + i)
          );
        }

        return { groups, error: null };
      }

      // Custom ranges: each comma-separated part becomes its own file
      const parts = customRanges.split(",").map((part) => part.trim()).filter(Boolean);

      if (parts.length === 0) return { groups: [], error: null };

      return { groups: parts.map((part) => parsePageRanges(part, pageCount)), error: null };
    } catch (planError) {
      return { groups: [], error: planError instanceof Error ? planError.message : String(planError) };
    }
  }, [mode, selected, splitMode, everyN, customRanges, pageCount]);

  // Typed range error in extract mode (the selection keeps its last valid value)
  const rangeError = useMemo(() => {
    if (mode !== "extract" || rangeText.trim() === "" || pageCount === 0) return null;

    try {
      parsePageRanges(rangeText, pageCount);
      return null;
    } catch (parseError) {
      return parseError instanceof Error ? parseError.message : String(parseError);
    }
  }, [mode, rangeText, pageCount]);

  // Which output file each page ends up in (for the badges on the previews)
  const fileOfPage = useMemo(() => {
    const map = new Map<number, number>();

    plan.groups.forEach((group, fileIndex) => {
      group.forEach((page) => {
        if (!map.has(page)) map.set(page, fileIndex);
      });
    });

    return map;
  }, [plan]);

  const handleRangeText = (value: string) => {
    setRangeText(value);
    setResult(null);

    if (value.trim() === "") {
      setSelected([]);
      return;
    }

    try {
      setSelected(parsePageRanges(value, pageCount));
    } catch {
      // Keep the previous selection; the error is shown below the input
    }
  };

  const togglePage = (index: number) => {
    if (mode !== "extract") return;

    const next = selected.includes(index)
      ? selected.filter((page) => page !== index)
      : [...selected, index].sort((a, b) => a - b);

    setSelected(next);
    setRangeText(formatRanges(next));
    setResult(null);
  };

  const outputNameFor = (group: number[]) =>
    mode === "extract" ? `${base}-extracted.pdf` : `${base}-${pagesLabel(group)}.pdf`;

  const canSave = plan.groups.length > 0 && !plan.error && !rangeError && !isSaving;

  const handleSave = async () => {
    if (!bytes || !canSave) return;

    setIsSaving(true);

    try {
      const { PDFDocument } = await loadPdfLib();
      const source = await PDFDocument.load(bytes);

      const outputs: { name: string; data: Uint8Array }[] = [];

      for (const group of plan.groups) {
        const output = await PDFDocument.create();
        const pages = await output.copyPages(source, group);

        pages.forEach((page) => output.addPage(page));
        outputs.push({ name: outputNameFor(group), data: await output.save() });
      }

      let blob: Blob;
      let name: string;

      if (outputs.length === 1) {
        blob = pdfBlob(outputs[0].data);
        name = outputs[0].name;
      } else {
        const { zipSync } = await import("fflate");

        // PDFs are already compressed, so store them without extra compression
        const zipped = zipSync(
          Object.fromEntries(outputs.map((output) => [output.name, [output.data, { level: 0 }]]))
        );

        blob = new Blob([zipped as BlobPart], { type: "application/zip" });
        name = `${base}-split.zip`;
      }

      setResult({ blob, name, count: outputs.length });
      downloadBlob(blob, name);
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
    setSelected([]);
    setRangeText("");
    setCustomRanges("");
    setResult(null);
  };

  const optionClass = (active: boolean) =>
    `rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition sm:px-4 ${
      active
        ? "border-blue-600 bg-blue-600 text-white"
        : "border-gray-200 bg-gray-50 text-gray-700 hover:border-blue-300 hover:bg-blue-50"
    }`;

  const inputClass =
    "w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  const saveLabel = (() => {
    if (isSaving) return "Splitting...";
    if (rangeError || plan.error) return "Fix the page numbers first";

    if (plan.groups.length === 0) {
      return mode === "extract" ? "Select at least one page" : "Enter the page ranges";
    }

    if (mode === "extract") {
      const count = plan.groups[0].length;
      return `Extract ${count} ${count === 1 ? "page" : "pages"}`;
    }

    return plan.groups.length === 1
      ? "Split into 1 PDF"
      : `Split into ${plan.groups.length} PDFs (ZIP)`;
  })();

  return (
    <div className="bg-gray-50 px-6 py-12 text-gray-900 sm:px-10 lg:px-16 sm:py-16">

      <div className="mx-auto max-w-6xl">

        <ToolHero
          icon="✂️"
          badge="Split PDF"
          title="Split PDF Files"
          highlight="Online for Free"
          description="Extract the pages you need into a new PDF, or split a PDF into several smaller files."
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
                    ? `${pageCount} ${pageCount === 1 ? "page" : "pages"}`
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

            {pageCount > 0 && (
              <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-5">

                {/* Mode */}

                <div className="flex flex-wrap gap-2 sm:gap-3" role="group" aria-label="Split mode">
                  <button
                    type="button"
                    onClick={() => { setMode("extract"); setResult(null); }}
                    aria-pressed={mode === "extract"}
                    className={optionClass(mode === "extract")}
                  >
                    Extract pages
                  </button>

                  <button
                    type="button"
                    onClick={() => { setMode("split"); setResult(null); }}
                    aria-pressed={mode === "split"}
                    className={optionClass(mode === "split")}
                  >
                    Split into files
                  </button>
                </div>

                {mode === "extract" && (
                  <div className="mt-5">
                    <label htmlFor="extract-ranges" className="text-sm font-semibold text-gray-700">
                      Pages to extract
                    </label>

                    <input
                      id="extract-ranges"
                      type="text"
                      value={rangeText}
                      onChange={(event) => handleRangeText(event.target.value)}
                      placeholder="e.g. 1-3, 5"
                      className={`mt-2 ${inputClass}`}
                    />

                    <p className="mt-2 text-sm text-gray-500">
                      Click pages below or type page numbers and ranges. The selected pages are saved as one new PDF.
                    </p>

                    {rangeError && (
                      <p className="mt-2 text-sm font-medium text-red-600">
                        {rangeError}
                      </p>
                    )}
                  </div>
                )}

                {mode === "split" && (
                  <div className="mt-5">

                    <div className="flex flex-wrap gap-2 sm:gap-3" role="group" aria-label="How to split">
                      <button
                        type="button"
                        onClick={() => { setSplitMode("each"); setResult(null); }}
                        aria-pressed={splitMode === "each"}
                        className={optionClass(splitMode === "each")}
                      >
                        Every page
                      </button>

                      <button
                        type="button"
                        onClick={() => { setSplitMode("every"); setResult(null); }}
                        aria-pressed={splitMode === "every"}
                        className={optionClass(splitMode === "every")}
                      >
                        Every N pages
                      </button>

                      <button
                        type="button"
                        onClick={() => { setSplitMode("ranges"); setResult(null); }}
                        aria-pressed={splitMode === "ranges"}
                        className={optionClass(splitMode === "ranges")}
                      >
                        Custom ranges
                      </button>
                    </div>

                    {splitMode === "each" && (
                      <p className="mt-4 text-sm text-gray-500">
                        Each page becomes its own PDF file.
                      </p>
                    )}

                    {splitMode === "every" && (
                      <div className="mt-4">
                        <label htmlFor="every-n" className="text-sm font-semibold text-gray-700">
                          Pages per file
                        </label>

                        <input
                          id="every-n"
                          type="number"
                          min={1}
                          max={pageCount}
                          value={Number.isNaN(everyN) ? "" : everyN}
                          onChange={(event) => { setEveryN(event.target.valueAsNumber); setResult(null); }}
                          className={`mt-2 max-w-40 ${inputClass}`}
                        />
                      </div>
                    )}

                    {splitMode === "ranges" && (
                      <div className="mt-4">
                        <label htmlFor="custom-ranges" className="text-sm font-semibold text-gray-700">
                          Ranges (each one becomes a file)
                        </label>

                        <input
                          id="custom-ranges"
                          type="text"
                          value={customRanges}
                          onChange={(event) => { setCustomRanges(event.target.value); setResult(null); }}
                          placeholder={pageCount >= 3 ? `e.g. 1-2, 3-${pageCount}` : "e.g. 1, 2"}
                          className={`mt-2 ${inputClass}`}
                        />

                        <p className="mt-2 text-sm text-gray-500">
                          Separate files with commas. &quot;7-&quot; means page 7 to the end.
                        </p>
                      </div>
                    )}

                    {plan.error && (
                      <p className="mt-2 text-sm font-medium text-red-600">
                        {plan.error}
                      </p>
                    )}

                    {plan.groups.length > 0 && (
                      <p className="mt-3 text-sm font-medium text-gray-700">
                        {plan.groups.length} {plan.groups.length === 1 ? "file" : "files"}
                        {plan.groups.length > 1 && ", downloaded together as a ZIP"}
                      </p>
                    )}

                  </div>
                )}

              </div>
            )}

            {/* Pages */}

            <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">

              {previews.map((preview, index) => {
                const isSelected = mode === "extract" && selected.includes(index);
                const fileIndex = fileOfPage.get(index);

                return (
                  <button
                    key={preview.url}
                    type="button"
                    onClick={() => togglePage(index)}
                    aria-pressed={mode === "extract" ? isSelected : undefined}
                    aria-label={
                      mode === "extract"
                        ? `${isSelected ? "Deselect" : "Select"} page ${index + 1}`
                        : `Page ${index + 1}`
                    }
                    className={`relative flex flex-col items-center rounded-xl border-2 p-3 transition ${
                      mode === "extract" ? "cursor-pointer" : "cursor-default"
                    } ${
                      isSelected
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 bg-gray-50 hover:border-gray-300"
                    }`}
                  >

                    {isSelected && (
                      <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-sm" aria-hidden="true">
                        ✓
                      </span>
                    )}

                    {mode === "split" && fileIndex !== undefined && (
                      <span className="absolute left-2 top-2 rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white shadow-sm">
                        File {fileIndex + 1}
                      </span>
                    )}

                    <div className="flex h-44 w-full items-center justify-center overflow-hidden">
                      <img
                        src={preview.url}
                        alt=""
                        className="max-h-40 max-w-[85%] shadow-sm"
                      />
                    </div>

                    <span className="mt-3 text-sm font-medium text-gray-600">
                      {index + 1}
                    </span>

                  </button>
                );
              })}

            </div>

            {loading && !error && (
              <p className="mt-6 text-center text-sm text-gray-500">
                Loading page previews...
              </p>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="mt-8 w-full rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saveLabel}
            </button>

          </div>
        )}

        {result && (
          <ResultCard
            fileName={result.name}
            size={result.blob.size}
            note={result.count > 1 ? `The ZIP contains ${result.count} PDF files.` : undefined}
            onDownload={() => downloadBlob(result.blob, result.name)}
            onReset={handleReset}
            resetLabel="Split another PDF"
          />
        )}

      </div>

    </div>
  );
}
