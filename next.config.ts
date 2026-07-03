import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Game cover art (up to 10MB, see lib/uploads.ts) is uploaded through the
      // createGame Server Action, above the framework's 1MB default.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
