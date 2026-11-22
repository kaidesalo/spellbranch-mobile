/**
 * Source: https://github.com/kaidesalo/spellbranch
 * Path: src/lib/scryfall/client.ts
 * Commit: b7ab91509e054f6fdfa94e797e9e6a88b8c38e07
 * PR: https://github.com/kaidesalo/spellbranch/pull/72
 *
 * What changed for React Native / Expo:
 * - Removed Next.js `next: { revalidate }`. That field is a Next fetch
 *   extension. This app does not cache responses (see Deferred in the PR).
 * - Removed collection import, set catalog, autocomplete, and printings.
 *   Milestone 1 only searches and opens one card.
 * - The web app caps the body with `res.body.getReader()` so it can cancel
 *   mid-download. React Native's fetch does not reliably expose that stream,
 *   so we cap with Content-Length and the string we already received.
 * - `User-Agent` is set only when the runtime allows it. Browsers strip it.
 * - Requests go through the queue in `throttle.ts` (the web app only paused
 *   between collection batches).
 * - `getCardImage` / mana / oracle helpers became `mapCardSummary` and
 *   `mapCardDetail`, which also understand per-face art on double-faced cards.
 */

import { cardNameMatchKey, printedFaceNames } from "@/shared/names";
import { createRequestQueue, isAbortError, SCRYFALL_MIN_GAP_MS } from "@/shared/throttle";
import type {
  CardDetail,
  CardFaceView,
  CardOutcome,
  CardSummary,
  LegalityRow,
  ScryfallCard,
  ScryfallImageUris,
  SearchOutcome,
} from "@/shared/types";

export const SCRYFALL_SEARCH_URL = "https://api.scryfall.com/cards/search";
export const SCRYFALL_USER_AGENT = "SpellbranchMobile/0.1";
/** Same budget the web app uses for one card lookup. */
export const SCRYFALL_TIMEOUT_MS = 5_000;
/**
 * Same 2 MB cap the web app uses for a search body. A full page of cards
 * is under 1 MB; anything larger is not a card list we should parse.
 */
export const SCRYFALL_MAX_BODY_CHARS = 2_000_000;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const queue = createRequestQueue(SCRYFALL_MIN_GAP_MS);

/** Tests share one queue with the app. Reset it so cases don't leak a timer. */
export function resetScryfallQueueForTests(): void {
  queue.reset();
}

export interface HeaderEnv {
  /** React Native sets `navigator.product` to `"ReactNative"`. */
  reactNative: boolean;
  /** A browser document means the Fetch spec will strip User-Agent. */
  browserDocument: boolean;
}

export function detectHeaderEnv(): HeaderEnv {
  const nav =
    typeof navigator !== "undefined" ? (navigator as { product?: string }) : undefined;
  return {
    reactNative: nav?.product === "ReactNative",
    browserDocument: typeof document !== "undefined",
  };
}

/**
 * Scryfall asks every client to send Accept and a User-Agent that identifies
 * the app. Expo web cannot send User-Agent: the Fetch spec lists it as a
 * forbidden header, and the browser drops it. Native fetch is not a browser,
 * so the header is set there (and in Node tests).
 */
export function scryfallRequestHeaders(env: HeaderEnv = detectHeaderEnv()): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const browserBlocksUserAgent = env.browserDocument && !env.reactNative;
  if (!browserBlocksUserAgent) {
    headers["User-Agent"] = SCRYFALL_USER_AGENT;
  }
  return headers;
}

/**
 * A colon means the person already wrote Scryfall syntax (`t:dragon`).
 * Wrapping that in `name:"..."` would search for the punctuation instead
 * of the filter. Otherwise quote the name first, matching the web client,
 * so "sol ring" ranks the card and not every card that mentions a ring.
 */
export function buildSearchQuery(query: string): string {
  const q = query.trim();
  if (q.includes(":")) return q;
  return `name:"${q}" OR ${q}`;
}

