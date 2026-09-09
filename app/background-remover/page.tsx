"use client";

import { useEffect, useState } from "react";
import { removeBackground } from "@imgly/background-removal";

type BackgroundOption =
  | "transparent"
  | "white"
  | "black"
  | "sunset"
  | "ocean"
  | "purple"
  | "custom";

const gradientStops: Record<string, [string, string]> = {
  sunset: ["#ff7e5f", "#feb47b"],
  ocean: ["#2193b0", "#6dd5ed"],
  purple: ["#7f00ff", "#e100ff"],
};

const getBackgroundStyle = (
  background: BackgroundOption,
  customColor: string
) => {
  switch (background) {
    case "white":
      return {
        type: "color" as const,
        value: "#ffffff",
      };

    case "black":
      return {
        type: "color" as const,
        value: "#000000",
      };

    case "sunset":
    case "ocean":
    case "purple": {
      const [from, to] = gradientStops[background];

      return {
        type: "gradient" as const,
        value: `linear-gradient(135deg, ${from}, ${to})`,
      };
    }

    case "custom":
      return {
        type: "color" as const,
        value: customColor,
      };

    default:
      return {
        type: "transparent" as const,
        value: "transparent",
      };
  }
};

// Draws the cut-out image on the selected background
// and returns a PNG blob.
const createFinalImage = async (
  resultUrl: string,
  background: BackgroundOption,
  customColor: string
): Promise<Blob> => {
  const response = await fetch(resultUrl);
  const blob = await response.blob();

  const imageBitmap = await createImageBitmap(blob);

  const canvas = document.createElement("canvas");

  canvas.width = imageBitmap.width;
  canvas.height = imageBitmap.height;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not create canvas.");
  }

  const selectedBackground = getBackgroundStyle(
    background,
    customColor
  );

  if (selectedBackground.type === "color") {
    ctx.fillStyle = selectedBackground.value;

    ctx.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );
  }

  if (selectedBackground.type === "gradient") {
    const gradient = ctx.createLinearGradient(
      0,
      0,
      canvas.width,
      canvas.height
    );

    const [from, to] = gradientStops[background];

    gradient.addColorStop(0, from);
    gradient.addColorStop(1, to);

    ctx.fillStyle = gradient;

    ctx.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );
  }

  ctx.drawImage(
    imageBitmap,
    0,
    0,
    canvas.width,
    canvas.height
  );

  imageBitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob((newBlob) => {
      if (newBlob) {
        resolve(newBlob);
      } else {
        reject(new Error("Could not create final image."));
      }
    }, "image/png");
  });
};

