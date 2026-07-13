"use client";

import { useRef, useState } from "react";
import type { UploadKind } from "@/lib/uploads";

export function ImagePicker({
  label,
  value,
  onChange,
  kind,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  kind: UploadKind;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("kind", kind);
      const res = await fetch("/api/uploads", { method: "POST", body: formData });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Upload failed.");
      const url = body.url as string;
      // The text field is uncontrolled (see below), so an upload needs to
      // update its displayed value imperatively too.
      if (textInputRef.current) textInputRef.current.value = url;
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleUrlBlur(e: React.FocusEvent<HTMLInputElement>) {
    const next = e.target.value;
    if (next === value) return;

    // Already one of our own hosted paths (or cleared) -- nothing to fetch.
    if (!next || !/^https?:\/\//i.test(next)) {
      onChange(next);
      return;
    }

    // A pasted external URL is downloaded once and re-hosted through the
    // upload pipeline instead of kept as a live hotlink -- otherwise it can
    // break later if the source expires (e.g. Discord's signed CDN links) or
    // hotlink-blocks us, and it can't be bundled into a checklist export.
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("url", next);
      formData.set("kind", kind);
      const res = await fetch("/api/uploads", { method: "POST", body: formData });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Couldn't fetch that image.");
      const url = body.url as string;
      if (textInputRef.current) textInputRef.current.value = url;
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't fetch that image.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="mb-1 block text-xs text-neutral-400">{label}</label>
      <div className="flex gap-2">
        <input
          ref={textInputRef}
          type="text"
          defaultValue={value || ""}
          onBlur={handleUrlBlur}
          disabled={uploading}
          placeholder="https://…"
          className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white outline-none disabled:opacity-60"
        />
        <label className="flex cursor-pointer items-center justify-center rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white shadow-sm transition-colors hover:bg-neutral-700">
          {uploading ? "…" : "📁"}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={handleFileUpload}
          />
        </label>
      </div>
      {error && <span className="mt-1.5 block text-[10px] font-medium text-red-500">{error}</span>}
      {!error && value && !value.startsWith("http") && (
        <span className="mt-1.5 block text-[10px] font-medium text-emerald-500">✓ Uploaded</span>
      )}
    </div>
  );
}
