"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Doula-facing intake. Posts to /api/clients, which scopes the family to the
// signed-in doula and runs the coverage check behind the scenes. The result
// comes back in plain language.
export function AddFamilyForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ clientId: string; eligible: string | null } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {};
    for (const [k, v] of form.entries()) {
      if (v !== "") body[k] = v;
    }
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong saving this family.");
      return;
    }
    const data = await res.json();
    setResult({ clientId: data.id, eligible: data.eligibilityStatus ?? null });
  }

  if (result) {
    const ok = result.eligible === "ACTIVE";
    return (
      <div className="rounded-2xl border border-hairline bg-card p-6 text-center shadow-sm">
        <div
          className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${ok ? "bg-money-soft text-money" : "bg-amber-soft text-amber-warm"}`}
        >
          {ok ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path d="M4 10.5L8.5 15L16 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path d="M10 5v6M10 14.5v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </div>
        <h2 className="mt-3 font-display text-xl font-semibold">
          {ok ? "Coverage confirmed" : "We're checking coverage"}
        </h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">
          {ok
            ? "Their Medicaid coverage is active. You're all set to log visits, and we'll handle the billing from here."
            : "We couldn't confirm coverage instantly. We'll keep checking and sort it out; you can log visits as usual in the meantime."}
        </p>
        <button
          onClick={() => router.push(`/families/${result.clientId}`)}
          className="mt-4 rounded-full bg-aubergine px-4 py-2 text-sm font-medium text-white hover:bg-violet-mid"
        >
          Go to family
        </button>
      </div>
    );
  }

  const input = "w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm";
  const label = "mb-1 block text-sm font-medium";

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-hairline bg-card p-6 shadow-sm">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="firstName" className={label}>First name</label>
          <input id="firstName" name="firstName" required className={input} />
        </div>
        <div>
          <label htmlFor="lastName" className={label}>Last name</label>
          <input id="lastName" name="lastName" required className={input} />
        </div>
      </div>
      <div>
        <label htmlFor="dob" className={label}>Date of birth</label>
        <input id="dob" name="dob" type="date" required className={input} />
      </div>
      <div>
        <label htmlFor="medicaidId" className={label}>Medicaid ID</label>
        <input id="medicaidId" name="medicaidId" required className={input} placeholder="On their Medicaid card" />
        <p className="mt-1 text-xs text-ink-faint">
          We use this once to confirm coverage. You won&apos;t deal with it again.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="state" className={label}>State</label>
          <input id="state" name="state" required maxLength={2} className={input} placeholder="MN" />
        </div>
        <div>
          <label htmlFor="expectedDeliveryDate" className={label}>Due date</label>
          <input id="expectedDeliveryDate" name="expectedDeliveryDate" type="date" className={input} />
        </div>
      </div>
      <div>
        <label htmlFor="phone" className={label}>Phone (optional)</label>
        <input id="phone" name="phone" className={input} />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-full bg-aubergine py-2.5 text-sm font-medium text-white hover:bg-violet-mid disabled:opacity-50"
      >
        {busy ? "Checking coverage..." : "Add family and check coverage"}
      </button>
    </form>
  );
}