export default function BackgroundRemover() {
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [finalImage, setFinalImage] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  const [background, setBackground] =
    useState<BackgroundOption>("transparent");

  const [customColor, setCustomColor] =
    useState("#2563eb");

  // Release object URLs when they are replaced or the page unmounts
  useEffect(() => {
    if (!image) return;

    return () => URL.revokeObjectURL(image);
  }, [image]);

  useEffect(() => {
    if (!result) return;

    return () => URL.revokeObjectURL(result);
  }, [result]);

  useEffect(() => {
    if (!finalImage) return;

    return () => URL.revokeObjectURL(finalImage);
  }, [finalImage]);

  const handleImageUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    // Reset input so the same image can be selected again
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    const imageUrl = URL.createObjectURL(file);

    setImage(imageUrl);
    setResult(null);
    setFinalImage(null);
    setBackground("transparent");
  };

  const removeImageBackground = async () => {
    if (!image) return;

    try {
      setLoading(true);
      setResult(null);
      setFinalImage(null);

      const response = await fetch(image);
      const blob = await response.blob();

      const resultBlob = await removeBackground(blob);

      const resultUrl = URL.createObjectURL(resultBlob);

      setResult(resultUrl);
    } catch (error) {
      console.error(error);
      alert("Background removal failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Rebuild the final image when the result or background changes.
  // A render that finishes after a newer one has started is ignored,
  // so quick background changes can't show an outdated image.
  useEffect(() => {
    if (!result) return;

    let cancelled = false;

    createFinalImage(result, background, customColor)
      .then((blob) => {
        if (!cancelled) {
          setFinalImage(URL.createObjectURL(blob));
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error(error);
          alert("Could not create the final image.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [background, customColor, result]);

  const downloadImage = () => {
    if (!finalImage) return;

    const link = document.createElement("a");

    link.href = finalImage;
    link.download = "background-removed.png";

    link.click();
  };

  const clearImage = () => {
    setImage(null);
    setResult(null);
    setFinalImage(null);
    setBackground("transparent");
    setLoading(false);
  };

  const checkerboardStyle = {
    backgroundImage:
      "linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)",
    backgroundSize: "30px 30px",
    backgroundPosition:
      "0 0, 0 15px, 15px -15px, -15px 0px",
  };

  const previewBackground = () => {
    const selected = getBackgroundStyle(background, customColor);

    if (selected.type === "transparent") {
      return checkerboardStyle;
    }

    if (selected.type === "color") {
      return {
        backgroundColor: selected.value,
      };
    }

    return {
      background: selected.value,
    };
  };

  return (
    <div className="bg-gray-50 text-gray-900">


      {/* Hero */}

      <section className="relative overflow-hidden bg-white">

        <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-100/60 blur-3xl" />

        <div className="relative mx-auto max-w-5xl px-6 py-16 text-center sm:px-10 lg:px-16 sm:py-20">

          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-5 py-2.5 text-sm font-medium text-blue-700">
            <span>✦</span>
            AI Image Tool
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            Background Remover
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-gray-600">
            Remove image backgrounds automatically and create
            transparent, solid or gradient backgrounds in seconds.
          </p>

        </div>

      </section>

      {/* Main Tool */}

      <section className="mx-auto max-w-5xl px-6 py-12 sm:px-10 lg:px-16 sm:py-16">

        {/* Upload */}

        {!image && (
          <div className="rounded-3xl border-2 border-dashed border-gray-300 bg-white p-10 text-center shadow-sm sm:p-16">

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-50 text-4xl">
              ✨
            </div>

            <h2 className="mt-6 text-2xl font-bold text-gray-900">
              Upload your image
            </h2>

            <p className="mt-3 text-base text-gray-500">
              JPG, PNG or WebP
            </p>

            <label className="mt-7 inline-flex cursor-pointer items-center rounded-xl bg-blue-600 px-8 py-4 text-base font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-700">

              Choose Image

              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

            </label>

            <p className="mt-5 text-sm text-gray-400">
              Your image is processed directly in your browser.
            </p>

          </div>
        )}

        {/* Original Image */}

        {image && !result && (
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">

            <div className="mb-6">

              <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
                Step 1
              </p>

              <h2 className="mt-2 text-2xl font-bold text-gray-900">
                Your Original Image
              </h2>

            </div>

            <div className="relative flex min-h-[350px] items-center justify-center overflow-hidden rounded-2xl bg-gray-100 p-6 sm:min-h-[450px]">

              <img
                src={image}
                alt="Original"
                className={`max-h-[500px] max-w-full rounded-xl object-contain ${
                  loading ? "opacity-60" : ""
                }`}
              />

              {/* Loading Animation */}

              {loading && (
                <div className="absolute inset-0 flex items-center justify-center">

                  <div className="absolute inset-0 bg-black/20" />

                  <div className="absolute left-0 right-0 h-1 animate-[scan_2s_ease-in-out_infinite] bg-blue-500 shadow-[0_0_20px_6px_rgba(59,130,246,0.6)]" />

                  <div className="relative z-10 rounded-2xl bg-white/95 px-8 py-7 text-center shadow-2xl backdrop-blur-sm">

                    <div className="mx-auto mb-4 h-11 w-11 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />

                    <p className="font-semibold text-gray-900">
                      Removing Background...
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      AI is processing your image
                    </p>

                  </div>

                </div>
              )}

            </div>

            <button
              onClick={removeImageBackground}
              disabled={loading}
              className="mt-6 w-full rounded-xl bg-blue-600 px-6 py-4 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {loading
                ? "Processing Image..."
                : "Remove Background"}
            </button>

            <button
              onClick={clearImage}
              disabled={loading}
              className="mt-3 w-full rounded-xl border border-gray-300 bg-white px-6 py-4 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Choose Another Image
            </button>

            {loading && (
              <p className="mt-4 text-center text-sm text-gray-500">
                Please wait while AI removes the background.
              </p>
            )}

          </div>
        )}

        {/* Result */}

        {result && (
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">

            <div className="mb-6">

              <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
                Step 2
              </p>

              <h2 className="mt-2 text-2xl font-bold text-gray-900">
                Background Removed
              </h2>

            </div>

            {/* Preview */}

            <div
              className="flex min-h-[400px] items-center justify-center rounded-2xl p-6 sm:min-h-[500px]"
              style={previewBackground()}
            >

              {finalImage ? (
                <img
                  src={finalImage}
                  alt="Background removed result"
                  className="max-h-[500px] max-w-full object-contain"
                />
              ) : (
                <p className="text-gray-500">
                  Preparing preview...
                </p>
              )}

            </div>

            {/* Background */}

            <div className="mt-10">

              <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
                Customize
              </p>

              <h3 className="mt-2 text-xl font-bold text-gray-900">
                Choose Background
              </h3>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">

                <button
                  onClick={() => setBackground("transparent")}
                  className={`rounded-xl border px-4 py-3 font-semibold transition ${
                    background === "transparent"
                      ? "border-blue-600 bg-blue-50 text-blue-600"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Transparent
                </button>

                <button
                  onClick={() => setBackground("white")}
                  className={`rounded-xl border px-4 py-3 font-semibold transition ${
                    background === "white"
                      ? "border-blue-600 bg-blue-50 text-blue-600"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  White
                </button>

                <button
                  onClick={() => setBackground("black")}
                  className={`rounded-xl border px-4 py-3 font-semibold transition ${
                    background === "black"
                      ? "border-blue-600 bg-blue-50 text-blue-600"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Black
                </button>

                <button
                  onClick={() => setBackground("custom")}
                  className={`rounded-xl border px-4 py-3 font-semibold transition ${
                    background === "custom"
                      ? "border-blue-600 bg-blue-50 text-blue-600"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Custom Color
                </button>

              </div>

              {background === "custom" && (
                <div className="mt-4 flex items-center gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4">

                  <input
                    type="color"
                    value={customColor}
                    onChange={(event) =>
                      setCustomColor(event.target.value)
                    }
                    className="h-12 w-16 cursor-pointer rounded"
                  />

                  <div>
                    <p className="font-semibold text-gray-900">
                      Custom Background
                    </p>

                    <p className="text-sm text-gray-500">
                      {customColor}
                    </p>
                  </div>

                </div>
              )}

            </div>

            {/* Themes */}

            <div className="mt-10">

              <h3 className="text-xl font-bold text-gray-900">
                Background Themes
              </h3>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">

                <button
                  onClick={() => setBackground("sunset")}
                  className={`rounded-xl bg-gradient-to-r from-orange-400 to-yellow-300 px-4 py-4 font-semibold text-white shadow-sm transition hover:scale-[1.02] ${
                    background === "sunset"
                      ? "ring-4 ring-blue-500 ring-offset-2"
                      : ""
                  }`}
                >
                  Sunset
                </button>

                <button
                  onClick={() => setBackground("ocean")}
                  className={`rounded-xl bg-gradient-to-r from-cyan-600 to-sky-300 px-4 py-4 font-semibold text-white shadow-sm transition hover:scale-[1.02] ${
                    background === "ocean"
                      ? "ring-4 ring-blue-500 ring-offset-2"
                      : ""
                  }`}
                >
                  Ocean
                </button>

                <button
                  onClick={() => setBackground("purple")}
                  className={`rounded-xl bg-gradient-to-r from-purple-700 to-fuchsia-500 px-4 py-4 font-semibold text-white shadow-sm transition hover:scale-[1.02] ${
                    background === "purple"
                      ? "ring-4 ring-blue-500 ring-offset-2"
                      : ""
                  }`}
                >
                  Purple
                </button>

              </div>

            </div>

            {/* Download */}

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">

              <button
                onClick={downloadImage}
                disabled={!finalImage}
                className="flex-1 rounded-xl bg-green-600 px-6 py-4 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                Download PNG
              </button>

              <button
                onClick={clearImage}
                className="rounded-xl border border-gray-300 bg-white px-6 py-4 font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Remove Another Image
              </button>

            </div>

          </div>
        )}

        {/* Info */}

        <div className="mt-12 grid gap-8 sm:grid-cols-3">

          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-600">
              ✦
            </div>

            <h3 className="mt-4 font-bold text-gray-900">
              AI Background Removal
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              Automatically separate the subject from the image background.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-600">
              🎨
            </div>

            <h3 className="mt-4 font-bold text-gray-900">
              Custom Backgrounds
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              Choose transparent, solid colors or gradient themes.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-600">
              🔒
            </div>

            <h3 className="mt-4 font-bold text-gray-900">
              Browser Processing
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              Your image is processed directly in your browser.
            </p>
          </div>

        </div>

      </section>


    </div>
  );
}

