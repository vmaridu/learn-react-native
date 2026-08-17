# React Native Field Manual

A complete, production-grade curriculum for learning React Native — written for an
experienced React web developer who is going to ship a real startup.

**Author's context (this is written *for* you, so the assumptions are explicit):**

- You already know React, TypeScript, Tailwind CSS, and shadcn/ui on the web.
- You are targeting **both iOS and Android**.
- You have **Claude Code** and **Cursor** subscriptions and intend to use AI heavily —
  but you will read and understand every line that ships.
- You are building a startup called **Hamlet HQ**: an HOA / community platform with
  amenity reservations, payments, community events, and broadcast messaging.
- Before you build the real thing, you want a **practice app** that exercises every
  skill Hamlet HQ needs.

Everything in this folder is built around those five facts.

---

## The three tracks

This curriculum runs three tracks in parallel. They are designed to be read together,
not sequentially — you learn a concept, apply it in the practice app, and note how it
will be used in the real product.

| Track | What it is | Where |
|---|---|---|
| **Learn** | React Native itself: components, layout, navigation, native APIs | [`01-foundations/`](./01-foundations/), [`02-curriculum/`](./02-curriculum/) |
| **Practice** | *Trailhead* — a sample app that rehearses every Hamlet HQ capability | [`05-practice-app/`](./05-practice-app/) |
| **Build** | *Hamlet HQ* — the real startup: architecture, money, multi-tenancy | [`06-hamlet-hq/`](./06-hamlet-hq/) |

Two cross-cutting tracks support all three:

| Track | What it is | Where |
|---|---|---|
| **Ship** | Production engineering: testing, CI/CD, releases, security, performance | [`03-production/`](./03-production/) |
| **Leverage** | How to actually use Claude Code + Cursor without shipping slop | [`04-ai-workflow/`](./04-ai-workflow/) |

---

## Start here

👉 **[00-start-here.md](./00-start-here.md)** — read this first. It explains how to use
this repo, what to install, and what "done" looks like at each stage.

👉 **[07-study-plan.md](./07-study-plan.md)** — the 14-week schedule that sequences
everything below into a week-by-week plan with checkpoints.

---

## Full table of contents

### 01 — Foundations

Get the mental model right before writing code. If you skip this you will spend
three months writing React Native as though it were React DOM, and fighting the
framework the whole way.

| # | Doc | What you'll get |
|---|---|---|
| 1 | [How React Native actually works](./01-foundations/01-how-react-native-works.md) | JSI, Fabric, TurboModules, Hermes — why the New Architecture matters |
| 2 | [From web to native](./01-foundations/02-from-web-to-native.md) | Every habit you must unlearn, with a translation table |
| 3 | [Environment setup](./01-foundations/03-environment-setup.md) | macOS/Windows/Linux, Xcode, Android Studio, real devices |
| 4 | [Your first app, walked through](./01-foundations/04-first-app-walkthrough.md) | Line-by-line tour of a fresh Expo Router app |

### 02 — Core curriculum

The actual React Native tutorials. Each one is self-contained, has runnable code, a
"web equivalent" callout, and exercises tied to the practice app.

| # | Doc | What you'll get |
|---|---|---|
| 1 | [Components and layout](./02-curriculum/01-components-and-layout.md) | Core components, Flexbox/Yoga, safe areas, platform differences |
| 2 | [Styling with NativeWind](./02-curriculum/02-styling-with-nativewind.md) | Tailwind in React Native — what works, what doesn't |
| 3 | [Design system](./02-curriculum/03-design-system.md) | React Native Reusables — the shadcn/ui of mobile |
| 4 | [Navigation](./02-curriculum/04-navigation.md) | Expo Router: stacks, tabs, modals, deep links, auth gating |
| 5 | [Lists and performance](./02-curriculum/05-lists-and-performance.md) | FlashList, virtualization, and why your list is janky |
| 6 | [Forms and validation](./02-curriculum/06-forms-and-validation.md) | React Hook Form + Zod, keyboard handling, native pickers |
| 7 | [State and data](./02-curriculum/07-state-and-data.md) | TanStack Query, Zustand, offline-first, optimistic updates |
| 8 | [Native APIs](./02-curriculum/08-native-apis.md) | Camera, notifications, location, storage, biometrics, permissions |
| 9 | [Animation and gestures](./02-curriculum/09-animation-and-gestures.md) | Reanimated 4 + Gesture Handler on the UI thread |
| 10 | [Native modules and config plugins](./02-curriculum/10-native-modules-and-config-plugins.md) | When you outgrow the JS layer |

### 03 — Production engineering

The difference between "it works on my simulator" and "50,000 people depend on it."

