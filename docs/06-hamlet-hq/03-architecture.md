# Hamlet HQ — Architecture

System design for a solo founder building a product that handles other people's money.

---

## 1. The guiding constraint

**You are one person.** Every architectural decision should be evaluated against:

> *If this breaks at 2am, can I diagnose and fix it alone?*

That rules out a lot of otherwise-reasonable choices: microservices, self-managed
Kubernetes, custom auth, event-sourced ledgers, bespoke sync engines. All defensible
with a team. All liabilities alone.

**Choose boring, managed, and well-documented.** Your competitive advantage is domain
understanding and shipping speed, not infrastructure.

---

## 2. System overview

```
┌─────────────────────┐     ┌──────────────────────┐
│   Mobile (Expo)     │     │   Web (Next.js)      │
│   Residents         │     │   Board dashboard    │
│   iOS + Android     │     │                      │
└──────────┬──────────┘     └──────────┬───────────┘
           │                            │
           └────────────┬───────────────┘
                        │  HTTPS + JWT
           ┌────────────▼─────────────┐
           │       Supabase           │
           │  ┌────────────────────┐  │
           │  │ Postgres + RLS     │  │  ← authorization lives here
           │  │ Auth               │  │
           │  │ Storage            │  │
           │  │ Realtime           │  │
           │  │ Edge Functions     │  │  ← money + push live here
           │  └────────────────────┘  │
           └──┬────────────┬──────────┘
              │            │
      ┌───────▼─────┐ ┌────▼──────────┐
      │   Stripe    │ │  Expo Push    │
      │   Connect   │ │  → APNs/FCM   │
      └─────────────┘ └───────────────┘

Cross-cutting: Sentry (errors) · PostHog (product analytics) · Resend (email)
```

Two clients, one backend, three external services. That's the whole system, and it's
deliberately small enough to hold in your head.

---

## 3. Why Supabase

**The decision:** Supabase as the backend, not a custom Node/Rails API.

**Why it's right for this product specifically:**

| Reason | Detail |
|---|---|
| **RLS is the authorization model** | Multi-tenant isolation enforced in the database, not scattered across endpoints. For a product where a privacy leak is existential, having one auditable place for authorization is worth a great deal. |
| **Postgres is the right database** | HOA data is deeply relational. Units, households, assessments, allocations — all joins. Plus `exclude using gist` for booking conflicts, which no document store can do. |
| **Auth included** | Email, magic link, OAuth, and — importantly — Apple Sign In, which the App Store requires if you offer any social login. |
| **Realtime included** | Broadcasts and availability updates without running a socket server. |
| **Edge Functions** | Somewhere to put the code that must not run on a client: payments, push fan-out, webhooks. |
| **Managed** | Backups, scaling, patching. Not your problem at 2am. |
| **Escape hatch** | It's just Postgres. If you outgrow it, you take your database and go. Not a lock-in trap. |

**What you give up:** fine-grained control over the API layer, and some complex queries
are awkward through PostgREST. Both are manageable — drop to a Postgres function when
the query gets hairy.

**The alternative worth considering:** a plain Postgres instance (Neon, RDS) plus a
small Node/Hono API on Fly.io or Railway. More control, more code to maintain, no RLS
safety net. Choose this only if you find yourself fighting Supabase constantly — which
for this domain, you probably won't.

---

## 4. Where each kind of logic lives

The most important architectural decision in the system. Get this wrong and you have
either an insecure app or an unmaintainable one.

| Logic | Lives in | Why |
|---|---|---|
| UI state, navigation | Mobile/web client | Presentation |
| Form validation (UX) | Client, via shared Zod | Fast feedback |
| Form validation (truth) | Database constraints + Edge Function | Client is untrusted |
| **Authorization** | **RLS policies** | One auditable place |
| **Booking conflict prevention** | **DB constraint** | Race-proof |
| **Booking rules** (windows, limits) | **Postgres function** | Must not be client-editable |
| **Payment intent creation** | **Edge Function** | Amount must be server-computed |
| **Payment confirmation** | **Stripe webhook → Edge Function** | Client can't be trusted to assert payment |
| Push fan-out | Edge Function | Needs the full recipient list |
| Scheduled work (dues, reminders) | pg_cron → Edge Function | |
| Read queries | Client → PostgREST, filtered by RLS | Simple, fast |

**The rule that captures all of it:**

> Anything a malicious client could exploit by lying — prices, permissions,
> availability, payment status — is computed and enforced server-side. The client only
> ever *requests*; the server *decides*.

### A concrete example

```
❌ WRONG
Client: computes fee = $50, calls stripe.createPaymentIntent(5000),
        then inserts reservation with status='confirmed'

  A modified client sets fee = 0. Or creates a confirmed reservation
  with no payment at all.

✅ RIGHT
Client: POST /functions/v1/create-reservation
        { amenityId, startsAt, endsAt, partySize, idempotencyKey }

Edge Function (service role):
  1. Verify the caller's membership and unit           ← authorization
  2. Load the amenity's policy from the DB             ← rules from server
  3. Validate window, notice, duration, per-unit limit
  4. Compute the fee from the amenity's stored rate    ← server computes money
  5. Insert reservation (status='pending')
     → the exclude constraint rejects any overlap      ← race-proof
  6. Create the Stripe PaymentIntent for the computed amount
  7. Return the client secret

Stripe webhook (later):
  8. Verify signature
  9. Mark payment succeeded, reservation confirmed     ← truth comes from Stripe
 10. Write ledger entry
 11. Send confirmation push
```

