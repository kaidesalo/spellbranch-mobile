import multiFaceJson from "@/shared/__fixtures__/multi-face.json";
import singleFaceJson from "@/shared/__fixtures__/single-face.json";
import {
  buildSearchQuery,
  buildSearchUrl,
  detectHeaderEnv,
  fetchCard,
  mapCardDetail,
  mapCardSummary,
  mapSearchPayload,
  resetScryfallQueueForTests,
  SCRYFALL_USER_AGENT,
  scryfallRequestHeaders,
  searchCards,
} from "@/shared/scryfall";
import { SCRYFALL_MIN_GAP_MS } from "@/shared/throttle";
import type { ScryfallCard } from "@/shared/types";

const bolt = singleFaceJson as ScryfallCard;
const ajani = multiFaceJson as ScryfallCard;

function jsonResponse(status: number, body: unknown, extraHeaders: Record<string, string> = {}) {
  const text = JSON.stringify(body);
  const headers = new Map<string, string>(
    Object.entries({ "content-length": String(text.length), ...extraHeaders }).map(([key, value]) => [
      key.toLowerCase(),
      value,
    ]),
  );
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (name: string) => headers.get(name.toLowerCase()) ?? null },
    body: null,
    text: async () => text,
  };
}

describe("search URL", () => {
  it("quotes a plain name and leaves Scryfall syntax alone", () => {
    expect(buildSearchQuery("ajani")).toBe('name:"ajani" OR ajani');
    expect(buildSearchQuery("  sol ring  ")).toBe('name:"sol ring" OR sol ring');
    expect(buildSearchQuery("t:legendary")).toBe("t:legendary");
  });

  it("builds a cards/search URL on api.scryfall.com", () => {
    expect(buildSearchUrl("   ")).toBeNull();
    const url = new URL(buildSearchUrl("ajani", 2)!);
    expect(url.origin).toBe("https://api.scryfall.com");
    expect(url.pathname).toBe("/cards/search");
    expect(url.searchParams.get("q")).toBe('name:"ajani" OR ajani');
    expect(url.searchParams.get("unique")).toBe("cards");
    expect(url.searchParams.get("page")).toBe("2");
  });
});

describe("response mapping", () => {
  it("maps a single-faced card from image_uris", () => {
    const summary = mapCardSummary(bolt);
    const detail = mapCardDetail(bolt);
    expect(summary).toMatchObject({
      id: bolt.id,
      name: "Lightning Bolt",
      manaCost: "{R}",
      imageUri: "https://example.test/cards/bolt-small.jpg",
      faceCount: 1,
    });
    expect(detail?.faces).toHaveLength(1);
    expect(detail?.faces[0]).toMatchObject({
      name: "Lightning Bolt",
      oracleText: "Lightning Bolt deals 3 damage to any target.",
      imageUri: "https://example.test/cards/bolt-normal.jpg",
      artist: "Christopher Rush",
    });
    expect(detail?.legalities.map((row) => [row.label, row.statusLabel])).toEqual([
      ["Modern", "Legal"],
      ["Commander", "Legal"],
      ["Vintage", "Restricted"],
      ["Pauper", "Banned"],
      ["Standard", "Not legal"],
    ]);
  });

  it("maps a double-faced card from card_faces, front image in the list", () => {
    const summary = mapCardSummary(ajani);
    const detail = mapCardDetail(ajani);
    expect(summary).toMatchObject({
      name: "Ajani, Nacatl Pariah // Ajani, Nacatl Avenger",
      manaCost: "{1}{W}",
      imageUri: "https://example.test/cards/ajani-front-small.jpg",
      faceCount: 2,
    });
    expect(summary?.imageUri).not.toContain("back");
    expect(detail?.faces.map((face) => face.name)).toEqual([
      "Ajani, Nacatl Pariah",
      "Ajani, Nacatl Avenger",
    ]);
    expect(detail?.faces[0]?.imageUri).toBe("https://example.test/cards/ajani-front-normal.jpg");
    expect(detail?.faces[1]).toMatchObject({
      name: "Ajani, Nacatl Avenger",
      manaCost: null,
      oracleText: "+2: Put a +1/+1 counter on each Cat you control.",
      imageUri: "https://example.test/cards/ajani-back-normal.jpg",
      artist: "Chris Rallis",
    });
  });

  it("falls back to the parent image when a face has no art of its own", () => {
    const split: ScryfallCard = {
      id: "00000000-0000-4000-8000-000000000099",
      name: "Fire // Ice",
      image_uris: { small: "https://example.test/cards/fire-small.jpg", normal: "https://example.test/cards/fire-normal.jpg" },
      card_faces: [
        { name: "Fire", mana_cost: "{1}{R}", type_line: "Instant", oracle_text: "Fire deals 2 damage." },
        { name: "Ice", mana_cost: "{1}{U}", type_line: "Instant", oracle_text: "Tap target permanent." },
      ],
    };
    const detail = mapCardDetail(split);
    expect(detail?.faces.every((face) => face.imageUri === "https://example.test/cards/fire-normal.jpg")).toBe(true);
    expect(mapCardSummary(split)?.imageUri).toBe("https://example.test/cards/fire-small.jpg");
  });

  it("ranks a back-face query onto the double-faced card", () => {
    const payload = {
      total_cards: 2,
      has_more: false,
      data: [
        { id: "00000000-0000-4000-8000-000000000010", name: "Ajani Goldmane", type_line: "Planeswalker — Ajani", mana_cost: "{2}{W}{W}" },
        ajani,
      ],
    };
    const result = mapSearchPayload(payload, "Ajani, Nacatl Avenger");
    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;
    expect(result.cards[0]?.name).toBe(ajani.name);
  });
});

