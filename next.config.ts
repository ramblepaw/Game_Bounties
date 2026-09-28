import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // The largest things sent through a Server Action: cover art (up to 10MB,
      // see lib/uploads.ts) via createGame, and checklist imports. An import
      // carries every image base64-encoded inside its JSON -- a third bigger
      // than the files themselves -- so a checklist with a sprite per target
      // outgrows 10MB long before its text would.
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
