"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { StatusBadge } from "./StatusBadge";

type ServiceRow = {
  id: string;
  serviceType: string;
  serviceDate: string;
  procedureCode: string | null;
  modifier: string | null;
  units: number;
  chargeCents: number;
  status: string;
};

// Log services and assemble unclaimed ones into a claim.
export function ServicesPanel({
  episodeId,
  services,
}: {
  episodeId: string;
  services: ServiceRow[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const billable = services.filter((s) => s.status === "LOGGED" || s.status === "VALIDATED");

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function logService(formData: FormData) {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        episodeId,
        serviceType: formData.get("serviceType"),
        serviceDate: formData.get("serviceDate"),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to log service");
    } else {
      router.refresh();
    }
  }

  async function buildClaim() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ episodeId, serviceIds: [...selected] }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(
        data.issues
          ? data.issues.map((i: { message: string }) => i.message).join(" ")
          : (data.error ?? "Failed to build claim")
      );
    } else {
      const { claimId } = await res.json();
      router.push(`/admin/claims/${claimId}`);
    }
  }

  return (
    <div>
      <form
        action={logService}
        className="mb-4 flex flex-wrap items-end gap-3 rounded-md bg-slate-50 p-3"
      >
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Service type</label>
          <select
            name="serviceType"
            required
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
          >
            <option value="PRENATAL">Prenatal visit</option>
            <option value="LABOR_DELIVERY">Labor and delivery support</option>
            <option value="POSTPARTUM">Postpartum visit</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
          <input
            type="date"
            name="serviceDate"
            required
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          Log service
        </button>
      </form>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-600">
            <th className="py-2 pr-2 w-8"></th>
            <th className="py-2 pr-4 font-medium">Type</th>
            <th className="py-2 pr-4 font-medium">Date</th>
            <th className="py-2 pr-4 font-medium">Code</th>
            <th className="py-2 pr-4 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {services.map((s) => (
            <tr key={s.id}>
              <td className="py-2 pr-2">
                {(s.status === "LOGGED" || s.status === "VALIDATED") && (
                  <input
                    type="checkbox"
                    checked={selected.has(s.id)}
                    onChange={() => toggle(s.id)}
                  />
                )}
              </td>
              <td className="py-2 pr-4">{s.serviceType.replaceAll("_", " ")}</td>
              <td className="py-2 pr-4">{s.serviceDate.slice(0, 10)}</td>
              <td className="py-2 pr-4 font-mono text-xs">
                {s.procedureCode ?? "-"}
                {s.modifier ? ` ${s.modifier}` : ""}
              </td>
              <td className="py-2 pr-4">
                <StatusBadge status={s.status} />
              </td>
            </tr>
          ))}
          {services.length === 0 && (
            <tr>
              <td colSpan={5} className="py-6 text-center text-slate-400">
                No services logged yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {billable.length > 0 && (
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={buildClaim}
            disabled={busy || selected.size === 0}
            className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
          >
            Build claim from {selected.size} selected
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
    </div>
  );
}
