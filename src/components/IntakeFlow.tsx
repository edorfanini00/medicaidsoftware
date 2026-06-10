"use client";

import { useState } from "react";

const CONSENT_TEXT =
  "I authorize this organization and my doula to submit claims to my Medicaid plan for doula services provided to me, to receive payment on my behalf, and to share the information needed to do so. I understand I will never be billed personally for covered doula services, and I can withdraw this authorization at any time by contacting my doula.";

const steps = ["Welcome", "About you", "Your Medicaid", "Consent", "Done"] as const;

export function IntakeFlow({ token, doulaName }: { token: string; doulaName: string }) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Record<string, string>>({});
  const [eligibility, setEligibility] = useState<string | null>(null);

  function update(e: React.ChangeEvent<HTMLInputElement>) {
    setData((d) => ({ ...d, [e.target.name]: e.target.value }));
  }

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/intake/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, consentText: CONSENT_TEXT }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong. Please try again.");
      return;
    }
    const body = await res.json();
    setEligibility(body.eligibilityStatus);
    setStep(4);
  }

  const input = "w-full rounded-lg border border-hairline bg-white px-3 py-2.5 text-sm";
  const label = "mb-1 block text-sm font-medium";
  const nextBtn =
    "w-full rounded-full bg-aubergine py-2.5 text-sm font-medium text-white hover:bg-violet-mid disabled:opacity-50";

  return (
    <div>
      <div className="mb-6 flex items-center gap-1.5" aria-hidden>
        {steps.slice(0, 4).map((s, i) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full ${i <= step ? "bg-clay" : "bg-hairline"}`}
          />
        ))}
      </div>

      {step === 0 && (
        <div className="text-center">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            {doulaName} invited you
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink-soft">
            Your doula&apos;s visits may be fully covered by your Medicaid plan. This takes
            about two minutes: a few basics, your Medicaid number, and one consent so we can
            handle the billing. You will never get a bill for covered doula care.
          </p>
          <button className={`mt-6 ${nextBtn}`} onClick={() => setStep(1)}>
            Get started
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <h2 className="font-display text-xl font-semibold">About you</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="firstName" className={label}>First name</label>
              <input id="firstName" name="firstName" value={data.firstName ?? ""} onChange={update} className={input} />
            </div>
            <div>
              <label htmlFor="lastName" className={label}>Last name</label>
              <input id="lastName" name="lastName" value={data.lastName ?? ""} onChange={update} className={input} />
            </div>
          </div>
          <div>
            <label htmlFor="dob" className={label}>Date of birth</label>
            <input id="dob" name="dob" type="date" value={data.dob ?? ""} onChange={update} className={input} />
          </div>
          <div>
            <label htmlFor="expectedDeliveryDate" className={label}>Due date (if you know it)</label>
            <input id="expectedDeliveryDate" name="expectedDeliveryDate" type="date" value={data.expectedDeliveryDate ?? ""} onChange={update} className={input} />
          </div>
          <div>
            <label htmlFor="phone" className={label}>Phone (optional)</label>
            <input id="phone" name="phone" value={data.phone ?? ""} onChange={update} className={input} />
          </div>
          <button
            className={nextBtn}
            disabled={!data.firstName || !data.lastName || !data.dob}
            onClick={() => setStep(2)}
          >
            Continue
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="font-display text-xl font-semibold">Your Medicaid</h2>
          <p className="text-sm text-ink-soft">
            This is on your Medicaid card. We use it only to confirm your coverage and bill
            your plan, never to charge you.
          </p>
          <div>
            <label htmlFor="medicaidId" className={label}>Medicaid ID number</label>
            <input id="medicaidId" name="medicaidId" value={data.medicaidId ?? ""} onChange={update} className={input} />
          </div>
          <div>
            <label htmlFor="state" className={label}>State</label>
            <input id="state" name="state" maxLength={2} placeholder="MN" value={data.state ?? ""} onChange={update} className={input} />
          </div>
          <button
            className={nextBtn}
            disabled={!data.medicaidId || !data.state || data.state.length !== 2}
            onClick={() => setStep(3)}
          >
            Continue
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2 className="font-display text-xl font-semibold">One consent</h2>
          <div className="max-h-44 overflow-y-auto rounded-xl border border-hairline bg-paper p-4 text-sm leading-relaxed text-ink-soft">
            {CONSENT_TEXT}
          </div>
          <div>
            <label htmlFor="consentName" className={label}>
              Type your full name to sign
            </label>
            <input
              id="consentName"
              name="consentName"
              value={data.consentName ?? ""}
              onChange={update}
              className={input}
              placeholder="Your full legal name"
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            className={nextBtn}
            disabled={busy || !data.consentName || data.consentName.trim().length < 2}
            onClick={submit}
          >
            {busy ? "Finishing up..." : "Agree and finish"}
          </button>
        </div>
      )}

      {step === 4 && (
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-money-soft text-money">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path d="M4 10.5L8.5 15L16 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="mt-3 font-display text-2xl font-semibold">You&apos;re all set</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
            {eligibility === "ACTIVE"
              ? `Your Medicaid coverage is confirmed. ${doulaName} can focus on you, and the billing happens quietly in the background.`
              : `Thanks. We're confirming your coverage now; if we need anything we'll reach ${doulaName}. Nothing more for you to do.`}
          </p>
        </div>
      )}
    </div>
  );
}
