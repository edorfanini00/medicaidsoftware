"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Posts JSON to an API route and refreshes the page data. The shared building
// block for every "do a billing thing" button in the UI.
export function ActionButton({
  url,
  body,
  label,
  variant = "primary",
}: {
  url: string;
  body?: Record<string, unknown>;
  label: string;
  variant?: "primary" | "secondary" | "danger";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const styles = {
    primary: "bg-slate-900 text-white hover:bg-slate-700",
    secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50",
    danger: "bg-rose-600 text-white hover:bg-rose-500",
  }[variant];

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : "{}",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          data.issues
            ? data.issues.map((i: { message: string }) => i.message).join(" ")
            : (data.error ?? `Request failed (${res.status})`)
        );
      } else {
        router.refresh();
      }
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        onClick={run}
        disabled={busy}
        className={`rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${styles}`}
      >
        {busy ? "Working..." : label}
      </button>
      {error && <span className="text-xs text-rose-600 max-w-xs">{error}</span>}
    </span>
  );
}
