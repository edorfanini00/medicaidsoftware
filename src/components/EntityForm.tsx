"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type Field = {
  name: string;
  label: string;
  type?: "text" | "date" | "email" | "select" | "number";
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
  placeholder?: string;
};

// Generic create form: renders fields, posts JSON to an API route, redirects.
export function EntityForm({
  fields,
  postUrl,
  redirectTo,
  submitLabel,
}: {
  fields: Field[];
  postUrl: string;
  redirectTo: string;
  submitLabel: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {};
    for (const field of fields) {
      const raw = form.get(field.name);
      if (raw == null || raw === "") continue;
      body[field.name] = field.type === "number" ? Number(raw) : String(raw);
    }
    try {
      const res = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Request failed (${res.status})`);
        setBusy(false);
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("Network error");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-lg space-y-4">
      {fields.map((field) => (
        <div key={field.name}>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {field.label}
            {field.required && <span className="text-rose-500"> *</span>}
          </label>
          {field.type === "select" ? (
            <select
              name={field.name}
              required={field.required}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              defaultValue=""
            >
              <option value="" disabled>
                Select...
              </option>
              {field.options?.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              name={field.name}
              type={field.type ?? "text"}
              required={field.required}
              placeholder={field.placeholder}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          )}
        </div>
      ))}
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {busy ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
