import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: 'standalone',
  turbopack: {
    // Fix: Next.js 16 detected a stale package-lock.json in the home directory
    // and incorrectly set it as the workspace root. Explicitly setting root here
    // pins resolution to this project folder, fixing the tailwindcss lookup error.
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