/** `null` when there is nothing to search, so the caller never hits the network. */
export function buildSearchUrl(query: string, page = 1): string | null {
  const q = query.trim();
  if (!q) return null;
  const url = new URL(SCRYFALL_SEARCH_URL);
  url.searchParams.set("q", buildSearchQuery(q));
  url.searchParams.set("page", String(page));
  // `unique=cards` collapses reprints. Milestone 1 is a card browser, not a
  // printings browser, so one Lightning Bolt is enough.
  url.searchParams.set("unique", "cards");
  return url.toString();
}

/**
 * The web app checks ids before they go into a path (`src/lib/data/validation`).
 * Same reason here: the route param is only safe to embed if it is a UUID.
 */
export function isScryfallId(id: string): boolean {
  return UUID_RE.test(id);
}

function clean(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * List rows ask for `small` (about 146px tall). The detail screen asks for
 * `normal`. Falling back the other way still shows art when one size is missing.
 */
function pickUri(uris: ScryfallImageUris | undefined, prefer: "small" | "normal"): string | null {
  if (!uris) return null;
  if (prefer === "small") return uris.small || uris.normal || null;
  return uris.normal || uris.small || null;
}

const FORMAT_LABELS: Record<string, string> = {
  standard: "Standard",
  future: "Future",
  historic: "Historic",
  timeless: "Timeless",
  gladiator: "Gladiator",
  pioneer: "Pioneer",
  explorer: "Explorer",
  modern: "Modern",
  legacy: "Legacy",
  pauper: "Pauper",
  vintage: "Vintage",
  penny: "Penny",
  commander: "Commander",
  oathbreaker: "Oathbreaker",
  standardbrawl: "Standard Brawl",
  brawl: "Brawl",
  alchemy: "Alchemy",
  paupercommander: "Pauper Commander",
  duel: "Duel",
  oldschool: "Old School",
  premodern: "Premodern",
  predh: "PreDH",
};

const STATUS_LABELS: Record<string, string> = {
  legal: "Legal",
  not_legal: "Not legal",
  restricted: "Restricted",
  banned: "Banned",
};

/** Legal first: that is the list a person actually scans. */
const STATUS_ORDER = ["legal", "restricted", "banned", "not_legal"];

const FORMAT_ORDER = [
  "standard",
  "pioneer",
  "modern",
  "legacy",
  "vintage",
  "commander",
  "pauper",
  "alchemy",
  "brawl",
  "standardbrawl",
  "historic",
  "timeless",
  "explorer",
  "oathbreaker",
  "paupercommander",
  "premodern",
  "predh",
  "oldschool",
  "gladiator",
  "penny",
  "duel",
  "future",
];

function titleCase(value: string): string {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function mapLegalities(legalities: Record<string, string> | undefined): LegalityRow[] {
  if (!legalities) return [];
  const rows: LegalityRow[] = [];
  for (const [format, status] of Object.entries(legalities)) {
    if (typeof status !== "string" || !status) continue;
    rows.push({
      format,
      label: FORMAT_LABELS[format] ?? titleCase(format),
      status,
      statusLabel: STATUS_LABELS[status] ?? titleCase(status),
    });
  }
  rows.sort((a, b) => {
    const byStatus = statusRank(a.status) - statusRank(b.status);
    if (byStatus !== 0) return byStatus;
    return formatRank(a.format) - formatRank(b.format) || a.label.localeCompare(b.label);
  });
  return rows;
}

function statusRank(status: string): number {
  const index = STATUS_ORDER.indexOf(status);
  return index === -1 ? STATUS_ORDER.length : index;
}

function formatRank(format: string): number {
  const index = FORMAT_ORDER.indexOf(format);
  return index === -1 ? FORMAT_ORDER.length : index;
}

/**
 * Prefer the parent image (a normal card, or the combined art of a split
 * card). Double-faced cards omit `image_uris` and put art on each face;
 * the list shows the front face only.
 */
export function mapCardSummary(card: ScryfallCard): CardSummary | null {
  const id = card.id?.trim();
  const name = card.name?.trim();
  if (!id || !name) return null;
  const faceCount = card.card_faces?.length ?? 0;
  return {
    id,
    name,
    manaCost: clean(card.mana_cost) ?? clean(card.card_faces?.[0]?.mana_cost),
    typeLine: card.type_line?.trim() || card.card_faces?.[0]?.type_line?.trim() || "",
    imageUri:
      pickUri(card.image_uris, "small") ?? pickUri(card.card_faces?.[0]?.image_uris, "small"),
    faceCount: faceCount > 1 ? faceCount : 1,
  };
}

function mapFaces(card: ScryfallCard): CardFaceView[] {
  const parentImage = pickUri(card.image_uris, "normal");
  const parentArtist = clean(card.artist);
  const rawFaces = (card.card_faces ?? []).filter((face) => clean(face.name) || clean(face.oracle_text));
  if (rawFaces.length === 0) {
    return [
      {
        name: card.name?.trim() || "Unknown card",
        manaCost: clean(card.mana_cost),
        typeLine: card.type_line?.trim() || "",
        oracleText: clean(card.oracle_text),
        imageUri: parentImage,
        artist: parentArtist,
      },
    ];
  }
  return rawFaces.map((face) => ({
    name: face.name?.trim() || card.name?.trim() || "Unknown card",
    manaCost: clean(face.mana_cost),
    typeLine: face.type_line?.trim() || "",
    oracleText: clean(face.oracle_text),
    // Transform cards store art per face. Split cards often store one
    // combined image on the parent and nothing on the faces.
    imageUri: pickUri(face.image_uris, "normal") ?? parentImage,
    artist: clean(face.artist) ?? parentArtist,
  }));
}

export function mapCardDetail(card: ScryfallCard): CardDetail | null {
  const summary = mapCardSummary(card);
  if (!summary) return null;
  return {
    id: summary.id,
    name: summary.name,
    scryfallUri: typeof card.scryfall_uri === "string" ? card.scryfall_uri : null,
    setName: clean(card.set_name),
    collectorNumber: clean(card.collector_number),
    faces: mapFaces(card),
    legalities: mapLegalities(card.legalities),
  };
}

/**
 * Exact and prefix matches come first, and a face name counts. "Ajani,
 * Nacatl Avenger" is not the card's `name` (that is "A // B"); it is the
 * back face. `printedFaceNames` is what makes that query land on the card.
 */
export function rankCards<T extends { name: string }>(cards: readonly T[], query: string): T[] {
  const q = cardNameMatchKey(query);
  const score = (name: string) => {
    if (!q) return 3;
    const keys = [cardNameMatchKey(name), ...printedFaceNames(name).map(cardNameMatchKey)].filter(
      Boolean,
    );
    if (keys.some((key) => key === q)) return 0;
    if (keys.some((key) => key.startsWith(q))) return 1;
    if (keys.some((key) => key.includes(q))) return 2;
    return 3;
  };
  return [...cards].sort((a, b) => {
    const byScore = score(a.name) - score(b.name);
    if (byScore !== 0) return byScore;
    return a.name.localeCompare(b.name);
  });
}

export function mapSearchPayload(payload: unknown, query: string): SearchOutcome {
  const record =
    payload && typeof payload === "object"
      ? (payload as { data?: unknown; total_cards?: unknown; has_more?: unknown })
      : {};
  const rows = Array.isArray(record.data) ? record.data : [];
  const cards: CardSummary[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const summary = mapCardSummary(row as ScryfallCard);
    if (summary) cards.push(summary);
  }
  const ranked = rankCards(cards, query);
  if (ranked.length === 0) return { status: "no-results", query };
  const total = typeof record.total_cards === "number" ? record.total_cards : ranked.length;
  return {
    status: "ready",
    query,
    cards: ranked,
    total,
    hasMore: record.has_more === true,
  };
}

function linkTimeout(parent: AbortSignal | undefined, ms: number): { signal: AbortSignal; cancel: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  const onParentAbort = () => controller.abort();
  if (parent) {
    if (parent.aborted) controller.abort();
    else parent.addEventListener("abort", onParentAbort);
  }
  return {
    signal: controller.signal,
    cancel() {
      clearTimeout(timer);
      parent?.removeEventListener("abort", onParentAbort);
    },
  };
}

async function discard(res: Response): Promise<void> {
  const body = res.body as { cancel?: () => Promise<void> } | null;
  if (body && typeof body.cancel === "function") {
    await body.cancel().catch(() => undefined);
    return;
  }
  await res.text().catch(() => undefined);
}

async function readLimited(res: Response): Promise<string> {
  const declared = Number(res.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > SCRYFALL_MAX_BODY_CHARS) {
    await discard(res);
    throw new Error("too-large");
  }
  const text = await res.text();
  if (text.length > SCRYFALL_MAX_BODY_CHARS) throw new Error("too-large");
  return text;
}

type FetchOk = { ok: true; json: unknown };
type FetchNo = { ok: false; status?: number; error?: "network" | "timeout" | "too-large" | "bad-json" };

async function scryfallFetch(url: string, signal: AbortSignal | undefined): Promise<FetchOk | FetchNo> {
  const timeout = linkTimeout(signal, SCRYFALL_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: scryfallRequestHeaders(),
      signal: timeout.signal,
      // Don't follow a redirect off api.scryfall.com, and don't send cookies.
      redirect: "error",
      credentials: "omit",
    });
    if (res.status === 404) {
      await discard(res);
      return { ok: false, status: 404 };
    }
    if (!res.ok) {
      await discard(res);
      return { ok: false, status: res.status };
    }
    let text: string;
    try {
      text = await readLimited(res);
    } catch (error) {
      if (error instanceof Error && error.message === "too-large") return { ok: false, error: "too-large" };
      return { ok: false, error: "bad-json" };
    }
    try {
      return { ok: true, json: JSON.parse(text) as unknown };
    } catch {
      return { ok: false, error: "bad-json" };
    }
  } catch (error) {
    // The caller's AbortController means "ignore this result". A timeout
    // aborts the same way but the parent signal is still active, so the
    // person should see an error instead of a silent cancel.
    if (isAbortError(error)) {
      if (signal?.aborted) throw error;
      return { ok: false, error: "timeout" };
    }
    return { ok: false, error: "network" };
  } finally {
    timeout.cancel();
  }
}

