"use client";

import { formatFileSize } from "@/lib/pdf";

// Shown after a PDF tool finishes: file info, download again, start over
export default function ResultCard({
  title = "Your file is ready",
  fileName,
  size,
  note,
  onDownload,
  onReset,
  resetLabel = "Start over",
}: {
  title?: string;
  fileName: string;
  size?: number;
  note?: string;
  onDownload: () => void;
  onReset: () => void;
  resetLabel?: string;
}) {
  return (
    <div className="mx-auto mt-10 max-w-4xl rounded-2xl border border-green-200 bg-green-50 p-6 sm:p-8">

      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

        <div className="min-w-0">
          <p className="text-sm font-semibold text-green-700">
            ✓ {title}
          </p>

          <p className="mt-1 truncate text-lg font-bold text-green-950" title={fileName}>
            {fileName}
          </p>

          {size !== undefined && (
            <p className="mt-0.5 text-sm text-green-800">
              {formatFileSize(size)}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-3 sm:flex-row">

          <button
            type="button"
            onClick={onDownload}
            className="rounded-xl bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-700"
          >
            Download
          </button>

          <button
            type="button"
            onClick={onReset}
            className="rounded-xl border border-green-300 bg-white px-6 py-3 font-semibold text-green-800 transition hover:bg-green-100"
          >
            {resetLabel}
          </button>

        </div>

      </div>

      {note && (
        <p className="mt-4 text-sm leading-6 text-green-900">
          {note}
        </p>
      )}

    </div>
  );
}
