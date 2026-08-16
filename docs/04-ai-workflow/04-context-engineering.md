# Context Engineering

Most "the AI is bad at this" moments are context failures, not model failures. This doc
is about fixing that systematically.

---

## 1. The core idea

An AI agent knows: the model's training, whatever you put in the conversation, and
whatever it reads from your repo.

It does **not** know: your conventions, your architecture decisions, what you tried and
rejected, which of two similar helpers is the current one, or that the pattern in
`legacy/` is deprecated.

Every one of those gaps produces plausible code that doesn't fit your codebase.
Context engineering is the practice of closing them **once**, in a file, instead of
re-explaining daily.

**The compounding effect:** a good `CLAUDE.md` written in hour one saves an hour every
week for the life of the project. It's the highest-ROI file in your repo.

---

## 2. `CLAUDE.md` — the project constitution

Lives at the repo root (and optionally per-package in a monorepo). Read automatically
at the start of every session.

### What belongs in it

| Include | Why |
|---|---|
| Stack with **versions** | Prevents wrong-version APIs |
| Commands (`verify`, `test`, `build`) | So the agent can self-check |
| Architecture and folder rules | So new code lands in the right place |
| Naming and file conventions | Consistency |
| **Non-negotiables** | The rules that must never be broken |
| **Anti-patterns** — what NOT to do | Extremely effective, widely omitted |
| Definition of done | So "done" means the same thing to both of you |
| What requires asking first | Guards Tier 3 work |

### What doesn't belong

- Long explanations of how React works (the model knows)
- Documentation that duplicates your docs folder (link instead)
- Anything that changes weekly (it goes stale and becomes misleading)
- Secrets. Ever.

### A real one for this project

```markdown
# Trailhead — Project Constitution

React Native practice app. Precursor to Hamlet HQ (HOA community platform).
Curriculum and specs live in `/docs`.

## Stack — do not deviate without asking

| Concern | Choice | Version |
|---|---|---|
| Framework | Expo | SDK 57 |
| React Native | | 0.86 |
| Routing | Expo Router | typed routes ON |
| Styling | NativeWind | 4.2.x (Tailwind **v3**, not v4) |
| UI | React Native Reusables | components/ui/ |
| Server state | TanStack Query | v5 |
| Client state | Zustand | v5 |
| Forms | React Hook Form + Zod | |
| Lists | FlashList | v2 |
| Backend | Supabase | |

## Commands
- `pnpm verify` — typecheck + lint + test. **Run before saying you're done.**
- `pnpm ios` / `pnpm android`
- `npx expo install --check` — check version drift

## Architecture
- `app/` — routes ONLY. Screens are thin; they compose hooks and components.
- `src/features/<name>/` — feature slices: `api.ts`, `keys.ts`, `hooks.ts`,
  `schemas.ts`, `types.ts`, `components/`
- `src/components/ui/` — Reusables primitives. **Check here before creating anything.**
- `src/lib/` — supabase client, query client, storage, utils
- Components never call `api.ts` directly — always through hooks.

## Non-negotiables
1. Verify packages exist before suggesting: `npm view <pkg> version time.modified`
2. Expo packages install via `npx expo install`, never `pnpm add`
3. Never edit `ios/` or `android/` — generated. Use config plugins in `plugins/`.
4. No hardcoded colors. Semantic tokens only (`bg-background`, `text-foreground`).
5. Import `Text` from `~/components/ui/text`, never `react-native`
6. All lists use FlashList. Never `.map()` a list in a ScrollView.
7. Auth tokens in `expo-secure-store` only. Never MMKV/AsyncStorage.
8. Never use `{count && <X/>}` — renders `0` and crashes. Use `{count > 0 && <X/>}`.
9. TypeScript strict. No `any`. No `@ts-ignore` without a comment explaining why.

## Definition of done
- `pnpm verify` passes
- Verified on **both** iOS and Android
- Handles loading, empty, and error states
- Interactive elements have accessibilityRole + accessibilityLabel
- Works in light and dark mode

If you cannot verify a platform, say so explicitly. Do not claim it works.

## Ask me first before
- Adding any dependency
- Creating a new component in `components/ui/`
- Changing the database schema or writing a migration
- Anything touching payments, auth, or authorization
- Changing `app.json` / `app.config.ts`

## Anti-patterns — do not do these
- ❌ Business logic inside `app/` route files
- ❌ Server data in Zustand (use TanStack Query)
- ❌ `useEffect` for data fetching (use TanStack Query)
- ❌ Optimistic updates on bookings or payments (scarce/irreversible)
- ❌ `TouchableOpacity` (use `Pressable`)
- ❌ `Image` from react-native (use `expo-image`)
- ❌ Inline arrow functions as FlashList `renderItem` props
- ❌ Tailwind v4 syntax (we're on NativeWind 4 / Tailwind v3)
```