The client never sees a number it can change, and never asserts a fact the server
needs to trust.

---

## 5. Mobile app architecture

```
apps/mobile/
├── app/                          # Expo Router — routes only, thin
│   ├── _layout.tsx
│   ├── (auth)/
│   └── (app)/
│       ├── _layout.tsx           # community context + role guard
│       ├── (tabs)/
│       ├── amenity/[id]/
│       ├── reservation/[id]/
│       ├── payments/
│       └── broadcast/[id]/
├── src/
│   ├── components/ui/            # React Native Reusables
│   ├── features/
│   │   ├── auth/
│   │   ├── communities/
│   │   ├── reservations/         # api · keys · hooks · schemas · components
│   │   ├── payments/
│   │   ├── broadcasts/
│   │   └── events/
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── query.ts
│   │   ├── storage.ts
│   │   └── notifications.ts
│   └── theme/
└── plugins/                      # config plugins
```

### The community context

Every screen operates within a selected community. This is core to the app's shape:

```tsx
// src/features/communities/context.tsx
export function useActiveCommunity() {
  const communityId = useCommunityStore((s) => s.activeCommunityId);
  const { data: memberships } = useMyMemberships();

  const membership = memberships?.find((m) => m.community_id === communityId);

  return {
    communityId,
    membership,
    role: membership?.role ?? null,
    unitId: membership?.unit_id ?? null,
    isBoard: ['board_member', 'manager', 'admin'].includes(membership?.role ?? ''),
  };
}
```

Most residents belong to one community and never see a switcher. But the model must
support several from day one — board members often own in two, and managers work across
many.

