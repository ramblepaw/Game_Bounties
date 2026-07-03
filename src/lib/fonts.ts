import { Fredoka, Bebas_Neue, Playfair_Display } from "next/font/google";

// Checklist items/sections can be styled with one of a small, curated set of
// self-hosted fonts (via next/font, so no runtime calls to Google/CDNs — important
// for an offline-friendly self-hosted deployment). Arbitrary font uploads are out of
// scope: a fixed palette keeps the editor simple and avoids validating font files.
export const fontPlayful = Fredoka({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-playful",
  display: "swap",
});

export const fontDisplay = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

export const fontSerif = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const CHECKLIST_FONT_VARIABLE_CLASSNAMES = [
  fontPlayful.variable,
  fontDisplay.variable,
  fontSerif.variable,
].join(" ");

export type ChecklistFontKey = "sans" | "mono" | "serif" | "playful" | "display";

export const FONT_OPTIONS: { key: ChecklistFontKey; label: string; cssClass: string }[] = [
  { key: "sans", label: "Sans", cssClass: "font-preset-sans" },
  { key: "mono", label: "Mono", cssClass: "font-preset-mono" },
  { key: "serif", label: "Serif", cssClass: "font-preset-serif" },
  { key: "playful", label: "Playful", cssClass: "font-preset-playful" },
  { key: "display", label: "Display", cssClass: "font-preset-display" },
];

export function fontClassForKey(key: string | null | undefined): string {
  const match = FONT_OPTIONS.find((f) => f.key === key);
  return match?.cssClass ?? "";
}
