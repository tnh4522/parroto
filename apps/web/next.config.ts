import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@linguacraft/contracts"],
  images: {
    unoptimized: false,
  },
};

export default nextConfig;