function messageFor(failure: FetchNo): string {
  if (failure.status === 429) return "Scryfall asked us to slow down. Wait a moment and try again.";
  if (failure.error === "timeout") return "Scryfall took too long to answer. Try again.";
  if (failure.error === "too-large" || failure.error === "bad-json") {
    return "Scryfall sent an unexpected answer. Try again in a moment.";
  }
  if (failure.error === "network") return "Could not reach Scryfall.";
  // Scryfall's `details` string stays off the screen. It is written for
  // their API and can change; the UI needs a stable sentence.
  return "Scryfall search failed.";
}

export async function searchCards(
  query: string,
  opts: { signal?: AbortSignal } = {},
): Promise<SearchOutcome> {
  const url = buildSearchUrl(query);
  if (!url) return { status: "no-results", query: query.trim() };
  try {
    const result = await queue.enqueue(() => scryfallFetch(url, opts.signal), opts.signal);
    if (!result.ok) {
      if (result.status === 404) return { status: "no-results", query: query.trim() };
      return { status: "error", message: messageFor(result) };
    }
    return mapSearchPayload(result.json, query.trim());
  } catch (error) {
    if (isAbortError(error)) throw error;
    return { status: "error", message: "Could not reach Scryfall." };
  }
}

export async function fetchCard(id: string, opts: { signal?: AbortSignal } = {}): Promise<CardOutcome> {
  const trimmed = id.trim();
  if (!isScryfallId(trimmed)) return { status: "invalid" };
  const url = `https://api.scryfall.com/cards/${encodeURIComponent(trimmed)}`;
  try {
    const result = await queue.enqueue(() => scryfallFetch(url, opts.signal), opts.signal);
    if (!result.ok) {
      if (result.status === 404) return { status: "not-found" };
      return { status: "error", message: messageFor(result) };
    }
    if (!result.json || typeof result.json !== "object") {
      return { status: "error", message: "Scryfall sent an unexpected answer. Try again in a moment." };
    }
    const card = mapCardDetail(result.json as ScryfallCard);
    if (!card) {
      return { status: "error", message: "Scryfall sent an unexpected answer. Try again in a moment." };
    }
    return { status: "ready", card };
  } catch (error) {
    if (isAbortError(error)) throw error;
    return { status: "error", message: "Could not reach Scryfall." };
  }
}
