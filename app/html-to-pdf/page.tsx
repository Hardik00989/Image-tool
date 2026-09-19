"use client";

import { useRef, useState } from "react";
import ToolHero from "@/components/ToolHero";
import ResultCard from "@/components/pdf/ResultCard";
import { downloadBlob } from "@/lib/pdf";

type PageSize = "a4" | "letter";
type Orientation = "portrait" | "landscape";
type Margin = "none" | "small" | "normal";

// Page sizes in PDF points (1/72 inch), portrait
const PAGE_SIZES: Record<PageSize, { label: string; width: number; height: number }> = {
  a4: { label: "A4", width: 595.28, height: 841.89 },
  letter: { label: "Letter", width: 612, height: 792 },
};

const MARGINS: Record<Margin, { label: string; points: number }> = {
  none: { label: "None", points: 0 },
  small: { label: "Small", points: 20 },
  normal: { label: "Normal", points: 40 },
};

// CSS pixels per PDF point (96 DPI screen / 72 DPI PDF)
const PX_PER_POINT = 96 / 72;

// Browsers can't draw canvases much taller than ~32,000 px
const MAX_CANVAS_HEIGHT = 30000;

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const EXAMPLE_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; line-height: 1.6; }
    h1 { color: #2563eb; margin-bottom: 4px; }
    .subtitle { color: #6b7280; margin-top: 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; }
    th { background: #eff6ff; }
    .total { font-weight: bold; background: #f9fafb; }
  </style>
</head>
<body>
  <h1>Project Report</h1>
  <p class="subtitle">Prepared on 26 September 2026</p>

  <p>
    This sample shows how <strong>HTML to PDF</strong> handles headings,
    paragraphs, lists, tables and <span style="color: #16a34a;">inline CSS</span>.
    Replace it with your own HTML code.
  </p>

  <h2>Highlights</h2>
  <ul>
    <li>Website traffic grew by 24% this quarter</li>
    <li>Two new features were launched</li>
    <li>Customer satisfaction reached 4.8 out of 5</li>
  </ul>

  <h2>Budget</h2>
  <table>
    <tr><th>Item</th><th>Quantity</th><th>Cost</th></tr>
    <tr><td>Design</td><td>1</td><td>$1,200</td></tr>
    <tr><td>Development</td><td>3</td><td>$4,500</td></tr>
    <tr><td>Testing</td><td>2</td><td>$800</td></tr>
    <tr class="total"><td>Total</td><td></td><td>$6,500</td></tr>
  </table>

  <p style="margin-top: 24px; padding: 12px; border-left: 4px solid #2563eb; background: #eff6ff;">
    Tip: use the options to change the page size, orientation and margins.
  </p>
</body>
</html>`;

// Returns the y positions where pages start (plus the end). Each break moves up to
// the nearest blank row, so lines of text aren't cut in half where possible.
function findPageBreaks(canvas: HTMLCanvasElement, sliceHeight: number) {
  const context = canvas.getContext("2d");
  const breaks = [0];

  // Look back at most 15% of a page for a blank row
  const lookBack = Math.floor(sliceHeight * 0.15);

  while (canvas.height - breaks[breaks.length - 1] > sliceHeight) {
    const ideal = breaks[breaks.length - 1] + sliceHeight;
    let cut = ideal;

    if (context && lookBack > 0) {
      const { data, width } = context.getImageData(0, ideal - lookBack, canvas.width, lookBack);

      for (let row = lookBack - 1; row >= 0; row--) {
        const start = row * width * 4;
        let blank = true;

        // A row is blank when every pixel has about the same colour as its first pixel
        for (let i = start + 4; i < start + width * 4; i += 4) {
          if (
            Math.abs(data[i] - data[start]) > 8 ||
            Math.abs(data[i + 1] - data[start + 1]) > 8 ||
            Math.abs(data[i + 2] - data[start + 2]) > 8
          ) {
            blank = false;
            break;
          }
        }

        if (blank) {
          cut = ideal - lookBack + row + 1;
          break;
        }
      }
    }

    breaks.push(cut);
  }

  breaks.push(canvas.height);

  return breaks;
}

// Loads HTML into a hidden, script-free iframe with the given width and waits until it has rendered
function loadHiddenFrame(html: string, width: number) {
  return new Promise<HTMLIFrameElement>((resolve, reject) => {
    const frame = document.createElement("iframe");

    // No "allow-scripts": scripts in the pasted HTML never run
    frame.setAttribute("sandbox", "allow-same-origin");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = `position:fixed;left:-20000px;top:0;width:${width}px;height:800px;border:0;visibility:hidden;`;

    const timer = setTimeout(() => reject(new Error("The HTML took too long to load.")), 20000);

    frame.onload = () => {
      clearTimeout(timer);
      resolve(frame);
    };

    frame.srcdoc = html;
    document.body.appendChild(frame);
  });
}

export default function HtmlToPdf() {
  const [html, setHtml] = useState("");
  const [sourceName, setSourceName] = useState<string | null>(null);

  const [pageSize, setPageSize] = useState<PageSize>("a4");
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [margin, setMargin] = useState<Margin>("normal");

  const [progress, setProgress] = useState<string | null>(null);
  const [convertError, setConvertError] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; pages: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const outputName = sourceName ? `${sourceName.replace(/\.html?$/i, "") || "page"}.pdf` : "html-to-pdf.pdf";

  const hasHtml = html.trim() !== "";
  const isConverting = progress !== null;

  const changeHtml = (value: string, name: string | null) => {
    setHtml(value);
    setSourceName(name);
    setResult(null);
    setConvertError(null);
  };

  const handleFile = async (selected: File | undefined) => {
    if (!selected) return;

    if (!/\.html?$/i.test(selected.name) && selected.type !== "text/html") {
      alert("Please choose an .html or .htm file.");
      return;
    }

    if (selected.size > MAX_FILE_SIZE) {
      alert("This HTML file is too large (the limit is 5 MB).");
      return;
    }

    changeHtml(await selected.text(), selected.name);
  };

  const handleConvert = async () => {
    if (!hasHtml || isConverting) return;

    setProgress("Rendering HTML...");
    setConvertError(null);
    setResult(null);

    let frame: HTMLIFrameElement | null = null;

    // html2canvas measures text baselines with a tiny image in the main page.
    // Tailwind makes images display:block, which shifts all text down, so undo that for it.
    const metricsFix = document.createElement("style");
    metricsFix.textContent = `img[src^="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP"] { display: inline !important; }`;
    document.head.appendChild(metricsFix);

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const size = PAGE_SIZES[pageSize];
      const pageWidth = orientation === "portrait" ? size.width : size.height;
      const pageHeight = orientation === "portrait" ? size.height : size.width;
      const marginPoints = MARGINS[margin].points;

      const contentWidth = pageWidth - marginPoints * 2;
      const contentHeight = pageHeight - marginPoints * 2;

      // Lay out the HTML at the width of the printable area
      const widthPx = Math.round(contentWidth * PX_PER_POINT);

      frame = await loadHiddenFrame(html, widthPx);

      const frameDocument = frame.contentDocument;

      if (!frameDocument?.body) {
        throw new Error("The HTML couldn't be rendered.");
      }

      const heightPx = Math.max(
        1,
        frameDocument.documentElement.scrollHeight,
        frameDocument.body.scrollHeight
      );

      frame.style.height = `${heightPx}px`;

      // Sharp output (2x), reduced for very long documents to stay within canvas limits
      const scale = Math.min(2, MAX_CANVAS_HEIGHT / heightPx);

      if (scale < 0.5) {
        throw new Error("This HTML is too long to convert in one go. Split it into smaller parts.");
      }

      const canvas = await html2canvas(frameDocument.documentElement, {
        backgroundColor: "#ffffff",
        scale,
        width: widthPx,
        height: heightPx,
        windowWidth: widthPx,
        windowHeight: heightPx,
        logging: false,
      });

      // Cut the tall canvas into page-sized slices, preferring blank rows as page breaks
      const sliceHeight = Math.floor((contentHeight / contentWidth) * canvas.width);
      const breaks = findPageBreaks(canvas, sliceHeight);
      const pageCount = breaks.length - 1;

      const pdf = new jsPDF({
        unit: "pt",
        format: [pageWidth, pageHeight],
        orientation,
        compress: true,
      });

      const slice = document.createElement("canvas");
      slice.width = canvas.width;

      const context = slice.getContext("2d");

      if (!context) {
        throw new Error("Could not create canvas.");
      }

      for (let index = 0; index < pageCount; index++) {
        setProgress(`Creating page ${index + 1} of ${pageCount}...`);

        const top = breaks[index];
        const height = breaks[index + 1] - top;

        slice.height = height;
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, slice.width, height);
        context.drawImage(canvas, 0, top, canvas.width, height, 0, 0, canvas.width, height);

        if (index > 0) {
          pdf.addPage([pageWidth, pageHeight], orientation);
        }

        pdf.addImage(
          slice.toDataURL("image/jpeg", 0.92),
          "JPEG",
          marginPoints,
          marginPoints,
          contentWidth,
          (height / canvas.width) * contentWidth
        );
      }

      // Free canvas memory
      canvas.width = 0;
      canvas.height = 0;
      slice.width = 0;
      slice.height = 0;

      const blob = pdf.output("blob");

      setResult({ blob, pages: pageCount });
      downloadBlob(blob, outputName);
    } catch (error) {
      console.error(error);
      setConvertError(
        error instanceof Error && error.message.startsWith("This HTML")
          ? error.message
          : "The HTML couldn't be converted. Check the code and try again."
      );
    } finally {
      frame?.remove();
      metricsFix.remove();
      setProgress(null);
    }
  };

  const handleReset = () => {
    changeHtml("", null);
  };

  const optionClass = (active: boolean) =>
    `rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition sm:px-4 ${
      active
        ? "border-blue-600 bg-blue-600 text-white"
        : "border-gray-200 bg-gray-50 text-gray-700 hover:border-blue-300 hover:bg-blue-50"
    }`;

  return (
    <div className="bg-gray-50 px-6 py-12 text-gray-900 sm:px-10 lg:px-16 sm:py-16">

      <div className="mx-auto max-w-6xl">

        <ToolHero
          icon="🌐"
          badge="HTML to PDF"
          title="Convert HTML to PDF"
          highlight="Online for Free"
          description="Paste HTML code or upload an .html file, preview it and save it as a PDF document."
        />

        <div
          className="mt-12 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            void handleFile(event.dataTransfer.files[0]);
          }}
        >

          {/* Toolbar */}

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div className="min-w-0">
              <p className="truncate font-semibold" title={sourceName ?? undefined}>
                {sourceName ?? "Paste your HTML code"}
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Or upload / drop an .html file. It is processed in your browser and never uploaded.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">

              <button
                type="button"
                onClick={() => changeHtml(EXAMPLE_HTML, null)}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Insert example
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Upload HTML file
              </button>

              {hasHtml && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                >
                  Clear
                </button>
              )}

            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".html,.htm,text/html"
              aria-label="Upload an HTML file"
              className="hidden"
              onChange={(event) => {
                const input = event.target;

                void handleFile(input.files?.[0]);

                // Reset so the same file can be chosen again
                input.value = "";
              }}
            />

          </div>

          {/* Editor and preview */}

          <div className="mt-8 grid gap-6 lg:grid-cols-2">

            <div className="flex min-w-0 flex-col">
              <label htmlFor="html-code" className="text-sm font-semibold text-gray-700">
                HTML code
              </label>

              <textarea
                id="html-code"
                value={html}
                onChange={(event) => changeHtml(event.target.value, sourceName)}
                placeholder="<h1>Hello</h1>&#10;<p>Paste your HTML here...</p>"
                spellCheck={false}
                className="mt-2 h-80 w-full resize-y rounded-xl border border-gray-300 bg-gray-50 p-4 font-mono text-sm leading-6 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 lg:h-[28rem]"
              />
            </div>

            <div className="flex min-w-0 flex-col">
              <p className="text-sm font-semibold text-gray-700">
                Preview
              </p>

              {hasHtml ? (
                <iframe
                  title="HTML preview"
                  srcDoc={html}
                  sandbox="allow-same-origin"
                  className="mt-2 h-80 w-full rounded-xl border border-gray-300 bg-white lg:h-[28rem]"
                />
              ) : (
                <div className="mt-2 flex h-80 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-400 lg:h-[28rem]">
                  Your preview appears here. Click &quot;Insert example&quot; to try it out.
                </div>
              )}
            </div>

          </div>

          {/* Options */}

          <div className="mt-8 grid gap-6 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-5 md:grid-cols-3">

            <div>
              <p className="text-sm font-semibold text-gray-700">
                Page size
              </p>

              <div className="mt-3 flex flex-wrap gap-2 sm:gap-3" role="group" aria-label="Page size">
                {(Object.keys(PAGE_SIZES) as PageSize[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { setPageSize(key); setResult(null); }}
                    aria-pressed={pageSize === key}
                    className={optionClass(pageSize === key)}
                  >
                    {PAGE_SIZES[key].label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-700">
                Orientation
              </p>

              <div className="mt-3 flex flex-wrap gap-2 sm:gap-3" role="group" aria-label="Orientation">
                {(["portrait", "landscape"] as Orientation[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { setOrientation(key); setResult(null); }}
                    aria-pressed={orientation === key}
                    className={optionClass(orientation === key)}
                  >
                    {key === "portrait" ? "Portrait" : "Landscape"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-700">
                Margin
              </p>

              <div className="mt-3 flex flex-wrap gap-2 sm:gap-3" role="group" aria-label="Margin">
                {(Object.keys(MARGINS) as Margin[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { setMargin(key); setResult(null); }}
                    aria-pressed={margin === key}
                    className={optionClass(margin === key)}
                  >
                    {MARGINS[key].label}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Limits */}

          <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-5">
            <p className="font-semibold text-blue-900">
              Good to know
            </p>

            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-blue-800">
              <li>The PDF pages are images, so the text can&apos;t be selected or searched.</li>
              <li>Scripts in your HTML don&apos;t run, so content built with JavaScript won&apos;t appear.</li>
              <li>Images and fonts from other websites may not load. This tool can&apos;t open web page URLs.</li>
              <li>Long content is split into pages at blank space where possible. Very tall images or tables can still be cut.</li>
            </ul>
          </div>

          {convertError && (
            <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {convertError}
            </p>
          )}

          <button
            type="button"
            onClick={handleConvert}
            disabled={!hasHtml || isConverting}
            className="mt-8 w-full rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {progress ?? (hasHtml ? "Convert to PDF" : "Paste HTML to convert")}
          </button>

        </div>

        {result && (
          <ResultCard
            fileName={outputName}
            size={result.blob.size}
            note={`${result.pages} ${result.pages === 1 ? "page" : "pages"}, ${PAGE_SIZES[pageSize].label} ${orientation}.`}
            onDownload={() => downloadBlob(result.blob, outputName)}
            onReset={handleReset}
            resetLabel="Convert other HTML"
          />
        )}

      </div>

    </div>
  );
}
