import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Allow external image/video domains */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static.wetab.link",
      },
      {
        protocol: "https",
        hostname: "eo.hitfun.top",
      },
      {
        protocol: "https",
        hostname: "static.infinitytab.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
