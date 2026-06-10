import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";

const groups: Array<{ label: string; items: Array<{ href: string; label: string }> }> = [
  {
    label: "Operate",
    items: [
      { href: "/admin", label: "Dashboard" },
      { href: "/admin/claims", label: "Claims" },
      { href: "/admin/denials", label: "Denials and rework" },
      { href: "/admin/remittances", label: "Remittances" },
      { href: "/admin/reconciliation", label: "Reconciliation" },
      { href: "/admin/eligibility", label: "Eligibility" },
    ],
  },
  {
    label: "Money",
    items: [
      { href: "/admin/payouts", label: "Payout ledger" },
      { href: "/admin/reports", label: "Reports" },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/admin/doulas", label: "Doulas" },
      { href: "/admin/clients", label: "Clients" },
    ],
  },
  {
    label: "Configure",
    items: [
      { href: "/admin/rulesets", label: "State rulesets" },
      { href: "/admin/payers", label: "Payers and enrollment" },
      { href: "/admin/audit", label: "Audit log" },
    ],
  },
];

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser("ADMIN");

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r border-hairline bg-aubergine-deep text-white">
        <div className="border-b border-white/10 px-5 py-5">
          <Link href="/admin" className="block">
            <span className="font-display text-xl font-semibold tracking-tight">maren</span>
            <span className="mt-0.5 block text-xs text-white/50">billing operations</span>
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {groups.map((g) => (
            <div key={g.label} className="mb-5">
              <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/35">
                {g.label}
              </p>
              {g.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-md px-3 py-1.5 text-sm text-white/80 hover:bg-white/10 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="border-t border-white/10 px-5 py-4 text-sm">
          <p className="font-medium text-white/90">{user.name}</p>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-xs text-white/50">Operations</span>
            <LogoutButton className="text-xs text-white/60 hover:text-white" />
          </div>
        </div>
      </aside>
      <main className="flex-1 px-8 py-8">
        <div className="mx-auto max-w-6xl fade-in">{children}</div>
      </main>
    </div>
  );
}
