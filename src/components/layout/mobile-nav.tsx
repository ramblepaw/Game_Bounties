"use client";

import { useState } from "react";
import Link from "next/link";

export function MobileNav({
  links,
  children,
}: {
  links: { href: string; label: string }[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Toggle menu"
        aria-expanded={open}
        className="rounded-md p-2 text-xl leading-none text-violet-100 hover:text-white"
      >
        {open ? "✕" : "☰"}
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full z-20 flex flex-col gap-1 border-t border-white/20 bg-violet-700 px-4 py-3 shadow-lg dark:bg-neutral-900">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded px-2 py-2 text-sm font-medium text-violet-100 hover:bg-white/10 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
          <div
            className="mt-2 flex flex-col gap-2 border-t border-white/20 pt-2"
            onClick={() => setOpen(false)}
          >
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
