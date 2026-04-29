import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Keep watcher scoped to this app to avoid noisy cross-folder recompiles.
    root: __dirname,
  },
};

export default nextConfig;
