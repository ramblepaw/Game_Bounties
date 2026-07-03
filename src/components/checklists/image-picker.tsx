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
  const inputRef = useRef<HTMLInputElement>(null);

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
      onChange(body.url as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <label className="mb-1 block text-xs text-neutral-400">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://…"
          className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white outline-none"
        />
        <label className="flex cursor-pointer items-center justify-center rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white shadow-sm transition-colors hover:bg-neutral-700">
          {uploading ? "…" : "📁"}
          <input
            ref={inputRef}
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
