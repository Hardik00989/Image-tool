"use client";

import { useEffect, useState } from "react";
import {
  canvasToBlob,
  openPdfJs,
  pdfErrorMessage,
  renderPageToCanvas,
  type PdfJsDocument,
} from "@/lib/pdf";

export type PagePreview = {
  url: string;
  // Page size in PDF points (1/72 inch), before any rotation
  width: number;
  height: number;
};

// Opens a PDF and renders a small preview image of every page.
// Preview URLs are released automatically when the PDF changes.
export function usePdfPreviews(
  bytes: Uint8Array | null,
  {
    previewWidth = 220,
    maxPages = 300,
  }: { previewWidth?: number; maxPages?: number } = {}
) {
  const [state, setState] = useState<{
    bytes: Uint8Array | null;
    pdf: PdfJsDocument | null;
    previews: PagePreview[];
    pageCount: number;
    error: string | null;
  }>({ bytes: null, pdf: null, previews: [], pageCount: 0, error: null });

  useEffect(() => {
    if (!bytes) return;

    let cancelled = false;
    const urls: string[] = [];
    let pdf: PdfJsDocument | null = null;

    (async () => {
      try {
        pdf = await openPdfJs(bytes);

        if (cancelled) return;

        const pageCount = pdf.numPages;
        const previews: PagePreview[] = [];

        setState({ bytes, pdf, previews: [], pageCount, error: null });

        for (let pageNumber = 1; pageNumber <= Math.min(pageCount, maxPages); pageNumber++) {
          const page = await pdf.getPage(pageNumber);
          const { width, height } = page.getViewport({ scale: 1, rotation: 0 });
          const canvas = await renderPageToCanvas(pdf, pageNumber, previewWidth / width);
          const url = URL.createObjectURL(await canvasToBlob(canvas, "image/jpeg", 0.8));

          if (cancelled) {
            URL.revokeObjectURL(url);
            return;
          }

          urls.push(url);
          previews.push({ url, width, height });

          // Show previews as they are ready
          setState({ bytes, pdf, previews: [...previews], pageCount, error: null });
        }
      } catch (error) {
        if (!cancelled) {
          console.error(error);
          setState({ bytes, pdf: null, previews: [], pageCount: 0, error: pdfErrorMessage(error) });
        }
      }
    })();

    return () => {
      cancelled = true;
      urls.forEach((url) => URL.revokeObjectURL(url));
      void pdf?.loadingTask.destroy();
    };
  }, [bytes, previewWidth, maxPages]);

  // Ignore results that belong to a previous file
  const current = state.bytes === bytes && bytes !== null;

  const finished =
    current &&
    (state.error !== null ||
      (state.pageCount > 0 &&
        state.previews.length >= Math.min(state.pageCount, maxPages)));

  return {
    pdf: current ? state.pdf : null,
    previews: current ? state.previews : [],
    pageCount: current ? state.pageCount : 0,
    error: current ? state.error : null,
    loading: bytes !== null && !finished,
  };
}
