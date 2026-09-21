// Helpers for the Sign PDF tool

// A finished signature image (transparent PNG, trimmed to its content)
export type Signature = {
  url: string;
  width: number;
  height: number;
};

// Largest side of a signature image in pixels (keeps uploads small)
export const MAX_SIGNATURE_SIDE = 1600;

// Crops away fully transparent edges, keeping a small margin.
// Returns null when the canvas is empty.
export function trimCanvas(canvas: HTMLCanvasElement, padding = 6): HTMLCanvasElement | null {
  const context = canvas.getContext("2d");

  if (!context) return null;

  const { width, height } = canvas;
  const { data } = context.getImageData(0, 0, width, height);

  let top = height;
  let left = width;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }

  if (right < 0) return null;

  left = Math.max(0, left - padding);
  top = Math.max(0, top - padding);
  right = Math.min(width - 1, right + padding);
  bottom = Math.min(height - 1, bottom + padding);

  const trimmed = document.createElement("canvas");
  trimmed.width = right - left + 1;
  trimmed.height = bottom - top + 1;
  trimmed.getContext("2d")?.drawImage(canvas, left, top, trimmed.width, trimmed.height, 0, 0, trimmed.width, trimmed.height);

  return trimmed;
}

// Trims the canvas and turns it into a signature, or null if nothing is drawn
export function canvasToSignature(canvas: HTMLCanvasElement): Signature | null {
  const trimmed = trimCanvas(canvas);

  if (!trimmed) return null;

  return {
    url: trimmed.toDataURL("image/png"),
    width: trimmed.width,
    height: trimmed.height,
  };
}

// Makes near-white pixels transparent (for photos or scans of a signature)
export function removeWhiteBackground(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");

  if (!context) return;

  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = image;

  for (let i = 0; i < data.length; i += 4) {
    const lightness = Math.min(data[i], data[i + 1], data[i + 2]);

    // Fully transparent above 235, fade out between 190 and 235
    if (lightness >= 235) {
      data[i + 3] = 0;
    } else if (lightness > 190) {
      data[i + 3] = Math.round(data[i + 3] * ((235 - lightness) / 45));
    }
  }

  context.putImageData(image, 0, 0);
}

// Maps a point on the page as the reader sees it (fractions of the displayed
// width/height, origin top-left, page rotation applied) to PDF user space.
export function displayToPdf(
  fx: number,
  fy: number,
  rotation: number,
  box: { x: number; y: number; width: number; height: number }
) {
  const { x: x0, y: y0, width: W, height: H } = box;
  const sideways = rotation === 90 || rotation === 270;
  const dx = fx * (sideways ? H : W);
  const dy = fy * (sideways ? W : H);

  switch (rotation) {
    case 90:
      return { x: x0 + dy, y: y0 + dx };
    case 180:
      return { x: x0 + W - dx, y: y0 + dy };
    case 270:
      return { x: x0 + W - dy, y: y0 + H - dx };
    default:
      return { x: x0 + dx, y: y0 + H - dy };
  }
}

// "26 Sep 2026" — plain ASCII so the standard PDF font can draw it
export function todayText() {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const today = new Date();

  return `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;
}

export function dataUrlToBytes(url: string) {
  const binary = atob(url.slice(url.indexOf(",") + 1));
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}