describe("searchCards", () => {
  beforeEach(() => {
    resetScryfallQueueForTests();
    jest.useFakeTimers({ now: 0 });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("sends Accept, and User-Agent only when the runtime allows it", async () => {
    const fetchMock = jest.fn(async (_url: string, _init?: RequestInit) => jsonResponse(404, { object: "error" }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const pending = searchCards("no-such-card");
    await jest.advanceTimersByTimeAsync(0);
    await pending;

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, { headers: Record<string, string>; redirect: string }];
    expect(new URL(url).searchParams.get("q")).toBe('name:"no-such-card" OR no-such-card');
    expect(init.headers.Accept).toBe("application/json");
    expect(init.redirect).toBe("error");
    const env = detectHeaderEnv();
    if (env.browserDocument && !env.reactNative) {
      expect(init.headers["User-Agent"]).toBeUndefined();
    } else {
      expect(init.headers["User-Agent"]).toBe(SCRYFALL_USER_AGENT);
    }
  });

  it("describes the header rule for web and native without calling fetch", () => {
    expect(scryfallRequestHeaders({ reactNative: false, browserDocument: true })["User-Agent"]).toBeUndefined();
    expect(scryfallRequestHeaders({ reactNative: true, browserDocument: false })["User-Agent"]).toBe(
      SCRYFALL_USER_AGENT,
    );
    expect(scryfallRequestHeaders({ reactNative: false, browserDocument: false }).Accept).toBe("application/json");
  });

  it("turns a Scryfall 404 into no-results, not an error", async () => {
    globalThis.fetch = jest.fn(async () => jsonResponse(404, { object: "error", details: "No cards found" })) as unknown as typeof fetch;
    const pending = searchCards("zzzznotacard");
    await jest.advanceTimersByTimeAsync(0);
    await expect(pending).resolves.toEqual({ status: "no-results", query: "zzzznotacard" });
  });

  it("maps a page that mixes a single-faced card and a double-faced card", async () => {
    globalThis.fetch = jest.fn(async () =>
      jsonResponse(200, { object: "list", total_cards: 2, has_more: false, data: [bolt, ajani] }),
    ) as unknown as typeof fetch;
    const pending = searchCards("ajani");
    await jest.advanceTimersByTimeAsync(0);
    const result = await pending;
    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;
    expect(result.cards.map((card) => card.name)).toEqual([
      "Ajani, Nacatl Pariah // Ajani, Nacatl Avenger",
      "Lightning Bolt",
    ]);
    expect(result.cards[0]?.imageUri).toContain("ajani-front-small");
    expect(result.cards[1]?.faceCount).toBe(1);
  });

  it("reports a rate limit and a network failure without throwing", async () => {
    globalThis.fetch = jest.fn(async () => jsonResponse(429, { object: "error" })) as unknown as typeof fetch;
    const limited = searchCards("bolt");
    await jest.advanceTimersByTimeAsync(0);
    await expect(limited).resolves.toMatchObject({
      status: "error",
      message: "Scryfall asked us to slow down. Wait a moment and try again.",
    });

    resetScryfallQueueForTests();
    globalThis.fetch = jest.fn(async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    const offline = searchCards("bolt");
    await jest.advanceTimersByTimeAsync(0);
    await expect(offline).resolves.toMatchObject({ status: "error", message: "Could not reach Scryfall." });
  });

  it("spaces two searches by the queue gap", async () => {
    const starts: number[] = [];
    globalThis.fetch = jest.fn(async () => {
      starts.push(Date.now());
      return jsonResponse(200, { object: "list", total_cards: 0, data: [] });
    }) as unknown as typeof fetch;

    const first = searchCards("bolt");
    const second = searchCards("shock");
    await jest.advanceTimersByTimeAsync(0);
    expect(starts).toEqual([0]);
    await jest.advanceTimersByTimeAsync(SCRYFALL_MIN_GAP_MS - 1);
    expect(starts).toEqual([0]);
    await jest.advanceTimersByTimeAsync(1);
    expect(starts).toEqual([0, SCRYFALL_MIN_GAP_MS]);
    await Promise.all([first, second]);
  });

  it("does not send a search that was cancelled while waiting for the gap", async () => {
    const fetchMock = jest.fn(async () => jsonResponse(200, { object: "list", total_cards: 0, data: [] }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const first = searchCards("bolt");
    const controller = new AbortController();
    const second = searchCards("shock", { signal: controller.signal });

    await jest.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const cancelled = second.then(
      () => {
        throw new Error("cancelled search should reject");
      },
      (error: unknown) => error,
    );
    controller.abort();
    await jest.advanceTimersByTimeAsync(SCRYFALL_MIN_GAP_MS);
    await expect(cancelled).resolves.toMatchObject({ name: "AbortError" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await first;
  });

  it("refuses a card id that is not a UUID and maps a real one", async () => {
    const fetchMock = jest.fn(async (_url: string) => jsonResponse(200, ajani));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await expect(fetchCard("../not-an-id")).resolves.toEqual({ status: "invalid" });
    expect(fetchMock).not.toHaveBeenCalled();

    const pending = fetchCard(ajani.id!);
    await jest.advanceTimersByTimeAsync(0);
    const result = await pending;
    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;
    expect(result.card.faces[1]?.name).toBe("Ajani, Nacatl Avenger");
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(`https://api.scryfall.com/cards/${ajani.id}`);
  });
});
