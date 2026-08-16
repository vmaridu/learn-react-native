# Project Constitution

Learning repo and playground for React Native, building toward **Hamlet HQ** (an HOA
community platform). The curriculum lives in `/docs`.

> This file is the authoritative source for conventions. `.cursor/rules/project.mdc`
> defers to it. When a convention changes, update this file in the same commit.

---

## Repo layout

```
docs/              # curriculum — the spec for everything
apps/trailhead/    # the practice app
```

Most work happens in `apps/trailhead/`. Docs are markdown only — no build step.

---

## Stack — do not deviate without asking

| Concern | Choice | Version |
|---|---|---|
| Framework | Expo | SDK 57 |
| React Native | | 0.86 |
| React | | 19.2 |
| Routing | Expo Router | typed routes ON |
| Styling | NativeWind | **4.2.x — Tailwind v3, NOT v4** |
| UI primitives | React Native Reusables | `components/ui/` |
| Server state | TanStack Query | v5 |
| Client state | Zustand | v5 |
| Forms | React Hook Form + Zod | |
| Lists | FlashList | v2 |
| Animation | Reanimated | v4 |
| Backend | Supabase | |
| Payments | Stripe | |
| Tests | Jest + Testing Library, Maestro | |

Full rationale: `docs/08-reference/stack-decisions.md`

---

## Commands

Run from `apps/trailhead/`:

```bash
pnpm verify        # typecheck + lint + test — RUN BEFORE SAYING YOU'RE DONE
pnpm typecheck
pnpm lint
pnpm test
pnpm ios / pnpm android
npx expo install --check    # check version drift
npx expo-doctor
```

---

## Architecture

- `app/` — **routes only.** Screens are thin: they compose hooks and components.
  No business logic, no direct data access.
- `src/features/<name>/` — feature slices. Every slice has the same shape:
  `api.ts` · `keys.ts` · `hooks.ts` · `schemas.ts` · `types.ts` · `utils.ts` · `components/`
- `src/components/ui/` — Reusables primitives. **Check here before creating anything.**
- `src/lib/` — supabase client, query client, storage, `cn()`

**Dependency rules:**
- `lib/` imports nothing internal
- `components/ui/` never imports from `features/`
- Components use hooks, never `api.ts` directly
- Features import other features only via their index

---

## Non-negotiables

1. **Verify packages before suggesting them:** `npm view <pkg> version time.modified`
2. **Install Expo packages with `npx expo install`**, never `pnpm add`
3. **Never edit `ios/` or `android/`** — they're generated. Use config plugins in `plugins/`.
4. **No hardcoded colors.** Semantic tokens only: `bg-background`, `text-foreground`,
   `border-border`, `text-muted-foreground`
5. **Import `Text` from `~/components/ui/text`**, never from `react-native`
6. **All lists use FlashList.** Never `.map()` a data-driven list in a ScrollView.
7. **Auth tokens in `expo-secure-store`** only. Never MMKV or AsyncStorage.
8. **Never `{count && <X/>}`** — renders `0` and crashes. Use `{count > 0 && <X/>}`.
9. **TypeScript strict.** No `any`. No `@ts-ignore` without a comment explaining why.
10. **Amounts are integer cents.** Never floats for money.

---

## Definition of done

A change is not done until:

- [ ] `pnpm verify` passes
- [ ] Verified on **both** iOS and Android
- [ ] Loading, empty, and error states handled
- [ ] Interactive elements have `accessibilityRole` and `accessibilityLabel`
- [ ] Works in light and dark mode
- [ ] Safe areas respected

**If you cannot verify a platform, say so explicitly. Do not claim it works.**

---

## Ask before

- Adding any dependency
- Creating a new component in `components/ui/`
- Changing the database schema or writing a migration
- Anything touching payments, auth, or authorization
- Changing `app.json` / `app.config.ts`
- Creating a new architectural pattern

---

## Tiered review

Match your care to the blast radius:

| Tier | What | How it's handled |
|---|---|---|
| 🟢 1 | Boilerplate, types, tests, mechanical refactors | Generate freely |
| 🟡 2 | Feature logic, hooks, UI, animations | Generate, but explain your choices |
| 🔴 3 | **Money, auth, RLS, migrations, permissions, native config** | Draft only. Flag clearly for line-by-line human review. Do not write the tests for your own Tier 3 code. |

For Tier 3, explicitly enumerate what could go wrong: concurrent access, partial
failure, retry/double-submit, wrong user, malformed input.

---

## Anti-patterns — do not do these

- ❌ Business logic in `app/` route files
- ❌ Server data in Zustand (use TanStack Query)
- ❌ `useEffect` for data fetching (use TanStack Query)
- ❌ Optimistic updates on bookings or payments (scarce/irreversible resources)
- ❌ `TouchableOpacity` (use `Pressable`)
- ❌ `Image` from react-native (use `expo-image`)
- ❌ Inline arrow functions as FlashList `renderItem`
- ❌ Tailwind v4 syntax (we're on NativeWind 4 / Tailwind v3)
- ❌ Client-side-only authorization (hiding a button is not security)
- ❌ `console.log` in committed code
- ❌ Snapshot tests

---

## Docs conventions

When editing files in `docs/`:

- Every tutorial has: intro, runnable examples, "web equivalent" notes where useful,
  an exercise, a "Check yourself" section with collapsed answers, and Sources
- Link between docs with relative paths
- Pin versions where they matter, and cite the source
- Prefer tables for comparisons
- Use 🔴 for Tier-3 / high-stakes callouts
