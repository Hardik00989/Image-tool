import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // These converters were removed; the Image Resizer converts between
  // PNG, JPG and WebP, so old links and search results land there.
  redirects() {
    return [
      {
        source: "/jpg-to-png",
        destination: "/image-resizer",
        permanent: true,
      },
      {
        source: "/png-to-jpg",
        destination: "/image-resizer",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
