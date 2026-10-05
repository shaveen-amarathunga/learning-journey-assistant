import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully client-side app: build to static files in /out (deployed as a Render static site).
  output: "export",
};

export default nextConfig;
