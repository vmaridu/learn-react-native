# The 14-Week Study Plan

From "experienced React web developer" to "shipped a production React Native app and
ready to build Hamlet HQ."

---

## How this is structured

**Time budget:** 10–14 hours per week. If you have more, don't compress the calendar —
go deeper on the exercises instead. Understanding takes wall-clock time, not just hours.

**Three phases:**

| Phase | Weeks | Goal |
|---|---|---|
| **1. Learn** | 1–3 | Platform fundamentals. Code written by hand. |
| **2. Build** | 4–11 | Trailhead, shipped to TestFlight. |
| **3. Start** | 12–14 | Hamlet HQ foundations. |

**The rule that makes this work:** each week has a **deliverable** and a **checkpoint**.
Don't advance until the checkpoint passes. Moving on with a shaky foundation is how
people end up six months in with a codebase they can't maintain.

---

# Phase 1 — Learn (weeks 1–3)

> **AI policy this phase: explain only.** Ask questions, get concepts explained, have it
> review code *you* wrote. Do not have it generate code.
>
> This will feel slow. It's the highest-leverage constraint in the plan — you cannot
> review what you've never written, and review is the entire basis of your ability to
> use AI safely later.

## Week 1 — Foundations

**Read**
- [00-start-here](./00-start-here.md)
- [How React Native works](./01-foundations/01-how-react-native-works.md)
- [From web to native](./01-foundations/02-from-web-to-native.md)
- [Environment setup](./01-foundations/03-environment-setup.md)

**Do**
- [ ] Full environment setup: Node, Android Studio, Xcode, devices
- [ ] `npx expo-doctor` clean
- [ ] Run a starter app on **both** platforms
- [ ] Run it on a physical iPhone and a physical Android
- [ ] Learn to read `adb logcat` and the Xcode console
- [ ] Build three throwaway screens by hand: a profile card, a settings list, a login
      form

**Checkpoint**
- [ ] I can run an app on iOS and Android without looking up commands
- [ ] I can explain what happens between `<Text>` in JSX and pixels on screen
- [ ] I can name three things that break when you write React Native like React DOM

⏱️ ~12 hours

---

## Week 2 — Layout and styling

**Read**
- [Components and layout](./02-curriculum/01-components-and-layout.md)
- [Styling with NativeWind](./02-curriculum/02-styling-with-nativewind.md)
- [First app walkthrough](./01-foundations/04-first-app-walkthrough.md)

**Do**
- [ ] Set up NativeWind from scratch, by hand, without copying a template
- [ ] Build the campsite detail screen exercise from the layout doc
- [ ] Rebuild three screens from apps you use daily (Airbnb, Calm, your bank)
- [ ] Get every one working in light **and** dark mode
- [ ] Do a full safe-area pass on all of them

**Checkpoint**
- [ ] I can build a screen from a screenshot without looking up flexbox
- [ ] I know why `flex-row` is needed and `flex` alone isn't
- [ ] I can explain the no-cascade problem and how to work around it
- [ ] My screens look right on a notched iPhone and an Android with gesture nav

⏱️ ~12 hours

---

## Week 3 — Navigation and the design system

**Read**
- [Navigation](./02-curriculum/04-navigation.md)
- [Design system](./02-curriculum/03-design-system.md)
- [Lists and performance](./02-curriculum/05-lists-and-performance.md)

**Do**
- [ ] Build a 6-screen app with tabs, a stack, a modal, and dynamic routes
- [ ] Deep links working on both platforms — test with `xcrun simctl` and `adb`
- [ ] Set up React Native Reusables; read `button.tsx` line by line
- [ ] Build the component inventory (Button, Card, StatusBadge, EmptyState, ListRow)
- [ ] Build a kitchen-sink screen
- [ ] Build a 1,000-item FlashList and measure its FPS on a real Android device

**Checkpoint**
- [ ] I can set up a full navigation structure from scratch
- [ ] Deep links work; I can explain how a notification would route to a screen
- [ ] I understand why Reusables defines both `buttonVariants` and `buttonTextVariants`
- [ ] My 1,000-item list scrolls at 60fps and I can prove it

