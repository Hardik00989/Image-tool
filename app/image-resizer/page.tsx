"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type OutputFormat = "png" | "jpeg" | "webp";

export default function ImageResizer() {
  const [image, setImage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  // Original image details
  const [originalWidth, setOriginalWidth] = useState<number>(0);
  const [originalHeight, setOriginalHeight] = useState<number>(0);
  const [originalSize, setOriginalSize] = useState<number>(0);

  // Resize settings
  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);

  const [maintainAspectRatio, setMaintainAspectRatio] =
    useState<boolean>(true);

  // Compression settings
  const [format, setFormat] = useState<OutputFormat>("webp");
  const [quality, setQuality] = useState<number>(80);

  // Processed image
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [processedSize, setProcessedSize] = useState<number>(0);
  const [processedWidth, setProcessedWidth] = useState<number>(0);
  const [processedHeight, setProcessedHeight] = useState<number>(0);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Release object URLs when they are replaced or the page unmounts
  useEffect(() => {
    if (!image) return;

    return () => URL.revokeObjectURL(image);
  }, [image]);

  useEffect(() => {
    if (!processedImage) return;

    return () => URL.revokeObjectURL(processedImage);
  }, [processedImage]);

  // Upload image
  const handleImageUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0];

    // Reset input so the same image can be selected again
    event.target.value = "";

    if (!selectedFile) {
      return;
    }

    setFile(selectedFile);

    setOriginalSize(selectedFile.size);

    setProcessedImage(null);
    setProcessedSize(0);
    setProcessedWidth(0);
    setProcessedHeight(0);

    const imageUrl = URL.createObjectURL(selectedFile);

    const img = new Image();

    img.onload = () => {
      setOriginalWidth(img.width);
      setOriginalHeight(img.height);

      setWidth(img.width);
      setHeight(img.height);

      setImage(imageUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      alert("Could not load the image. Please try another file.");
    };

    img.src = imageUrl;
  };

  // Width change
  const handleWidthChange = (newWidth: number) => {
    setWidth(newWidth);

    if (
      maintainAspectRatio &&
      originalWidth > 0 &&
      originalHeight > 0 &&
      newWidth > 0
    ) {
      const newHeight = Math.round(
        (newWidth * originalHeight) / originalWidth
      );

      setHeight(newHeight);
    }
  };

  // Height change
  const handleHeightChange = (newHeight: number) => {
    setHeight(newHeight);

    if (
      maintainAspectRatio &&
      originalWidth > 0 &&
      originalHeight > 0 &&
      newHeight > 0
    ) {
      const newWidth = Math.round(
        (newHeight * originalWidth) / originalHeight
      );

      setWidth(newWidth);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Calculate reduction
  const getReduction = () => {
    if (!originalSize || !processedSize) {
      return 0;
    }

    return Math.round(
      ((originalSize - processedSize) / originalSize) * 100
    );
  };

  // Resize + Compress
  const handleProcess = () => {
    if (!file || !image || !width || !height) {
      return;
    }

    setIsProcessing(true);

    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");

      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");

      if (!context) {
        setIsProcessing(false);
        return;
      }

      // JPG does not support transparency.
      // Add white background.
      if (format === "jpeg") {
        context.fillStyle = "#ffffff";

        context.fillRect(
          0,
          0,
          width,
          height
        );
      }

      // Draw resized image
      context.drawImage(
        img,
        0,
        0,
        width,
        height
      );

      let mimeType = "image/webp";

      if (format === "jpeg") {
        mimeType = "image/jpeg";
      }

      if (format === "png") {
        mimeType = "image/png";
      }

      // Convert canvas
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setIsProcessing(false);
            return;
          }

          const resultUrl = URL.createObjectURL(blob);

          setProcessedImage(resultUrl);
          setProcessedSize(blob.size);
          setProcessedWidth(width);
          setProcessedHeight(height);

          setIsProcessing(false);
        },
        mimeType,
        quality / 100
      );
    };

    img.onerror = () => {
      setIsProcessing(false);
      alert("Could not load the image. Please try another file.");
    };

    img.src = image;
  };

  // Download processed image
  const handleDownload = () => {
    if (!processedImage) {
      return;
    }

    let extension = "webp";

    if (format === "jpeg") {
      extension = "jpg";
    }

    if (format === "png") {
      extension = "png";
    }

    const link = document.createElement("a");

    link.href = processedImage;
    link.download = `resized-compressed-image.${extension}`;

    link.click();
  };

  return (
    <div className="bg-gray-50 px-6 py-12 text-gray-900 sm:px-10 lg:px-16 sm:py-16">

      <div className="mx-auto max-w-6xl">

        {/* Header */}

        <div className="mx-auto max-w-3xl text-center">


          <div className="mt-8">

            <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-5 py-2.5 text-base font-medium text-blue-700">
              <span>↔</span>
              Image Resizer
            </span>

          </div>

          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">

            Resize Images Online

            <span className="block text-blue-600">
              Quickly & Easily
            </span>

          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-gray-600">

            Change the width and height of your images in pixels,
            keep the aspect ratio and download in your preferred format.

          </p>

          <p className="mt-3 text-base text-gray-500">
            Only need a smaller file size?{" "}
            <Link
              href="/image-compressor"
              className="font-semibold text-blue-600 hover:text-blue-700"
            >
              Try the Image Compressor →
            </Link>
          </p>

        </div>

        {/* Upload */}

        {!image && (

          <div className="mx-auto mt-12 max-w-4xl rounded-2xl border-2 border-dashed border-gray-300 bg-white p-8 shadow-sm transition hover:border-blue-400 sm:p-12">

            <label
              htmlFor="image-upload"
              className="flex cursor-pointer flex-col items-center justify-center text-center"
            >

              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-50 text-4xl">
                📷
              </div>

              <h2 className="mt-6 text-2xl font-bold text-gray-900">
                Upload an image
              </h2>

              <p className="mt-3 text-base text-gray-500">
                Drag and drop your image here or choose a file
              </p>

              <p className="mt-2 text-sm text-gray-400">
                JPG, PNG or WebP
              </p>

              <div className="mt-7 rounded-xl bg-blue-600 px-7 py-3.5 text-base font-semibold text-white transition hover:bg-blue-700">
                Choose Image
              </div>

            </label>

            <input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />

          </div>

        )}

        {/* Main Content */}

        {image && (

          <div className="mt-12 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">

            {/* Preview */}

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-7">

              <div className="flex items-center justify-between gap-4">

                <div>

                  <h2 className="text-2xl font-bold">
                    Image Preview
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Preview your original image
                  </p>

                </div>

                <span className="rounded-full bg-green-50 px-3 py-1.5 text-sm font-semibold text-green-700">
                  Ready
                </span>

              </div>

              {/* Original Image */}

              <div className="mt-6 flex min-h-[360px] items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-100 p-5 sm:min-h-[440px]">

                <img
                  src={image}
                  alt="Uploaded image preview"
                  className="max-h-[420px] max-w-full object-contain"
                />

              </div>

              {/* Original Details */}

              <div className="mt-6 grid grid-cols-2 gap-4">

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">

                  <p className="text-sm font-medium text-gray-500">
                    Original Width
                  </p>

                  <p className="mt-1 text-lg font-bold text-gray-900">
                    {originalWidth}px
                  </p>

                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">

                  <p className="text-sm font-medium text-gray-500">
                    Original Height
                  </p>

                  <p className="mt-1 text-lg font-bold text-gray-900">
                    {originalHeight}px
                  </p>

                </div>

              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">

                <div className="rounded-xl bg-blue-50 p-4">

                  <p className="text-sm font-medium text-blue-700">
                    Original Size
                  </p>

                  <p className="mt-1 text-lg font-bold text-blue-900">
                    {formatFileSize(originalSize)}
                  </p>

                </div>

                <div className="rounded-xl bg-blue-50 p-4">

                  <p className="text-sm font-medium text-blue-700">
                    New Dimensions
                  </p>

                  <p className="mt-1 text-lg font-bold text-blue-900">
                    {width} × {height}px
                  </p>

                </div>

              </div>

            </div>

            {/* Settings */}

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-7">

              <div>

                <h2 className="text-2xl font-bold">
                  Resize & Compression
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Configure image dimensions, format and quality.
                </p>

              </div>

              {/* Dimensions */}

              <div className="mt-7">

                <h3 className="text-base font-semibold text-gray-900">
                  Dimensions
                </h3>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">

                  {/* Width */}

                  <div>

                    <label
                      htmlFor="width"
                      className="text-sm font-semibold text-gray-700"
                    >
                      Width
                    </label>

                    <div className="relative mt-2">

                      <input
                        id="width"
                        type="number"
                        min="1"
                        value={width}
                        onChange={(e) =>
                          handleWidthChange(
                            Number(e.target.value)
                          )
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3.5 pr-14 text-base outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />

                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                        px
                      </span>

                    </div>

                  </div>

                  {/* Height */}

                  <div>

                    <label
                      htmlFor="height"
                      className="text-sm font-semibold text-gray-700"
                    >
                      Height
                    </label>

                    <div className="relative mt-2">

                      <input
                        id="height"
                        type="number"
                        min="1"
                        value={height}
                        onChange={(e) =>
                          handleHeightChange(
                            Number(e.target.value)
                          )
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3.5 pr-14 text-base outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />

                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                        px
                      </span>

                    </div>

                  </div>

                </div>

              </div>

              {/* Aspect Ratio */}

              <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">

                <label className="flex cursor-pointer items-start gap-3">

                  <input
                    id="aspect-ratio"
                    type="checkbox"
                    checked={maintainAspectRatio}
                    onChange={(e) =>
                      setMaintainAspectRatio(
                        e.target.checked
                      )
                    }
                    className="mt-1 h-5 w-5 rounded border-gray-300 accent-blue-600"
                  />

                  <span>

                    <span className="block text-base font-semibold text-gray-900">
                      Maintain aspect ratio
                    </span>

                    <span className="mt-1 block text-sm leading-5 text-gray-500">
                      Automatically adjust the other dimension
                      when you change width or height.
                    </span>

                  </span>

                </label>

              </div>

              {/* Output Format */}

              <div className="mt-7">

                <label
                  htmlFor="format"
                  className="text-base font-semibold text-gray-700"
                >
                  Output Format
                </label>

                <select
                  id="format"
                  value={format}
                  onChange={(e) =>
                    setFormat(
                      e.target.value as OutputFormat
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3.5 text-base outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >

                  <option value="webp">
                    WebP
                  </option>

                  <option value="jpeg">
                    JPG
                  </option>

                  <option value="png">
                    PNG
                  </option>

                </select>

              </div>

              {/* Quality */}

              <div className="mt-7">

                <div className="flex items-center justify-between">

                  <label
                    htmlFor="quality"
                    className="text-base font-semibold text-gray-700"
                  >
                    Compression Quality
                  </label>

                  <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-600">
                    {quality}%
                  </span>

                </div>

                <input
                  id="quality"
                  type="range"
                  min="10"
                  max="100"
                  value={quality}
                  onChange={(e) =>
                    setQuality(
                      Number(e.target.value)
                    )
                  }
                  className="mt-4 w-full accent-blue-600"
                />

                <div className="mt-2 flex justify-between text-sm text-gray-500">
                  <span>Smaller file</span>
                  <span>Better quality</span>
                </div>

              </div>

              {/* Info */}

              <div className="mt-7 rounded-xl bg-blue-50 p-4">

                <p className="text-sm leading-6 text-blue-800">
                  Lower quality usually creates a smaller file,
                  while higher quality keeps more image detail.
                </p>

              </div>

              {/* Process Button */}

              <button
                type="button"
                onClick={handleProcess}
                disabled={isProcessing}
                className="mt-7 w-full rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              >

                {isProcessing
                  ? "Processing Image..."
                  : "Resize & Compress"}

              </button>

              <p className="mt-4 text-center text-sm text-gray-500">
                Your image is processed directly in your browser.
              </p>

            </div>

          </div>

        )}

        {/* Result */}

        {processedImage && (

          <div className="mt-8 rounded-2xl border border-green-200 bg-white p-6 shadow-sm sm:p-7">

            <div className="text-center">

              <span className="inline-flex rounded-full bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
                Processing Complete
              </span>

              <h2 className="mt-4 text-2xl font-bold">
                Your Optimized Image
              </h2>

              <p className="mt-2 text-gray-500">
                Your image has been resized and compressed successfully.
              </p>

            </div>

            {/* Result Preview */}

            <div className="mt-7 flex min-h-[300px] items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-100 p-5">

              <img
                src={processedImage}
                alt="Processed image preview"
                className="max-h-[400px] max-w-full object-contain"
              />

            </div>

            {/* Result Details */}

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">

                <p className="text-sm text-gray-500">
                  Final Width
                </p>

                <p className="mt-1 text-lg font-bold">
                  {processedWidth}px
                </p>

              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">

                <p className="text-sm text-gray-500">
                  Final Height
                </p>

                <p className="mt-1 text-lg font-bold">
                  {processedHeight}px
                </p>

              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">

                <p className="text-sm text-gray-500">
                  Final File Size
                </p>

                <p className="mt-1 text-lg font-bold">
                  {formatFileSize(processedSize)}
                </p>

              </div>

              <div className="rounded-xl border border-green-200 bg-green-50 p-4">

                <p className="text-sm text-green-700">
                  Size Reduction
                </p>

                <p className="mt-1 text-lg font-bold text-green-800">

                  {getReduction() > 0
                    ? `${getReduction()}%`
                    : "0%"}

                </p>

              </div>

            </div>

            {/* Download */}

            <button
              type="button"
              onClick={handleDownload}
              className="mt-7 w-full rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md"
            >
              Download Optimized Image
            </button>

            <p className="mt-4 text-center text-sm text-gray-500">
              Output format:{" "}
              {format === "jpeg"
                ? "JPG"
                : format.toUpperCase()}
            </p>

          </div>

        )}

      </div>

    </div>
  );
}

