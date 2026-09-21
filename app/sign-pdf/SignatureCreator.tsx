"use client";

import { useCallback, useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { Caveat, Dancing_Script, Great_Vibes } from "next/font/google";
import {
  MAX_SIGNATURE_SIDE,
  canvasToSignature,
  removeWhiteBackground,
  type Signature,
} from "./signature";

const dancingScript = Dancing_Script({ subsets: ["latin"], weight: "600", display: "swap" });
const greatVibes = Great_Vibes({ subsets: ["latin"], weight: "400", display: "swap" });
const caveat = Caveat({ subsets: ["latin"], weight: "600", display: "swap" });

const FONTS = [
  { name: "Dancing Script", font: dancingScript },
  { name: "Great Vibes", font: greatVibes },
  { name: "Caveat", font: caveat },
];

const COLORS = [
  { name: "Black", value: "#111827" },
  { name: "Blue", value: "#1d4ed8" },
];

type Tab = "draw" | "type" | "upload";
type Point = { x: number; y: number };

// Drawing canvas size in pixels (shown at full container width, 3:1)
const DRAW_WIDTH = 1200;
const DRAW_HEIGHT = 400;

// Draws a smooth stroke through the points using quadratic curves
function drawStroke(context: CanvasRenderingContext2D, points: Point[]) {
  if (points.length === 0) return;

  context.beginPath();
  context.moveTo(points[0].x, points[0].y);

  if (points.length === 1) {
    context.lineTo(points[0].x + 0.1, points[0].y + 0.1);
  }

  for (let i = 1; i < points.length - 1; i++) {
    const midX = (points[i].x + points[i + 1].x) / 2;
    const midY = (points[i].y + points[i + 1].y) / 2;
    context.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
  }

  if (points.length > 1) {
    const last = points[points.length - 1];
    context.lineTo(last.x, last.y);
  }

  context.stroke();
}

function ColorPicker({ color, onChange }: { color: string; onChange: (color: string) => void }) {
  return (
    <div className="flex items-center gap-2" role="group" aria-label="Signature colour">
      {COLORS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-label={`${option.name} ink`}
          aria-pressed={color === option.value}
          className={`h-8 w-8 rounded-full border-2 transition ${
            color === option.value ? "border-blue-500 ring-2 ring-blue-200" : "border-white shadow"
          }`}
          style={{ backgroundColor: option.value }}
        />
      ))}
    </div>
  );
}

