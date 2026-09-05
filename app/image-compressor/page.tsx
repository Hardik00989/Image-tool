"use client";

import { useEffect, useState } from "react";

type OutputFormat = "jpeg" | "webp" | "png";

export default function ImageCompressor() {
  const [image, setImage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const [originalSize, setOriginalSize] = useState<number>(0);
  const [quality, setQuality] = useState<number>(80);

  const [format, setFormat] = useState<OutputFormat>("webp");

  const [compressedSize, setCompressedSize] = useState<number>(0);

  // Release the preview URL when it is replaced or the page unmounts
  useEffect(() => {
    if (!image) return;

    return () => URL.revokeObjectURL(image);
  }, [image]);

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
    setCompressedSize(0);

    const imageUrl = URL.createObjectURL(selectedFile);

    setImage(imageUrl);
  };

  // Convert bytes to readable size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Compress image
  const handleCompress = () => {
    if (!file || !image) {
      return;
    }

    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");

      canvas.width = img.width;
      canvas.height = img.height;

      const context = canvas.getContext("2d");

      if (!context) {
        return;
      }

      // JPG doesn't support transparency.
      // Add white background when using JPG.
      if (format === "jpeg") {
        context.fillStyle = "#ffffff";
        context.fillRect(
          0,
          0,
          canvas.width,
          canvas.height
        );
      }

      // Draw image
      context.drawImage(
        img,
        0,
        0,
        canvas.width,
        canvas.height
      );

      let mimeType = "image/webp";
      let extension = "webp";

      if (format === "jpeg") {
        mimeType = "image/jpeg";
        extension = "jpg";
      }

      if (format === "png") {
        mimeType = "image/png";
        extension = "png";
      }

      // Convert canvas
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return;
          }

          // Show compressed size
          setCompressedSize(blob.size);

          // Create download URL
          const downloadUrl = URL.createObjectURL(blob);

          // Create download link
          const link = document.createElement("a");

          link.href = downloadUrl;
          link.download = `compressed-image.${extension}`;

          // Download
          link.click();

          // Clean up
          URL.revokeObjectURL(downloadUrl);
        },
        mimeType,
        quality / 100
      );
    };

    img.onerror = () => {
      alert("Could not load the image. Please try another file.");
    };

    img.src = image;
  };

  // Calculate reduction
  const getReduction = () => {
    if (!originalSize || !compressedSize) {
      return 0;
    }

    return Math.round(
      ((originalSize - compressedSize) / originalSize) * 100
    );
  };

  return (
    <div className="bg-gray-50 px-6 py-12 sm:px-10 lg:px-16">

      <div className="mx-auto max-w-4xl">

        {/* Header */}
        <div className="text-center">


          <h1 className="mt-6 text-4xl font-bold">
            Image Compressor
          </h1>

          <p className="mt-3 text-gray-600">
            Reduce image file size while keeping good quality.
          </p>

        </div>

        {/* Upload Box */}
        <div className="mt-10 rounded-xl border-2 border-dashed border-gray-300 bg-white p-10 text-center">

          <label
            htmlFor="image-upload"
            className="cursor-pointer"
          >

            <div className="text-5xl">
              🖼️
            </div>

            <h2 className="mt-4 text-xl font-semibold">
              Upload an image
            </h2>

            <p className="mt-2 text-gray-500">
              Select JPG, PNG or WebP
            </p>

            <div className="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700">
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

        {/* Image Details */}
        {image && (
          <div className="mt-8 grid gap-10 md:grid-cols-2">

            {/* Preview */}
            <div className="rounded-xl bg-white p-6 shadow-sm">

              <h2 className="text-xl font-semibold">
                Preview
              </h2>

              <div className="mt-5 flex min-h-64 items-center justify-center rounded-lg bg-gray-100 p-4">

                <img
                  src={image}
                  alt="Uploaded image preview"
                  className="max-h-80 max-w-full object-contain"
                />

              </div>

              {/* Original Size */}
              <div className="mt-5 rounded-lg bg-gray-50 p-4">

                <p className="text-sm text-gray-500">
                  Original File Size
                </p>

                <p className="mt-1 text-lg font-semibold">
                  {formatFileSize(originalSize)}
                </p>

              </div>

              {/* Compressed Size */}
              {compressedSize > 0 && (
                <div className="mt-3 rounded-lg bg-gray-50 p-4">

                  <p className="text-sm text-gray-500">
                    Compressed File Size
                  </p>

                  <p className="mt-1 text-lg font-semibold">
                    {formatFileSize(compressedSize)}
                  </p>

                  <p className="mt-2 text-sm text-green-600">
                    {getReduction() > 0
                      ? `${getReduction()}% smaller`
                      : "File size did not decrease"}
                  </p>

                </div>
              )}

            </div>

            {/* Settings */}
            <div className="rounded-xl bg-white p-6 shadow-sm">

              <h2 className="text-xl font-semibold">
                Compression Settings
              </h2>

              {/* Format */}
              <div className="mt-6">

                <label
                  htmlFor="format"
                  className="text-sm font-medium"
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
                  className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
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
                    className="text-sm font-medium"
                  >
                    Compression Quality
                  </label>

                  <span className="font-semibold text-blue-600">
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
                    setQuality(Number(e.target.value))
                  }
                  className="mt-4 w-full"
                />

                <div className="mt-2 flex justify-between text-xs text-gray-500">
                  <span>Smaller size</span>
                  <span>Better quality</span>
                </div>

              </div>

              {/* Info */}
              <div className="mt-7 rounded-lg bg-blue-50 p-4">

                <p className="text-sm text-blue-800">
                  Lower quality usually produces a smaller file,
                  while higher quality keeps more image detail.
                </p>

              </div>

              {/* Compress Button */}
              <button
                type="button"
                onClick={handleCompress}
                className="mt-7 w-full rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700"
              >
                Compress & Download
              </button>

            </div>

          </div>
        )}

      </div>

    </div>
  );
}

