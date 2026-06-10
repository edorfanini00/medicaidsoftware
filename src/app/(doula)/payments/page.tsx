import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { claimBucket, doulaShare, summarizeClaims } from "@/lib/plain";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const user = await requireUser("DOULA");
  const doula = await prisma.doula.findUniqueOrThrow({
    where: { id: user.doulaId! },
    include: {
      claims: { include: { episode: { include: { client: true } } }, orderBy: { updatedAt: "desc" } },
      payouts: { orderBy: { createdAt: "desc" }, include: { lines: true } },
    },
  });

  const money = summarizeClaims(doula.claims, doula.feeBps);
  const landed = doula.payouts.filter((p) => p.status === "PAID");
  const pending = doula.payouts.filter((p) => p.status !== "PAID" && p.status !== "FAILED");
  const inFlight = doula.claims.filter((c) => claimBucket(c.status) === "onway");

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Payments</h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          What&apos;s landed, what&apos;s on the way, all in plain dollars.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-aubergine p-5 text-white">
          <p className="text-xs text-white/60">Paid to you</p>
          <p className="tnum mt-1 font-display text-2xl font-semibold">{formatCents(money.paid)}</p>
        </div>
        <div className="rounded-2xl border border-hairline bg-card p-5">
          <p className="text-xs text-ink-faint">On its way</p>
          <p className="tnum mt-1 font-display text-2xl font-semibold text-money">
            {formatCents(money.onway)}
          </p>
        </div>
        <div className="rounded-2xl border border-hairline bg-card p-5">
          <p className="text-xs text-ink-faint">We&apos;re handling</p>
          <p className="tnum mt-1 font-display text-2xl font-semibold text-amber-warm">
            {formatCents(money.hold)}
          </p>
        </div>
      </div>

      {(pending.length > 0 || inFlight.length > 0) && (
        <>
          <h2 className="mt-8 mb-3 font-display text-lg font-semibold">On the way to you</h2>
          <div className="overflow-hidden rounded-2xl border border-hairline bg-card shadow-sm">
            <ul className="divide-y divide-hairline">
              {pending.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium">Payout being prepared</p>
                    <p className="text-xs text-ink-faint">
                      {p.lines.length} paid {p.lines.length === 1 ? "visit" : "visits"}, lands in your account soon
                    </p>
                  </div>
                  <span className="tnum text-sm font-semibold text-money">{formatCents(p.netCents)}</span>
                </li>
              ))}
              {inFlight.map((c) => (
                <li key={c.id} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium">
                      Care for {c.episode.client.firstName} {c.episode.client.lastName.charAt(0)}.
                    </p>
                    <p className="text-xs text-ink-faint">Working through Medicaid, usually about two weeks</p>
                  </div>
                  <span className="tnum text-sm font-medium text-ink-soft">
                    ~{formatCents(doulaShare(c.totalChargeCents, doula.feeBps))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      <h2 className="mt-8 mb-3 font-display text-lg font-semibold">Payment history</h2>
      <div className="overflow-hidden rounded-2xl border border-hairline bg-card shadow-sm">
        <ul className="divide-y divide-hairline">
          {landed.map((p) => (
            <li key={p.id} className="flex items-center justify-between px-5 py-3.5">
              <div>
                <p className="text-sm font-medium">Deposit to your account</p>
                <p className="text-xs text-ink-faint">
                  {p.paidAt?.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  {" \u00b7 "}
                  {p.lines.length} paid {p.lines.length === 1 ? "visit" : "visits"}
                </p>
              </div>
              <span className="tnum text-sm font-semibold text-money">{formatCents(p.netCents)}</span>
            </li>
          ))}
          {landed.length === 0 && (
            <li className="px-5 py-10 text-center text-sm text-ink-faint">
              Your first payment will show up here. Most arrive within a few weeks of a visit.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
