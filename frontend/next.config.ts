import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Client-side app built to static files in /out (hosted as a Render static site).
  output: "export",
  // Emit /outcomes/lo1/index.html so deep links work on a static host.
  trailingSlash: true,
};

export default nextConfig;