| # | Doc | What you'll get |
|---|---|---|
| 1 | [Project architecture](./03-production/01-project-architecture.md) | Folder structure, feature slices, dependency rules |
| 2 | [Testing strategy](./03-production/02-testing-strategy.md) | The pyramid for mobile: unit, component, E2E with Maestro |
| 3 | [CI/CD with EAS](./03-production/03-ci-cd-with-eas.md) | GitHub Actions, EAS Build/Submit/Update, release channels |
| 4 | [Shipping to the stores](./03-production/04-shipping-to-stores.md) | App Store + Play Console, review gotchas, phased rollout |
| 5 | [Observability](./03-production/05-observability.md) | Sentry, analytics, crash-free rate, the metrics that matter |
| 6 | [Security and privacy](./03-production/06-security-and-privacy.md) | Secrets, tokens, RLS, PII, app store privacy labels |
| 7 | [Performance playbook](./03-production/07-performance-playbook.md) | Startup time, list jank, bundle size, memory |
| 8 | [Over-the-air updates](./03-production/08-over-the-air-updates.md) | When updates actually apply, auto-update patterns, forced updates, rollback |

### 04 — AI-assisted development

You have the tools. This is how senior engineers actually use them — and the review
discipline that keeps AI-written code from becoming a liability.

| # | Doc | What you'll get |
|---|---|---|
| 1 | [The operating model](./04-ai-workflow/01-operating-model.md) | Spec → plan → implement → review → verify. The loop that works. |
| 2 | [Claude Code playbook](./04-ai-workflow/02-claude-code-playbook.md) | Agentic multi-file work, subagents, hooks, MCP |
| 3 | [Cursor playbook](./04-ai-workflow/03-cursor-playbook.md) | Tight edit loops, rules files, when Cursor beats Claude Code |
| 4 | [Context engineering](./04-ai-workflow/04-context-engineering.md) | CLAUDE.md, rules, and why your AI keeps getting it wrong |
| 5 | [Reviewing AI code](./04-ai-workflow/05-reviewing-ai-code.md) | **The most important doc here.** How to read a diff you didn't write. |

### 05 — Practice app: Trailhead

A campground and trail community app. Deliberately chosen because it is a
**structural twin of Hamlet HQ** — every feature you build maps 1:1 onto a Hamlet HQ
feature — but the domain is different enough that you're learning, not prematurely
building your startup.

| # | Doc | What you'll get |
|---|---|---|
| 1 | [Trailhead spec](./05-practice-app/01-trailhead-spec.md) | Full product spec, screens, data model, the Hamlet HQ mapping |
| 2 | [Build milestones](./05-practice-app/02-build-milestones.md) | 10 milestones from "hello world" to "on TestFlight" |

### 06 — Hamlet HQ

The real thing. Written as a technical founding document you can hand to a
contractor, a co-founder, or an AI agent.

| # | Doc | What you'll get |
|---|---|---|
| 1 | [Product brief](./06-hamlet-hq/01-product-brief.md) | Who it's for, what it does, what it deliberately doesn't do |
| 2 | [Domain model](./06-hamlet-hq/02-domain-model.md) | Entities, multi-tenancy, roles, the full schema |
| 3 | [Architecture](./06-hamlet-hq/03-architecture.md) | System design, backend choice, realtime, offline |
| 4 | [Payments](./06-hamlet-hq/04-payments.md) | Stripe Connect, dues, refunds, and the rules about money |
| 5 | [Reservations](./06-hamlet-hq/05-reservations.md) | The booking engine: availability, conflicts, cancellation |
| 6 | [Messaging](./06-hamlet-hq/06-messaging.md) | Broadcasts, push notifications, delivery guarantees |

### 07 — Study plan

👉 [**The 14-week plan**](./07-study-plan.md) — week-by-week, with time budgets,
deliverables, and a self-assessment checkpoint at the end of each phase.

### 08 — Reference

| Doc | What you'll get |
|---|---|
| [Web → React Native cheatsheet](./08-reference/web-to-rn-cheatsheet.md) | The translation table, printable |
| [Stack decisions](./08-reference/stack-decisions.md) | Every library chosen, the version, and *why* — plus what we rejected |
| [Resources](./08-reference/resources.md) | Docs, courses, newsletters, people worth following |

---

## How to use this repo as a playground

```bash
# The docs live here. The code you write lives in apps/.
learn-react-native/
├── docs/            # ← you are here
├── apps/
│   └── trailhead/   # the practice app you'll build
└── CLAUDE.md        # project constitution for AI agents
```

Read a curriculum doc → build the corresponding milestone in `apps/trailhead` →
check it against the milestone's "done" criteria → move on.

---

## A note on versions

This curriculum is pinned to a specific, verified stack as of **August 2026**:

| | Version |
|---|---|
| Expo SDK | 57 |
| React Native | 0.86 (SDK 57) / 0.87 latest |
| React | 19.2 |
| NativeWind | 4.2.6 (stable) |
| Expo Router | 57.x |

Full list with rationale in [stack decisions](./08-reference/stack-decisions.md).
Mobile moves fast — when a version here disagrees with the official docs, the
official docs win. Every doc links to its upstream source.
