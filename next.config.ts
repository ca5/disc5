import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/disc5',
  assetPrefix: '/disc5',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
