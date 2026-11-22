import {
  cardLookupKey,
  cardNameMatchKey,
  collectionLookupNames,
  canonicalizePrintedName,
  printedFaceNames,
} from "@/shared/names";

describe("printed face names", () => {
  it("splits every separator a decklist actually uses", () => {
    expect(printedFaceNames("Fire // Ice")).toEqual(["Fire", "Ice"]);
    expect(printedFaceNames("Fire / Ice")).toEqual(["Fire", "Ice"]);
    expect(printedFaceNames("Fire//Ice")).toEqual(["Fire", "Ice"]);
    expect(printedFaceNames("Fire/Ice")).toEqual(["Fire", "Ice"]);
  });

  it("treats a front-face-only line as one card, not a split", () => {
    expect(printedFaceNames("Ajani, Nacatl Pariah")).toEqual([]);
    expect(printedFaceNames("Sol Ring")).toEqual([]);
    expect(collectionLookupNames("Ajani, Nacatl Pariah")).toEqual(["Ajani, Nacatl Pariah"]);
  });

  it("keeps a five-face split and rejects a sixth part", () => {
    expect(printedFaceNames("Who // What // When // Where // Why")).toEqual([
      "Who",
      "What",
      "When",
      "Where",
      "Why",
    ]);
    expect(printedFaceNames("a/b/c/d/e/f")).toEqual([]);
  });

  it("still returns the whole printed line when a single-faced name contains a slash", () => {
    expect(collectionLookupNames("SP//dr, Piloted by Peni")[0]).toBe("SP // dr, Piloted by Peni");
    expect(collectionLookupNames("SP//dr, Piloted by Peni")).toContain("SP");
  });
});

describe("name match keys", () => {
  it("folds the four multi-face spellings onto one key", () => {
    const full = cardNameMatchKey("Ajani, Nacatl Pariah // Ajani, Nacatl Avenger");
    expect(cardNameMatchKey("Ajani, Nacatl Pariah / Ajani, Nacatl Avenger")).toBe(full);
    expect(cardNameMatchKey("Ajani, Nacatl Pariah//Ajani, Nacatl Avenger")).toBe(full);
    expect(cardNameMatchKey("Ajani, Nacatl Pariah/Ajani, Nacatl Avenger")).toBe(full);
  });

  it("folds case, spaces, and punctuation the way a single-faced lookup does", () => {
    expect(cardNameMatchKey("Lim-Dûl's Vault")).toBe(cardNameMatchKey("lim duls vault"));
    expect(cardNameMatchKey("Séance")).toBe(cardNameMatchKey("Seance"));
    expect(cardNameMatchKey("Rin & Seri")).not.toBe(cardNameMatchKey("Rin and Seri"));
  });

  it("canonicalizes a curly apostrophe and a cramped double slash", () => {
    expect(canonicalizePrintedName("Lim-D\u00fbl\u2019s Vault")).toBe("Lim-D\u00fbl's Vault");
    expect(canonicalizePrintedName("  Fire//Ice  ")).toBe("Fire // Ice");
    expect(cardLookupKey("  FIRE // ICE ")).toBe("fire // ice");
  });

  it("asks for the printed line and each face", () => {
    expect(collectionLookupNames("Fire // Ice")).toEqual(["Fire // Ice", "Fire", "Ice"]);
    // A single slash is a face separator, but canonicalize only inserts spaces around `//`.
    expect(collectionLookupNames("Fire/Ice")).toEqual(["Fire/Ice", "Fire", "Ice"]);
    expect(collectionLookupNames("   ")).toEqual([]);
  });
});
