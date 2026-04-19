import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: "http://194.163.161.170/api/v1/:path*",
      },
    ];
  },
};

export default nextConfig;
