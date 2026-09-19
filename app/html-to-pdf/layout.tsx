import JsonLd from "@/components/JsonLd";
import ToolContent from "@/components/ToolContent";
import {
  breadcrumbSchema,
  faqSchema,
  pageMetadata,
  webAppSchema,
} from "@/lib/site";
import { toolsSeo } from "@/lib/tools-seo";

const tool = toolsSeo["/html-to-pdf"];

export const metadata = pageMetadata(tool);

export default function HtmlToPdfLayout({
  children,
}: LayoutProps<"/html-to-pdf">) {
  return (
    <main className="flex flex-1 flex-col">
      <JsonLd
        data={[
          webAppSchema(tool.name, tool.description, tool.path),
          breadcrumbSchema(tool.name, tool.path),
          faqSchema(tool.faqs),
        ]}
      />

      {children}

      <ToolContent tool={tool} />
    </main>
  );
}