That file will save you hundreds of corrections.

---

## 3. Make the codebase itself legible

Documentation is one lever. **The code is a bigger one.** An AI extrapolates from what
it sees — so consistency is a context strategy.

### Consistent feature slices

If every feature looks identical, the AI generates the next one correctly without
being told:

```
src/features/bookings/          src/features/announcements/
├── api.ts                      ├── api.ts
├── keys.ts                     ├── keys.ts
├── hooks.ts                    ├── hooks.ts
├── schemas.ts                  ├── schemas.ts
├── types.ts                    ├── types.ts
└── components/                 └── components/
```

```
Add an `events` feature slice following the exact structure and patterns
in @src/features/bookings/
```

That prompt works *because* the pattern is unambiguous. In an inconsistent codebase,
the same prompt produces a coin flip.

### A kitchen-sink screen

Create `app/(app)/_kitchen-sink.tsx` rendering every UI component in every variant.

Two payoffs:
1. Visual regression surface for you
2. **A single file the AI can read to learn your entire component vocabulary**

```
Build the announcement card. Use only components shown in
@app/(app)/_kitchen-sink.tsx — don't create new primitives.
```

This dramatically reduces the "AI invents a fifth Button component" problem.

### Types as documentation

```ts
// ❌ tells the AI nothing about the rules
type Booking = { id: string; status: string; startsAt: string };

// ✅ encodes the domain
type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';

type Booking = {
  id: string;
  status: BookingStatus;
  /** ISO 8601 UTC. Always store UTC; convert at the display layer. */
  startsAt: string;
  /** Cents, never floats. Currency is always the community's currency. */
  feeCents: number;
};
```

Comments that encode *rules* (UTC, cents-not-floats) prevent whole categories of bugs,
for humans and AI alike.

---

## 4. Reference docs from code

Your `/docs` folder is a context asset. Point at it:

```
Implement the reservation conflict rules described in
@docs/06-hamlet-hq/05-reservations.md, section "Availability".
Follow the data patterns in @src/features/bookings/
```

The spec is written down once, and both you and the agent work from the same source.
This is why writing the Hamlet HQ blueprint before building it is worth the time —
it's simultaneously a design document and an AI context file.

---

## 5. Per-conversation context

Repo-level context handles conventions. Per-task context handles the specific job.

### The shape of a good task prompt

```
[GOAL]      What outcome, in one sentence
[CONTEXT]   Which files matter, what already exists
[CONSTRAINTS] What not to do, what to reuse
[DONE]      How we'll know it worked
```

Worked example:

```
GOAL
Residents can RSVP to a community event, with a capacity limit.

CONTEXT
- Events slice exists at @src/features/events/ (api, keys, hooks done)
- The RSVP table and RLS policy already exist — see
  @supabase/migrations/0012_rsvps.sql
- UI primitives: @src/components/ui/

CONSTRAINTS
- Capacity enforcement must be server-side (a Postgres function), not in
  the hook. Two users can RSVP simultaneously.
- Reuse ConfirmDialog and Button. Do not create new UI components.
- No optimistic update — capacity is a scarce resource.
- No new dependencies.

DONE
- pnpm verify passes
- RSVP at capacity shows "Event is full" and does not create a row
- Cancelling an RSVP frees the slot
- Works offline: queued with an idempotency key
```

