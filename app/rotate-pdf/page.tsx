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

export default function RotatePdf() {
  const [file, setFile] = useState<File | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);

  // Extra rotation per page in degrees (0, 90, 180, 270)
  const [rotations, setRotations] = useState<number[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<Blob | null>(null);

  const { previews, pageCount, loading, error } = usePdfPreviews(bytes);

  const outputName = file ? `${baseName(file.name)}-rotated.pdf` : "rotated.pdf";

  const handleFiles = async ([selected]: File[]) => {
    setFile(selected);
    setBytes(await readFileBytes(selected));
    setRotations([]);
    setResult(null);
  };

  const rotationOf = (index: number) => rotations[index] ?? 0;

  const rotatePage = (index: number, delta: number) => {
    setRotations((previous) => {
      const next = Array.from({ length: pageCount }, (_, i) => previous[i] ?? 0);
      next[index] = (next[index] + delta + 360) % 360;
      return next;
    });
    setResult(null);
  };

  const rotateAll = (delta: number) => {
    setRotations((previous) =>
      Array.from({ length: pageCount }, (_, i) => ((previous[i] ?? 0) + delta + 360) % 360)
    );
    setResult(null);
  };

  const hasChanges = rotations.some((rotation) => rotation !== 0);

  const handleSave = async () => {
    if (!bytes) return;

    setIsSaving(true);

    try {
      const { PDFDocument, degrees } = await loadPdfLib();
      const pdf = await PDFDocument.load(bytes);

      pdf.getPages().forEach((page, index) => {
        const extra = rotationOf(index);

        if (extra !== 0) {
          page.setRotation(degrees((page.getRotation().angle + extra) % 360));
        }
      });

      const blob = pdfBlob(await pdf.save());

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
    setRotations([]);
    setResult(null);
  };

  return (
    <div className="bg-gray-50 px-6 py-12 text-gray-900 sm:px-10 lg:px-16 sm:py-16">

      <div className="mx-auto max-w-6xl">

        <ToolHero
          icon="↻"
          badge="Rotate PDF"
          title="Rotate PDF Pages"
          highlight="Online for Free"
          description="Rotate one page or all pages of your PDF left or right, then download the fixed file."
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
                    ? `${pageCount} ${pageCount === 1 ? "page" : "pages"} · click the arrows on a page to rotate it`
                    : "Reading PDF..."}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">

                <button
                  type="button"
                  onClick={() => rotateAll(-90)}
                  disabled={pageCount === 0}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  ↺ Rotate all left
                </button>

                <button
                  type="button"
                  onClick={() => rotateAll(90)}
                  disabled={pageCount === 0}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  ↻ Rotate all right
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

            {/* Pages */}

            <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">

              {previews.map((preview, index) => (
                <div
                  key={preview.url}
                  className="flex flex-col items-center rounded-xl border border-gray-200 bg-gray-50 p-3"
                >

                  <div className="flex h-44 w-full items-center justify-center overflow-hidden">
                    <img
                      src={preview.url}
                      alt={`Page ${index + 1}`}
                      className="max-h-40 max-w-[85%] shadow-sm transition-transform duration-300"
                      style={{ transform: `rotate(${rotationOf(index)}deg)` }}
                    />
                  </div>

                  <div className="mt-3 flex w-full items-center justify-between">

                    <button
                      type="button"
                      onClick={() => rotatePage(index, -90)}
                      aria-label={`Rotate page ${index + 1} left`}
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-lg text-gray-700 shadow-sm transition hover:bg-blue-50 hover:text-blue-600"
                    >
                      ↺
                    </button>

                    <span className="text-sm font-medium text-gray-600">
                      {index + 1}
                    </span>

                    <button
                      type="button"
                      onClick={() => rotatePage(index, 90)}
                      aria-label={`Rotate page ${index + 1} right`}
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-lg text-gray-700 shadow-sm transition hover:bg-blue-50 hover:text-blue-600"
                    >
                      ↻
                    </button>

                  </div>

                </div>
              ))}

            </div>

            {loading && !error && (
              <p className="mt-6 text-center text-sm text-gray-500">
                Loading page previews...
              </p>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="mt-8 w-full rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving
                ? "Saving..."
                : hasChanges
                  ? "Save rotated PDF"
                  : "Rotate at least one page"}
            </button>

          </div>
        )}

        {result && (
          <ResultCard
            fileName={outputName}
            size={result.size}
            onDownload={() => downloadBlob(result, outputName)}
            onReset={handleReset}
            resetLabel="Rotate another PDF"
          />
        )}

      </div>

    </div>
  );
}
