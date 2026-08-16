# learn-react-native

A React Native playground and curriculum — learning the platform properly, practising on
a real app, and building toward **Hamlet HQ**, an HOA community platform.

---

## 👉 Start here: [`docs/`](./docs/)

The full curriculum lives in the docs folder.

- **[docs/README.md](./docs/README.md)** — the portal index
- **[docs/00-start-here.md](./docs/00-start-here.md)** — read this first
- **[docs/07-study-plan.md](./docs/07-study-plan.md)** — the 14-week plan

---

## What's in here

| Section | What it covers |
|---|---|
| [01 — Foundations](./docs/01-foundations/) | How React Native works, web→native mental model, setup |
| [02 — Curriculum](./docs/02-curriculum/) | 10 tutorials: layout, NativeWind, navigation, lists, forms, state, native APIs, animation, native modules |
| [03 — Production](./docs/03-production/) | Architecture, testing, CI/CD, store releases, observability, security, performance |
| [04 — AI workflow](./docs/04-ai-workflow/) | Using Claude Code and Cursor properly, and reviewing what they write |
| [05 — Practice app](./docs/05-practice-app/) | *Trailhead* — the app you build to learn |
| [06 — Hamlet HQ](./docs/06-hamlet-hq/) | The startup: domain model, architecture, payments, reservations, messaging |
| [07 — Study plan](./docs/07-study-plan.md) | 14 weeks, week by week, with checkpoints |
| [08 — Reference](./docs/08-reference/) | Cheatsheet, stack decisions, resources |

---

## The plan in one paragraph

Spend three weeks learning React Native fundamentals by hand, without AI generation.
Then build **Trailhead** — a campground community app deliberately designed as a
structural twin of Hamlet HQ, so every technique transfers — and ship it to TestFlight
and Play Console. Only then start the real product, on foundations you actually
understand.

```
Weeks 1–3    Foundations    Learn the platform. Code by hand.
Weeks 4–11   Trailhead      Build and ship the practice app.
Week  12     Ship           TestFlight, real users, an OTA update.
Weeks 13–14  Hamlet HQ      Start the real thing.
```

---

## The stack

Verified August 2026. Full rationale in [stack decisions](./docs/08-reference/stack-decisions.md).

| | |
|---|---|
| Expo SDK 57 · React Native 0.86 · React 19.2 | TypeScript strict |
| Expo Router | NativeWind 4.2 (Tailwind v3) |
| React Native Reusables | TanStack Query + Zustand |
| React Hook Form + Zod | FlashList 2 · Reanimated 4 |
| Supabase | Stripe Connect |
| Jest + Testing Library · Maestro | EAS Build/Submit/Update |

---

## Repo layout

```
learn-react-native/
├── docs/                 # the curriculum — start here
├── apps/
│   └── trailhead/        # the practice app (created in week 4)
├── mockup/               # Hamlet HQ homeowner mockup — clickable, fake backend
├── CLAUDE.md             # project constitution for AI agents
└── .cursor/rules/        # Cursor equivalents
```

### The mockup

[`mockup/`](./mockup/) is a runnable Expo app covering the Phase 1 **homeowner**
experience — booking, dues, documents, violations, elections, inbox, directories and a
document-grounded assistant — all against an in-memory fake backend. Sign in with
`demo@hamlethq.app` / `hamlet2026`, or tap through as the demo resident.

See [`mockup/README.md`](./mockup/README.md) for Android install instructions
(Expo Go, an EAS-built `.apk`, or a local Gradle build).

---

## Working conventions

Whether you're writing code or an AI agent is:

1. **Never merge code you can't explain.** If you can't explain a diff to another
   engineer, you don't own it yet.
2. **`pnpm verify` before every commit** — typecheck, lint, test.
3. **Test on iOS and Android** before calling anything done.
4. **Money, auth, and permissions are hand-reviewed**, always, line by line.
5. **Verify packages before installing** — `npm view <pkg> version time.modified`.

See [the AI operating model](./docs/04-ai-workflow/01-operating-model.md) for the full
workflow.
