# Spellbranch

Spellbranch is a free mobile card lookup. You search [Scryfall](https://scryfall.com), open a card, and flip double-faced cards between the front and the back. There is no account, no paywall, and no advertising. The only network calls are to `https://api.scryfall.com`.

This repository is the Expo app. Shared search rules were copied from [kaidesalo/spellbranch](https://github.com/kaidesalo/spellbranch) into [`src/shared`](src/shared/README.md) so they can move into a monorepo package later. Milestone 1 is the study target: see [docs/M1-walkthrough.md](docs/M1-walkthrough.md).

## Fan Content Policy

Spellbranch Mobile is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.

Card data and images come from Scryfall. Scryfall is not affiliated with Wizards of the Coast.

## Run it

Requires Node.js 20 or newer. This project was built with Expo SDK 58.

```bash
npm install
npx expo start
```

Then:

- **Phone:** install Expo Go from the App Store or Play Store. The phone and the computer must be on the same Wi-Fi. Scan the QR code with the Camera app on iOS, or with Expo Go on Android.
- **Network blocks the QR code:** stop the server and run `npx expo start --tunnel`, then scan again.
- **Web:** with the dev server running, press `w`. Or start it directly with `npx expo start --web`.

Other scripts:

| Script | What it does |
| --- | --- |
| `npm start` | `expo start` (same as `npx expo start`) |
| `npm run web` | `expo start --web` |
| `npm run ios` | `expo start --ios` (needs Xcode on a Mac) |
| `npm run android` | `expo start --android` |
| `npm test` | Jest unit tests for the shared Scryfall logic. No live network. |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `expo lint` (ESLint with `eslint-config-expo`) |

## Layout

```
src/app/            Expo Router screens. A file here is a route.
src/components/     Rows, mana pips, the face toggle, the footer.
src/hooks/          Debounce and the search / detail fetch hooks.
src/shared/         Copied Scryfall client, name folding, throttle. No React Native.
docs/M1-walkthrough.md
```

Routes:

- `/` search
- `/card/[id]` one card, with a front/back toggle when Scryfall sends `card_faces`
- `/about` the full disclaimer
