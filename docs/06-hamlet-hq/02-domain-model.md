# Hamlet HQ — Domain Model

The entities, the multi-tenancy strategy, and the authorization rules. Get this right
and everything else follows; get it wrong and you rewrite.

---

## 1. The core concepts

Before the schema, the vocabulary. HOA domain language is specific, and using it
correctly matters both for the product and for talking to customers.

| Term | Means |
|---|---|
| **Community** | The HOA itself. The tenancy root. |
| **Unit** | A physical property — a house, a condo, a lot. Owned. |
| **Household** | The people associated with a unit. Owner + family + tenants. |
| **Resident** | A person. May belong to households in multiple communities. |
| **Board member** | A resident with elected governance authority. |
| **Manager** | A professional property manager. May manage many communities. Not a resident. |
| **Amenity** | A bookable shared facility. |
| **Reservation** | A booking of an amenity for a time window. |
| **Assessment** | A charge levied on a unit. Dues, special assessments, fines. |
| **Broadcast** | An official message from the board to the community. |

**The distinction that matters most: charges attach to the _unit_, not the person.**

Dues are owed by the property. If a unit sells, the obligation transfers. If two spouses
both live there, they don't each owe dues — the household does. Modelling this as
"user owes money" is the single most common mistake in HOA software, and it breaks the
moment a unit changes hands.

```
Community
   └── Unit  (dues are owed HERE)
         └── Household
               └── Residents (people who can log in)
```

---

## 2. Schema

Postgres, via Supabase. Written as the authoritative reference.

### Tenancy and identity

```sql
create table communities (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text not null unique,
  timezone        text not null default 'America/New_York',
  address         jsonb,
  logo_url        text,
  settings        jsonb not null default '{}',   -- feature flags, policies
  stripe_account_id text,                        -- Stripe Connect
  status          text not null default 'active'
                    check (status in ('active','suspended','cancelled')),
  created_at      timestamptz not null default now()
);

create table units (
  id              uuid primary key default gen_random_uuid(),
  community_id    uuid not null references communities on delete cascade,
  label           text not null,                 -- "Unit 14B", "1420 Oak St"
  kind            text check (kind in ('single_family','condo','townhome','lot')),
  bedrooms        int,
  dues_cents      int not null default 0,        -- base periodic dues
  dues_period     text default 'monthly'
                    check (dues_period in ('monthly','quarterly','annual')),
  metadata        jsonb not null default '{}',
  unique (community_id, label)
);

create table profiles (
  id              uuid primary key references auth.users on delete cascade,
  display_name    text not null,
  email           text not null,
  phone           text,
  avatar_url      text,
  created_at      timestamptz not null default now()
);

-- The join that defines "who is in what community, as what"
create table memberships (
  id              uuid primary key default gen_random_uuid(),
  community_id    uuid not null references communities on delete cascade,
  profile_id      uuid not null references profiles on delete cascade,
  unit_id         uuid references units on delete set null,  -- null for managers
  role            text not null default 'resident'
                    check (role in ('resident','board_member','manager','admin')),
  relationship    text check (relationship in ('owner','tenant','family','none')),
  is_primary      boolean not null default false,  -- primary contact for the unit
  status          text not null default 'active'
                    check (status in ('invited','active','suspended','removed')),
  invited_at      timestamptz,
  joined_at       timestamptz,
  unique (community_id, profile_id)
);

create index on memberships (profile_id, status);
create index on memberships (community_id, role);
```

**Why `memberships` is the centre of the model:** it answers every authorization
question. "Can this person do X in community Y?" is always a lookup here. Every RLS
policy will reference it.

Note `unit_id` is nullable — a professional manager belongs to a community without
living in a unit.

### Amenities and reservations

