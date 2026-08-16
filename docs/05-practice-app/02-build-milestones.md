# Trailhead — Build Milestones

Ten milestones from empty repo to TestFlight. Each has a goal, a task list, explicit
"done" criteria, and the curriculum docs it exercises.

**Rule: don't start the next milestone until the current one meets its done criteria.**
Half-finished features accumulate into a codebase you can't reason about — which is
exactly the failure this whole curriculum is designed to prevent.

---

## M0 — Foundation

**Goal:** a running app with all quality gates in place, before any features.

**Tasks**
- [ ] `npx create-expo-app@latest trailhead` in `apps/`
- [ ] TypeScript strict + `noUncheckedIndexedAccess` + path aliases
- [ ] NativeWind 4 configured, `className` working
- [ ] React Native Reusables init; add button, card, input, text
- [ ] Design tokens in `global.css`, light + dark
- [ ] ESLint + Prettier + the AI-guard rules
- [ ] `pnpm verify` script
- [ ] Folder structure: `app/`, `src/features/`, `src/lib/`, `src/components/`
- [ ] `CLAUDE.md` + `.cursor/rules/`
- [ ] Git repo, first commit, GitHub Actions running `verify` on PRs
- [ ] Kitchen-sink screen rendering every component in both themes

**Done when:** the app runs on both platforms, `pnpm verify` passes, CI is green, and
a fresh AI session asked to "add a feature slice" produces something that fits your
conventions.

**Reads:** [first app](../01-foundations/04-first-app-walkthrough.md) ·
[NativeWind](../02-curriculum/02-styling-with-nativewind.md) ·
[design system](../02-curriculum/03-design-system.md) ·
[context engineering](../04-ai-workflow/04-context-engineering.md)

> ⚠️ Do M0 **by hand**, without AI generation. It's the foundation you'll review
> everything else against.

---

## M1 — Navigation shell

**Goal:** every screen exists and is reachable, with placeholder content.

**Tasks**
- [ ] `(auth)` and `(app)` route groups
- [ ] Tab navigator: discover, bookings, alerts, profile
- [ ] Dynamic routes: `campground/[id]`, `site/[id]`, `booking/[id]`
- [ ] Modal group with a filters screen
- [ ] Typed routes enabled — a bad path is a compile error
- [ ] Deep linking: `trailhead://campground/123` works on both platforms
- [ ] Safe areas correct on every screen
- [ ] Android hardware back handled

**Done when:** you can reach every screen, deep links work on a physical device of each
platform, and no screen has a safe-area problem.

**Reads:** [navigation](../02-curriculum/04-navigation.md)

---

## M2 — Backend and auth

**Goal:** real users, real data, real authorization.

**Tasks**
- [ ] Supabase project; schema from the spec
- [ ] **RLS policies for every table** — write these deliberately
- [ ] Seed data: 3 campgrounds, ~20 sites, some activities
- [ ] Supabase client with SecureStore-backed session persistence
- [ ] Sign up / sign in / forgot password
- [ ] Auth context; splash held until session resolves
- [ ] Route guarding with `Stack.Protected`
- [ ] Profile screen reading real data
- [ ] Sign out clears everything

**Done when:** you can sign up, restart the app and stay signed in, and — critically —
**you have verified with a second account that user A cannot read user B's data.**
Test that by calling the API directly, not just through your UI.

