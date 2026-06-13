import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits .next/standalone with a minimal node_modules + server.js so the
  // runtime fits comfortably on a 512MB t4g.nano instance.
  output: "standalone",
};

export default nextConfig;
