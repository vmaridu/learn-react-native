# Hamlet HQ — Product Brief

The founding technical document. Written to be handed to a co-founder, a contractor, or
an AI agent as authoritative context.

---

## 1. What it is

> **Hamlet HQ** is the operating system for HOA and residential communities. It gives
> residents a single app to book amenities, pay dues, RSVP to community events, and
> receive official announcements — and gives boards and managers the tools to run all
> of it without spreadsheets, group texts, and paper sign-up sheets.

**One-line positioning:** *Your community, in one app.*

---

## 2. The problem

HOA communities today run on a stack of things that don't talk to each other:

- A paper or Google Sheets sign-up for the clubhouse and tennis courts
- Dues collected by paper check, or a clunky third-party payment portal
- A Facebook group, a WhatsApp chat, or a physical noticeboard for announcements
- Email chains for event RSVPs
- A property manager fielding the same questions by phone every week

The result is predictable: double bookings, missed announcements, late dues, low event
attendance, and a board that spends its volunteer hours on administration instead of
community.

**Whose pain is sharpest:**

| Persona | Pain |
|---|---|
| **Resident** | "Is the clubhouse free Saturday? Who do I even ask?" |
| **Board member** | Volunteer, unpaid, drowning in admin, personally liable for mistakes |
| **Property manager** | Managing 5–20 communities, each with different ad-hoc systems |

The board member is the buyer. The resident is the user. **Those are different people
with different needs, and getting that right is the core product challenge.**

---

## 3. Who it's for

**Primary market:** self-managed and small professionally-managed HOAs, 50–500 units.

Why that band:
- Below 50 units, a group chat genuinely is enough
- Above 500, communities use enterprise platforms with procurement cycles you can't
  win as a solo founder
- 50–500 is large enough to have real pain, small enough to buy on a board vote

**Buyer:** the HOA board (usually the president or treasurer).
**Users:** every resident in the community.
**Champion:** typically one frustrated board member who volunteered to "find something
better."

---

## 4. The v1 feature set

Ruthlessly scoped. Everything here maps directly to something you'll have already built
in Trailhead.

### 🔵 Reservations
- Browse community amenities (pool, clubhouse, tennis courts, guest suite, BBQ pits)
- See real availability on a calendar
- Book a time slot, with community-defined rules (max duration, advance window, per-
  household limits)
- Pay a usage fee where applicable
- Cancel within a policy window
- Board sees all bookings; can block out dates for maintenance

### 🟢 Payments
- Recurring dues (monthly / quarterly / annual)
- One-off charges: amenity fees, fines, special assessments
- Autopay enrollment
- Payment history and downloadable receipts
- Board dashboard: who's paid, who's late, total collected
- Payouts to the community's bank account

### 🟡 Events
- Community calendar
- RSVP with capacity and guest counts
- Add to device calendar
- Reminders
- Board creates and manages events

### 🟠 Broadcasts
- Board publishes announcements to the whole community or a segment
- Severity levels (info / important / urgent)
- Push notification + in-app feed + optional email
- Read receipts in aggregate ("312 of 400 residents have seen this")
- Scheduled publishing

### ⚪ Foundation
- Multi-community support (a person can live in one, manage several)
- Roles: resident, board member, manager, admin
- Household model (multiple residents per unit)
- Directory (opt-in)
- Documents (bylaws, meeting minutes, forms)

---

## 5. Deliberately not in v1

Every one of these is a real request you will get. Saying no is what lets you ship.

| Excluded | Why | When |
|---|---|---|
| Violation / fine workflows | Legally sensitive, varies by state | v2 |
| Architectural review requests | Long-running, document heavy | v2 |
| Full accounting / GL | Competing with established accounting software | Never — integrate instead |
| Vendor management | Different buyer, different product | v3 |
| Voting / elections | Legal requirements vary enormously by jurisdiction | v2, carefully |
| Chat / DMs | Moderation liability, huge scope | Probably never |
| Maintenance work orders | Real need, but a separate product surface | v2 |
| Access control / gate integration | Hardware partnerships | v3 |
| White-labeling | Enterprise ask | When someone pays for it |

> **The discipline:** every one of these will be requested during your first ten sales
> calls. Write them down, thank the person, and ship v1 anyway. A product that does
> four things excellently beats one that does twelve things adequately — especially
> when a volunteer board is the one adopting it.

---

## 6. What makes it defensible

Be honest: the features are not hard to copy. The moat is elsewhere.

1. **Switching cost through data.** Once a community's payment history, documents, and
   booking rules live in Hamlet HQ, leaving is painful.
2. **Network effects within a community.** Value scales with resident adoption — a
   community with 80% adoption won't switch to restart at zero.
