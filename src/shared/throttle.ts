/**
 * Source: https://github.com/kaidesalo/spellbranch
 * Path: src/lib/scryfall/client.ts
 * Commit: b7ab91509e054f6fdfa94e797e9e6a88b8c38e07
 * PR: https://github.com/kaidesalo/spellbranch/pull/72
 *
 * What changed: the web app pauses `SCRYFALL_COLLECTION_GAP_MS` (100ms)
 * only between collection batches. A search box can fire on every pause
 * in typing, so that same gap is now a queue in front of every Scryfall
 * request. No Node APIs. `setTimeout` is used on purpose so tests can
 * drive the wait with fake timers.
 */

/** Scryfall asks clients to leave 50–100ms between requests. 100ms is the safe end. */
export const SCRYFALL_MIN_GAP_MS = 100;

export function abortError(): Error {
  const error = new Error("Aborted");
  error.name = "AbortError";
  return error;
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

/**
 * Wait `ms`, but reject immediately if `signal` aborts. A cancelled
 * keystroke must not sit in the queue and then hit Scryfall anyway.
 */
export function pause(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(abortError());
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(finish, ms);
    function finish() {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }
    function onAbort() {
      clearTimeout(timer);
      reject(abortError());
    }
    signal?.addEventListener("abort", onAbort);
  });
}

/**
 * One-at-a-time queue. The next task starts at least `gapMs` after the
 * previous one started, even if the previous one finished faster than that.
 * Overlapping requests are what the rate-limit note is trying to prevent.
 */
export function createRequestQueue(gapMs: number) {
  let tail: Promise<void> = Promise.resolve();
  let lastStart = Number.NEGATIVE_INFINITY;

  function enqueue<T>(task: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    const run = tail.then(async () => {
      const delay = Math.max(0, gapMs - (Date.now() - lastStart));
      await pause(delay, signal);
      if (signal?.aborted) throw abortError();
      lastStart = Date.now();
      return task();
    });
    // A failed request must not wedge every later search.
    tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  function reset(): void {
    tail = Promise.resolve();
    lastStart = Number.NEGATIVE_INFINITY;
  }

  return { enqueue, reset };
}
