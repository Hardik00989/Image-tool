import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Contact Us",
  description:
    "Contact ImageTools with questions, feedback or tool suggestions. We read every message about our free online image tools.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <main className="flex-1 bg-gray-50 text-gray-900">
      <JsonLd data={[breadcrumbSchema("Contact", "/contact")]} />
      <div className="mx-auto max-w-5xl px-6 py-16 sm:px-10 lg:px-16">


        <div className="rounded-3xl bg-white p-8 shadow-sm sm:p-12">

          <span className="inline-flex rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
            Contact Us
          </span>

          <h1 className="mt-6 text-4xl font-bold sm:text-5xl">
            Get in touch
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-600">
            Have a question, suggestion, or found an issue with one of
            our tools? We would like to hear from you.
          </p>

          <div className="mt-10 grid gap-8 sm:grid-cols-2">

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
              <div className="text-3xl">✉️</div>

              <h2 className="mt-4 text-xl font-bold">
                Email
              </h2>

              <p className="mt-2 text-sm leading-6 text-gray-600">
                For questions, feedback, or support, contact us by email.
              </p>

              <a
                href="mailto:vinayakhardik575@gmail.com"
                className="mt-4 inline-block font-semibold text-blue-600 hover:text-blue-700"
              >
                contact@imagetools.com
              </a>

            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
              <div className="text-3xl">💡</div>

              <h2 className="mt-4 text-xl font-bold">
                Suggestions
              </h2>

              <p className="mt-2 text-sm leading-6 text-gray-600">
                Have an idea for a new image or document tool? Send us
                your suggestion.
              </p>
            </div>

          </div>

          <div className="mt-10 rounded-2xl bg-blue-50 p-6">

            <h2 className="text-xl font-bold text-blue-900">
              Before contacting us
            </h2>

            <p className="mt-2 leading-7 text-blue-800">
              Please include the name of the tool you are using and a
              short description of the issue. This helps us understand
              and respond to your request more effectively.
            </p>

          </div>

        </div>
      </div>
    </main>
  );
}

