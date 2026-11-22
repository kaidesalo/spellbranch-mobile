beforeEach(() => {
  globalThis.fetch = jest.fn(async () => {
    throw new Error("Unit tests must not call the network. Mock fetch in the test.");
  }) as unknown as typeof fetch;
});

afterEach(() => {
  jest.useRealTimers();
});
