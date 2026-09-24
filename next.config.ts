import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // exceljs (Excel backup download) is a large CommonJS package; load it at runtime instead of bundling it.
  serverExternalPackages: ["exceljs"],
};

export default nextConfig;