> ⚠️ **`isBoard` gates UI, not access.** Hiding a button is presentation. The actual
> authorization is the RLS policy. Never conflate the two — see
> [reviewing AI code](../04-ai-workflow/05-reviewing-ai-code.md#client-side-only-authorization).

---

## 6. The monorepo

```
hamlet-hq/
├── apps/
│   ├── mobile/            # Expo — residents
│   └── web/               # Next.js — board dashboard
├── packages/
│   ├── core/              # types, Zod schemas, business rules — pure TS
│   ├── api/               # generated Supabase types + typed client
│   └── tokens/            # design tokens shared with both
├── supabase/
│   ├── migrations/
│   └── functions/         # Edge Functions
└── docs/
```

**`packages/core` is the important one.** Business rules that must agree across mobile,
web, and server:

```ts
// packages/core/src/reservations/rules.ts
export function canCancelFree(reservation: Reservation, policy: AmenityPolicy, now: Date) {
  const hoursUntil = differenceInHours(reservation.startsAt, now);
  return hoursUntil >= policy.cancellationWindowHours;
}

export function cancellationFeeCents(reservation: Reservation, policy: AmenityPolicy, now: Date) {
  if (canCancelFree(reservation, policy, now)) return 0;
  return Math.round(reservation.feeCents * (policy.cancellationFeePct / 100));
}
```

Imported by the mobile app (to *show* the fee), the web dashboard (to show it too), and
the Edge Function (to *charge* it). **One implementation, no drift.**

Rule for `packages/core`: **pure TypeScript only.** No React, no React Native, no
Next.js imports. It must run in Deno (Edge Functions) and in both clients. Put that in
its `CLAUDE.md`.

---

## 7. Offline strategy

Residents open the app in parking garages and basements. Offline is a requirement.

| Data | Strategy |
|---|---|
| Broadcasts | Cache aggressively; readable offline. **Highest priority.** |
| Amenity list | Cache; rarely changes |
| My reservations | Cache; readable offline |
| Availability | Network-only — must be fresh |
| Creating a reservation | ❌ **Do not queue offline** |
| Payments | ❌ **Never offline** |
| Documents | Cache on explicit download |

**Why reservations and payments are not queued offline** — this is a deliberate
departure from what you did in Trailhead:

A queued reservation from 40 minutes ago may be for a slot that's since been taken. The
user believes they have a booking; they don't. For a scarce, contended resource that's
worse than a clear "you're offline" message.

Payments are the same, amplified: never create the impression money moved when it
didn't.

**The right behaviour:** disable the action with a clear explanation.

```tsx
{!isConnected && (
  <Banner variant="warning">
    You're offline. You can browse and read announcements, but booking
    requires a connection.
  </Banner>
)}
```

This is a case where the more sophisticated engineering (offline queue) is the wrong
product decision. Worth internalizing.

---

## 8. Realtime

Used sparingly, where it earns its cost:

| Event | Realtime? |
|---|---|
| New broadcast published | ✅ Yes — immediacy is the point |
| Availability changed | ✅ Yes, while the booking screen is open |
| Payment succeeded | ✅ Yes — closes the loop after the Stripe sheet |
| Event RSVP count | ⚠️ Only on the event screen |
| Everything else | ❌ Polling / refetch on focus is fine |

Always unsubscribe when the app backgrounds — an open socket is a battery drain, and
users notice.

---

## 9. Scheduled work

```sql
-- Generate monthly dues assessments on the 1st
select cron.schedule('generate-dues', '0 6 1 * *', $$
  select net.http_post(
    url := 'https://<project>.supabase.co/functions/v1/generate-dues',
    headers := '{"Authorization": "Bearer <service-role-key>"}'::jsonb
  );
$$);
```

| Job | Schedule |
|---|---|
| Generate dues assessments | Monthly, 1st |
| Late fee assessment | Daily |
| Payment reminders (3 days before due) | Daily |
| Reservation reminders (day before) | Hourly |
| Event reminders | Hourly |
| Mark past reservations completed | Hourly |
| Publish scheduled broadcasts | Every 15 min |
| Clean up dead push tokens | Weekly |

**Every scheduled job must be idempotent.** They will re-run. Generating dues twice for
the same month is a billing incident — key on `(unit_id, period_start, kind)` with a
unique constraint so the second run is a no-op.

---

## 10. Environments

| Env | Supabase | Stripe | App |
|---|---|---|---|
| Local | Local (Docker) | Test | Expo dev |
| Preview | Branch DB | Test | EAS preview |
| Staging | Staging project | Test | TestFlight / internal |
| Production | Production project | **Live** | App Store / Play |

Separate `bundleIdentifier` per variant so dev, staging, and production install side by
side:

```ts
// app.config.ts
const variant = process.env.APP_VARIANT ?? 'production';
const ids = {
  development: 'com.hamlethq.app.dev',
  staging:     'com.hamlethq.app.staging',
  production:  'com.hamlethq.app',
};
```

> 🔴 **Never point a non-production app at live Stripe.** Test cards in production
> create real Stripe objects, and a real charge against a real card in a "test" is a
> genuinely bad day. Guard it in code:
> ```ts
> if (variant !== 'production' && stripeKey.startsWith('pk_live')) {
>   throw new Error('Live Stripe key in non-production build');
> }
> ```

---

## 11. Scaling — when to worry

For calibration, because it's easy to over-engineer:

| Scale | Reality |
|---|---|
| 10 communities, 2,000 units | Supabase free/pro tier. Nothing to think about. |
| 100 communities, 20,000 units | Pro tier. Add indexes. Still nothing exotic. |
| 1,000 communities, 200k units | Read replicas, caching, partition `ledger_entries` |
| Beyond | You have a team. This document is obsolete. |

**You will not hit a scaling problem before you hit a distribution problem.** Build for
10 communities. Make the schema right (multi-tenancy, integer money, constraints)
because *that* is expensive to change — and let performance follow the load.

---

## 12. Decision log

Record decisions with reasoning, so future-you (and your AI agents) understand *why*.

```markdown
# ADR 003 — Deny offline reservation creation

Date: 2026-XX-XX
Status: Accepted

## Context
Trailhead queued bookings offline and synced on reconnect. Should Hamlet
HQ do the same for amenity reservations?

## Decision
No. Reservations require a live connection.

## Reasoning
Amenity slots are scarce and contended. A reservation queued 40 minutes
ago may target a slot since taken. Syncing it later either fails (user
believed they had a booking) or succeeds against stale availability.
A clear "you're offline" message is better UX than a booking that
silently evaporates.

Broadcasts, amenity lists, and reservation history remain fully readable
offline.

## Consequences
- Booking UI must handle the offline state explicitly
- No idempotency-replay complexity for reservations
- If users complain, revisit with a "request slot" model that's explicitly
  provisional
```

Keep these in `docs/adr/`. Three paragraphs each. They're the highest-value
documentation you can write, and they're excellent AI context.

---

## Check yourself

1. Why does authorization live in RLS rather than in API endpoints?
2. Why must the payment amount be computed server-side?
3. Why not queue reservations offline, when Trailhead did?
4. What must be true of every scheduled job?
5. What goes in `packages/core`, and what's forbidden there?

<details>
<summary>Answers</summary>

1. It puts every authorization rule in one auditable place, enforced by the database
   regardless of which client or code path reaches it. Scattered endpoint checks mean
   one forgotten check is a breach, and there's no single place to review.
2. A client can be modified to send any amount. If the server trusts a client-supplied
   price, anyone can book a $200 clubhouse rental for $0. The server loads the rate
   from its own database.
3. Amenity slots are scarce and contended. A queued reservation may target a slot that's
   since been taken, so the user believes they have a booking they don't have. A clear
   offline message is better than a booking that silently evaporates.
4. Idempotent. Cron jobs re-run — on retry, on redeploy, on overlap. Generating dues
   twice for the same month is a billing incident, so it needs a uniqueness key that
   makes the second run a no-op.
5. Pure TypeScript business rules, types, and Zod schemas shared across mobile, web,
   and Edge Functions. Forbidden: any React, React Native, or Next.js import — it must
   run in Deno and both clients.

</details>

---

**Next:** [Payments →](./04-payments.md)
