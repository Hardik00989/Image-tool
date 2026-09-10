import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, pageMetadata } from "@/lib/site";
import Link from "next/link";

export const metadata = pageMetadata({
  title: "About Us",
  description:
    "About ImageTools – the team behind our free online image tools: resizer, compressor, converters, image to PDF, cropper and background remover.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <main className="flex-1 bg-gray-50 text-gray-900">
      <JsonLd data={[breadcrumbSchema("About", "/about")]} />
      <div className="mx-auto max-w-5xl px-6 py-16 sm:px-10 lg:px-16">


        <div className="rounded-3xl bg-white p-8 shadow-sm sm:p-12">

          <span className="inline-flex rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
            About ImageTools
          </span>

          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
            Simple tools for everyday image and document tasks
          </h1>

          <p className="mt-6 text-lg leading-8 text-gray-600">
            ImageTools is an online utility platform designed to make
            common image and document tasks simple, fast, and easy to use.
          </p>

          <div className="mt-10 space-y-8">

            <section>
              <h2 className="text-2xl font-bold">
                What is ImageTools?
              </h2>

              <p className="mt-3 leading-7 text-gray-600">
                ImageTools provides browser-based tools for working with
                images and documents. Users can resize, compress, convert,
                crop, edit, remove backgrounds, and convert images into PDF
                files.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold">
                Our Goal
              </h2>

              <p className="mt-3 leading-7 text-gray-600">
                Our goal is to provide straightforward online tools without
                unnecessary complexity. We focus on simple interfaces that
                allow users to complete common file-related tasks quickly.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold">
                Available Tools
              </h2>

              <ul className="mt-4 space-y-3 text-gray-600">
                <li>• Image Resizer</li>
                <li>• Image Compressor</li>
                <li>• Image to PDF Converter</li>
                <li>• Image Cropper and Editor</li>
                <li>• Background Remover</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold">
                Browser-Based Processing
              </h2>

              <p className="mt-3 leading-7 text-gray-600">
                Where supported by a tool, processing is performed directly
                in your web browser. This can help users work with files
                without unnecessarily sending them to a remote server.
              </p>
            </section>

          </div>

          <div className="mt-12 rounded-2xl bg-blue-50 p-6">
            <h2 className="text-lg font-bold text-blue-900">
              Have a question?
            </h2>

            <p className="mt-2 text-blue-800">
              Visit our contact page if you have a question, suggestion,
              or feedback.
            </p>

            <Link
              href="/contact"
              className="mt-4 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Contact Us
            </Link>
          </div>

        </div>
      </div>
    </main>
  );
}

