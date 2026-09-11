import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Terms & Conditions",
  description:
    "The terms and conditions for using ImageTools, our free online tools for resizing, compressing, converting and editing images.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <main className="flex-1 bg-gray-50 text-gray-900">
      <JsonLd data={[breadcrumbSchema("Terms & Conditions", "/terms")]} />
      <div className="mx-auto max-w-5xl px-6 py-16 sm:px-10 lg:px-16">


        <div className="rounded-3xl bg-white p-8 shadow-sm sm:p-12">

          <span className="inline-flex rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
            Terms & Conditions
          </span>

          <h1 className="mt-6 text-4xl font-bold">
            Terms & Conditions
          </h1>

          <p className="mt-4 text-gray-500">
            Last updated: September 2026
          </p>

          <div className="mt-10 space-y-8">

            <section>
              <h2 className="text-2xl font-bold">
                Acceptance of Terms
              </h2>

              <p className="mt-3 leading-7 text-gray-600">
                By accessing or using ImageTools, you agree to these
                Terms & Conditions. If you do not agree with these terms,
                please do not use the website.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold">
                Use of Our Tools
              </h2>

              <p className="mt-3 leading-7 text-gray-600">
                ImageTools provides online tools for common image and
                document processing tasks. You are responsible for the
                files you choose to process and for ensuring that you
                have the necessary rights to use those files.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold">
                Prohibited Use
              </h2>

              <p className="mt-3 leading-7 text-gray-600">
                You must not use ImageTools for unlawful activities,
                activities that violate the rights of others, or any
                activity that could damage, disrupt, or abuse the website
                or its services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold">
                Availability
              </h2>

              <p className="mt-3 leading-7 text-gray-600">
                We aim to keep the website and its tools available and
                functional, but we do not guarantee uninterrupted access
                or that every tool will always work with every file or
                device.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold">
                Results and Accuracy
              </h2>

              <p className="mt-3 leading-7 text-gray-600">
                File processing results may vary depending on the file,
                format, browser, device, and selected settings. You should
                review important files after processing and keep original
                copies when necessary.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold">
                Changes to These Terms
              </h2>

              <p className="mt-3 leading-7 text-gray-600">
                We may update these Terms & Conditions from time to time.
                Updated terms will be published on this page.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold">
                Contact
              </h2>

              <p className="mt-3 leading-7 text-gray-600">
                If you have questions about these terms, please contact
                us through our Contact page.
              </p>

            </section>

          </div>

        </div>
      </div>
    </main>
  );
}