3. **The board relationship.** Boards turn over annually; the platform that survives
   handover becomes the default.
4. **Trust with money.** Once you're the system of record for dues, you're
   infrastructure, not an app.
5. **Vertical depth.** Generic tools (Slack, Google Forms, Venmo) don't understand
   HOA-specific concepts: households, assessments, quorum, reserve funds.

**What is NOT a moat:** the mobile app itself. Assume it's replicable. Compete on
reliability, support, and being the place the money already lives.

---

## 7. Risks worth naming now

| Risk | Severity | Mitigation |
|---|---|---|
| **Handling other people's money** | 🔴 High | Stripe Connect; never touch funds directly. Get the payment architecture right — see [payments](./04-payments.md). |
| **Privacy between neighbours** | 🔴 High | Strict RLS. A resident must never see another's payment status. One leak destroys trust permanently. |
| **Low resident adoption** | 🔴 High | Board mandate + a genuinely useful first action (book something) within 60 seconds of install |
| **Long sales cycle** (board votes) | 🟡 Medium | Free pilot for one community; let residents pull it in |
| **Seasonality** (pool bookings) | 🟡 Medium | Dues and broadcasts carry off-season value |
| **State-by-state legal variation** | 🟡 Medium | Stay out of legally-regulated workflows (voting, fines) in v1 |
| **Solo founder bus factor** | 🟡 Medium | Boring, well-documented tech. Managed services. This docs folder. |
| **Support burden** | 🟡 Medium | Self-serve onboarding; in-app help; don't sell to communities you can't support |

The first two are the ones that can end the company rather than merely slow it down.
Both are engineering problems, and both are addressed in the architecture docs.

---

## 8. Success metrics

**Product health** (what tells you it's working):

| Metric | Target at 6 months |
|---|---|
| Resident activation (installed + completed one action) | > 60% of units |
| Weekly active residents / total residents | > 25% |
| Reservations per community per week | > 15 |
| Dues collected via app | > 70% |
| Broadcast read rate | > 65% |
| Crash-free sessions | > 99.5% |

**Business health:**

| Metric | Target |
|---|---|
| Communities live | 10 by month 6 |
| Net revenue retention | > 100% |
| Board-member NPS | > 40 |
| Support tickets per community per month | < 5 |

**The metric that matters most early:** resident activation rate. A community that
signs up but where only 15% of residents install is a churn event waiting to happen,
regardless of what the board says.

---

## 9. Pricing sketch

Not a final decision — a starting hypothesis to test.

**Per-unit SaaS:** $2–4 per unit per month, billed to the HOA annually.
- 200-unit community ≈ $500–800/month
- Aligns price with value and with your support cost

**Plus payment processing:** pass Stripe's fee through, optionally with a small margin
on ACH.

**Why not free-for-residents-with-ads:** you're handling dues. Trust is the product.
Ads would undermine it.

**Why not per-transaction only:** revenue would collapse in the off-season, and
broadcasts/documents deliver value with no transaction attached.

---

## 10. The path to launch

| Phase | Goal | Duration |
|---|---|---|
| **0. Prep** | Finish Trailhead. Ship it. Learn the platform. | Weeks 1–11 |
| **1. Design partner** | One friendly community. Free. Build with them in the room. | Weeks 12–20 |
| **2. Private beta** | 3 communities. Charge something. Prove retention. | Months 6–9 |
| **3. Launch** | 10 communities. Repeatable onboarding. Support process. | Months 9–12 |

**The single most important decision in this document:** find your design partner
community *before* you build. Ideally your own HOA, or one where you know a board
member.

Building an HOA platform without a real community giving you weekly feedback is how you
end up with a beautiful product that solves the wrong problems. The domain has a lot of
non-obvious rules — guest policies, household definitions, quorum, assessment
schedules — and you will not guess them correctly.

---

## 11. Technical north stars

The engineering principles that follow from everything above:

1. **Money is sacred.** Stripe Connect, server-side amounts, idempotency everywhere,
   integer cents, full audit trail. Never a float. Never a client-supplied price.
2. **Privacy between neighbours is a hard boundary.** RLS on every table. Default deny.
   Tested with real cross-tenant attempts.
3. **Multi-tenancy from day one.** Retrofitting `community_id` is a rewrite. Every
   table has it, every policy checks it.
4. **Broadcasts must be readable without push.** Push is a hint, never the delivery
   mechanism.
5. **Offline-tolerant.** Residents will open the app in a parking garage.
6. **Boring, well-supported technology.** You're one person. Managed services over
   clever infrastructure, every time.
7. **The board needs a web dashboard.** Nobody manages a 300-unit community from a
   phone. Mobile for residents, web for boards.

---

**Next:** [Domain model →](./02-domain-model.md)