⏱️ ~14 hours

> ### 🎓 Phase 1 gate
> Before moving on, answer these without looking:
> 1. Why does an animation stutter when a network response arrives?
> 2. Why does `{items.length && <List/>}` crash?
> 3. Where do auth tokens go, and why not AsyncStorage?
> 4. What's the difference between `(tabs)` and `tabs` as a folder name?
> 5. Why does `.map()` over 500 items behave worse in RN than on the web?
>
> If any answer is shaky, spend another few days there. **This is the foundation for
> everything after.**

---

# Phase 2 — Build Trailhead (weeks 4–11)

> **AI policy shifts by week.** Week 4–5: generate then rewrite from scratch and diff.
> Week 6+: normal delegation with careful review. Tier 3 code always gets your full
> attention.

## Week 4 — M0 + M1: foundation and shell

**Read**
- [Project architecture](./03-production/01-project-architecture.md)
- [Context engineering](./04-ai-workflow/04-context-engineering.md)
- [Trailhead spec](./05-practice-app/01-trailhead-spec.md)

**Do**
- [ ] M0 — full project setup **by hand**: TS strict, NativeWind, Reusables, ESLint,
      folder structure, `pnpm verify`, CI
- [ ] Write `CLAUDE.md` and `.cursor/rules/project.mdc`
- [ ] **Test your context**: fresh AI session, ask for a feature slice, grade the output
- [ ] M1 — full navigation shell, all screens reachable, deep links working

**Checkpoint**
- [ ] `pnpm verify` passes; CI green on a PR
- [ ] A cold AI session produces code that fits my conventions
- [ ] Every screen exists and is reachable

⏱️ ~14 hours

---

## Week 5 — M2: backend and auth

**Read**
- [State and data](./02-curriculum/07-state-and-data.md)
- [Security and privacy](./03-production/06-security-and-privacy.md)
- [Reviewing AI code](./04-ai-workflow/05-reviewing-ai-code.md) ← **read carefully**

**Do**
- [ ] Supabase project, full schema from the spec
- [ ] 🔴 **RLS policies — draft with AI, review every line yourself**
- [ ] Write RLS tests; prove user A cannot read user B's data
- [ ] Auth flow: sign up, sign in, session persistence in SecureStore
- [ ] Splash held until auth resolves — no flash of the wrong screen
- [ ] Seed data

**Checkpoint**
- [ ] I can sign up, kill the app, reopen, and still be signed in
- [ ] **I have proven, by calling the API directly with a second account, that
      cross-user access is impossible**
- [ ] RLS tests run in CI

⏱️ ~14 hours

---

## Week 6 — M3: discovery

**Do**
- [ ] TanStack Query with online + focus managers
- [ ] Cache persistence to MMKV
- [ ] Campgrounds feature slice, following your own conventions
- [ ] FlashList with cursor pagination, search, filters
- [ ] Optimistic favorites with rollback
- [ ] Skeletons, empty states, error states

**Checkpoint**
- [ ] Works offline from cache
- [ ] 60fps with 500+ items on a **low-end Android**
- [ ] Profiler shows rows not re-rendering during scroll

⏱️ ~12 hours

---

## Weeks 7–8 — M4: the booking flow

> The hardest and most valuable milestone. Two weeks. Don't rush it.

**Read**
- [Forms and validation](./02-curriculum/06-forms-and-validation.md)
- [Hamlet HQ reservations](./06-hamlet-hq/05-reservations.md)

**Do**
- [ ] Availability calendar from real data
- [ ] `exclude using gist` constraint
- [ ] Booking creation in a Postgres function — all rules server-side
- [ ] Idempotency keys
- [ ] Multi-step form with keyboard handling and draft persistence
- [ ] Cancellation with a fee window
- [ ] Conflict errors mapped to friendly UI

**Checkpoint**
- [ ] **Two devices booking the same slot simultaneously → exactly one booking**
      (actually test this — two simulators, tap together)
- [ ] Double-tap produces one booking
- [ ] I can explain every line of the Postgres function

