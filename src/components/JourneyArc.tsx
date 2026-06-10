// The signature element of the doula app: the care-and-payment journey.
// Three stages mirroring the pregnancy arc, doubling as money status.
// Calm by design: dashed connectors, one accent color, no motion.

type StageState = "done" | "current" | "future";

export type JourneyStage = {
  label: string;
  sublabel: string;
  state: StageState;
};

function Dot({ state }: { state: StageState }) {
  if (state === "done") {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-clay text-white">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path d="M2.5 6.5L5 9L9.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (state === "current") {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-clay bg-clay-soft">
        <span className="h-2.5 w-2.5 rounded-full bg-clay" />
      </span>
    );
  }
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-hairline bg-white" />
  );
}

export function JourneyArc({ stages }: { stages: JourneyStage[] }) {
  return (
    <div className="flex items-start">
      {stages.map((stage, i) => (
        <div key={stage.label} className="flex flex-1 flex-col items-center">
          <div className="flex w-full items-center">
            <div
              className={`h-px flex-1 border-t-2 border-dashed ${i === 0 ? "border-transparent" : stages[i - 1].state === "done" ? "border-clay/40" : "border-hairline"}`}
            />
            <Dot state={stage.state} />
            <div
              className={`h-px flex-1 border-t-2 border-dashed ${i === stages.length - 1 ? "border-transparent" : stage.state === "done" ? "border-clay/40" : "border-hairline"}`}
            />
          </div>
          <p className="mt-2 text-sm font-medium text-ink">{stage.label}</p>
          <p className="mt-0.5 text-xs text-ink-faint">{stage.sublabel}</p>
        </div>
      ))}
    </div>
  );
}