```sql
create table amenities (
  id                    uuid primary key default gen_random_uuid(),
  community_id          uuid not null references communities on delete cascade,
  name                  text not null,
  description           text,
  kind                  text,                   -- 'pool','clubhouse','court','guest_suite'
  image_url             text,
  capacity              int,

  -- Booking policy — the rules engine, per amenity
  requires_approval     boolean not null default false,
  fee_cents             int not null default 0,
  fee_unit              text default 'per_booking'
                          check (fee_unit in ('per_booking','per_hour','per_person')),
  min_duration_minutes  int default 60,
  max_duration_minutes  int default 240,
  advance_booking_days  int default 30,         -- how far ahead you may book
  min_notice_hours      int default 2,
  max_active_per_unit   int default 2,          -- concurrent future bookings
  cancellation_window_hours int default 24,
  cancellation_fee_pct  int default 0,
  open_hours            jsonb not null default '{}',  -- per weekday
  is_active             boolean not null default true
);

create table amenity_blackouts (
  id            uuid primary key default gen_random_uuid(),
  amenity_id    uuid not null references amenities on delete cascade,
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  reason        text
);

create table reservations (
  id                uuid primary key default gen_random_uuid(),
  community_id      uuid not null references communities on delete cascade,
  amenity_id        uuid not null references amenities on delete restrict,
  unit_id           uuid not null references units on delete restrict,
  profile_id        uuid not null references profiles on delete restrict,  -- who booked

  starts_at         timestamptz not null,
  ends_at           timestamptz not null,
  party_size        int not null default 1,
  notes             text,

  status            text not null default 'pending'
                      check (status in ('pending','confirmed','cancelled','completed','no_show','rejected')),

  fee_cents         int not null default 0,
  payment_id        uuid references payments on delete set null,
  idempotency_key   text not null unique,

  cancelled_at      timestamptz,
  cancelled_by      uuid references profiles,
  cancellation_fee_cents int not null default 0,

  created_at        timestamptz not null default now(),

  constraint valid_window check (ends_at > starts_at),

  -- THE constraint that makes double-booking impossible
  constraint no_overlap exclude using gist (
    amenity_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status in ('pending','confirmed'))
);

create index on reservations (community_id, starts_at);
create index on reservations (unit_id, status);
```

> 🔴 **The `exclude using gist` constraint is the most important line in this schema.**
>
> Application-level availability checks always have a race window: two requests both
> read "available," both write, and you have a double booking. No amount of careful
> JavaScript closes that gap.
>
> This constraint makes the *database* reject the second write. It's atomic, it's
> race-proof, and it works even if your application logic is wrong.
>
> Requires `create extension btree_gist;`

### Money

```sql
create table assessments (
  id              uuid primary key default gen_random_uuid(),
  community_id    uuid not null references communities on delete cascade,
  unit_id         uuid not null references units on delete restrict,
  kind            text not null
                    check (kind in ('dues','special','fine','amenity_fee','late_fee','other')),
  description     text not null,
  amount_cents    int not null check (amount_cents > 0),
  due_on          date not null,
  period_start    date,
  period_end      date,
  status          text not null default 'open'
                    check (status in ('open','paid','partial','waived','void')),
  created_at      timestamptz not null default now()
);

create table payments (
  id                        uuid primary key default gen_random_uuid(),
  community_id              uuid not null references communities on delete cascade,
  unit_id                   uuid references units on delete restrict,
  profile_id                uuid references profiles on delete set null,  -- who paid

  amount_cents              int not null check (amount_cents > 0),
  currency                  text not null default 'usd',

  status                    text not null default 'pending'
                              check (status in ('pending','processing','succeeded','failed','refunded','partially_refunded')),
  method                    text check (method in ('card','ach','cash','check','other')),

  stripe_payment_intent_id  text unique,
  stripe_charge_id          text,
  idempotency_key           text not null unique,

  failure_reason            text,
  refunded_cents            int not null default 0,

  created_at                timestamptz not null default now(),
  succeeded_at              timestamptz
);

-- Which payment settled which assessment (a payment may cover several)
create table payment_allocations (
  payment_id      uuid not null references payments on delete cascade,
  assessment_id   uuid not null references assessments on delete restrict,
  amount_cents    int not null check (amount_cents > 0),
  primary key (payment_id, assessment_id)
);

-- Append-only audit log. Never updated, never deleted.
create table ledger_entries (
  id              uuid primary key default gen_random_uuid(),
  community_id    uuid not null references communities,
  unit_id         uuid references units,
  entry_type      text not null,       -- 'assessment_created','payment_received','refund',…
  amount_cents    int not null,        -- signed: positive = owed, negative = credit
  reference_type  text,
  reference_id    uuid,
  actor_id        uuid references profiles,
  metadata        jsonb not null default '{}',
  created_at      timestamptz not null default now()
);
```

