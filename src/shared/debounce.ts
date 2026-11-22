/**
 * Not copied from https://github.com/kaidesalo/spellbranch.
 * The website searches when the form is submitted. A phone search box
 * has no submit step, so this trailing debounce is new. It lives in
 * src/shared because it does not import React Native: the unit test can
 * advance fake timers without rendering a component.
 */

/**
 * 350ms sits in the 300–400ms range for search-as-you-type: long enough
 * that "ajani" is one request, short enough that the list doesn't feel stuck.
 */
export const SEARCH_DEBOUNCE_MS = 350;

export interface Debounced<Args extends unknown[]> {
  (...args: Args): void;
  /** Drop a pending call. The search hook uses this as the effect cleanup. */
  cancel: () => void;
}

/**
 * Call `fn` only after `waitMs` of quiet. A second call before that
 * replaces the first, which is what makes typing "ajani" one search
 * instead of five.
 */
export function createDebounced<Args extends unknown[]>(
  fn: (...args: Args) => void,
  waitMs: number,
): Debounced<Args> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const wrapped = ((...args: Args) => {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      fn(...args);
    }, waitMs);
  }) as Debounced<Args>;
  wrapped.cancel = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  return wrapped;
}