⏱️ ~26 hours over two weeks

---

## Week 9 — M5: payments

> 🔴 Highest scrutiny in the entire project.

**Read**
- [Hamlet HQ payments](./06-hamlet-hq/04-payments.md) ← twice

**Do**
- [ ] Stripe test mode, payment sheet in the booking flow
- [ ] Payment intent created server-side; amount never from the client
- [ ] Webhook with signature verification and idempotency
- [ ] Booking confirmed only on webhook
- [ ] Refunds on cancellation
- [ ] **You** write the tests, not the AI

**Checkpoint**
- [ ] Tested: decline, network drop mid-payment, app killed after charge, duplicate
      webhook, double-tap
- [ ] None of them produce a wrong charge or an orphaned booking
- [ ] Every line of payment code reviewed against the Tier 3 checklist

⏱️ ~14 hours

---

## Week 10 — M6 + M7: push, camera, offline

**Read**
- [Native APIs](./02-curriculum/08-native-apis.md)
- [Hamlet HQ messaging](./06-hamlet-hq/06-messaging.md)

**Do**
- [ ] Push notifications end to end on real devices, both platforms
- [ ] Permission priming flows with `canAskAgain` handling
- [ ] Deep link from notification → correct screen (including from a killed app)
- [ ] Trail reports: camera, compression, GPS
- [ ] Offline mutation queue with idempotency

**Checkpoint**
- [ ] Push arrives on a real iPhone and a real Android
- [ ] Tapping a notification from a **killed** app opens the right screen
- [ ] Airplane mode → 2 reports → force quit → reopen → reconnect → **exactly 2** on
      the server

⏱️ ~14 hours

---

## Week 11 — M8 + M9: polish, tests, CI

**Read**
- [Animation and gestures](./02-curriculum/09-animation-and-gestures.md)
- [Testing strategy](./03-production/02-testing-strategy.md)
- [Observability](./03-production/05-observability.md)

**Do**
- [ ] Collapsing header, swipe actions, skeletons, success animation + haptics
- [ ] Full accessibility pass with VoiceOver and TalkBack
- [ ] Unit tests for business logic; 5 Maestro flows
- [ ] Sentry with source maps verified
- [ ] CI running everything

**Checkpoint**
- [ ] I can navigate the whole app with a screen reader
- [ ] Animations hold 60fps while a large fetch runs
- [ ] I introduced a deliberate bug and the test suite caught it

⏱️ ~14 hours

---

## Week 12 — M10: ship it

**Read**
- [CI/CD with EAS](./03-production/03-ci-cd-with-eas.md)
- [Shipping to stores](./03-production/04-shipping-to-stores.md)

**Do**
- [ ] Apple Developer + Play Console accounts (start early — verification takes days)
- [ ] Icons, screenshots, privacy policy, store listings
- [ ] Production builds, TestFlight + Play internal testing
- [ ] **5 real people using it**
- [ ] Fix their bugs
- [ ] **Ship an EAS Update** to fix something without a store review
- [ ] Back up your Android keystore

> ### 🎓 Phase 2 gate — you are now a React Native developer
> - [ ] Real people have my app on their phones
> - [ ] I fixed a bug they found
> - [ ] I shipped an OTA update
> - [ ] I can explain every file in my repo
>
> **Write a post-mortem.** What surprised you? What would you do differently? What do
> you still not understand? That document is the most valuable input into Hamlet HQ.

⏱️ ~14 hours

---

# Phase 3 — Hamlet HQ (weeks 13–14)

> You now have the judgment to make architectural decisions for a real product. Use it.

## Week 13 — Foundations and design partner

**Read**
- [Hamlet HQ product brief](./06-hamlet-hq/01-product-brief.md)
- [Domain model](./06-hamlet-hq/02-domain-model.md)
- [Architecture](./06-hamlet-hq/03-architecture.md)

**Do**
- [ ] **Find your design partner community.** Highest-priority task of the week.
      Ideally your own HOA, or one where you know a board member.