// Lets the user draw, type or upload a signature
export default function SignatureCreator({
  onCreate,
}: {
  onCreate: (signature: Signature) => void;
}) {
  const nameId = useId();
  const uploadId = useId();

  const [tab, setTab] = useState<Tab>("draw");
  const [color, setColor] = useState(COLORS[0].value);

  // Draw
  const drawCanvas = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Point[][]>([]);
  const activeStroke = useRef<Point[] | null>(null);
  const [hasDrawing, setHasDrawing] = useState(false);

  // Type
  const [name, setName] = useState("");
  const [fontIndex, setFontIndex] = useState(0);

  // Upload
  const [uploadImage, setUploadImage] = useState<HTMLImageElement | null>(null);
  const [removeWhite, setRemoveWhite] = useState(true);
  const [uploadPreview, setUploadPreview] = useState<Signature | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  // ---- Draw ----

  const redraw = useCallback(() => {
    const canvas = drawCanvas.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = color;
    context.lineWidth = 7;
    context.lineCap = "round";
    context.lineJoin = "round";

    strokes.current.forEach((stroke) => drawStroke(context, stroke));

    if (activeStroke.current) {
      drawStroke(context, activeStroke.current);
    }
  }, [color]);

  // Re-colour the existing drawing when the pen colour changes
  useEffect(() => {
    redraw();
  }, [redraw, tab]);

  const canvasPoint = (event: PointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();

    return {
      x: ((event.clientX - rect.left) / rect.width) * DRAW_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * DRAW_HEIGHT,
    };
  };

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    activeStroke.current = [canvasPoint(event)];
    setError(null);
    redraw();
  };

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!activeStroke.current) return;

    // Use coalesced events for smoother lines on fast movements
    const events = event.nativeEvent.getCoalescedEvents?.() ?? [];
    const rect = event.currentTarget.getBoundingClientRect();

    if (events.length > 0) {
      events.forEach((coalesced) =>
        activeStroke.current?.push({
          x: ((coalesced.clientX - rect.left) / rect.width) * DRAW_WIDTH,
          y: ((coalesced.clientY - rect.top) / rect.height) * DRAW_HEIGHT,
        })
      );
    } else {
      activeStroke.current.push(canvasPoint(event));
    }

    redraw();
  };

  const handlePointerUp = () => {
    if (!activeStroke.current) return;

    strokes.current.push(activeStroke.current);
    activeStroke.current = null;
    setHasDrawing(true);
    redraw();
  };

  const clearDrawing = () => {
    strokes.current = [];
    activeStroke.current = null;
    setHasDrawing(false);
    redraw();
  };

  const undoStroke = () => {
    strokes.current.pop();
    setHasDrawing(strokes.current.length > 0);
    redraw();
  };

  // ---- Type ----

  const renderTyped = async () => {
    const family = FONTS[fontIndex].font.style.fontFamily;
    const size = 160;
    const fontSpec = `${FONTS[fontIndex].font.style.fontWeight ?? 400} ${size}px ${family}`;

    // Make sure the handwriting font is loaded before drawing with it
    await document.fonts.load(fontSpec, name);

    const measure = document.createElement("canvas").getContext("2d");

    if (!measure) return null;

    measure.font = fontSpec;
    const textWidth = Math.ceil(measure.measureText(name).width);

    const canvas = document.createElement("canvas");
    canvas.width = Math.min(8000, textWidth + size);
    canvas.height = size * 2;

    const context = canvas.getContext("2d");

    if (!context) return null;

    context.font = fontSpec;
    context.fillStyle = color;
    context.textBaseline = "middle";
    context.fillText(name, size / 2, size);

    return canvasToSignature(canvas);
  };

  // ---- Upload ----

  const handleUpload = (fileList: FileList | null) => {
    const selected = fileList?.[0];

    if (!selected) return;

    if (!/^image\/(png|jpeg)$/.test(selected.type)) {
      setUploadError("Please choose a PNG or JPG image.");
      return;
    }

    setUploadError(null);

    const url = URL.createObjectURL(selected);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      setUploadImage(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      setUploadError("This image couldn't be opened.");
    };

    image.src = url;
  };

  // Rebuild the upload preview when the image or the option changes
  useEffect(() => {
    if (!uploadImage) return;

    const scale = Math.min(1, MAX_SIGNATURE_SIDE / Math.max(uploadImage.naturalWidth, uploadImage.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(uploadImage.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(uploadImage.naturalHeight * scale));
    canvas.getContext("2d")?.drawImage(uploadImage, 0, 0, canvas.width, canvas.height);

    if (removeWhite) {
      removeWhiteBackground(canvas);
    }

    const signature = canvasToSignature(canvas);

    // Updating derived preview state from the loaded image
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUploadPreview(signature);
    setUploadError(signature ? null : "The image is empty after removing the white background. Try turning that option off.");
  }, [uploadImage, removeWhite]);

  // ---- Create ----

  const handleCreate = async () => {
    setError(null);

    let signature: Signature | null = null;

    if (tab === "draw") {
      signature = drawCanvas.current ? canvasToSignature(drawCanvas.current) : null;

      if (!signature) {
        setError("Draw your signature in the box first.");
        return;
      }
    }

    if (tab === "type") {
      if (!name.trim()) {
        setError("Type your name first.");
        return;
      }

      signature = await renderTyped();
    }

    if (tab === "upload") {
      signature = uploadPreview;

      if (!signature) {
        setError("Upload an image of your signature first.");
        return;
      }
    }

    if (signature) {
      onCreate(signature);
    }
  };

  const tabClass = (value: Tab) =>
    `flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
      tab === value ? "bg-white text-blue-700 shadow-sm" : "text-gray-600 hover:text-gray-900"
    }`;

  return (
    <div>

      {/* Tabs */}

      <div className="flex gap-1 rounded-xl bg-gray-100 p-1" role="tablist" aria-label="How to create your signature">
        {([
          ["draw", "Draw"],
          ["type", "Type"],
          ["upload", "Upload"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => {
              setTab(value);
              setError(null);
            }}
            className={tabClass(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-5">

        {tab === "draw" && (
          <div>
            <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-gray-300 bg-white">
              <canvas
                ref={drawCanvas}
                width={DRAW_WIDTH}
                height={DRAW_HEIGHT}
                aria-label="Signature drawing area. Draw with your mouse, finger or pen."
                className="block aspect-[3/1] w-full cursor-crosshair touch-none"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              />

              <div className="pointer-events-none absolute inset-x-6 bottom-[22%] border-b border-gray-300" />

              {!hasDrawing && (
                <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-gray-400">
                  Draw your signature here
                </p>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <ColorPicker color={color} onChange={setColor} />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={undoStroke}
                  disabled={!hasDrawing}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Undo
                </button>

                <button
                  type="button"
                  onClick={clearDrawing}
                  disabled={!hasDrawing}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === "type" && (
          <div>
            <label htmlFor={nameId} className="text-sm font-semibold text-gray-700">
              Your name
            </label>

            <input
              id={nameId}
              type="text"
              value={name}
              maxLength={60}
              onChange={(event) => {
                setName(event.target.value);
                setError(null);
              }}
              placeholder="e.g. Jane Smith"
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <div className="mt-4 grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Signature style">
              {FONTS.map((option, index) => (
                <button
                  key={option.name}
                  type="button"
                  role="radio"
                  aria-checked={fontIndex === index}
                  aria-label={option.name}
                  onClick={() => setFontIndex(index)}
                  className={`min-w-0 rounded-xl border-2 bg-white px-4 py-3 text-left transition ${
                    fontIndex === index ? "border-blue-500" : "border-gray-200 hover:border-blue-300"
                  }`}
                >
                  <span
                    className={`${option.font.className} block truncate text-3xl leading-tight`}
                    style={{ color }}
                  >
                    {name.trim() || "Your name"}
                  </span>

                  <span className="mt-1 block text-xs text-gray-500">
                    {option.name}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-4">
              <ColorPicker color={color} onChange={setColor} />
            </div>
          </div>
        )}

        {tab === "upload" && (
          <div>
            <label
              htmlFor={uploadId}
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white p-6 text-center transition hover:border-blue-400"
            >
              {uploadPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={uploadPreview.url}
                  alt="Uploaded signature"
                  className="max-h-28 max-w-full object-contain"
                  style={{ backgroundImage: "repeating-conic-gradient(#f3f4f6 0% 25%, #fff 0% 50%)", backgroundSize: "16px 16px" }}
                />
              ) : (
                <span className="text-sm text-gray-500">
                  Choose a PNG or JPG image of your signature
                </span>
              )}

              <span className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
                {uploadPreview ? "Choose another image" : "Choose image"}
              </span>
            </label>

            <input
              id={uploadId}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(event) => {
                handleUpload(event.target.files);
                event.target.value = "";
              }}
            />

            <label className="mt-4 flex cursor-pointer items-center gap-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={removeWhite}
                onChange={(event) => setRemoveWhite(event.target.checked)}
                className="h-4 w-4 accent-blue-600"
              />
              Remove white background
            </label>

            {uploadError && (
              <p className="mt-3 text-sm font-medium text-red-600">
                {uploadError}
              </p>
            )}
          </div>
        )}

      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleCreate}
        className="mt-5 w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
      >
        Use this signature
      </button>

    </div>
  );
}
