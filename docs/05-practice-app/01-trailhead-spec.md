# Trailhead — Practice App Spec

The app you'll build to learn React Native, designed as a **structural twin of Hamlet
HQ**.

---

## 1. Why this app, and not a to-do list

A practice app has to do two things: teach every technique you need, and be different
enough from the real product that you're learning rather than prematurely building.

**Trailhead** is a campground and trail community app. Every feature maps 1:1 onto a
Hamlet HQ feature:

| Trailhead | → | Hamlet HQ |
|---|---|---|
| Campground | → | HOA community |
| Campsite / shelter | → | Amenity (pool, clubhouse, tennis court) |
| Site booking | → | Amenity reservation |
| Booking fee | → | Reservation fee / dues |
| Ranger announcement | → | Board broadcast message |
| Campfire talk / guided hike | → | Community event |
| Trail condition report | → | Maintenance request |
| Camper / Ranger roles | → | Resident / Board member roles |
| Multiple campgrounds | → | Multi-tenancy across communities |

**Every technique transfers. No product decisions are wasted.** When you start Hamlet
HQ in week 12, you will have already solved its hard problems once, in a domain where
a mistake costs nothing.

It's also more fun than a to-do app, which matters over 8 weeks.

---

## 2. Product summary

> **Trailhead** helps campers find and book campsites, join guided activities, and stay
> informed about trail conditions — while giving rangers tools to manage sites,
> broadcast alerts, and run events.

**Two personas:**

- **Camper** — browses campgrounds, books sites, RSVPs to activities, reads alerts,
  reports trail conditions
- **Ranger** — manages sites and availability, sends alerts, creates activities,
  reviews trail reports

---

## 3. Feature list

Grouped by the skill each one teaches.

### Auth & onboarding
- Sign up / sign in (email + password, then magic link)
- Biometric unlock on return
- Profile with avatar upload
- Role assignment (camper by default; ranger by invite)
- Onboarding flow shown once

*Teaches: auth flows, secure token storage, SecureStore, biometrics, image upload,
route guarding, first-run state.*

### Discovery
- Browse campgrounds, infinite scroll
- Search with debounce
- Filter sheet (amenities, price, availability, distance)
- Map view with clustered pins
- Campground detail: photo gallery, description, amenities, reviews
- Favorites (optimistic toggle)

*Teaches: FlashList, pagination, search UX, bottom sheets, maps, image galleries,
optimistic updates.*

### Booking (the core flow)
- Select a site, pick dates on a calendar with real availability
- Multi-step booking form
- Price breakdown with fees
- Payment via Stripe (test mode)
- Confirmation with a QR code for check-in
- My Bookings: upcoming, past, cancelled
- Cancel with a fee window
- Modify dates
- Offline: queued, syncs on reconnect

*Teaches: multi-step forms, calendars, availability conflicts, payments, idempotency,
state machines, offline queues, QR generation.*

### Alerts (broadcast)
- Ranger composes an alert, targets a campground, sets severity
- Push notification to subscribed campers
- In-app alert feed with read/unread
- Alert detail with deep link from the notification
- Notification preferences per category

*Teaches: push notifications end to end, deep links, badges, realtime, preference
management, delivery-vs-read semantics.*

### Activities (events)
- Browse guided hikes and campfire talks
- RSVP with a capacity limit
- Add to device calendar
- Reminder notification the day before
- Ranger creates/edits activities, sees the attendee list

*Teaches: capacity as a scarce resource, calendar integration, scheduled
notifications, role-gated UI.*

### Trail reports
- Report a condition with photo + GPS location
- Compress the image before upload
- Works offline, queues, syncs
- Feed of recent reports on a trail
- Ranger can mark a report resolved

*Teaches: camera, permissions with priming, image compression, geolocation, offline
mutation queue, file upload.*

### Profile & settings
- Edit profile
- Notification preferences
- Theme: light / dark / system, persisted
- Payment methods
- Sign out, delete account

*Teaches: forms, persistence, theming, account lifecycle (and Apple's account-deletion
requirement).*

---

## 4. Screen map

```
(auth)
├── welcome
├── sign-in
├── sign-up
└── forgot-password

(app)
├── (tabs)
│   ├── discover          Campground list + search + map toggle
│   ├── bookings          Upcoming / past / cancelled
│   ├── alerts            Feed, unread badge
│   └── profile
├── campground/[id]       Detail + gallery + sites
├── site/[id]
│   ├── index             Site detail + availability calendar
│   └── book              Multi-step booking flow
├── booking/[id]
│   ├── index             Detail + QR
│   └── cancel
├── alert/[id]
├── activity/
│   ├── [id]              Detail + RSVP
│   └── new               Ranger only
├── report/
│   ├── new               Camera + location
│   └── [id]
└── settings/
    ├── notifications
    ├── payment-methods
    └── appearance

(modals)
├── filters
└── site-picker
```

---

## 5. Data model

Deliberately close to Hamlet HQ's, so the schema work transfers.

