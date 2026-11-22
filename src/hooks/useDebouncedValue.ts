import { useEffect, useState } from "react";

import { createDebounced, SEARCH_DEBOUNCE_MS } from "@/shared/debounce";

/**
 * The latest `value`, delayed by `waitMs`. The cleanup cancels the pending
 * timer, so a new keystroke replaces the previous one instead of stacking.
 * The first render returns `value` immediately: an empty box should not
 * sit on a spinner for 350ms before showing the hint.
 */
export function useDebouncedValue<T>(value: T, waitMs = SEARCH_DEBOUNCE_MS): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = createDebounced((next: T) => {
      setDebounced(next);
    }, waitMs);
    handle(value);
    return () => handle.cancel();
  }, [value, waitMs]);

  return debounced;
}
