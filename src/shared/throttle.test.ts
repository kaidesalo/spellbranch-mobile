import { createRequestQueue, SCRYFALL_MIN_GAP_MS } from "@/shared/throttle";

describe("Scryfall request queue", () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: 0 });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("keeps the gap inside Scryfall's 50–100ms guidance", () => {
    expect(SCRYFALL_MIN_GAP_MS).toBeGreaterThanOrEqual(50);
    expect(SCRYFALL_MIN_GAP_MS).toBeLessThanOrEqual(100);
  });

  it("starts the next request only after the gap", async () => {
    const queue = createRequestQueue(SCRYFALL_MIN_GAP_MS);
    const starts: number[] = [];
    const first = queue.enqueue(async () => {
      starts.push(Date.now());
      return "first";
    });
    const second = queue.enqueue(async () => {
      starts.push(Date.now());
      return "second";
    });

    await jest.advanceTimersByTimeAsync(0);
    expect(starts).toEqual([0]);

    await jest.advanceTimersByTimeAsync(SCRYFALL_MIN_GAP_MS - 1);
    expect(starts).toEqual([0]);

    await jest.advanceTimersByTimeAsync(1);
    expect(starts).toEqual([0, SCRYFALL_MIN_GAP_MS]);
    await expect(Promise.all([first, second])).resolves.toEqual(["first", "second"]);
  });

  it("does not run a task that was aborted while waiting for the gap", async () => {
    const queue = createRequestQueue(SCRYFALL_MIN_GAP_MS);
    const ran: string[] = [];
    const first = queue.enqueue(async () => {
      ran.push("first");
    });
    const controller = new AbortController();
    const second = queue.enqueue(async () => {
      ran.push("second");
    }, controller.signal);

    await jest.advanceTimersByTimeAsync(0);
    expect(ran).toEqual(["first"]);
    controller.abort();
    await jest.advanceTimersByTimeAsync(SCRYFALL_MIN_GAP_MS);

    await expect(second).rejects.toMatchObject({ name: "AbortError" });
    expect(ran).toEqual(["first"]);
    await first;
  });
});
