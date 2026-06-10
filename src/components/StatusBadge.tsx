const COLORS: Record<string, string> = {
  // claims
  BUILT: "bg-slate-100 text-slate-700",
  SUBMITTED: "bg-blue-100 text-blue-800",
  ACCEPTED: "bg-sky-100 text-sky-800",
  PENDING: "bg-amber-100 text-amber-800",
  PAID: "bg-emerald-100 text-emerald-800",
  PARTIALLY_PAID: "bg-teal-100 text-teal-800",
  REJECTED: "bg-rose-100 text-rose-800",
  DENIED: "bg-rose-100 text-rose-800",
  REWORKING: "bg-purple-100 text-purple-800",
  VOID: "bg-slate-100 text-slate-500",
  // services
  LOGGED: "bg-slate-100 text-slate-700",
  VALIDATED: "bg-sky-100 text-sky-800",
  CLAIMED: "bg-blue-100 text-blue-800",
  // eligibility
  ACTIVE: "bg-emerald-100 text-emerald-800",
  INACTIVE: "bg-rose-100 text-rose-800",
  UNKNOWN: "bg-slate-100 text-slate-600",
  ERROR: "bg-rose-100 text-rose-800",
  // doulas / payouts
  ONBOARDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-sky-100 text-sky-800",
  FAILED: "bg-rose-100 text-rose-800",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${COLORS[status] ?? "bg-slate-100 text-slate-700"}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}
