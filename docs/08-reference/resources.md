# Resources

Curated, not exhaustive. Everything here is worth your time.

---

## Official documentation

Bookmark these. Index them in Cursor (Settings → Features → Docs) so your AI reads the
real API instead of recalling an old one.

| | |
|---|---|
| [Expo](https://docs.expo.dev) | The single most important reference |
| [React Native](https://reactnative.dev/docs) | Core components and APIs |
| [Expo Router](https://docs.expo.dev/router/introduction/) | Routing |
| [NativeWind](https://www.nativewind.dev/) | Tailwind for RN |
| [React Native Reusables](https://reactnativereusables.com/) | Your component library |
| [TanStack Query](https://tanstack.com/query/latest) | Server state |
| [Reanimated](https://docs.swmansion.com/react-native-reanimated/) | Animation |
| [Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/) | Gestures |
| [FlashList](https://shopify.github.io/flash-list/) | Lists |
| [Supabase](https://supabase.com/docs) | Backend |
| [Stripe](https://stripe.com/docs) | Payments |
| [Maestro](https://maestro.mobile.dev/) | E2E testing |

**Two more that will save you real time:**
- [React Native Directory](https://reactnative.directory/) — searchable library index
  with New Architecture and Expo compatibility flags
- [Expo SDK reference](https://docs.expo.dev/versions/latest/) — check here before
  reaching for a third-party library

---

## Design guidelines

Read both at least once. Most "this app feels wrong" feedback traces to violating one
of these.

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design 3](https://m3.material.io/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) —
  read before your first submission, not after your first rejection
- [Play Console Policy Center](https://play.google.com/console/about/policy/)

---

## Learning

**Free:**
- [Expo tutorial](https://docs.expo.dev/tutorial/introduction/) — the official one, good
- [React Native Express](https://www.reactnative.express/) — concise fundamentals
- [Callstack's Ultimate Guide to RN Performance](https://www.callstack.com/ebooks/the-ultimate-guide-to-react-native-optimization) —
  free ebook, genuinely excellent

**Worth paying for, if you learn well from video:**
- [Expo's YouTube channel](https://www.youtube.com/@ExpoDevelopers) — free, official
- [William Candillon — "Can it be done in React Native?"](https://www.youtube.com/@wcandillon) —
  advanced animation, free
- [Catalin Miron](https://www.youtube.com/@CatalinMironDev) — animation deep dives

> **A note on courses:** given your React experience, most React Native courses will
> spend the first 40% on things you already know. You'll usually learn faster from the
> official docs plus building. Use video for *animation* specifically, where seeing it
> helps.

---

## People worth following

The signal-to-noise here is high:

| Who | Why |
|---|---|
| [@expo](https://x.com/expo) | Release news |
| [@reactnative](https://x.com/reactnative) | Core team |
| [Software Mansion](https://blog.swmansion.com/) | Reanimated, Gesture Handler, ecosystem analysis |
| [Callstack](https://www.callstack.com/blog) | Performance, architecture |
| [Evan Bacon](https://x.com/Baconbrix) | Expo Router |
| [Marc Rousavy](https://x.com/mrousavy) | MMKV, VisionCamera, Nitro |
| [Krzysztof Magiera](https://x.com/kzzzf) | Reanimated |

---

## Newsletters

- [React Native Newsletter](https://reactnativenewsletter.com/) — weekly, high quality
- [This Week In React](https://thisweekinreact.com/) — covers both web and native
- [Expo Changelog](https://expo.dev/changelog) — read every SDK release

---

## Communities

- [Expo Discord](https://chat.expo.dev/) — genuinely responsive
- [Reactiflux Discord](https://www.reactiflux.com/) — `#react-native`
- [r/reactnative](https://reddit.com/r/reactnative)
- [React Native GitHub Discussions](https://github.com/facebook/react-native/discussions)

**When asking for help**, include: Expo SDK version, RN version, platform, whether it's
dev or production, the actual error, and a minimal reproduction. Doing this well gets
answers within the hour.

---

## Tools

**Development**
- [React Native DevTools](https://reactnative.dev/docs/react-native-devtools) — press `j`
- [Reactotron](https://github.com/infinitered/reactotron) — inspect state, network, logs
- [Expo Orbit](https://docs.expo.dev/build/orbit/) — launch builds on simulators quickly

**Design → code**
- [Figma](https://figma.com) with the [shadcn/ui kit](https://ui.shadcn.com/) — tokens
  transfer to your app
- [Blurhash](https://blurha.sh/) — image placeholders
- [Realtime Colors](https://realtimecolors.com/) — test a palette quickly

**Assets**
- [Expo icon generator](https://buildicon.netlify.app/)
- [App Icon Generator](https://www.appicon.co/)
- [Screenshots Pro](https://screenshots.pro/) — store screenshots with device frames
- [Lucide](https://lucide.dev/icons/) — browse the icon set

**Performance**
- [Flashlight](https://github.com/bamlab/flashlight) — real Android performance scores
- [react-native-bundle-visualizer](https://github.com/IjzerenHein/react-native-bundle-visualizer)

**Backend / ops**
- [Supabase Studio](https://supabase.com/dashboard)
- [Stripe CLI](https://stripe.com/docs/stripe-cli) — replay webhooks locally
- [Sentry](https://sentry.io/)
- [PostHog](https://posthog.com/)

---

## For the AI workflow

- [Claude Code docs](https://code.claude.com/docs/)
- [Cursor docs](https://docs.cursor.com/)
- [Model Context Protocol](https://modelcontextprotocol.io/) — connect agents to
  Supabase, GitHub, Sentry

---

## For the startup side

Relevant to Hamlet HQ specifically:

- [Stripe Connect docs](https://stripe.com/docs/connect) — read thoroughly before
  writing payment code
- [Stripe Atlas guides](https://stripe.com/atlas/guides) — good general startup material
- HOA domain: read your own community's bylaws, CC&Rs, and a few months of meeting
  minutes. **This is the highest-value research you can do** — the domain has
  non-obvious rules you will not guess.
- Talk to property managers. They manage many communities and will tell you exactly
  what's broken.

---

## Staying current

Mobile moves fast. A sustainable routine:

**Weekly (15 min)** — skim React Native Newsletter, check the Expo changelog.

**Monthly (1 hr)** — run `npx expo install --check`, review Dependabot PRs, read one
Software Mansion or Callstack post.

**Per SDK release (half a day)** — read the changelog, upgrade a branch, test, merge.
Staying one SDK behind latest is the right cadence.

---

**Back to:** [Portal index](../README.md)
