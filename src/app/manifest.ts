import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Game Bounties",
    short_name: "Bounties",
    description: "Completion checklists for video games",
    start_url: "/",
    display: "standalone",
    // Matches the dark theme in globals.css, which is the default.
    background_color: "#16101f",
    theme_color: "#5b21b6",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