**Design notes on money:**

- **Integer cents, always.** Never a float, never a numeric with decimals for currency.
- **`payment_allocations` is a join table**, because one payment can settle several
  assessments (paying three months of back dues at once), and one assessment can be
  settled by several payments (a partial payment plan).
- **`ledger_entries` is append-only.** It's the audit trail. When a board member asks
  "why does unit 14B show $340 owed," the ledger answers. Never `UPDATE` or `DELETE`
  a row here — corrections are new compensating entries.
- **Idempotency keys are `not null unique`** on both reservations and payments. The
  database enforces exactly-once.

### Communication

```sql
create table broadcasts (
  id              uuid primary key default gen_random_uuid(),
  community_id    uuid not null references communities on delete cascade,
  author_id       uuid not null references profiles,
  title           text not null,
  body            text not null,
  severity        text not null default 'info'
                    check (severity in ('info','important','urgent')),
  audience        jsonb not null default '{"type":"all"}',  -- all | role | units | building
  status          text not null default 'draft'
                    check (status in ('draft','scheduled','published','archived')),
  scheduled_for   timestamptz,
  published_at    timestamptz,
  expires_at      timestamptz,
  created_at      timestamptz not null default now()
);

create table broadcast_receipts (
  broadcast_id    uuid not null references broadcasts on delete cascade,
  profile_id      uuid not null references profiles on delete cascade,
  delivered_at    timestamptz,
  read_at         timestamptz,
  primary key (broadcast_id, profile_id)
);

create table events (
  id              uuid primary key default gen_random_uuid(),
  community_id    uuid not null references communities on delete cascade,
  created_by      uuid not null references profiles,
  title           text not null,
  description     text,
  location        text,
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  capacity        int,
  allows_guests   boolean not null default true,
  max_guests_per_unit int default 4,
  cover_url       text,
  status          text not null default 'published'
                    check (status in ('draft','published','cancelled'))
);

create table event_rsvps (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references events on delete cascade,
  unit_id         uuid not null references units on delete cascade,
  profile_id      uuid not null references profiles,
  attendee_count  int not null default 1 check (attendee_count > 0),
  guest_count     int not null default 0 check (guest_count >= 0),
  status          text not null default 'going'
                    check (status in ('going','waitlist','cancelled')),
  created_at      timestamptz not null default now(),
  unique (event_id, unit_id)
);

create table push_tokens (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references profiles on delete cascade,
  token           text not null unique,
  platform        text not null check (platform in ('ios','android')),
  last_seen_at    timestamptz not null default now()
);

create table documents (
  id              uuid primary key default gen_random_uuid(),
  community_id    uuid not null references communities on delete cascade,
  title           text not null,
  category        text,             -- 'bylaws','minutes','forms','financials'
  file_url        text not null,
  visibility      text not null default 'residents'
                    check (visibility in ('residents','board','public')),
  uploaded_by     uuid references profiles,
  created_at      timestamptz not null default now()
);
```

---

## 3. Multi-tenancy

**Every tenant-scoped table has `community_id`.** Not derived through a join —
denormalized onto the row.

This is deliberate and worth defending:

```sql
-- ✅ RLS policy can check tenancy directly
where community_id in (select community_id from my_memberships())

-- ❌ Without denormalization, every policy needs a join chain
where amenity_id in (
  select id from amenities where community_id in (...)
)
```

Denormalized `community_id` makes policies simple, fast, and — most importantly —
**easy to audit by eye**. A policy you can't read at a glance is a policy with a bug in
it.

> ⚠️ **Retrofitting multi-tenancy is a rewrite.** Add `community_id` to every table
> from the first migration, even when it feels redundant. This is the number one
> architectural regret in B2B SaaS.

### The helper function

```sql
-- Communities the current user belongs to
create or replace function my_communities()
returns setof uuid
language sql stable security definer
set search_path = public
as $$
  select community_id from memberships
  where profile_id = auth.uid() and status = 'active';
$$;

-- Communities where the current user has governance authority
create or replace function my_managed_communities()
returns setof uuid
language sql stable security definer
set search_path = public
as $$
  select community_id from memberships
  where profile_id = auth.uid()
    and status = 'active'
    and role in ('board_member','manager','admin');
$$;

-- The unit the current user belongs to in a given community
create or replace function my_unit(c_id uuid)
returns uuid
language sql stable security definer
set search_path = public
as $$
  select unit_id from memberships
  where profile_id = auth.uid() and community_id = c_id and status = 'active'
  limit 1;
$$;
```