**Reads:** [navigation § auth](../02-curriculum/04-navigation.md#4-auth-gated-navigation) ·
[state and data](../02-curriculum/07-state-and-data.md) ·
[security](../03-production/06-security-and-privacy.md)

> 🔴 **Tier 3.** RLS policies are authorization. Read every line yourself.

---

## M3 — Discovery

**Goal:** the list experience, done properly.

**Tasks**
- [ ] TanStack Query configured with online + focus managers
- [ ] Cache persistence to MMKV
- [ ] `campgrounds` feature slice (api / keys / hooks / schemas)
- [ ] FlashList with cursor-based infinite scroll
- [ ] Pull to refresh
- [ ] Debounced search
- [ ] Filter bottom sheet
- [ ] Campground detail with image gallery
- [ ] Favorites with optimistic toggle + rollback
- [ ] Loading skeletons, empty state, error state with retry
- [ ] Images resized server-side, blurhash placeholders

**Done when:** the list scrolls at 60fps with 500+ items **on a low-end Android
device**, works offline from cache, and the Profiler shows rows not re-rendering
during scroll.

**Reads:** [lists and performance](../02-curriculum/05-lists-and-performance.md) ·
[state and data](../02-curriculum/07-state-and-data.md)

---

## M4 — Booking flow

**Goal:** the hardest and most valuable milestone. This is Hamlet HQ's reservation
engine in disguise.

**Tasks**
- [ ] Availability calendar showing real booked dates
- [ ] Multi-step form (dates → party → add-ons → review)
- [ ] Zod schemas shared between client and server
- [ ] `exclude using gist` constraint preventing overlapping bookings
- [ ] Booking creation in a Postgres function — availability checked **server-side**
- [ ] Idempotency key on every booking attempt
- [ ] Keyboard never covers an input
- [ ] Draft survives backgrounding
- [ ] My Bookings list, grouped by status
- [ ] Booking detail with a QR code
- [ ] Cancellation with a 24h fee window
- [ ] Conflict error ("just taken") maps to a field error

**Done when:** two devices booking the same slot simultaneously results in exactly one
booking and a clean error for the other. **Actually test this** — two simulators, tap
at the same time.

**Reads:** [forms](../02-curriculum/06-forms-and-validation.md) ·
[reviewing AI code](../04-ai-workflow/05-reviewing-ai-code.md) ·
[Hamlet HQ reservations](../06-hamlet-hq/05-reservations.md)

> 🔴 **Tier 3.** This is the one to slow down on.

---

## M5 — Payments

**Goal:** money, in test mode, done correctly.

**Tasks**
- [ ] Stripe account (test mode); `@stripe/stripe-react-native` + config plugin
- [ ] Payment intent created **server-side** — amount never sent from the client
- [ ] Payment sheet in the booking flow
- [ ] Booking confirmed only on webhook, not on client success
- [ ] Webhook handler with signature verification
- [ ] Saved payment methods
- [ ] Refund path for cancellations
- [ ] All amounts integer cents, no floats
- [ ] Failure paths: declined card, network drop mid-payment, app killed after charge

**Done when:** you have deliberately tested a card decline, a network failure between
charge and confirmation, and a double-tap on pay — and none of them produce a wrong
charge or an orphaned booking.

**Reads:** [Hamlet HQ payments](../06-hamlet-hq/04-payments.md) ·
[reviewing AI code § Tier 3](../04-ai-workflow/05-reviewing-ai-code.md#7-the-tier-3-protocol)

> 🔴 **Tier 3, highest scrutiny in the project.**

---

## M6 — Alerts and push

**Goal:** broadcast messaging end to end.

**Tasks**
- [ ] `expo-notifications` + permission priming flow
- [ ] Push token registration, stored per device, refreshed on launch
- [ ] Android notification channels
- [ ] Ranger compose-alert screen (role-gated)
- [ ] Send via Expo Push, batched
- [ ] Handle `DeviceNotRegistered` receipts — delete dead tokens
- [ ] In-app alert feed with unread state
- [ ] Tab badge for unread count
- [ ] Deep link from notification to alert detail
- [ ] Notification preferences per category
- [ ] Realtime: a new alert appears without a refresh

**Done when:** a ranger publishes an alert and it arrives as a push on a real device of
each platform, tapping it opens the right screen, and the alert is **also readable
in-app** if push never arrives.

**Reads:** [native APIs](../02-curriculum/08-native-apis.md) ·
[Hamlet HQ messaging](../06-hamlet-hq/06-messaging.md)

---

## M7 — Camera, location, offline

**Goal:** native capabilities and genuine offline support.

**Tasks**
- [ ] Trail report: photo + GPS + notes
- [ ] Permission priming for camera and location, with `canAskAgain` handling
- [ ] Image compressed to <500KB before upload
- [ ] Upload to Supabase Storage with progress
- [ ] **Offline mutation queue** — report created offline, syncs on reconnect
- [ ] Offline banner
- [ ] Degraded paths: no camera permission → text-only report; no location → manual
      trail selection
- [ ] Activities: RSVP with capacity, add to device calendar, reminder notification

**Done when:** you can go into airplane mode, file two reports, force-quit the app,
reopen it, restore connectivity, and get **exactly two** reports on the server —
not one, not four.

**Reads:** [native APIs](../02-curriculum/08-native-apis.md) ·
[state and data § offline](../02-curriculum/07-state-and-data.md#5-offline)

---

## M8 — Polish

**Goal:** the difference between "works" and "feels good."

**Tasks**
- [ ] Collapsing header on detail screens
- [ ] Swipe-to-cancel on booking rows
- [ ] Skeleton shimmer while loading
- [ ] Success animation + haptics on booking confirmation
- [ ] Staggered list entrance
- [ ] Reduced-motion respected
- [ ] Full accessibility pass with VoiceOver and TalkBack
- [ ] Every screen checked in dark mode
- [ ] Empty states for every list
- [ ] Error boundaries with a real recovery path
- [ ] App icon, splash screen, adaptive icon

**Done when:** you can navigate the entire app with a screen reader, every animation
holds 60fps while a large fetch runs, and nothing looks unfinished in dark mode.

**Reads:** [animation](../02-curriculum/09-animation-and-gestures.md) ·
[components § accessibility](../02-curriculum/01-components-and-layout.md#7-accessibility-is-not-optional)

---

## M9 — Testing and CI

**Goal:** confidence that a change didn't break something.

**Tasks**
- [ ] Jest + Testing Library configured
- [ ] Unit tests for business logic: fee calculation, availability, cancellation window
- [ ] Component tests for critical UI
- [ ] Maestro flows: sign-up, book, cancel, receive alert, offline report
- [ ] GitHub Actions: typecheck, lint, test on every PR
- [ ] EAS Build in CI
- [ ] Sentry wired with source maps uploaded
- [ ] Analytics on key events

**Done when:** CI is green on every PR, Maestro flows run against a real build, and you
have deliberately introduced a bug and confirmed the suite catches it.

**Reads:** [testing](../03-production/02-testing-strategy.md) ·
[CI/CD](../03-production/03-ci-cd-with-eas.md) ·
[observability](../03-production/05-observability.md)

---

## M10 — Ship it

**Goal:** the full release pipeline, executed for real.

**Tasks**
- [ ] Apple Developer + Google Play Console accounts
- [ ] App icons and screenshots for every required size
- [ ] Privacy policy hosted
- [ ] App Store privacy labels / Play Data Safety form
- [ ] `eas build --profile production` for both platforms
- [ ] `eas submit` to TestFlight and Play internal testing
- [ ] Five external testers using it
- [ ] Fix the bugs they find
- [ ] **Ship an EAS Update** to fix something without a store review
- [ ] Post-mortem: what you'd do differently in Hamlet HQ

**Done when:** real people have the app on their phones, you've fixed a bug they found,
and you've pushed an OTA update. **Then you're ready for Hamlet HQ.**

**Reads:** [shipping to stores](../03-production/04-shipping-to-stores.md) ·
[CI/CD](../03-production/03-ci-cd-with-eas.md)

---

## Progress tracker

| # | Milestone | Est. | Done | Notes |
|---|---|---|---|---|
| M0 | Foundation | 1 wk | ☐ | Do by hand, no AI generation |
| M1 | Navigation shell | 3 d | ☐ | |
| M2 | Backend + auth | 1 wk | ☐ | 🔴 RLS is Tier 3 |
| M3 | Discovery | 1 wk | ☐ | Measure on a cheap Android |
| M4 | Booking flow | 1.5 wk | ☐ | 🔴 Hardest milestone |
| M5 | Payments | 1 wk | ☐ | 🔴 Highest scrutiny |
| M6 | Alerts + push | 1 wk | ☐ | Needs real devices |
| M7 | Camera + offline | 1 wk | ☐ | |
| M8 | Polish | 1 wk | ☐ | |
| M9 | Testing + CI | 1 wk | ☐ | |
| M10 | Ship | 1 wk | ☐ | Store review takes days |

---

## How to use AI per milestone

| Milestone | AI usage |
|---|---|
| M0 | **None.** Build the foundation by hand. |
| M1 | Explain-only. Write routes yourself. |
| M2 | Draft RLS policies with AI, then review every line yourself. Tier 3. |
| M3 | Generate, then rewrite from scratch and diff. Learn the patterns. |
| M4 | Full loop with careful review. Tier 3 on availability logic. |
| M5 | Full loop, maximum scrutiny. Write the tests yourself. |
| M6–M8 | Normal delegation. Tier 2 review. |
| M9 | Delegate freely — tests are verifiable. |
| M10 | Delegate config; you own store submission decisions. |

Ramp deliberately. By M8 you'll have the judgment to review quickly and confidently,
because you earned it in M0–M4.

---

**Next:** [Hamlet HQ → Product brief](../06-hamlet-hq/01-product-brief.md)
