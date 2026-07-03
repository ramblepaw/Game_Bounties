"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setTheme } from "@/server/actions/theme";

export function ThemeToggle({ theme }: { theme: "light" | "dark" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => setTheme(theme === "dark" ? "light" : "dark").then(() => router.refresh()))}
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      className="text-lg leading-none text-violet-100 transition-colors hover:text-white"
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