---

## 4. Row Level Security

> 🔴 **This section is Tier 3. Read every policy yourself. An RLS bug is a data breach,
> it is silent, and it passes every test your own UI can perform.**

**Enable RLS on every table. Default deny.**

```sql
alter table communities   enable row level security;
alter table units         enable row level security;
alter table memberships   enable row level security;
alter table amenities     enable row level security;
alter table reservations  enable row level security;
alter table assessments   enable row level security;
alter table payments      enable row level security;
alter table broadcasts    enable row level security;
alter table events        enable row level security;
alter table event_rsvps   enable row level security;
alter table documents     enable row level security;
```

### Reservations — the instructive case

```sql
-- Residents see their own unit's reservations.
-- Board/managers see everything in their community.
create policy reservations_select on reservations for select
using (
  community_id in (select my_managed_communities())
  or unit_id = my_unit(community_id)
);

-- You may only create a reservation for your own unit, in your community
create policy reservations_insert on reservations for insert
with check (
  community_id in (select my_communities())
  and unit_id = my_unit(community_id)
  and profile_id = auth.uid()
);

-- Cancel your own; board can cancel any in their community
create policy reservations_update on reservations for update
using (
  community_id in (select my_managed_communities())
  or unit_id = my_unit(community_id)
);
```

### Payments — the strictest

```sql
-- A resident sees ONLY their own unit's payments.
-- This is the boundary that must never leak.
create policy payments_select on payments for select
using (
  community_id in (select my_managed_communities())
  or unit_id = my_unit(community_id)
);

-- Payments are never written directly by clients.
-- They are created by the webhook handler with the service role.
-- No insert/update policy for authenticated users = denied.
```

**Note the absence of an insert policy on `payments`.** That's intentional. Payment
rows are created only by your Stripe webhook handler running with the service role.
A client can never write a payment record. See [payments](./04-payments.md).

### Broadcasts

```sql
create policy broadcasts_select on broadcasts for select
using (
  community_id in (select my_communities())
  and (status = 'published' or community_id in (select my_managed_communities()))
);

create policy broadcasts_write on broadcasts for all
using (community_id in (select my_managed_communities()))
with check (community_id in (select my_managed_communities()));
```

Residents see published broadcasts only; board members also see drafts.

### Testing RLS — non-negotiable

```sql
-- Impersonate a real resident and try to reach another unit's data
set local role authenticated;
set local request.jwt.claims to '{"sub":"<resident-a-uuid>"}';

select count(*) from payments;              -- must be ONLY unit A's
select count(*) from reservations;          -- must be ONLY unit A's
select * from payments where unit_id = '<unit-b-uuid>';  -- must return 0 rows
```

**Write these as automated tests and run them in CI.** Every new table, every new
policy. This is the single highest-value test suite in the product — more valuable
than any UI test, because the failure mode is invisible and catastrophic.

---

## 5. State machines

Statuses are not free-text. Write down the legal transitions and enforce them.

### Reservation

```
                ┌──────────┐
                │ pending  │ ← created (if amenity requires approval)
                └────┬─────┘
           approve ↙   ↘ reject
        ┌───────────┐  ┌──────────┐
        │ confirmed │  │ rejected │
        └─────┬─────┘  └──────────┘
     cancel ↙   ↘ time passes
  ┌───────────┐  ┌───────────┐
  │ cancelled │  │ completed │ ─→ no_show (board marks)
  └───────────┘  └───────────┘
```

Illegal: `cancelled → confirmed`, `completed → cancelled`, `rejected → anything`.

### Payment

```
pending → processing → succeeded → partially_refunded → refunded
             ↓
           failed
```

Illegal: `succeeded → pending`, `refunded → succeeded`.

Enforce in a database trigger, not just application code:

