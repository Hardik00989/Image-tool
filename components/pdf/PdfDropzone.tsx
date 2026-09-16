"use client";

import { useId, useState } from "react";
import { isPdfFile } from "@/lib/pdf";

// Upload box with drag and drop, used by every PDF tool
export default function PdfDropzone({
  onFiles,
  multiple = false,
  accept = "application/pdf,.pdf",
  acceptPdfOnly = true,
  title,
  buttonLabel,
  hint = "Your files are processed in your browser and never uploaded.",
}: {
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  accept?: string;
  // Reject files that aren't PDFs (turn off for image or HTML uploads)
  acceptPdfOnly?: boolean;
  title?: string;
  buttonLabel?: string;
  hint?: string;
}) {
  const inputId = useId();
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (fileList: FileList | null) => {
    const files = Array.from(fileList ?? []);

    if (files.length === 0) return;

    const usable = acceptPdfOnly ? files.filter(isPdfFile) : files;

    if (usable.length === 0) {
      alert("Please choose a PDF file.");
      return;
    }

    if (usable.length < files.length) {
      alert("Some files were skipped because they aren't PDFs.");
    }

    onFiles(multiple ? usable : usable.slice(0, 1));
  };

  return (
    <div
      className={`mx-auto mt-12 max-w-4xl rounded-2xl border-2 border-dashed bg-white p-8 shadow-sm transition sm:p-12 ${
        isDragging
          ? "border-blue-500 bg-blue-50"
          : "border-gray-300 hover:border-blue-400"
      }`}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsDragging(false);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        handleFiles(event.dataTransfer.files);
      }}
    >

      <label
        htmlFor={inputId}
        className="flex cursor-pointer flex-col items-center justify-center text-center"
      >

        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-red-50 text-4xl">
          📄
        </div>

        <h2 className="mt-6 text-2xl font-bold">
          {title ?? (multiple ? "Upload PDF files" : "Upload a PDF")}
        </h2>

        <p className="mt-3 text-base text-gray-500">
          {isDragging
            ? "Drop your files here"
            : "Drag and drop here or choose from your device"}
        </p>

        <div className="mt-7 rounded-xl bg-blue-600 px-7 py-3.5 font-semibold text-white transition hover:bg-blue-700">
          {buttonLabel ?? (multiple ? "Choose PDF files" : "Choose PDF")}
        </div>

        <p className="mt-5 text-sm text-gray-400">
          {hint}
        </p>

      </label>

      <input
        id={inputId}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(event) => {
          const input = event.target;
          const files = input.files;

          handleFiles(files);

          // Reset so the same file can be chosen again
          input.value = "";
        }}
      />

    </div>
  );
}
