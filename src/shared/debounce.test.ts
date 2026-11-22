import { createDebounced, SEARCH_DEBOUNCE_MS } from "@/shared/debounce";

describe("search debounce", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("uses a delay in the 300–400ms range", () => {
    expect(SEARCH_DEBOUNCE_MS).toBeGreaterThanOrEqual(300);
    expect(SEARCH_DEBOUNCE_MS).toBeLessThanOrEqual(400);
  });

  it("waits out the delay, and a second call replaces the first", () => {
    const fn = jest.fn();
    const debounced = createDebounced(fn, SEARCH_DEBOUNCE_MS);

    debounced("aj");
    jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1);
    expect(fn).not.toHaveBeenCalled();

    debounced("ajani");
    jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1);
    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("ajani");
  });

  it("cancel drops a pending call", () => {
    const fn = jest.fn();
    const debounced = createDebounced(fn, SEARCH_DEBOUNCE_MS);
    debounced("ajani");
    debounced.cancel();
    jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    expect(fn).not.toHaveBeenCalled();
  });
});
