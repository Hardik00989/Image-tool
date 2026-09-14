import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";
import { toolsSeo } from "@/lib/tools-seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const toolPages = Object.values(toolsSeo).map((tool) => ({
    url: absoluteUrl(tool.path),
    lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.9,
  }));

  const infoPages = [
    { path: "/about", priority: 0.6 },
    { path: "/contact", priority: 0.5 },
    { path: "/privacy", priority: 0.3 },
    { path: "/terms", priority: 0.3 },
  ].map((page) => ({
    url: absoluteUrl(page.path),
    lastModified,
    changeFrequency: "yearly" as const,
    priority: page.priority,
  }));

  return [
    {
      url: absoluteUrl("/"),
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...toolPages,
    ...infoPages,
  ];
}
