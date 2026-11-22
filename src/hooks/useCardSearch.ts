import { useEffect, useState } from "react";

import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { searchCards } from "@/shared/scryfall";
import { isAbortError } from "@/shared/throttle";
import type { SearchOutcome } from "@/shared/types";

export type CardSearchState = { status: "idle" } | { status: "loading" } | SearchOutcome;

/**
 * Search-as-you-type.
 *
 * The debounced string is what we send. Clearing the box skips the wait:
 * an empty field is idle immediately, and the effect cleanup aborts the
 * request already on the wire. AbortController is how a slow response for
 * "aj" cannot overwrite the results for "ajani".
 *
 * Loading is derived, not stored. The effect only writes a result after
 * the network answers, so it does not call setState in the same turn it
 * starts. If `stored.query` is not the query we are showing, the previous
 * result belongs to a different search and the screen is loading.
 */
export function useCardSearch(rawQuery: string): { state: CardSearchState; pending: boolean } {
  const debounced = useDebouncedValue(rawQuery);
  const trimmedRaw = rawQuery.trim();
  const query = trimmedRaw === "" ? "" : debounced.trim();
  const [stored, setStored] = useState<{ query: string; outcome: SearchOutcome } | null>(null);

  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();
    let active = true;
    searchCards(query, { signal: controller.signal })
      .then((outcome) => {
        if (!active) return;
        setStored({ query, outcome });
      })
      .catch((error: unknown) => {
        if (!active || isAbortError(error)) return;
        setStored({ query, outcome: { status: "error", message: "Could not reach Scryfall." } });
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [query]);

  let state: CardSearchState;
  if (!query) state = { status: "idle" };
  else if (!stored || stored.query !== query) state = { status: "loading" };
  else state = stored.outcome;

  return { state, pending: trimmedRaw !== "" && trimmedRaw !== query };
}
