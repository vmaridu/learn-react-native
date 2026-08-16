# Stack Decisions

Every library chosen, the version verified in August 2026, why it was picked, and what
was rejected. Decided once so you never re-litigate mid-project.

---

## The stack at a glance

| Concern | Choice | Version | Web equivalent |
|---|---|---|---|
| Framework | Expo | SDK 57 | Next.js |
| Runtime | React Native | 0.86 (SDK 57) | — |
| React | React | 19.2 | same |
| Language | TypeScript (strict) | 5.x | same |
| Routing | Expo Router | 57.x | Next.js App Router |
| Styling | NativeWind | **4.2.6** | Tailwind CSS |
| Tailwind | tailwindcss | **3.x** (not 4) | same |
| Components | React Native Reusables | CLI 0.7.x | shadcn/ui |
| Primitives | @rn-primitives/* | — | Radix UI |
| Icons | lucide-react-native | — | lucide-react |
| Server state | TanStack Query | 5.101.x | same |
| Client state | Zustand | 5.0.x | same |
| Forms | React Hook Form | 7.85.x | same |
| Validation | Zod | 4.4.x | same |
| Lists | @shopify/flash-list | 2.3.x | — |
| Animation | react-native-reanimated | 4.5.x | Framer Motion |
| Gestures | react-native-gesture-handler | 3.2.x | — |
| Bottom sheets | @gorhom/bottom-sheet | 5.x | — |
| Keyboard | react-native-keyboard-controller | — | — |
| Images | expo-image | SDK 57 | next/image |
| Fast storage | react-native-mmkv | 4.3.x | localStorage |
| Secure storage | expo-secure-store | SDK 57 | httpOnly cookie |
| Local DB | expo-sqlite + Drizzle | 57.x | IndexedDB |
| Backend | Supabase | 2.112.x | Supabase |
| Payments | @stripe/stripe-react-native | 0.74.x | @stripe/stripe-js |
| Push | expo-notifications | SDK 57 | Web Push |
| Unit tests | Jest + Testing Library | 14.x | same |
| E2E | Maestro | 2.x | Playwright |
| Build/deploy | EAS | — | Vercel |
| Errors | @sentry/react-native | 8.x | @sentry/nextjs |
| Analytics | PostHog | — | same |

> ⚠️ **Verify before installing.** Versions move. Run
> `npm view <package> version time.modified` — and make that a standing rule in your
> `CLAUDE.md`, because AI suggestions skew toward older versions.

---

## The big decisions

### Expo over bare React Native

**Chosen because:**
- **EAS Build compiles iOS in the cloud** — no Mac required. For a solo founder this is
  transformative.
- **EAS Update** ships JS fixes without a 1–3 day store review.
- Config plugins give you native configuration as code, with `ios/` and `android/` as
  generated artifacts rather than files that drift.
- expo-image, expo-notifications, expo-sqlite, Expo Router are best-in-class and
  versioned together.

**Rejected:** bare React Native CLI. The historical objection ("Expo can't do native
modules") has been false since SDK 43 — development builds support any native library.

**When you'd revisit:** integrating into an existing native app, or you have a
dedicated native team. Neither applies.

---

### NativeWind over the alternatives

**Chosen because** you already know Tailwind, it compiles at build time (no runtime
style cost), and React Native Reusables targets it.

> ⚠️ **Use 4.2.x with `tailwindcss@^3`.** NativeWind 5 (which targets Tailwind v4) is
> still `5.0.0-preview.4` as of August 2026 — not production-ready. The migration path
> is described as mostly compatible since `className` strings don't change.

**Alternatives considered:**

| Option | Why not (for you) |
|---|---|
| **Uniwind** | Genuinely promising — full Tailwind v4, notably faster benchmarks, no ThemeProvider needed. But newer, smaller ecosystem, and Reusables targets NativeWind. **Revisit at your next major version bump.** |
| **Unistyles** | Excellent performance, C++ engine. But it's a different API to learn, and your Tailwind knowledge wouldn't transfer. |
| **Tamagui** | Best option *if* you need shared components across web and native. Heavier toolchain, own compiler, steeper curve. You don't need shared components. |
| **StyleSheet** | No reason to give up Tailwind ergonomics. |

---

### React Native Reusables over component libraries

**Chosen because** it's the direct shadcn/ui port: copy-paste ownership, `cva` variants,
`cn()` merging, semantic tokens. Your existing mental model transfers, and your web
dashboard (real shadcn) will look identical because they share a token file.

**Rejected:**
- **React Native Paper / UI Kitten** — opinionated Material/Eva look, hard to customize
  deeply
- **gluestack** — good, but more framework than primitives
- **Tamagui** — see above

**The trade-off you're accepting:** you maintain the components. That's the shadcn
bargain, and you've already decided you like it.

---

### Supabase over a custom backend

**Chosen because:**
- **RLS is the authorization model** — one auditable place for the rules that protect
  neighbours' privacy
- Postgres is right for deeply relational HOA data, and `exclude using gist` is what
  makes double-booking impossible
- Auth, Storage, Realtime, Edge Functions included
- Managed — backups and scaling aren't your 2am problem
- **It's just Postgres.** Not a lock-in trap.

**Rejected:**
- **Firebase** — document model is a poor fit for relational HOA data, and no equivalent
  of RLS or exclusion constraints
- **Custom Node API** — more control, but also more code to write, secure, and maintain
  alone
- **Convex / other BaaS** — smaller ecosystems, less Postgres escape hatch

---

### TanStack Query + Zustand

Same as your web stack, deliberately. The split:

- **TanStack Query** for anything with an owner on a server
- **Zustand** for genuinely client-side state (active community, theme)

**Rejected:** Redux Toolkit (more ceremony than you need), Jotai/Recoil (fine, but
Zustand is simpler), and putting server data in a store (the classic mistake).

---

### FlashList over FlatList

**Chosen because** it recycles native views rather than mounting/unmounting, handles
large datasets far better, and v2 dropped the `estimatedItemSize` requirement.

**Alternative:** [Legend List](https://github.com/LegendApp/legend-list) — lighter, good
benchmarks, simpler API. Worth evaluating. FlashList wins on ecosystem maturity and
Shopify's production usage.

---

### Maestro over Detox

**Chosen because** the YAML flows are dramatically simpler, it tolerates async without
explicit waits, and it runs against real devices without deep build integration.

**Rejected:** Detox — more powerful and more precise, but significantly more setup and
maintenance. For a solo founder, Maestro's simplicity is worth the reduced control.

---

## Things deliberately NOT in the stack

| Not using | Why |
|---|---|
| Redux | Zustand + Query cover it with less ceremony |
| GraphQL | Supabase's REST + RPC is sufficient; GraphQL adds a layer to maintain |
| A custom design system from scratch | Reusables gets you 80% for free |
| Styled-components / Emotion | Runtime style cost; NativeWind compiles ahead of time |
| Moment.js | Huge bundle, bundles all locales. Use `date-fns` or `Intl` |
| Lodash (whole) | Import individual functions, or use native methods |
| A monorepo (initially) | Add it when you actually build the web app |
| Offline-first sync engine | Level 1+2 caching is enough for v1; sync engines are hard |
| Microservices | You are one person |
| Custom auth | Supabase Auth handles it, including Sign in with Apple |
| Certificate pinning (initially) | Breaks on cert rotation; revisit when your release process is solid |

---

## Version policy

**Upgrade cadence:** stay **one Expo SDK behind latest**. Let others find the sharp
edges for a few weeks, then move. Never fall three behind — libraries move on and you
end up doing several migrations at once.

```bash
# Check drift regularly
npx expo install --check

# Upgrade
npx expo install expo@latest
npx expo install --fix
npx expo-doctor
```

**Install rules:**
```bash
npx expo install <package>    # ✅ Expo-ecosystem packages — picks the compatible version
pnpm add <package>            # only for pure-JS packages with no native side
```

**Before adding any dependency:**
```bash
npm view <package> version time.modified
```

Check: maintained in the last ~6 months, New Architecture support, TypeScript types,
Expo compatibility. [reactnative.directory](https://reactnative.directory/) flags most
of this.

---

## The install script

Setting up a fresh project with this stack:

```bash
# Create
npx create-expo-app@latest my-app --template default
cd my-app

# Styling
npx expo install nativewind react-native-safe-area-context
pnpm add -D tailwindcss@^3 prettier prettier-plugin-tailwindcss
pnpm add clsx tailwind-merge class-variance-authority

# Design system
npx @react-native-reusables/cli@latest init
npx @react-native-reusables/cli@latest add button card input text

# Data
npx expo install @tanstack/react-query zustand @supabase/supabase-js
pnpm add @tanstack/react-query-persist-client @tanstack/query-async-storage-persister

# Forms
pnpm add react-hook-form zod @hookform/resolvers
npx expo install react-native-keyboard-controller

# UI
npx expo install @shopify/flash-list expo-image react-native-reanimated \
  react-native-gesture-handler
pnpm add @gorhom/bottom-sheet lucide-react-native
npx expo install react-native-svg

# Storage
npx expo install expo-secure-store react-native-mmkv @react-native-community/netinfo

# Native
npx expo install expo-notifications expo-device expo-constants expo-haptics \
  expo-image-picker expo-image-manipulator expo-location

# Quality
npx expo install jest-expo jest
pnpm add -D @testing-library/react-native @testing-library/jest-native \
  eslint eslint-config-expo @types/jest

# Observability
npx expo install @sentry/react-native
pnpm add posthog-react-native

# Verify
npx expo-doctor
npx expo install --check
```

---

## Sources

All versions verified against the npm registry, August 2026.

- [Expo SDK 57](https://expo.dev/changelog/sdk-57)
- [NativeWind](https://www.nativewind.dev/)
- [React Native Reusables](https://github.com/founded-labs/react-native-reusables)
- [React Native Directory](https://reactnative.directory/)

**Next:** [Web → RN cheatsheet](./web-to-rn-cheatsheet.md)
