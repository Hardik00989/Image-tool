"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { renderPageToCanvas, type PdfJsDocument } from "@/lib/pdf";

// Size of a page as it is displayed (rotation applied), in PDF points,
// plus the PDF.js matrix that maps PDF user space to these display points
export type PageGeometry = {
  width: number;
  height: number;
  transform: number[];
};

// Largest canvas side we render, to keep memory in check on huge pages
const MAX_CANVAS_SIDE = 8000;

// Renders one page as large as the container allows (fit width) and
// lays an overlay on top. `children` gets the current points-to-pixels scale.
export default function PageCanvas({
  pdf,
  pageNumber,
  maxWidth = 860,
  children,
}: {
  pdf: PdfJsDocument;
  pageNumber: number;
  maxWidth?: number;
  children: (scale: number, geometry: PageGeometry) => ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [containerWidth, setContainerWidth] = useState(0);

  const [geometry, setGeometry] = useState<{
    pdf: PdfJsDocument;
    pageNumber: number;
    value: PageGeometry;
  } | null>(null);

  const [renderedKey, setRenderedKey] = useState("");

  // Track the available width so the page scales on small screens
  useEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    const observer = new ResizeObserver(([entry]) => {
      setContainerWidth(Math.floor(entry.contentRect.width));
    });

    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  // Read the page size and rotation
  useEffect(() => {
    let cancelled = false;

    pdf.getPage(pageNumber).then((page) => {
      if (cancelled) return;

      const viewport = page.getViewport({ scale: 1 });

      setGeometry({
        pdf,
        pageNumber,
        value: {
          width: viewport.width,
          height: viewport.height,
          transform: viewport.transform,
        },
      });
    });

    return () => {
      cancelled = true;
    };
  }, [pdf, pageNumber]);

  const current =
    geometry && geometry.pdf === pdf && geometry.pageNumber === pageNumber
      ? geometry.value
      : null;

  const scale =
    current && containerWidth > 0
      ? Math.min(containerWidth, maxWidth) / current.width
      : 0;

  const key = `${pageNumber}:${scale.toFixed(4)}`;

  // Draw the page (sharp on high-DPI screens, capped in size)
  useEffect(() => {
    if (!current || scale === 0) return;

    let cancelled = false;

    const ratio = window.devicePixelRatio || 1;
    const pixelScale = Math.min(
      scale * ratio,
      MAX_CANVAS_SIDE / current.width,
      MAX_CANVAS_SIDE / current.height
    );

    renderPageToCanvas(pdf, pageNumber, pixelScale)
      .then((rendered) => {
        const canvas = canvasRef.current;

        if (cancelled || !canvas) return;

        canvas.width = rendered.width;
        canvas.height = rendered.height;
        canvas.getContext("2d")?.drawImage(rendered, 0, 0);

        // Free the offscreen canvas memory straight away
        rendered.width = 0;
        rendered.height = 0;

        setRenderedKey(`${pageNumber}:${scale.toFixed(4)}`);
      })
      .catch((error) => console.error(error));

    return () => {
      cancelled = true;
    };
  }, [pdf, pageNumber, current, scale]);

  return (
    <div ref={containerRef} className="w-full">

      {current && scale > 0 ? (
        <div
          className="relative mx-auto bg-white shadow-md ring-1 ring-gray-200"
          style={{ width: current.width * scale, height: current.height * scale }}
        >

          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full"
            aria-label={`Page ${pageNumber}`}
          />

          {renderedKey !== key && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm text-gray-500">
              Rendering page...
            </div>
          )}

          {children(scale, current)}

        </div>
      ) : (
        <div className="flex h-64 items-center justify-center text-sm text-gray-500">
          Loading page...
        </div>
      )}

    </div>
  );
}