That takes two minutes to write and reliably produces reviewable, correct-shaped code.
Compare to "add RSVP to events."

### Clear context between tasks

Stale context is actively harmful — the model carries forward decisions from a
different problem. `/clear` in Claude Code; a new chat in Cursor.

---

## 6. Negative constraints

Underused, and disproportionately effective. AI's default bias is to **add** — new
components, new dependencies, new abstractions. Telling it what not to do is how you
keep a codebase from sprawling.

```
Do not create new components — reuse what's in components/ui/
Do not add dependencies
Do not change the database schema
Do not touch files outside src/features/events/
Do not write comments explaining what the code does — only why
If you think something is missing, tell me instead of building it
```

That last one is especially good. It converts a silent wrong assumption into a
question you can answer.

---

## 7. Keeping context honest

The dangerous failure mode is a `CLAUDE.md` that's *wrong* — it produces confidently
incorrect code, and you'll trust it because you wrote it.

**Maintenance habits:**

- Update it the same commit you change a convention
- When you correct the AI twice for the same thing, that correction belongs in the file
- Use `#` in Claude Code to append a rule mid-session, then tidy it later
- Review it monthly; delete anything stale
- Keep it under ~200 lines. Beyond that, split into scoped files.

**The two-correction rule** is the practical one: the second time you type the same
correction, stop and write it down instead.

---

## 8. Monorepo context

When Hamlet HQ has mobile + web + shared packages:

```
hamlet-hq/
├── CLAUDE.md                    # shared conventions, monorepo rules
├── apps/
│   ├── mobile/CLAUDE.md         # RN-specific
│   └── web/CLAUDE.md            # Next.js-specific
└── packages/
    └── core/CLAUDE.md           # "pure TS only, no platform imports"
```

Nested files are read in addition to the root, so scoping keeps each one short and
relevant. `packages/core/CLAUDE.md` saying "no React Native or Next.js imports here —
this must run in both" prevents a very common monorepo mistake.

---

## 9. Exercise

Write the real `CLAUDE.md` for Trailhead. Then test it:

1. Start a **fresh** session with no other context
2. Ask: *"Add a `favorites` feature slice following this project's conventions."*
3. Review what you get

**Grade it.** Did it:
- Use the right folder structure?
- Follow the query-key factory pattern?
- Reuse existing UI components?
- Use FlashList?
- Avoid hardcoded colors?
- Run `pnpm verify`?

Every "no" is a gap in your `CLAUDE.md`. Fix the file — not the code — and re-run the
test in another fresh session. Iterate until a cold start produces code that fits your
codebase.

**That test loop is the whole skill.** It converts context engineering from a vague
idea into something you can measure and improve.

---

## Check yourself

1. What's the two-correction rule?
2. Why is a kitchen-sink screen a context asset?
3. Why do negative constraints work so well?
4. What's the risk of a large, aging `CLAUDE.md`?
5. How do you test whether your context is actually good?

<details>
<summary>Answers</summary>

1. The second time you give the AI the same correction, write it into `CLAUDE.md`
   instead of repeating it. Corrections you make twice are conventions you haven't
   documented.
2. It's a single file that shows the AI your entire component vocabulary and how each
   is used, so it reuses your primitives instead of inventing near-duplicates.
3. The model's default bias is to add code — new components, dependencies,
   abstractions. Explicitly forbidding that is what keeps a codebase from sprawling,
   and "tell me instead of building it" converts silent assumptions into questions.
4. Stale rules produce confidently wrong code, and you'll trust it because it matches
   your own documented conventions. Wrong context is worse than no context.
5. Start a fresh session with no other context, ask for a representative task, and
   grade the output against your conventions. Each failure is a gap in the file — fix
   the file, not the code, and re-test.

</details>

---

**Next:** [Reviewing AI code →](./05-reviewing-ai-code.md)
