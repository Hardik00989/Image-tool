import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Privacy Policy",
  description:
    "Read the ImageTools privacy policy. Our image tools run in your browser, so your images are processed on your device and never uploaded.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <main className="flex-1 bg-gray-50 text-gray-900">
      <JsonLd data={[breadcrumbSchema("Privacy Policy", "/privacy")]} />
      <div className="mx-auto max-w-5xl px-6 py-16 sm:px-10 lg:px-16">


        <div className="rounded-3xl bg-white p-8 shadow-sm sm:p-12">

          <span className="inline-flex rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
            Privacy Policy
          </span>

          <h1 className="mt-6 text-4xl font-bold">
            Privacy Policy
          </h1>

          <p className="mt-4 text-gray-500">
            Last updated: September 2026
          </p>

          <div className="mt-10 space-y-8">

            <section>
              <h2 className="text-2xl font-bold">
                Introduction
              </h2>

              <p className="mt-3 leading-7 text-gray-600">
                This Privacy Policy explains how ImageTools handles
                information when you use our website and online tools.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold">
                Files You Process
              </h2>

              <p className="mt-3 leading-7 text-gray-600">
                Many ImageTools features process images directly in your
                browser. When a tool performs browser-based processing,
                your selected files are processed locally on your device
                and are not required to be uploaded to our server.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold">
                Information We May Collect
              </h2>

              <p className="mt-3 leading-7 text-gray-600">
                Depending on how the website is used, basic technical
                information such as browser type, device information,
                approximate location, pages visited, and usage information
                may be collected by website analytics or advertising
                services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold">
                Cookies and Advertising
              </h2>

              <p className="mt-3 leading-7 text-gray-600">
                ImageTools may use cookies and similar technologies for
                website functionality, analytics, security, and advertising.
                Third-party advertising providers may use cookies to show
                relevant advertisements according to their own policies.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold">
                Third-Party Services
              </h2>

              <p className="mt-3 leading-7 text-gray-600">
                We may use third-party services such as analytics,
                advertising, hosting, or other website infrastructure
                providers. These services may process information according
                to their respective privacy policies.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold">
                Your Choices
              </h2>

              <p className="mt-3 leading-7 text-gray-600">
                You can control cookies through your browser settings.
                You can also stop using the website at any time.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold">
                Contact
              </h2>

              <p className="mt-3 leading-7 text-gray-600">
                If you have questions about this Privacy Policy, please
                contact us through our Contact page.
              </p>
            </section>

          </div>

        </div>
      </div>
    </main>
  );
}

