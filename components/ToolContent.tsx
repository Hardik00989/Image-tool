import Link from "next/link";
import { toolsSeo, type ToolSeo } from "@/lib/tools-seo";

// "How to", FAQ and related tools shown under every tool.
// Gives search engines real content to rank and answers common questions.
export default function ToolContent({
  tool,
}: {
  tool: ToolSeo;
}) {
  const related = tool.related.map((path) => toolsSeo[path]);

  return (
    <div className="border-t border-gray-200 bg-white text-gray-900">

      <div className="mx-auto max-w-5xl px-6 py-16 sm:px-10 sm:py-20 lg:px-16">

        {/* How To */}

        <section>

          <h2 className="text-3xl font-bold tracking-tight">
            {tool.howToTitle}
          </h2>

          <ol
            className={`mt-8 grid gap-8 sm:grid-cols-2 ${
              tool.steps.length > 3
                ? "lg:grid-cols-4"
                : "lg:grid-cols-3"
            }`}
          >
            {tool.steps.map((step, index) => (
              <li key={step.title}>

                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-bold text-white">
                  {index + 1}
                </span>

                <h3 className="mt-4 text-lg font-bold">
                  {step.title}
                </h3>

                <p className="mt-2 text-base leading-7 text-gray-600">
                  {step.text}
                </p>

              </li>
            ))}
          </ol>

        </section>

        {/* FAQ */}

        <section className="mt-16">

          <h2 className="text-3xl font-bold tracking-tight">
            {tool.faqTitle}
          </h2>

          <div className="mt-8 divide-y divide-gray-200 border-y border-gray-200">
            {tool.faqs.map((faq) => (
              <details
                key={faq.question}
                className="group py-5"
              >

                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg font-semibold [&::-webkit-details-marker]:hidden">
                  <h3>{faq.question}</h3>

                  <span className="shrink-0 text-blue-600 transition group-open:rotate-180">
                    ▾
                  </span>
                </summary>

                <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
                  {faq.answer}
                </p>

              </details>
            ))}
          </div>

        </section>

        {/* Related Tools */}

        <section className="mt-16">

          <h2 className="text-3xl font-bold tracking-tight">
            Related tools
          </h2>

          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {related.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className="group rounded-2xl border border-gray-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
              >

                <h3 className="text-lg font-bold">
                  {item.name}
                </h3>

                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {item.description.split(". ")[0]}.
                </p>

                <span className="mt-4 inline-flex items-center gap-2 font-semibold text-blue-600">
                  Open tool
                  <span className="transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </span>

              </Link>
            ))}
          </div>

        </section>

      </div>

    </div>
  );
}
