/**
 * Source: https://github.com/kaidesalo/spellbranch
 * Path: src/lib/scryfall/client.ts (interface ScryfallCard)
 * Commit: b7ab91509e054f6fdfa94e797e9e6a88b8c38e07
 * PR: https://github.com/kaidesalo/spellbranch/pull/72
 *
 * What changed: kept the fields Milestone 1 displays (name, faces, images,
 * oracle text, type line, mana, legalities, artist, Scryfall link). Prices,
 * finishes, meld parts, and set catalogs stayed in the web app. The view
 * models at the bottom are new: screens render these, not raw JSON, so a
 * layout change doesn't have to know Scryfall's field names.
 */

export interface ScryfallImageUris {
  small?: string;
  normal?: string;
  large?: string;
}

export interface ScryfallFace {
  name?: string;
  mana_cost?: string;
  type_line?: string;
  oracle_text?: string;
  artist?: string;
  image_uris?: ScryfallImageUris;
}

/** The slice of a Scryfall card object this app reads. */
export interface ScryfallCard {
  id?: string;
  name?: string;
  mana_cost?: string;
  type_line?: string;
  oracle_text?: string;
  artist?: string;
  image_uris?: ScryfallImageUris;
  card_faces?: ScryfallFace[];
  scryfall_uri?: string;
  set_name?: string;
  collector_number?: string;
  legalities?: Record<string, string>;
}

/** One row in the search list. */
export interface CardSummary {
  id: string;
  name: string;
  manaCost: string | null;
  typeLine: string;
  /** `small` art, or `normal` when small is missing. Null when Scryfall has neither. */
  imageUri: string | null;
  faceCount: number;
}

/** One physical side of a card, already chosen for the detail screen. */
export interface CardFaceView {
  name: string;
  manaCost: string | null;
  typeLine: string;
  oracleText: string | null;
  imageUri: string | null;
  artist: string | null;
}

export interface LegalityRow {
  /** Scryfall's key, e.g. `modern`. */
  format: string;
  /** Readable label, e.g. `Modern`. */
  label: string;
  /** Scryfall's status, e.g. `not_legal`. */
  status: string;
  statusLabel: string;
}

export interface CardDetail {
  id: string;
  name: string;
  scryfallUri: string | null;
  setName: string | null;
  collectorNumber: string | null;
  faces: CardFaceView[];
  legalities: LegalityRow[];
}

export type SearchOutcome =
  | { status: "no-results"; query: string }
  | { status: "error"; message: string }
  | { status: "ready"; query: string; cards: CardSummary[]; total: number; hasMore: boolean };

export type CardOutcome =
  | { status: "ready"; card: CardDetail }
  | { status: "not-found" }
  | { status: "invalid" }
  | { status: "error"; message: string };