```sql
-- Tenancy root
campgrounds (
  id uuid pk, name text, slug text unique, description text,
  location geography(point), timezone text,
  hero_url text, created_at timestamptz
)

-- Users and membership
profiles (
  id uuid pk references auth.users, display_name text,
  avatar_url text, phone text, created_at timestamptz
)

memberships (
  id uuid pk, campground_id uuid fk, profile_id uuid fk,
  role text check (role in ('camper','ranger','admin')),
  status text check (status in ('active','pending','suspended')),
  unique (campground_id, profile_id)
)

-- Bookable inventory
sites (
  id uuid pk, campground_id uuid fk, name text,
  kind text check (kind in ('tent','rv','cabin','shelter')),
  capacity int, price_cents int, amenities jsonb,
  is_active bool default true
)

bookings (
  id uuid pk, site_id uuid fk, profile_id uuid fk,
  campground_id uuid fk,              -- denormalized for RLS
  starts_on date, ends_on date,
  party_size int,
  status text check (status in ('pending','confirmed','cancelled','completed','no_show')),
  total_cents int, fee_cents int,
  payment_intent_id text,
  idempotency_key text unique,        -- ← prevents double booking
  cancelled_at timestamptz, created_at timestamptz,
  exclude using gist (                -- ← DB-level conflict prevention
    site_id with =,
    daterange(starts_on, ends_on) with &&
  ) where (status in ('pending','confirmed'))
)

-- Messaging
alerts (
  id uuid pk, campground_id uuid fk, author_id uuid fk,
  title text, body text,
  severity text check (severity in ('info','warning','urgent')),
  published_at timestamptz, expires_at timestamptz
)

alert_reads (
  alert_id uuid fk, profile_id uuid fk, read_at timestamptz,
  primary key (alert_id, profile_id)
)

-- Events
activities (
  id uuid pk, campground_id uuid fk, title text, description text,
  starts_at timestamptz, ends_at timestamptz,
  capacity int, location text
)

rsvps (
  id uuid pk, activity_id uuid fk, profile_id uuid fk,
  status text check (status in ('going','waitlist','cancelled')),
  unique (activity_id, profile_id)
)

-- Reports
trail_reports (
  id uuid pk, campground_id uuid fk, profile_id uuid fk,
  trail_name text, condition text, notes text,
  photo_url text, location geography(point),
  status text check (status in ('open','acknowledged','resolved')),
  created_at timestamptz
)

-- Devices for push
push_tokens (
  id uuid pk, profile_id uuid fk, token text unique,
  platform text, last_seen_at timestamptz
)
```

**Two things worth noticing**, because they're the same techniques Hamlet HQ needs:

1. **`idempotency_key unique`** on bookings — the database itself rejects a duplicate
   submission, even if two requests race.
2. **The `exclude using gist` constraint** — Postgres refuses to create two overlapping
   bookings for the same site. Application-level conflict checks always have a race
   window; a database constraint doesn't. This is the correct way to prevent
   double-booking, and it's exactly what Hamlet HQ's amenity reservations need.

---

## 6. Authorization rules

Write these down before coding — they're the spec for your RLS policies.

| Action | Camper | Ranger | Admin |
|---|---|---|---|
| View campgrounds | ✅ all | ✅ all | ✅ all |
| View sites | ✅ | ✅ | ✅ |
| Create booking | ✅ own | ✅ own | ✅ own |
| View booking | ✅ own only | ✅ own campground | ✅ all |
| Cancel booking | ✅ own | ✅ own campground | ✅ all |
| Create/edit site | ❌ | ✅ own campground | ✅ |
| Publish alert | ❌ | ✅ own campground | ✅ |
| Create activity | ❌ | ✅ own campground | ✅ |
| RSVP | ✅ | ✅ | ✅ |
| View attendee list | ❌ | ✅ own campground | ✅ |
| File trail report | ✅ | ✅ | ✅ |
| Resolve trail report | ❌ | ✅ own campground | ✅ |

**The critical rule: a camper must never see another camper's booking.** That's the
same privacy boundary as "a resident must never see a neighbour's payment history" in
Hamlet HQ — and it's the one an AI agent is most likely to get wrong, because the happy
path works fine either way.

---

## 7. Non-functional requirements

Treat these as hard requirements, not aspirations. They're what make it a *production*
practice app rather than a tutorial.

| Requirement | Target |
|---|---|
| Cold start to first paint | < 2s on a mid-range Android |
| List scrolling | 60fps with 500+ items |
| Works offline | Browse cached content; queue bookings and reports |
| Both platforms | Every feature verified on iOS and Android |
| Dark mode | Every screen |
| Accessibility | Full VoiceOver/TalkBack navigation |
| Test coverage | Business logic unit-tested; 5 critical flows in Maestro |
| Crash-free rate | > 99.5% |
| Bundle size | < 30MB download |
| No secrets in the client | All enforced server-side |

---

## 8. Deliberately out of scope

Scope discipline is a skill. These are excluded on purpose:

- ❌ Chat / direct messaging (big feature, low learning-per-hour)
- ❌ Social feed, follows, comments
- ❌ Multi-language (worth doing in Hamlet HQ, not needed to learn RN)
- ❌ Web version
- ❌ Ranger analytics dashboards
- ❌ Real payment processing (Stripe test mode only)
- ❌ Apple/Google Sign-In (add in Hamlet HQ, where store review requires it)

If you find yourself building any of these, you've drifted. The point is to finish.

---

## 9. What "done" means

Trailhead is complete when:

- [ ] All features above work on iOS and Android
- [ ] It's on TestFlight and Play Console internal testing
- [ ] Five people who aren't you have used it and filed bugs
- [ ] CI runs typecheck, lint, tests, and a build on every PR
- [ ] Maestro covers: sign-up, book a site, cancel a booking, receive an alert,
      file an offline report
- [ ] Sentry is wired with source maps; you've fixed at least one real reported crash
- [ ] You can explain every file in the repo
- [ ] An EAS Update has been shipped to fix something without a store review

That last two are the real graduation criteria. The first tests understanding; the
second tests that you own the release pipeline.

---

**Next:** [Build milestones →](./02-build-milestones.md)
