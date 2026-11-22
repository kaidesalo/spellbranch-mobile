# Milestone 1 walkthrough

Spellbranch Mobile is a small Expo app whose job is to make one network conversation understandable: type a name, wait a beat, ask Scryfall once, show the rows, open a card, flip a second face.

The code is split so the part that knows Scryfall (`src/shared`) has no React Native imports. That is the folder that can move into a shared package later. Screens in `src/app` are routes. Everything else is UI.

Expo SDK 58. TypeScript `strict`. Routing is file-based (Expo Router).

## Dependencies

The template that `create-expo-app` generates pulls in a demo (animated splash, glass, symbols). Those were removed. What is left is what Milestone 1 uses.

| Package | What It Does | Why It Matters |
| --- | --- | --- |
| `expo` | SDK, dev server, Expo Go | This is the class toolchain. `npx expo start` is the app. |
| `expo-router` | File-based routes | `src/app/card/[id].tsx` is the URL `/card/<id>`. No route table to keep in sync. |
| `expo-constants` | Reads `app.json` at runtime | Peer of Expo Router. The client needs the scheme and the app name. |
| `expo-linking` | Turns URLs into navigations | Peer of Expo Router. Opening a card is a URL, including on web. |
| `expo-splash-screen` | Native splash, configured in `app.json` | Holds a plain green splash until the first screen paints. The art is a placeholder branch, not a Wizards mark. |
| `expo-status-bar` | Status bar color | Light text on the dark header. |
| `expo-image` | Card images | Decodes and caches off the JS thread. A search page can show dozens of `small` images; React Native's `Image` would work, but lists are the case `expo-image` is for. This is the one UI dependency that is not required by the router. |
| `react`, `react-native` | UI | Components and `StyleSheet`. |
| `react-dom`, `react-native-web` | Web target | Pressing `w` in the Expo terminal. Optional peers, required if you want the browser. |
| `react-native-screens` | Native screen containers | The stack navigator renders real screens, not plain views. |
| `react-native-safe-area-context` | Notch and home-indicator insets | The disclaimer footer pads itself so it is not hidden by the home indicator. |
| `react-native-gesture-handler` | Swipe from the edge to go back | Optional peer. Without it the stack still navigates; the iOS back gesture is the reason it is installed. |
| `typescript` | `npm run typecheck` | `tsc --noEmit` with `strict`. |
| `jest`, `jest-expo` | `npm test` | Unit tests run in an Expo-aware Jest preset. Fixtures, no network. |
| `eslint`, `eslint-config-expo` | `npm run lint` | The config Expo documents for SDK 58 (flat config). |

Removed from the template, because nothing in Milestone 1 imports them: `@expo/ui`, `expo-device`, `expo-font`, `expo-glass-effect`, `expo-symbols`, `expo-system-ui`, `expo-web-browser`, `react-native-reanimated`, `react-native-worklets`. Reanimated was only there for the template's animated splash.

The React Compiler experiment is off. The template turns it on. Leaving it off means the effects you read are the effects that run, which is the model the rest of this walkthrough uses.

## 1. Expo Router layout and routes

**Concept.** Expo Router treats `src/app` as the URL tree. `src/app/index.tsx` is `/`. `src/app/about.tsx` is `/about`. `src/app/card/[id].tsx` is `/card/<id>`, and the brackets are the param. `src/app/_layout.tsx` wraps every screen in one stack. `src/shared` sits next to `src/app`, not inside it, so the client is not turned into a route. A file whose name starts with `+`, like `+not-found.tsx`, is a router convention rather than a path segment.

`src/app/_layout.tsx` imports `react-native-gesture-handler` on the first line. The native stack installs its swipe-back gesture at import time, and that has to happen before any screen module loads.

| Code | What It Does | Why It Matters |
| --- | --- | --- |
| `import "react-native-gesture-handler"` at the top of `_layout.tsx` | Loads the gesture runtime before the stack. | If this import is lower, the back swipe can miss the first screen. |
| `<Stack>` with `headerStyle` / `contentStyle` | One navigator, dark header, parchment body. | Every screen inherits it. A screen can override the title. |
| `<Stack.Screen name="card/[id]" />` | Names the dynamic route. | The `name` matches the file path. Expo Router does not use a separate registry. |
| `<StatusBar style="light" />` | Light status-bar icons. | The header is dark green. Dark icons would disappear. |
| `useLocalSearchParams` in `card/[id].tsx` | Reads the `id` segment. | The id is a string from the URL. It is not trusted until `isScryfallId` checks it is a UUID. |
| `<Link href={{ pathname: "/card/[id]", params: { id } }}>` | Navigates to that card. | On web this is a real link. The path is the route file, not a hand-built string. |
| `src/app/+not-found.tsx` | Renders for any other path. | A bad URL tells you to go back to search instead of a blank screen. |