- [ ] Interview 3 board members and 5 residents. Ask what they do today, not what they
      want.
- [ ] Revise the product brief based on what you learn (you *will* be surprised)
- [ ] Register the company, domain, Apple/Play accounts under the business
- [ ] Set up the monorepo; migrate your Trailhead patterns

**Checkpoint**
- [ ] A real community has agreed to be my design partner
- [ ] I've revised the spec based on real conversations

⏱️ ~14 hours

---

## Week 14 — Schema and first vertical slice

**Do**
- [ ] Full Hamlet HQ schema with multi-tenancy from migration one
- [ ] RLS policies + tests for every table
- [ ] Auth with household/unit model
- [ ] **One complete vertical slice:** amenity reservations, end to end
- [ ] Deploy to TestFlight; get your design partner's board using it

**Checkpoint**
- [ ] Real board members are using a real feature
- [ ] Cross-tenant isolation proven by test
- [ ] I have a roadmap for the next 8 weeks based on their feedback

⏱️ ~14 hours

---

# Daily rhythm

```
Start (15 min)
  □ Pick ONE task
  □ Write the spec in your own words
  □ Decide the tier (🟢 delegate / 🟡 review / 🔴 own it)

Work (2–3 hr blocks)
  □ Plan mode first for anything non-trivial
  □ Implement in slices
  □ Review each slice — git add -p
  □ pnpm verify before every commit
  □ Run on BOTH platforms

End (15 min)
  □ Push a branch, open a PR, read your own diff
  □ Note anything you accepted but don't fully understand
  □ Tomorrow's first task
```

**The "don't fully understand" list is the most important habit here.** If it's
growing, slow down. If it's empty, you can go faster.

---

# Weekly review

Every Friday, 30 minutes:

```
□ Did I hit this week's checkpoint? If not, why?
□ What did I accept without understanding? Go back and understand it.
□ What did I correct the AI on twice? → put it in CLAUDE.md
□ Did I test on a real low-end Android this week?
□ Is anything in the codebase I'd be embarrassed to show a senior engineer?
□ What's the biggest risk to next week?
```

---

# Tracker

| Wk | Focus | Deliverable | ✓ |
|---|---|---|---|
| 1 | Environment + fundamentals | Apps running on both platforms | ☐ |
| 2 | Layout + NativeWind | 3 screens rebuilt from real apps | ☐ |
| 3 | Navigation + design system | 6-screen app + component inventory | ☐ |
| — | **Phase 1 gate** | 5 questions answered cold | ☐ |
| 4 | M0 + M1 | Foundation + navigation shell + CLAUDE.md | ☐ |
| 5 | M2 | Backend + auth + **RLS proven** | ☐ |
| 6 | M3 | Discovery at 60fps on cheap Android | ☐ |
| 7–8 | M4 | Booking flow, race-proof | ☐ |
| 9 | M5 | Payments, all failure paths tested | ☐ |
| 10 | M6 + M7 | Push + camera + offline | ☐ |
| 11 | M8 + M9 | Polish + tests + CI | ☐ |
| 12 | M10 | **Shipped to TestFlight** | ☐ |
| — | **Phase 2 gate** | Real users + OTA update + post-mortem | ☐ |
| 13 | Hamlet HQ foundations | Design partner secured | ☐ |
| 14 | First vertical slice | Board using reservations | ☐ |

---

# If you fall behind

You will. Here's the triage:

**Cut these first:** week 2's "rebuild three real apps" (do one), M8 polish, some
Maestro flows.

**Never cut these:**
- Phase 1 entirely — it's the foundation for reviewing everything after
- RLS testing (week 5)
- The booking concurrency test (week 8)
- Payment failure-path testing (week 9)
- Actually shipping (week 12)

**If you're 3+ weeks behind:** you're likely spending too long polishing. Ship uglier,
sooner. The learning is in shipping, not in perfecting.

**If a week takes twice as long:** that's normal and it's fine. The calendar is a
guide, not a commitment. What matters is that checkpoints genuinely pass.

---

**Next:** [Reference → Stack decisions](./08-reference/stack-decisions.md)
