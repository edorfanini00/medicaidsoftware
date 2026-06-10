import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const faqs = [
  {
    q: "How do I get paid?",
    a: "You log your visits, and that's it. We turn each visit into an insurance claim, send it to Medicaid, collect the payment, and deposit your share to your account. You never touch the paperwork.",
  },
  {
    q: "How long does it take?",
    a: "Most payments arrive two to four weeks after a visit. Birth support usually pays the largest amount and can take slightly longer. The Payments page always shows what's on the way.",
  },
  {
    q: "What does \u201cWe're handling it\u201d mean?",
    a: "Sometimes Medicaid asks a question about a claim before paying it. That's normal and it's our job to resolve. We rework it and resubmit. You don't need to do anything, and it doesn't affect your other payments.",
  },
  {
    q: "What's the fee?",
    a: "We keep a percentage of what Medicaid pays, shown in your Settings. There are no other charges, and you never pay anything out of pocket.",
  },
  {
    q: "What if a mother's coverage lapses?",
    a: "We check coverage when you add a family and keep an eye on it during care. If something changes, we work on it and let you know only if we actually need something from you.",
  },
];

export default async function HelpPage() {
  await requireUser("DOULA");
  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight">How payments work</h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          The short version: you support families, we do the billing.
        </p>
      </div>
      <div className="space-y-3">
        {faqs.map((f) => (
          <div key={f.q} className="rounded-2xl border border-hairline bg-card p-5 shadow-sm">
            <h2 className="font-display text-base font-semibold">{f.q}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{f.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
