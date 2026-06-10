"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const TYPES = [
  { value: "PRENATAL", label: "Prenatal visit", hint: "A visit before the birth" },
  { value: "LABOR_DELIVERY", label: "Birth support", hint: "Labor and delivery" },
  { value: "POSTPARTUM", label: "Postpartum visit", hint: "A visit after the birth" },
];

export function LogVisitForm({
  families,
  preselected,
}: {
  families: Array<{ episodeId: string; clientId: string; name: string }>;
  preselected?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState("PRENATAL");
  const initial = families.find((f) => f.clientId === preselected) ?? families[0];
  const [episodeId, setEpisodeId] = useState(initial?.episodeId ?? "");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        episodeId,
        serviceType: type,
        serviceDate: form.get("serviceDate"),
        notes: form.get("notes") || undefined,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "We couldn't save that visit. Try again.");
      return;
    }
    const family = families.find((f) => f.episodeId === episodeId);
    router.push(family ? `/families/${family.clientId}` : "/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-hairline bg-card p-6 shadow-sm">
      <div>
        <label htmlFor="family" className="mb-1 block text-sm font-medium">Family</label>
        <select
          id="family"
          value={episodeId}
          onChange={(e) => setEpisodeId(e.target.value)}
          className="w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm"
        >
          {families.map((f) => (
            <option key={f.episodeId} value={f.episodeId}>
              {f.name}
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="mb-2 block text-sm font-medium">What kind of visit?</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              aria-pressed={type === t.value}
              className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                type === t.value
                  ? "border-aubergine bg-aubergine text-white"
                  : "border-hairline bg-white hover:border-violet-mid/40"
              }`}
            >
              <span className="block text-sm font-medium">{t.label}</span>
              <span className={`block text-xs ${type === t.value ? "text-white/60" : "text-ink-faint"}`}>
                {t.hint}
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="serviceDate" className="mb-1 block text-sm font-medium">When was it?</label>
        <input
          id="serviceDate"
          name="serviceDate"
          type="date"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label htmlFor="notes" className="mb-1 block text-sm font-medium">
          Notes for your records (optional)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          className="w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm"
          placeholder="Anything you want to remember about this visit"
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={busy || !episodeId}
        className="w-full rounded-full bg-aubergine py-2.5 text-sm font-medium text-white hover:bg-violet-mid disabled:opacity-50"
      >
        {busy ? "Saving..." : "Save visit"}
      </button>
      <p className="text-center text-xs text-ink-faint">
        That&apos;s it. We attach the billing details and submit everything for you.
      </p>
    </form>
  );
}
