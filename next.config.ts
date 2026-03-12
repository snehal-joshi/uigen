import type { NextConfig } from "next";

require('./node-compat.cjs');

const nextConfig: NextConfig = {
  devIndicators: false,
};

export default nextConfig;
