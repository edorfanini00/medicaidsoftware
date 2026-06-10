"use client";

import { useState } from "react";

// Generates a single-use intake link the doula can text to the mother, so the
// mother fills in her own details and signs the billing consent herself.
export function InviteLinkButton() {
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    const res = await fetch("/api/intake-links", { method: "POST" });
    setBusy(false);
    if (res.ok) {
      const data = await res.json();
      setUrl(`${window.location.origin}${data.path}`);
    }
  }

  if (url) {
    return (
      <div className="rounded-2xl border border-hairline bg-card p-4">
        <p className="text-sm font-medium">Send this link to the mother</p>
        <div className="mt-2 flex items-center gap-2">
          <input
            readOnly
            value={url}
            className="w-full rounded-lg border border-hairline bg-paper px-3 py-2 font-mono text-xs"
            onFocus={(e) => e.currentTarget.select()}
          />
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(url);
              setCopied(true);
            }}
            className="shrink-0 rounded-lg border border-hairline bg-white px-3 py-2 text-sm hover:bg-paper"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="mt-2 text-xs text-ink-faint">
          She fills in her own details and signs the consent. The family appears in your list
          the moment she finishes.
        </p>
      </div>
    );
  }

  return (
    <button
      onClick={create}
      disabled={busy}
      className="w-full rounded-2xl border border-dashed border-hairline bg-card px-4 py-3 text-sm text-ink-soft hover:border-violet-mid/40 hover:text-ink disabled:opacity-50"
    >
      {busy ? "Creating link..." : "Or send the mother a link so she can fill this in herself"}
    </button>
  );
}
