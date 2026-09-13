import { ImageResponse } from "next/og";

// Shared settings for every route's opengraph-image.tsx
export const ogSize = {
  width: 1200,
  height: 630,
};

export const ogContentType = "image/png";

// Branded 1200×630 share image with the page's title and subtitle
export function ogImage(title: string, subtitle: string) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "linear-gradient(135deg, #eff6ff 0%, #ffffff 55%, #dbeafe 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 16,
              background: "#2563eb",
              color: "white",
              fontSize: 44,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            I
          </div>

          <div
            style={{
              fontSize: 40,
              fontWeight: 700,
              color: "#111827",
            }}
          >
            ImageTools
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              fontSize: 76,
              fontWeight: 800,
              color: "#111827",
              lineHeight: 1.1,
              letterSpacing: -2,
            }}
          >
            {title}
          </div>

          <div
            style={{
              marginTop: 24,
              fontSize: 34,
              color: "#4b5563",
            }}
          >
            {subtitle}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 16,
          }}
        >
          {["Free", "No sign-up", "Works in your browser"].map((label) => (
            <div
              key={label}
              style={{
                display: "flex",
                padding: "12px 24px",
                borderRadius: 999,
                background: "white",
                border: "2px solid #bfdbfe",
                color: "#1d4ed8",
                fontSize: 26,
                fontWeight: 600,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    ogSize
  );
}
