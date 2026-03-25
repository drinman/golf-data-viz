"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { trackEvent } from "@/lib/analytics/client";
import {
  buildTroubleContextSummary,
  TROUBLE_CAUSES,
  MAX_TROUBLE_HOLES,
  type TroubleCause,
  type TroubleHoleInput,
  type RoundTroubleContext,
} from "@/lib/golf/trouble-context";

const CAUSE_LABELS: Record<TroubleCause, string> = {
  tee: "Tee",
  approach: "Approach",
  around_green: "Around the Green",
  putting: "Putting",
  penalty: "Penalty",
};

interface TroubleContextModalProps {
  onClose: () => void;
  onApply: (context: RoundTroubleContext) => void;
}

export function TroubleContextModal({
  onClose,
  onApply,
}: TroubleContextModalProps) {
  const [step, setStep] = useState<"count" | "holes">("count");
  const [holeCount, setHoleCount] = useState(0);
  const [holes, setHoles] = useState<TroubleHoleInput[]>([]);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Escape key dismissal
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Click-outside dismissal
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === backdropRef.current) onClose();
    },
    [onClose]
  );

  function handleCountSelect(count: number) {
    setHoleCount(count);
    setHoles(
      Array.from({ length: count }, () => ({
        holeNumber: null,
        primaryCause: "tee" as TroubleCause,
      }))
    );
    setStep("holes");
  }

  function updateHole(index: number, field: keyof TroubleHoleInput, value: number | null | TroubleCause) {
    setHoles((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function handleApply() {
    const summary = buildTroubleContextSummary(holes);
    onApply({ troubleHoles: holes, summary });
  }

  const countOptions = [1, 2, 3, 4];

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/40"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add trouble context"
        className="animate-slide-down mx-4 w-full max-w-md rounded-xl bg-white shadow-xl"
      >
        <div className="px-6 pb-6 pt-5">
          {step === "count" && (
            <>
              <h3 className="font-display text-lg font-semibold tracking-tight text-neutral-950">
                How many holes got off track?
              </h3>
              <p className="mt-1 text-sm text-neutral-500">
                Think about holes where one bad shot cascaded into a rough
                score.
              </p>
              <div className="mt-4 flex gap-2">
                {countOptions.map((n) => (
                  <button
                    key={n}
                    type="button"
                    data-testid={`trouble-count-${n}`}
                    onClick={() => handleCountSelect(n)}
                    className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-cream-200 text-sm font-semibold text-neutral-800 transition-all hover:border-brand-800/30 hover:bg-cream-50"
                  >
                    {n}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-600"
              >
                Cancel
              </button>
            </>
          )}

          {step === "holes" && (
            <>
              <h3 className="font-display text-lg font-semibold tracking-tight text-neutral-950">
                Tell us about {holeCount === 1 ? "that hole" : "those holes"}
              </h3>
              <p className="mt-1 text-sm text-neutral-500">
                For each hole, pick where the trouble started.
              </p>

              <div className="mt-4 space-y-4 max-h-[50vh] overflow-y-auto">
                {holes.map((hole, i) => (
                  <div
                    key={i}
                    data-testid={`trouble-hole-${i}`}
                    className="rounded-lg border border-cream-200 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-medium text-neutral-500">
                        Hole
                      </label>
                      <select
                        value={hole.holeNumber ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateHole(
                            i,
                            "holeNumber",
                            val === "" ? null : Number(val)
                          );
                        }}
                        className="rounded-lg border-2 border-cream-200 bg-cream-100 px-3 py-2.5 text-sm text-neutral-800 transition-all duration-200 hover:border-cream-200/80 focus:border-brand-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-800/20"
                      >
                        <option value="">Don&apos;t remember</option>
                        {Array.from({ length: 18 }, (_, n) => (
                          <option key={n + 1} value={n + 1}>
                            {n + 1}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="mt-2">
                      <label className="text-xs font-medium text-neutral-500">
                        Where did it start?
                      </label>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {TROUBLE_CAUSES.map((cause) => (
                          <button
                            key={cause}
                            type="button"
                            onClick={() => {
                              updateHole(i, "primaryCause", cause);
                              trackEvent("trouble_context_cause_selected", {
                                cause,
                                step: i,
                              });
                            }}
                            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                              hole.primaryCause === cause
                                ? "bg-brand-800 text-white"
                                : "border border-cream-200 text-neutral-600 hover:border-brand-800/30 hover:bg-cream-50"
                            }`}
                          >
                            {CAUSE_LABELS[cause]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  data-testid="trouble-apply"
                  onClick={handleApply}
                  className="min-h-11 rounded-lg bg-brand-800 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-md active:translate-y-0"
                >
                  Apply context
                </button>
                {holes.length < MAX_TROUBLE_HOLES && (
                  <button
                    type="button"
                    onClick={() => {
                      setHoles((prev) => [
                        ...prev,
                        { holeNumber: null, primaryCause: "tee" as TroubleCause },
                      ]);
                      setHoleCount((c) => c + 1);
                    }}
                    className="inline-flex min-h-11 items-center text-sm font-medium text-brand-800 transition-colors hover:text-brand-600"
                  >
                    + Add hole
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex min-h-11 items-center text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-600"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