## 2. The debounced fetch hook

**Concept.** A search box has no submit button. If every keystroke called Scryfall, "ajani" would be five requests, and a slow answer for "aj" could arrive after "ajani" and replace the right list. Two mechanisms stack:

1. **Debounce** waits 350ms after the last keystroke (`SEARCH_DEBOUNCE_MS`). That is inside the 300–400ms range: long enough to collapse a word, short enough that the list does not feel stuck.
2. **AbortController** cancels the previous request when the debounced query changes, including when the box is cleared.

`createDebounced` lives in `src/shared/debounce.ts` so the test can advance fake timers without rendering. `useDebouncedValue` is the React wrapper: the effect cleanup calls `cancel()`, which is the same "latest call wins" rule.

Clearing the field is special. `useCardSearch` treats an empty box as idle immediately, instead of waiting out the debounce, and the effect cleanup aborts whatever was in flight.

Loading is not stored. The effect only writes a result after the network returns. If the stored result's query is not the query on screen, the UI is loading. That avoids calling `setState` in the same turn the effect starts (the lint rule `react-hooks/set-state-in-effect` flags that pattern).

| Code | What It Does | Why It Matters |
| --- | --- | --- |
| `SEARCH_DEBOUNCE_MS = 350` | The quiet period. | One request per name, not per letter. The test asserts it stays between 300 and 400. |
| `createDebounced` clears the previous `setTimeout` | A new call replaces the pending one. | Typing "ajani" without a pause fires once. |
| `wrapped.cancel` | Drops the pending timer. | The hook's effect cleanup is this function. Unmount and the next keystroke both cancel. |
| `useDebouncedValue` returns `value` on the first render | No delay before the empty hint. | An empty box should not sit on a spinner for 350ms. |
| `query = trimmedRaw === "" ? "" : debounced.trim()` | Empty input skips the debounce. | Backspace-to-clear hides results now, and aborts the request. |
| `new AbortController()` inside the effect | One signal per search. | Cleanup calls `abort()`. A stale response is ignored. |
| `if (!active) return` before `setStored` | Drops a response after cleanup. | Abort rejects, but a response that already resolved must not paint over the next query. |
| `stored.query !== query` means loading | Derives the spinner. | The previous list belongs to a different string. Showing it would be a lie. |
| `pending` when the raw text differs from the debounced text | The box has changed and the timer has not fired. | The empty state can say "Waiting a moment…" so the pause is visible. |

## 3. The Scryfall client, the throttle, and name folding

**Concept.** `src/shared/scryfall.ts` is the web app's `src/lib/scryfall/client.ts`, cut down to search and "get one card", then adapted for Hermes and the browser. The header comment on the file lists the cuts. The important ones:

- Next.js `next: { revalidate }` is gone. That field is a Next fetch extension. This app does not cache.
- The body cap uses `Content-Length` and `res.text()`. The web app reads `res.body.getReader()` so it can cancel mid-download. React Native's fetch does not reliably expose that stream.
- Collection import, set catalogs, and printings stayed in the web app. Milestone 1 does not paste decklists.

Scryfall's rate-limit note asks for 50–100ms between requests. The web client only paused between collection batches (`SCRYFALL_COLLECTION_GAP_MS`, 100ms). A search box is chattier, so `src/shared/throttle.ts` puts that same 100ms gap in front of every request, including "search, then open a card". The queue is serial: the next request does not start until the previous one has started and the gap has elapsed. `setTimeout` is the wait, on purpose, so tests drive it with fake timers.

