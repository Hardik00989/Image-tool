"use client";

import { useEffect, useRef, useState } from "react";
import ReactCrop, {
  type Crop,
  type PixelCrop,
  centerCrop,
  convertToPixelCrop,
  makeAspectCrop,
} from "react-image-crop";

import "react-image-crop/dist/ReactCrop.css";

type Transform =
  | "rotate-left"
  | "rotate-right"
  | "flip-horizontal"
  | "flip-vertical";

export default function CropImage() {
  const [image, setImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [imageElement, setImageElement] =
    useState<HTMLImageElement | null>(null);

  const [outputFormat, setOutputFormat] =
    useState<"png" | "jpeg">("png");

  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [flipVertical, setFlipVertical] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);

  // Editor section reference
  const editorRef = useRef<HTMLDivElement | null>(null);

  // Release the image URL when it is replaced or the page unmounts
  useEffect(() => {
    if (!image) return;

    return () => URL.revokeObjectURL(image);
  }, [image]);

  // Scroll directly to editor when an image is selected
  // (not on every rotate/flip, which also replaces the image URL)
  const hasImage = image !== null;

  useEffect(() => {
    if (hasImage) {
      setTimeout(() => {
        if (editorRef.current) {
          const navbarHeight = 80;

          const editorPosition =
            editorRef.current.getBoundingClientRect().top +
            window.scrollY -
            navbarHeight;

          window.scrollTo({
            top: editorPosition,
            behavior: "smooth",
          });
        }
      }, 150);
    }
  }, [hasImage]);

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
    setCrop(undefined);
    setCompletedCrop(null);
    setFlipHorizontal(false);
    setFlipVertical(false);
  };

  const handleImageLoad = (
    event: React.SyntheticEvent<HTMLImageElement>
  ) => {
    const img = event.currentTarget;

    setImageElement(img);

    const newCrop = centerCrop(
      makeAspectCrop(
        {
          unit: "%",
          width: 80,
        },
        1,
        img.naturalWidth,
        img.naturalHeight
      ),
      img.naturalWidth,
      img.naturalHeight
    );

    setCrop(newCrop);

    // Make the default crop usable without the user dragging it first
    setCompletedCrop(
      convertToPixelCrop(newCrop, img.width, img.height)
    );
  };

  // Rotation and flips are applied to the image itself, so the crop
  // box always lines up with what the user sees.
  const transformImage = (transform: Transform) => {
    if (
      !imageElement ||
      !imageElement.complete ||
      isTransforming
    ) {
      return;
    }

    const width = imageElement.naturalWidth;
    const height = imageElement.naturalHeight;

    const isRotation =
      transform === "rotate-left" ||
      transform === "rotate-right";

    const canvas = document.createElement("canvas");

    canvas.width = isRotation ? height : width;
    canvas.height = isRotation ? width : height;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      alert("Could not create canvas.");
      return;
    }

    ctx.translate(canvas.width / 2, canvas.height / 2);

    if (transform === "rotate-left") {
      ctx.rotate(-Math.PI / 2);
    }

    if (transform === "rotate-right") {
      ctx.rotate(Math.PI / 2);
    }

    if (transform === "flip-horizontal") {
      ctx.scale(-1, 1);
    }

    if (transform === "flip-vertical") {
      ctx.scale(1, -1);
    }

    ctx.drawImage(imageElement, -width / 2, -height / 2);

    setIsTransforming(true);

    canvas.toBlob((blob) => {
      setIsTransforming(false);

      if (!blob) {
        alert("Could not transform the image.");
        return;
      }

      setImage(URL.createObjectURL(blob));
      setCrop(undefined);
      setCompletedCrop(null);

      if (transform === "flip-horizontal") {
        setFlipHorizontal((previous) => !previous);
      }

      if (transform === "flip-vertical") {
        setFlipVertical((previous) => !previous);
      }
    }, "image/png");
  };

  const rotateLeft = () => {
    transformImage("rotate-left");
  };

  const rotateRight = () => {
    transformImage("rotate-right");
  };

  const toggleHorizontalFlip = () => {
    transformImage("flip-horizontal");
  };

  const toggleVerticalFlip = () => {
    transformImage("flip-vertical");
  };

  const cropAndDownload = () => {
    if (!completedCrop || !imageElement) {
      alert("Please select a crop area first.");
      return;
    }

    const canvas = document.createElement("canvas");

    const scaleX =
      imageElement.naturalWidth / imageElement.width;

    const scaleY =
      imageElement.naturalHeight / imageElement.height;

    const cropWidth =
      Math.round(completedCrop.width * scaleX);

    const cropHeight =
      Math.round(completedCrop.height * scaleY);

    if (cropWidth < 1 || cropHeight < 1) {
      alert("Please select a crop area first.");
      return;
    }

    canvas.width = cropWidth;
    canvas.height = cropHeight;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      alert("Could not create canvas.");
      return;
    }

    // JPG doesn't support transparency.
    // Add white background.
    if (outputFormat === "jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, cropWidth, cropHeight);
    }

    ctx.drawImage(
      imageElement,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight
    );

    const mimeType =
      outputFormat === "png"
        ? "image/png"
        : "image/jpeg";

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          alert("Failed to create image.");
          return;
        }

        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");

        link.href = url;

        link.download =
          outputFormat === "png"
            ? "edited-image.png"
            : "edited-image.jpg";

        link.click();

        URL.revokeObjectURL(url);
      },
      mimeType,
      0.95
    );
  };

  const clearImage = () => {
    setImage(null);
    setCrop(undefined);
    setCompletedCrop(null);
    setImageElement(null);
    setFlipHorizontal(false);
    setFlipVertical(false);
  };

  return (
    <div className="bg-gray-50 text-gray-900">


      {/* Hero */}

      <section className="relative overflow-hidden bg-white">

        <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-100/60 blur-3xl" />

        <div className="relative mx-auto max-w-5xl px-6 py-16 text-center sm:px-10 lg:px-16 sm:py-20">

          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-5 py-2.5 text-sm font-medium text-blue-700">
            <span>✎</span>
            Image Editing Tool
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            Image Editor
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-gray-600">
            Crop, rotate and flip your images easily.
            Choose your preferred output format and download the result.
          </p>

        </div>

      </section>

      {/* Main Editor */}

      <section className="mx-auto max-w-5xl px-6 py-12 sm:px-10 lg:px-16 sm:py-16">

        {/* Upload */}

        {!image && (
          <div className="rounded-3xl border-2 border-dashed border-gray-300 bg-white p-10 text-center shadow-sm sm:p-16">

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-50 text-4xl">
              🖼️
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
              Select an image to start editing.
            </p>

          </div>
        )}

        {/* Editor */}

        {image && (
          <div
            ref={editorRef}
            className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
          >

            {/* Crop */}

            <div className="mb-6">

              <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
                Step 1
              </p>

              <h2 className="mt-2 text-2xl font-bold text-gray-900">
                Crop Image
              </h2>

              <p className="mt-2 text-base text-gray-500">
                Select the area of the image you want to keep.
              </p>

            </div>

            <div className="flex justify-center overflow-auto rounded-2xl bg-gray-100 p-4 sm:p-6">

              <ReactCrop
                crop={crop}
                onChange={(newCrop) =>
                  setCrop(newCrop)
                }
                onComplete={(newCrop) => {
                  setCompletedCrop(newCrop);
                }}
              >
                <img
                  src={image}
                  alt="Image editor"
                  onLoad={handleImageLoad}
                  className="max-h-[600px] max-w-full"
                />
              </ReactCrop>

            </div>

            {/* Rotate & Flip */}

            <div className="mt-10">

              <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
                Step 2
              </p>

              <h2 className="mt-2 text-xl font-bold text-gray-900">
                Rotate & Flip
              </h2>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">

                <button
                  onClick={rotateLeft}
                  disabled={isTransforming}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  ↺ Rotate Left
                </button>

                <button
                  onClick={rotateRight}
                  disabled={isTransforming}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  ↻ Rotate Right
                </button>

                <button
                  onClick={toggleHorizontalFlip}
                  disabled={isTransforming}
                  className={`rounded-xl border px-4 py-3 font-semibold transition ${
                    flipHorizontal
                      ? "border-blue-600 bg-blue-50 text-blue-600"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  ↔ Flip Horizontal
                </button>

                <button
                  onClick={toggleVerticalFlip}
                  disabled={isTransforming}
                  className={`rounded-xl border px-4 py-3 font-semibold transition ${
                    flipVertical
                      ? "border-blue-600 bg-blue-50 text-blue-600"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  ↕ Flip Vertical
                </button>

              </div>

            </div>

            {/* Output Format */}

            <div className="mt-10">

              <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
                Step 3
              </p>

              <label className="mt-2 block text-xl font-bold text-gray-900">
                Output Format
              </label>

              <select
                value={outputFormat}
                onChange={(event) =>
                  setOutputFormat(
                    event.target.value as "png" | "jpeg"
                  )
                }
                className="mt-5 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="png">
                  PNG
                </option>

                <option value="jpeg">
                  JPG
                </option>

              </select>

            </div>

            {/* Buttons */}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">

              <button
                onClick={cropAndDownload}
                className="flex-1 rounded-xl bg-blue-600 px-6 py-4 font-semibold text-white transition hover:bg-blue-700"
              >
                Apply & Download
              </button>

              <button
                onClick={clearImage}
                className="rounded-xl border border-gray-300 bg-white px-6 py-4 font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Remove Image
              </button>

            </div>

          </div>
        )}

        {/* Information */}

        <div className="mt-12 grid gap-8 sm:grid-cols-3">

          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center">

            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-600">
              ✂
            </div>

            <h3 className="mt-4 font-bold text-gray-900">
              Easy Cropping
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              Select exactly the part of your image you want to keep.
            </p>

          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center">

            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-600">
              ↻
            </div>

            <h3 className="mt-4 font-bold text-gray-900">
              Rotate & Flip
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              Rotate your image and flip it horizontally or vertically.
            </p>

          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center">

            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-600">
              ⇩
            </div>

            <h3 className="mt-4 font-bold text-gray-900">
              PNG or JPG
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              Choose PNG or JPG as your output format before downloading.
            </p>

          </div>

        </div>

      </section>


    </div>
  );
}

