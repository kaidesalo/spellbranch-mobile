# `src/shared`

This folder is the slice of [spellbranch](https://github.com/kaidesalo/spellbranch) that the mobile app needs for Milestone 1. It is staged here so it can move into a monorepo package later (for example `packages/scryfall`) without dragging React Native along with it.

## Rules for this folder

- No React, no React Native, no Expo imports. Screens live in `src/app` and `src/components`. A future package should run in the Next.js app and in this one.
- No Node-only APIs (`fs`, `process`, Next.js `next: { revalidate }` on `fetch`).
- Each copied file starts with a comment: source repo, path, commit, pull request, and what changed for mobile.
- Do not put secrets here. The only network host is `https://api.scryfall.com`.

## What was copied

| File | Upstream | Why it is here |
| --- | --- | --- |
| `names.ts` | `src/lib/decklist/names.ts` at `b7ab915` ([PR #72](https://github.com/kaidesalo/spellbranch/pull/72)) | Folds `A // B`, `A / B`, `A//B`, `A/B`, and a front-face-only name the same way deck import does. Search ranking uses it so a back-face query finds the double-faced card. |
| `types.ts` | `ScryfallCard` in `src/lib/scryfall/client.ts` | Only the fields Milestone 1 displays, plus the view models the screens render. |
| `scryfall.ts` | `src/lib/scryfall/client.ts` | Search URL building, one-card fetch, and the image / mana / oracle reads. Collection import, set catalogs, and printings were left upstream. |
| `throttle.ts` | The 100ms pause between collection batches in that same client | Every request waits, not only import batches, because a search box can fire much more often. |

`debounce.ts` is new. The website searches on submit; the phone searches as you type.

## What was not copied

Deck import (`src/lib/decklist/build.ts`, `parse.ts`) stays in the web app. Milestone 1 does not paste decklists, so the "made-up back face is not the front card" matcher was not brought over. `collectionLookupNames` is still here, unchanged, so the name rules do not fork before the package move.