`src/shared/names.ts` is copied from PR [#72](https://github.com/kaidesalo/spellbranch/pull/72) (`b7ab915`, branch `cursor/fix-multiface-import-31d5`). It was not rewritten. Search ranking uses `printedFaceNames` and `cardNameMatchKey` so the query "Ajani, Nacatl Avenger" ranks the card whose printed `name` is "Ajani, Nacatl Pariah // Ajani, Nacatl Avenger". The back face is not the `name` field. It is `card_faces[1].name`.

| Code | What It Does | Why It Matters |
| --- | --- | --- |
| `buildSearchQuery` | Quotes a plain name as `name:"ajani" OR ajani`. Leaves `t:dragon` alone. | A colon means the person already wrote Scryfall syntax. Wrapping it in `name:"..."` would search for the punctuation. The quote-first form matches the web client, so "sol ring" prefers the card. |
| `buildSearchUrl` | Builds `https://api.scryfall.com/cards/search` with `unique=cards`. Returns null for a blank query. | `unique=cards` collapses reprints. This is a card browser, not a printings list. Null means the caller never hits the network. |
| `scryfallRequestHeaders` | Always sends `Accept: application/json`. Adds `User-Agent: SpellbranchMobile/0.1` unless the runtime is a browser document. | Scryfall asks clients to identify themselves. The Fetch spec forbids JavaScript from setting `User-Agent` in a browser, so Expo web would silently drop it. React Native's fetch is not a browser, so the header is set there. |
| `isScryfallId` | UUID check before `GET /cards/:id`. | The route param is user-controlled. Only a UUID is encoded into the path. `../` never becomes a different URL. |
| `SCRYFALL_MIN_GAP_MS = 100` and `createRequestQueue` | Serial queue, 100ms between starts. | The top of Scryfall's 50–100ms guidance. A failed request does not wedge the tail: the queue's `tail` promise ignores rejection. |
| `pause` rejects when the signal aborts | A cancelled search does not fire when its turn arrives. | Otherwise abort would only skip painting, and the request would still count against the rate limit. |
| `redirect: "error"`, `credentials: "omit"` | Do not follow a redirect, do not send cookies. | Same sandbox as the web client. The URL we asked for is the only host. |
| `res.status === 404` on search | Returns `{ status: "no-results" }`. | Scryfall uses 404 for "no cards matched". That is an empty list, not a broken network. |
| `messageFor` | Fixed sentences for 429, timeout, network, bad JSON. | Scryfall's `details` string is for their API and can change. The screen needs a stable sentence. |
| `mapCardSummary` image order | Parent `image_uris.small`, else `card_faces[0]`. | A normal card has art on the parent. A double-faced card omits parent art and puts it on each face. The list shows the front only, at `small` size. |
| `mapFaces` | One view per face, `normal` art, parent image as fallback. | Transform cards have per-face art. Split cards often have one combined image on the parent and none on the faces. |
| `rankCards` + `printedFaceNames` | Exact, then prefix, then contains. A face name counts. | "Ajani, Nacatl Avenger" is an exact face match even though the card `name` is the `//` form. |
| `printedFaceNames` | Splits `A // B`, `A / B`, `A//B`, and `A/B`. Empty when there is no slash. At most five parts. | Front-face-only ("Ajani, Nacatl Pariah") is one name, not a broken split. Five is the longest Scryfall split. |
| `cardNameMatchKey` | Strips case, accents, and punctuation. | "Lim-Dûl's Vault" and "lim duls vault" share a key. "Rin & Seri" does not fold into "Rin and Seri", matching Scryfall's collection rules. |
| `collectionLookupNames` | Printed line, then each face. | Kept unchanged from PR 72 so the algorithm does not fork. Milestone 1 search does not call the collection endpoint. |

## 4. List rendering

**Concept.** `FlatList` virtualizes. Scryfall returns up to 175 cards on a page. Mapping them into a `ScrollView` would mount 175 images at once. `keyExtractor` returns the Scryfall id. An index key would reuse a row's image for a different card when the list changes.

The row is a `Link` with `asChild` around a `Pressable`. `Link` defaults to a `Text` wrapper. A `View` (the art, the mana pips) inside `Text` is invalid on native, so the pressable has to be the row itself.

Art is 56 by 78 points. That is the 63:88 card ratio, close to Scryfall's `small` (about 146px tall), and it does not crowd out the name. `expo-image` uses `contentFit="cover"`.

Mana is parsed from `{1}{W}` into circles. The colors are the familiar ones for each letter so the cost is readable. They are plain circles, not Wizards' mana font.

The four list states are the `CardSearchState` union: idle, loading, `no-results` (the 404), `error`, and `ready`.

The footer stays outside the list, so the short Fan Content notice and the Scryfall credit stay on screen while the rows scroll. The full sentence is on About.

| Code | What It Does | Why It Matters |
| --- | --- | --- |
| `<FlatList data={state.status === "ready" ? state.cards : []} />` | Rows only when a search succeeded. | Loading, idle, 404, and error all render through `ListEmptyComponent`, so they are not a fake row. |
| `keyExtractor` returns `card.id` | Stable identity. | Recycled rows keep the right art and the right link. |
| `renderItem` wrapped in `useCallback` | Same function between renders. | FlatList can skip work when the parent re-renders on each keystroke. |
| `keyboardShouldPersistTaps="handled"` | A tap on a row works while the keyboard is open. | Otherwise the first tap only dismisses the keyboard. |
| `CardRow` width 56, height 78 | Front `small` image. | `normal` is several times larger. The list does not need print-quality art. |
| `autoCapitalize="none"` and `autoCorrect={false}` | Leaves the query alone. | `t:dragon` and card names should not be rewritten by the keyboard. |
| `Showing N of total` when `has_more` | Says the page is not the whole catalog. | Pagination is deferred. The count is how you can tell. |
| `DisclaimerFooter` plus `useSafeAreaInsets` | Short policy text, pinned under the list. | The notice has to be visible on the search screen, including above the home indicator. |

## 5. Detail and the face toggle

**Concept.** `GET https://api.scryfall.com/cards/:id` returns one object. A double-faced card is still one object. The faces are `card_faces`. Flipping does not fetch again. The toggle is local state.

`CardDetailScreen` renders `CardBody` with `key={id}`. Changing cards remounts the body, so the toggle starts on the front. Remembering "back" from the previous card would show the wrong face.

Two faces are labeled Front and Back. That matches transform and modal cards (Ajani, Nacatl Pariah / Ajani, Nacatl Avenger). A split with more than two faces uses the face names, because "back" would not say which part you are on.

Legalities are on the card, not the face. Scryfall sends one map. The toggle does not change them. They are grouped Legal, then Restricted, Banned, and Not legal, with readable labels (`not_legal` becomes "Not legal", `modern` becomes "Modern").

Under the image: `Illustrated by {artist}`. The artist is the face's `artist`, falling back to the parent. The Scryfall page is `scryfall_uri`, opened with `Linking.openURL`.

| Code | What It Does | Why It Matters |
| --- | --- | --- |
| `key={id}` on `CardBody` | Remounts when the route param changes. | Face index is `useState(0)` again. No effect needed to reset it. |
| `useCardDetail` stores `{ id, attempt, outcome }` | The fetch writes the outcome. Loading means the store is for a different id or retry. | Same derived-loading idea as search. Retry bumps `attempt`, which re-runs the effect. |
| `fetchCard` through the same queue | Detail waits out the gap after a search. | Opening a card is another Scryfall request. It should not ignore the 100ms rule. |
| `FaceToggle` returns null when `faces.length < 2` | No control on a normal card. | Lightning Bolt has nothing to flip. Ajani does. |
| Front / Back labels when there are two faces | Sets `faceIndex`. | The header title is `face.name`, so the back screenshot reads "Ajani, Nacatl Avenger". |
| `face.imageUri` prefers that face's `normal` | Per-face art for transform cards. | The back of Ajani is a different picture, not a crop of the front. |
| Parent image fallback | Used when a face has no `image_uris`. | Split cards often store one combined image. The toggle still changes the name and the oracle text. |
| `Illustrated by {artist}` | Credit under the image. | Required attribution. Omitted when Scryfall sent no artist, rather than "Illustrated by null". |
| `mapLegalities` sort | Legal formats first, then the known format order. | A readable list leads with where you can play the card. Unknown keys are title-cased so a new format does not crash. |
| `Linking.openURL(scryfallUri)` | "View on Scryfall". | The app does not re-host the card page. The link is the one Scryfall returned. |

## Tests

`npm test` runs Jest with the `jest-expo` preset. `jest.setup.ts` replaces `fetch` with a function that throws, so a test that forgets to mock the network fails instead of calling Scryfall.

| File | What it locks |
| --- | --- |
| `src/shared/names.test.ts` | `A // B`, `A / B`, `A//B`, `A/B`, front-face-only, the five-face split, punctuation folding. |
| `src/shared/debounce.test.ts` | 350ms is inside 300–400. A second call resets the timer. `cancel` drops the pending call. Fake timers. |
| `src/shared/throttle.test.ts` | The gap is inside 50–100ms. The second task starts only after the gap. An abort during the wait does not run the task. Fake timers, clock pinned at 0. |
| `src/shared/scryfall.test.ts` | URL building, header rule (browser vs native), 404 vs 429 vs network, single-face and multi-face fixtures, back-face ranking, the queue between two searches, UUID refusal. |

Fixtures are `src/shared/__fixtures__/single-face.json` (Lightning Bolt shape) and `multi-face.json` (Ajani, with art only on `card_faces`). Image hosts in the fixtures are `example.test`, not Scryfall.

## What this milestone does not do

Pagination past the first page, offline cache, deck import, accounts, and a designed icon. The placeholder branch is generated by `scripts/generate-mark.mjs` so the splash is not the Expo logo and not a Wizards symbol. See the pull request "Deferred" list.