```sql
create or replace function check_reservation_transition()
returns trigger language plpgsql as $$
begin
  if old.status = new.status then return new; end if;

  if not (
    (old.status = 'pending'   and new.status in ('confirmed','rejected','cancelled')) or
    (old.status = 'confirmed' and new.status in ('cancelled','completed')) or
    (old.status = 'completed' and new.status = 'no_show')
  ) then
    raise exception 'Illegal reservation transition: % -> %', old.status, new.status;
  end if;

  return new;
end $$;

create trigger reservation_transition
  before update on reservations
  for each row execute function check_reservation_transition();
```

This catches an entire class of bug that's otherwise very hard to find — including
bugs an AI agent introduces months later in code you review less carefully.

---

## 6. Authorization matrix

The complete reference. This is the spec your RLS policies implement.

| Action | Resident | Board member | Manager | Admin |
|---|---|---|---|---|
| View community info | ✅ own | ✅ own | ✅ managed | ✅ all |
| View amenities | ✅ | ✅ | ✅ | ✅ |
| Create reservation | ✅ own unit | ✅ own unit | ✅ any unit | ✅ |
| View reservations | ✅ **own unit only** | ✅ community | ✅ community | ✅ |
| Cancel reservation | ✅ own | ✅ any | ✅ any | ✅ |
| Manage amenities | ❌ | ✅ | ✅ | ✅ |
| View own balance | ✅ | ✅ | ✅ | ✅ |
| View **others'** balances | ❌ 🔴 | ✅ | ✅ | ✅ |
| Make a payment | ✅ own unit | ✅ own unit | ✅ any | ✅ |
| Issue assessment | ❌ | ✅ | ✅ | ✅ |
| Issue refund | ❌ | ✅ | ✅ | ✅ |
| Publish broadcast | ❌ | ✅ | ✅ | ✅ |
| View broadcast analytics | ❌ | ✅ | ✅ | ✅ |
| Create event | ❌ | ✅ | ✅ | ✅ |
| RSVP | ✅ | ✅ | ✅ | ✅ |
| View attendee list | ❌ | ✅ | ✅ | ✅ |
| View directory | ✅ opt-in only | ✅ | ✅ | ✅ |
| Upload documents | ❌ | ✅ | ✅ | ✅ |
| Invite residents | ❌ | ✅ | ✅ | ✅ |
| Change roles | ❌ | ✅ | ✅ | ✅ |

🔴 The "view others' balances" row is the one that ends the company if you get it
wrong. A resident discovering they can see which neighbours are behind on dues is a
privacy incident you don't recover from in a community of 200 people who all know each
other.

---

## 7. Migration discipline

```
supabase/migrations/
├── 0001_extensions.sql        -- btree_gist, pgcrypto
├── 0002_communities.sql
├── 0003_profiles_memberships.sql
├── 0004_amenities.sql
├── 0005_reservations.sql
├── 0006_money.sql
├── 0007_communication.sql
├── 0008_rls_policies.sql
└── 0009_triggers.sql
```

**Rules:**
1. Migrations are **append-only**. Never edit a shipped migration.
2. Every migration is reversible, or documents why it isn't.
3. Destructive migrations get a separate PR and your full attention.
4. Test on a copy of production data before applying.
5. **AI never writes a migration you haven't read line by line.** Tier 3.

---

## Check yourself

1. Why do assessments attach to units rather than to people?
2. What does `exclude using gist` prevent, and why can't application code do it?
3. Why is `community_id` denormalized onto every table?
4. Why is there no insert policy on `payments`?
5. Which authorization rule is most dangerous to get wrong, and why?

<details>
<summary>Answers</summary>

1. Dues are an obligation of the property, not the person. When a unit sells, the
   obligation transfers to the new owner. Two spouses in one unit owe one set of dues,
   not two. Modelling it per-person breaks on the first sale.
2. Two overlapping reservations for the same amenity. Application code always has a
   race window between the availability check and the insert — two concurrent requests
   can both pass the check. The constraint is enforced atomically by the database.
3. So RLS policies can check tenancy with a direct comparison instead of a join chain.
   Simple policies are fast, and — more importantly — auditable by eye.
4. Payment rows are created exclusively by the Stripe webhook handler using the service
   role. No client should ever be able to assert that a payment happened; that fact
   comes from Stripe.
5. A resident being able to see another unit's payment status or balance. It's a
   privacy breach among neighbours who know each other personally, it's silent (no
   error, no crash), and it destroys the trust that the entire product depends on.

</details>

---

**Next:** [Architecture →](./03-architecture.md)
