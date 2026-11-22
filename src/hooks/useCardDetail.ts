import { useCallback, useEffect, useState } from "react";

import { fetchCard } from "@/shared/scryfall";
import { isAbortError } from "@/shared/throttle";
import type { CardOutcome } from "@/shared/types";

export type CardDetailState = { status: "loading" } | CardOutcome;

/**
 * Loads one card for `app/card/[id]`. `attempt` is the retry button:
 * bumping it re-runs the effect without a second copy of the fetch logic.
 * Cleanup aborts so leaving the screen does not apply a response to a card
 * the person already left, and does not spend the rate-limit gap on it.
 *
 * The effect records the outcome. Loading is "we have no outcome for this
 * id and attempt yet", which is why opening a card shows the spinner
 * before the promise resolves.
 */
export function useCardDetail(id: string | undefined): { state: CardDetailState; reload: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [stored, setStored] = useState<{ id: string; attempt: number; outcome: CardOutcome } | null>(null);
  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  const requestId = id ?? "";

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    fetchCard(requestId, { signal: controller.signal })
      .then((outcome) => {
        if (!active) return;
        setStored({ id: requestId, attempt, outcome });
      })
      .catch((error: unknown) => {
        if (!active || isAbortError(error)) return;
        setStored({
          id: requestId,
          attempt,
          outcome: { status: "error", message: "Could not reach Scryfall." },
        });
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [requestId, attempt]);

  const state: CardDetailState =
    !stored || stored.id !== requestId || stored.attempt !== attempt ? { status: "loading" } : stored.outcome;

  return { state, reload };
}
