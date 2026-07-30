"use client";

import { useState } from "react";

/** A titled section that can be collapsed by clicking its header. */
export function CollapsibleSection({
  title,
  headerExtra,
  children,
  defaultCollapsed = false,
}: {
  title: string;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
  defaultCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <div className="flex flex-col gap-2">
      <div
        onClick={() => setCollapsed((c) => !c)}
        className="flex cursor-pointer items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400">{collapsed ? "▸" : "▾"}</span>
          <h3 className="font-medium text-fuchsia-700 dark:text-fuchsia-400">{title}</h3>
        </div>
        {headerExtra && (
          <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-2">
            {headerExtra}
          </div>
        )}
      </div>
      {!collapsed && children}
    </div>
  );
}
