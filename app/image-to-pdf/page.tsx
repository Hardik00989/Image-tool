"use client";

import { useEffect, useRef, useState } from "react";
import jsPDF from "jspdf";

type ImageItem = {
  file: File;
  preview: string;
  width: number;
  height: number;
};

const MIN_TARGET_KB = 50;

export default function ImageToPdf() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [isConverting, setIsConverting] = useState(false);

  // Target PDF size
  const [targetSizeKB, setTargetSizeKB] =
    useState<number>(100);

  // Generated PDF
  const [generatedPdfSize, setGeneratedPdfSize] =
    useState<number>(0);

  const [generatedPdfUrl, setGeneratedPdfUrl] =
    useState<string | null>(null);

  // Reference for Selected Images section
  const selectedImagesRef =
    useRef<HTMLDivElement>(null);

  // Automatically scroll to selected images
  // after user uploads images.
  useEffect(() => {
    if (images.length > 0) {
      setTimeout(() => {
        selectedImagesRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 150);
    }
  }, [images.length]);

  // -----------------------------
  // Format File Size
  // -----------------------------

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // -----------------------------
  // Upload Images
  // -----------------------------

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFiles = event.target.files;

    if (!selectedFiles || selectedFiles.length === 0) {
      return;
    }

    const imageFiles = Array.from(selectedFiles).filter((file) =>
      file.type.startsWith("image/")
    );

    if (imageFiles.length === 0) {
      alert("Please select valid image files.");
      return;
    }

    const imagePromises = imageFiles.map(
      (file) =>
        new Promise<ImageItem>((resolve, reject) => {
          const preview = URL.createObjectURL(file);

          const img = new Image();

          img.onload = () => {
            resolve({
              file,
              preview,
              width: img.width,
              height: img.height,
            });
          };

          img.onerror = () => {
            URL.revokeObjectURL(preview);

            reject(
              new Error(
                `Could not load ${file.name}`
              )
            );
          };

          img.src = preview;
        })
    );

    try {
      const newImages = await Promise.all(
        imagePromises
      );

      setImages((previousImages) => [
        ...previousImages,
        ...newImages,
      ]);

      // Reset previous PDF result
      setGeneratedPdfSize(0);

      if (generatedPdfUrl) {
        URL.revokeObjectURL(generatedPdfUrl);
        setGeneratedPdfUrl(null);
      }
    } catch (error) {
      console.error(
        "Image loading error:",
        error
      );

      alert(
        "Some images could not be loaded."
      );
    }

    // Reset input so same image can be selected again
    event.target.value = "";
  };

  // -----------------------------
  // Remove Image
  // -----------------------------

  const handleRemoveImage = (index: number) => {
    setImages((previousImages) => {
      const imageToRemove =
        previousImages[index];

      if (imageToRemove) {
        URL.revokeObjectURL(
          imageToRemove.preview
        );
      }

      return previousImages.filter(
        (_, imageIndex) =>
          imageIndex !== index
      );
    });

    setGeneratedPdfSize(0);

    if (generatedPdfUrl) {
      URL.revokeObjectURL(generatedPdfUrl);
      setGeneratedPdfUrl(null);
    }
  };

  // -----------------------------
  // Clear All Images
  // -----------------------------

  const handleClearAll = () => {
    images.forEach((image) => {
      URL.revokeObjectURL(
        image.preview
      );
    });

    setImages([]);

    setGeneratedPdfSize(0);

    if (generatedPdfUrl) {
      URL.revokeObjectURL(generatedPdfUrl);
      setGeneratedPdfUrl(null);
    }
  };

  // -----------------------------
  // Create PDF
  // -----------------------------

  const createPdf = async (
    quality: number
  ): Promise<Blob> => {
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const pageWidth = 210;
    const pageHeight = 297;

    const margin = 10;

    const maxWidth =
      pageWidth - margin * 2;

    const maxHeight =
      pageHeight - margin * 2;

    for (
      let i = 0;
      i < images.length;
      i++
    ) {
      if (i > 0) {
        pdf.addPage();
      }

      const image = images[i];

      const img = new Image();

      await new Promise<void>(
        (resolve, reject) => {
          img.onload = () => resolve();

          img.onerror = () =>
            reject(
              new Error(
                `Could not load ${image.file.name}`
              )
            );

          img.src = image.preview;
        }
      );

      /*
       * Reduce resolution for stronger
       * compression.
       */

      let scale = 1;

      if (quality < 0.8) {
        scale = 0.8;
      }

      if (quality < 0.6) {
        scale = 0.65;
      }

      if (quality < 0.45) {
        scale = 0.5;
      }

      if (quality < 0.3) {
        scale = 0.4;
      }

      const canvas =
        document.createElement(
          "canvas"
        );

      canvas.width = Math.max(
        1,
        Math.round(
          img.width * scale
        )
      );

      canvas.height = Math.max(
        1,
        Math.round(
          img.height * scale
        )
      );

      const context =
        canvas.getContext("2d");

      if (!context) {
        throw new Error(
          "Could not create canvas."
        );
      }

      /*
       * JPEG doesn't support transparency,
       * so transparent images get a white background.
       */

      context.fillStyle =
        "#ffffff";

      context.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
      );

      context.drawImage(
        img,
        0,
        0,
        canvas.width,
        canvas.height
      );

      // Convert image to JPEG
      const imageData =
        canvas.toDataURL(
          "image/jpeg",
          quality
        );

      // Calculate image dimensions for A4
      let imageWidth =
        maxWidth;

      let imageHeight =
        (img.height / img.width) *
        imageWidth;

      // Fit image inside A4
      if (
        imageHeight >
        maxHeight
      ) {
        imageHeight =
          maxHeight;

        imageWidth =
          (img.width /
            img.height) *
          imageHeight;
      }

      // Center image
      const x =
        (pageWidth -
          imageWidth) /
        2;

      const y =
        (pageHeight -
          imageHeight) /
        2;

      pdf.addImage(
        imageData,
        "JPEG",
        x,
        y,
        imageWidth,
        imageHeight,
        undefined,
        "FAST"
      );
    }

    return pdf.output("blob");
  };

  // -----------------------------
  // Find Best Compression
  // -----------------------------

  const findCompressedPdf =
    async (
      targetBytes: number
    ): Promise<Blob> => {
      /*
       * Try multiple quality levels.
       *
       * Higher quality = larger PDF
       * Lower quality = smaller PDF
       */

      const qualities = [
        0.9,
        0.8,
        0.7,
        0.6,
        0.5,
        0.4,
        0.3,
        0.25,
        0.2,
        0.15,
        0.1,
      ];

      let bestBlob: Blob | null =
        null;

      for (
        const quality of qualities
      ) {
        const blob =
          await createPdf(
            quality
          );

        // Keep smallest generated PDF
        if (
          !bestBlob ||
          blob.size <
            bestBlob.size
        ) {
          bestBlob = blob;
        }

        // Target reached
        if (
          blob.size <=
          targetBytes
        ) {
          return blob;
        }
      }

      // Return smallest possible result
      return bestBlob!;
    };

  // -----------------------------
  // Generate PDF
  // -----------------------------

  const handleConvertToPdf =
    async () => {
      if (images.length === 0) {
        return;
      }

      if (
        !targetSizeKB ||
        targetSizeKB <
          MIN_TARGET_KB
      ) {
        alert(
          `Minimum target size is ${MIN_TARGET_KB} KB.`
        );

        setTargetSizeKB(
          MIN_TARGET_KB
        );

        return;
      }

      setIsConverting(true);

      setGeneratedPdfSize(0);

      if (generatedPdfUrl) {
        URL.revokeObjectURL(
          generatedPdfUrl
        );

        setGeneratedPdfUrl(null);
      }

      try {
        const targetBytes =
          targetSizeKB *
          1024;

        const pdfBlob =
          await findCompressedPdf(
            targetBytes
          );

        setGeneratedPdfSize(
          pdfBlob.size
        );

        const downloadUrl =
          URL.createObjectURL(
            pdfBlob
          );

        setGeneratedPdfUrl(
          downloadUrl
        );

        // Download PDF
        const link =
          document.createElement(
            "a"
          );

        link.href =
          downloadUrl;

        link.download =
          "compressed-images.pdf";

        document.body.appendChild(
          link
        );

        link.click();

        document.body.removeChild(
          link
        );
      } catch (error) {
        console.error(
          "PDF compression failed:",
          error
        );

        alert(
          "Something went wrong while creating the compressed PDF."
        );
      } finally {
        setIsConverting(false);
      }
    };

  return (
    <div className="bg-gray-50 px-6 py-12 text-gray-900 sm:px-10 lg:px-16 sm:py-16">

      <div className="mx-auto max-w-6xl">

        {/* Header */}

        <div className="mx-auto max-w-3xl text-center">


          <div className="mt-8">

            <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-5 py-2.5 text-base font-medium text-blue-700">
              <span>▣</span>
              Image to PDF
            </span>

          </div>

          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">

            Convert Images to PDF

            <span className="block text-blue-600">
              With Custom File Size
            </span>

          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-gray-600">
            Convert multiple images into a PDF
            and compress it to your desired file
            size.
          </p>

        </div>

        {/* Upload Box */}

        <div className="mx-auto mt-12 max-w-4xl rounded-2xl border-2 border-dashed border-gray-300 bg-white p-8 shadow-sm transition hover:border-blue-400 sm:p-12">

          <label
            htmlFor="image-upload"
            className="flex cursor-pointer flex-col items-center justify-center text-center"
          >

            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-50 text-4xl">
              📄
            </div>

            <h2 className="mt-6 text-2xl font-bold">
              Upload Images
            </h2>

            <p className="mt-3 text-base text-gray-500">
              Select one or multiple images
            </p>

            <p className="mt-2 text-sm text-gray-400">
              JPG, PNG or WebP
            </p>

            <div className="mt-7 rounded-xl bg-blue-600 px-7 py-3.5 font-semibold text-white transition hover:bg-blue-700">
              Choose Images
            </div>

          </label>

          <input
            id="image-upload"
            type="file"
            accept="image/*"
            multiple
            onChange={
              handleImageUpload
            }
            className="hidden"
          />

        </div>

        {/* Selected Images Info */}

        {images.length > 0 && (

          <div className="mt-10 flex flex-col gap-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">

            <div>

              <p className="text-sm font-medium text-gray-500">
                Selected Images
              </p>

              <p className="mt-1 text-2xl font-bold">
                {images.length}{" "}
                {images.length === 1
                  ? "Image"
                  : "Images"}
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Each image will be placed on a
                separate PDF page.
              </p>

            </div>

            <button
              type="button"
              onClick={
                handleClearAll
              }
              className="rounded-xl border border-red-200 px-5 py-3 font-semibold text-red-600 transition hover:bg-red-50"
            >
              Clear All
            </button>

          </div>

        )}

        {/* Selected Images */}

        {images.length > 0 && (

          <div
            ref={selectedImagesRef}
            className="mt-10 scroll-mt-6"
          >

            <h2 className="text-2xl font-bold">
              Selected Images
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Review your images before creating
              the PDF.
            </p>

            <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">

              {images.map(
                (image, index) => (

                  <div
                    key={`${image.file.name}-${index}`}
                    className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >

                    {/* Image Preview */}

                    <div className="relative flex h-60 items-center justify-center overflow-hidden bg-gray-100 p-5">

                      <div className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-sm">
                        {index + 1}
                      </div>

                      <img
                        src={
                          image.preview
                        }
                        alt={`Selected image ${
                          index + 1
                        }`}
                        className="max-h-full max-w-full object-contain"
                      />

                    </div>

                    {/* Image Details */}

                    <div className="p-5">

                      <p
                        className="truncate font-semibold"
                        title={
                          image.file.name
                        }
                      >
                        {image.file.name}
                      </p>

                      <div className="mt-3 rounded-xl bg-gray-50 p-3">

                        <p className="text-sm text-gray-500">
                          Dimensions
                        </p>

                        <p className="mt-1 font-semibold">
                          {image.width} ×{" "}
                          {image.height}px
                        </p>

                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveImage(
                            index
                          )
                        }
                        className="mt-4 w-full rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                      >
                        Remove Image
                      </button>

                    </div>

                  </div>

                )
              )}

            </div>

          </div>

        )}

        {/* Compression Settings */}

        {images.length > 0 && (

          <div className="mx-auto mt-10 max-w-4xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">

            <div className="text-center">

              <h2 className="text-2xl font-bold">
                Choose PDF Size
              </h2>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                Enter the maximum PDF size you
                want. Minimum allowed size is 50 KB.
              </p>

            </div>

            {/* Target Size */}

            <div className="mt-8">

              <label
                htmlFor="target-size"
                className="text-base font-semibold"
              >
                Target PDF Size
              </label>

              <div className="mt-2 flex gap-3">

                <input
                  id="target-size"
                  type="number"
                  min={MIN_TARGET_KB}
                  value={targetSizeKB}
                  onChange={(e) => {
                    const value =
                      Number(
                        e.target.value
                      );

                    setTargetSizeKB(
                      value
                    );
                  }}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3.5 text-lg font-semibold outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <div className="flex items-center rounded-xl bg-gray-100 px-5 font-semibold text-gray-700">
                  KB
                </div>

              </div>

              <p className="mt-2 text-sm text-gray-500">
                Example: enter 100 for an
                approximately 100 KB PDF.
              </p>

            </div>

            {/* Quick Sizes */}

            <div className="mt-6">

              <p className="text-sm font-semibold text-gray-700">
                Quick Select
              </p>

              <div className="mt-3 flex flex-wrap gap-3">

                {[50, 100, 200, 500, 1024, 2048].map(
                  (size) => (

                    <button
                      key={size}
                      type="button"
                      onClick={() =>
                        setTargetSizeKB(
                          size
                        )
                      }
                      className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                        targetSizeKB ===
                        size
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-gray-200 bg-gray-50 text-gray-700 hover:border-blue-300 hover:bg-blue-50"
                      }`}
                    >
                      {size >= 1024
                        ? `${size / 1024} MB`
                        : `${size} KB`}
                    </button>

                  )
                )}

              </div>

            </div>

            {/* Information */}

            <div className="mt-7 rounded-xl border border-blue-100 bg-blue-50 p-5">

              <p className="font-semibold text-blue-900">
                Automatic Compression
              </p>

              <p className="mt-2 text-sm leading-6 text-blue-800">
                Image quality and resolution will
                automatically be reduced until the
                PDF reaches your requested size.
                Your original images will not be changed.
              </p>

            </div>

            {/* Generate Button */}

            <button
              type="button"
              onClick={
                handleConvertToPdf
              }
              disabled={
                isConverting
              }
              className="mt-7 w-full rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
            >

              {isConverting
                ? "Compressing PDF..."
                : `Create PDF ≤ ${
                    targetSizeKB || 0
                  } KB`}

            </button>

            {/* Result */}

            {generatedPdfSize >
              0 && (

              <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5">

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                  <div>

                    <p className="text-sm font-medium text-green-700">
                      PDF Created Successfully
                    </p>

                    <p className="mt-1 text-xl font-bold text-green-900">
                      {formatFileSize(
                        generatedPdfSize
                      )}
                    </p>

                  </div>

                  {generatedPdfUrl && (

                    <a
                      href={
                        generatedPdfUrl
                      }
                      download="compressed-images.pdf"
                      className="rounded-xl bg-green-600 px-5 py-3 text-center font-semibold text-white transition hover:bg-green-700"
                    >
                      Download Again
                    </a>

                  )}

                </div>

                {generatedPdfSize >
                  targetSizeKB *
                    1024 && (

                  <p className="mt-3 text-sm leading-5 text-green-800">
                    The requested size could not
                    be reached without making the
                    PDF unreadable. The smallest
                    practical PDF generated was used.
                  </p>

                )}

              </div>

            )}

            <p className="mt-4 text-center text-sm text-gray-500">
              Processing happens directly in your
              browser. Images are not uploaded to a
              server.
            </p>

          </div>

        )}

        {/* Empty State */}

        {images.length === 0 && (

          <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-gray-200 bg-white p-7 text-center shadow-sm">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-2xl">
              🔒
            </div>

            <h2 className="mt-4 text-lg font-bold">
              Private & Browser-Based
            </h2>

            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-500">
              Your images are processed directly
              in your browser. They do not need
              to be uploaded to a server.
            </p>

          </div>

        )}

      </div>

    </div>
  );
}

