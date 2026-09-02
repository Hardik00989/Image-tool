// Renders structured data for search engines.
// "<" is escaped so the JSON can't close the script tag early.
export default function JsonLd({
  data,
}: {
  data: Record<string, unknown>[];
}) {
  const payload = {
    "@context": "https://schema.org",
    "@graph": data,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(payload).replace(/</g, "\\u003c"),
      }}
    />
  );
}
