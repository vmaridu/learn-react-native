# Hamlet HQ — Reservations

The booking engine. Deceptively hard: availability, concurrency, policy rules, and
timezones all intersect here.

---

## 1. Why this is harder than it looks

"Let people book the clubhouse" sounds like a form and a calendar. The complexity is
in the edges:

- Two residents tap "Book" for the same slot at the same instant
- The community allows 2-hour bookings, but only between 9am and 9pm, and only 30 days
  out, and only 2 active bookings per household
- Someone books at 11pm on the last Sunday in October — the night the clocks change
- The board blocks the pool for maintenance *after* people have booked
- A booking requires payment, and the payment fails after the slot is held
- A resident cancels 23 hours before, and the policy window is 24

Each of these is a real bug that will happen. This doc is how to prevent them.

---

## 2. Availability is a derived value

**Do not store "available slots."** Availability is computed from four inputs:

```
available(amenity, window) =
      within the amenity's open hours
  AND not inside a blackout
  AND no overlapping active reservation
  AND satisfies the booking policy for this requester
```

Storing availability as rows means maintaining it on every booking, cancellation,
blackout, and policy change — and it will drift. Compute it.

```sql
create or replace function get_availability(
  p_amenity_id uuid,
  p_date date
) returns table (slot_start timestamptz, slot_end timestamptz, is_available boolean)
language plpgsql stable security definer as $$
declare
  v_amenity amenities%rowtype;
  v_tz text;
begin
  select a.* into v_amenity from amenities a where a.id = p_amenity_id;
  select c.timezone into v_tz from communities c where c.id = v_amenity.community_id;

  return query
  with slots as (
    -- generate candidate slots from the amenity's open hours for that weekday
    select
      gs as slot_start,
      gs + make_interval(mins => v_amenity.min_duration_minutes) as slot_end
    from generate_series(
      (p_date::text || ' ' || (v_amenity.open_hours -> to_char(p_date,'dy') ->> 'open'))::timestamp
        at time zone v_tz,
      (p_date::text || ' ' || (v_amenity.open_hours -> to_char(p_date,'dy') ->> 'close'))::timestamp
        at time zone v_tz,
      make_interval(mins => v_amenity.min_duration_minutes)
    ) gs
  )
  select
    s.slot_start,
    s.slot_end,
    not exists (
      select 1 from reservations r
      where r.amenity_id = p_amenity_id
        and r.status in ('pending','confirmed')
        and tstzrange(r.starts_at, r.ends_at) && tstzrange(s.slot_start, s.slot_end)
    )
    and not exists (
      select 1 from amenity_blackouts b
      where b.amenity_id = p_amenity_id
        and tstzrange(b.starts_at, b.ends_at) && tstzrange(s.slot_start, s.slot_end)
    ) as is_available
  from slots s
  where s.slot_end <= (p_date + 1)::timestamp at time zone v_tz;
end $$;
```

---

## 3. Concurrency — the constraint that saves you

**This is the single most important idea in the document.**

Every naive booking implementation has the same race:

```
Time    User A                      User B
────────────────────────────────────────────────────
t0      check availability          
t1      → "available" ✅            check availability
t2                                  → "available" ✅
t3      INSERT reservation          
t4                                  INSERT reservation
        ↓                           ↓
        Two bookings. Same slot. Both "valid."
```

No amount of careful application code closes this. The window between check and insert
is where the bug lives, and it's real — it will happen the first time two people try to
book the pool on the same sunny Saturday morning.

**The fix is a database constraint:**

```sql
create extension if not exists btree_gist;

alter table reservations add constraint no_overlap
  exclude using gist (
    amenity_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status in ('pending','confirmed'));
```

Now Postgres itself refuses the second insert. Atomically. Regardless of what your
application code does.

```
t3      INSERT → success
t4      INSERT → ERROR: conflicting key value violates
                exclusion constraint "no_overlap"
```

**Handle it as a normal, expected outcome** — not an error page:

```ts
const { error } = await supabase.rpc('create_reservation', params);

if (error?.code === '23P01') {          // exclusion_violation
  return {
    ok: false,
    reason: 'slot_taken',
    message: 'That time was just booked by someone else. Please pick another.',
  };
}
```

The `where (status in ('pending','confirmed'))` clause matters: cancelled and completed
reservations don't block the slot, so it can be rebooked.

---

## 4. Booking policy rules

Every amenity carries its own policy. Enforce it **server-side** — the client shows the
rules; the server is what makes them true.

```sql
create or replace function create_reservation(
  p_amenity_id      uuid,
  p_starts_at       timestamptz,
  p_ends_at         timestamptz,
  p_party_size      int,
  p_idempotency_key text
) returns reservations
language plpgsql security definer as $$
declare
  v_amenity     amenities%rowtype;
  v_unit_id     uuid;
  v_profile_id  uuid := auth.uid();
  v_active_count int;
  v_duration_min int;
  v_fee_cents   int;
  v_reservation reservations%rowtype;
begin
  select * into v_amenity from amenities where id = p_amenity_id and is_active;
  if not found then
    raise exception 'AMENITY_UNAVAILABLE';
  end if;

  -- Membership + unit
  select unit_id into v_unit_id from memberships
   where profile_id = v_profile_id
     and community_id = v_amenity.community_id
     and status = 'active';
  if v_unit_id is null then
    raise exception 'NOT_A_MEMBER';
  end if;

  -- Idempotency: return the existing reservation, don't create a second
  select * into v_reservation from reservations where idempotency_key = p_idempotency_key;
  if found then
    return v_reservation;
  end if;

  v_duration_min := extract(epoch from (p_ends_at - p_starts_at)) / 60;

  -- Policy checks
  if p_starts_at < now() + make_interval(hours => v_amenity.min_notice_hours) then
    raise exception 'TOO_SOON';
  end if;

  if p_starts_at > now() + make_interval(days => v_amenity.advance_booking_days) then
    raise exception 'TOO_FAR_AHEAD';
  end if;

  if v_duration_min < v_amenity.min_duration_minutes
     or v_duration_min > v_amenity.max_duration_minutes then
    raise exception 'INVALID_DURATION';
  end if;

  if v_amenity.capacity is not null and p_party_size > v_amenity.capacity then
    raise exception 'OVER_CAPACITY';
  end if;

  -- Per-unit concurrent booking limit
  select count(*) into v_active_count from reservations
   where unit_id = v_unit_id
     and amenity_id = p_amenity_id
     and status in ('pending','confirmed')
     and starts_at > now();
  if v_active_count >= v_amenity.max_active_per_unit then
    raise exception 'TOO_MANY_ACTIVE';
  end if;

  -- Blackouts
  if exists (
    select 1 from amenity_blackouts
     where amenity_id = p_amenity_id
       and tstzrange(starts_at, ends_at) && tstzrange(p_starts_at, p_ends_at)
  ) then
    raise exception 'BLACKED_OUT';
  end if;

  -- FEE COMPUTED SERVER-SIDE, from the amenity's stored rate
  v_fee_cents := case v_amenity.fee_unit
    when 'per_booking' then v_amenity.fee_cents
    when 'per_hour'    then v_amenity.fee_cents * ceil(v_duration_min / 60.0)::int
    when 'per_person'  then v_amenity.fee_cents * p_party_size
  end;

  -- The insert. The exclusion constraint arbitrates concurrency.
  insert into reservations (
    community_id, amenity_id, unit_id, profile_id,
    starts_at, ends_at, party_size,
    status, fee_cents, idempotency_key
  ) values (
    v_amenity.community_id, p_amenity_id, v_unit_id, v_profile_id,
    p_starts_at, p_ends_at, p_party_size,
    case when v_amenity.requires_approval then 'pending'
         when v_fee_cents > 0            then 'pending'
         else 'confirmed' end,
    v_fee_cents, p_idempotency_key
  )
  returning * into v_reservation;

  return v_reservation;
end $$;
```

**Notice what this function guarantees**, none of which the client can subvert:
membership, the unit, every policy rule, the fee, and — through the constraint —
exclusivity.

The client's job is only to make the UI reflect these rules so users rarely hit them.

---

## 5. Timezones

Community amenities are physical. "Saturday 2pm at the pool" means 2pm *there*.

**The rules:**

1. **Store `timestamptz`.** Postgres normalizes to UTC internally.
2. **Every community has a `timezone`.** Set at creation, e.g. `America/Chicago`.
3. **Business rules evaluate in community time.** "Bookable 9am–9pm" means local.
4. **Display in community time**, not the device's — a resident travelling shouldn't see
   their pool booking shift.
5. **Never construct dates from strings without a zone.**

```ts
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

// ✅ Display in the community's timezone, always
formatInTimeZone(reservation.startsAt, community.timezone, 'EEE d MMM, h:mm a');

// ❌ Uses the device timezone — wrong for a travelling resident
format(new Date(reservation.startsAt), 'EEE d MMM, h:mm a');
```

**DST is the trap.** Twice a year a local day is 23 or 25 hours long. In the US spring
transition, 2:00–3:00am doesn't exist. Generating slots by adding fixed intervals to a
naive local time produces either impossible or duplicated slots.

Generating slots in the community timezone with `at time zone`, as in
`get_availability` above, handles this — Postgres knows the rules. Doing the arithmetic
in JavaScript with plain `Date` does not.

**Test it:** create a booking flow test that runs on the DST transition dates for a
community in a DST-observing zone. It's a five-minute test that catches a genuinely
nasty class of bug.

---

## 6. Reservations that need payment

Combining the booking flow with [payments](./04-payments.md):

```
1. create_reservation()  → status 'pending', fee computed
2. create-payment        → PaymentIntent for that fee
3. Payment sheet
4. Webhook: succeeded    → reservation status 'confirmed'
5. Push confirmation
```

**The slot is held while pending**, because the exclusion constraint includes
`'pending'`. Nobody else can take it during payment.

**But a pending reservation must expire**, or an abandoned checkout holds a slot
forever:

```sql
-- every 5 minutes
update reservations
   set status = 'cancelled',
       cancelled_at = now()
 where status = 'pending'
   and fee_cents > 0
   and payment_id is null
   and created_at < now() - interval '15 minutes';
```

Fifteen minutes is generous enough for a slow payment flow and short enough that a slot
isn't dead for an evening.

**Failure mode to handle explicitly:** payment succeeds *after* the reservation was
expired. The webhook must detect this and refund automatically:

```sql
if v_reservation.status = 'cancelled' then
  perform issue_refund(v_payment.id, 'reservation_expired');
  -- notify the resident with an explanation
  return;
end if;
```

Not handling this means a resident is charged for a booking they don't have. It's rare,
and it's exactly the kind of edge an AI-generated implementation will skip.

---

## 7. Cancellation

```sql
create or replace function cancel_reservation(
  p_reservation_id uuid,
  p_idempotency_key text
) returns jsonb
language plpgsql security definer as $$
declare
  v_r reservations%rowtype;
  v_a amenities%rowtype;
  v_hours_until numeric;
  v_fee_cents int := 0;
  v_refund_cents int := 0;
  v_is_board boolean;
begin
  select * into v_r from reservations where id = p_reservation_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;

  -- Idempotent: already cancelled is a success, not an error
  if v_r.status = 'cancelled' then
    return jsonb_build_object('status','already_cancelled');
  end if;

  if v_r.status not in ('pending','confirmed') then
    raise exception 'CANNOT_CANCEL';
  end if;

  -- Authorization: owner of the unit, or board
  select exists (
    select 1 from memberships
     where profile_id = auth.uid() and community_id = v_r.community_id
       and role in ('board_member','manager','admin') and status = 'active'
  ) into v_is_board;

  if not v_is_board and v_r.unit_id <> my_unit(v_r.community_id) then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_a from amenities where id = v_r.amenity_id;
  v_hours_until := extract(epoch from (v_r.starts_at - now())) / 3600;

  -- Board cancellations are always free to the resident
  if not v_is_board and v_hours_until < v_a.cancellation_window_hours then
    v_fee_cents := round(v_r.fee_cents * v_a.cancellation_fee_pct / 100.0);
  end if;

  v_refund_cents := v_r.fee_cents - v_fee_cents;

  update reservations
     set status = 'cancelled',
         cancelled_at = now(),
         cancelled_by = auth.uid(),
         cancellation_fee_cents = v_fee_cents
   where id = p_reservation_id;
  -- ↑ slot is now free: the exclusion constraint only covers pending/confirmed

  insert into ledger_entries
    (community_id, unit_id, entry_type, amount_cents, reference_type, reference_id, actor_id)
  values
    (v_r.community_id, v_r.unit_id, 'reservation_cancelled',
     v_fee_cents, 'reservation', p_reservation_id, auth.uid());

  return jsonb_build_object(
    'status','cancelled',
    'fee_cents', v_fee_cents,
    'refund_cents', v_refund_cents
  );
end $$;
```

The refund itself is issued by the caller (an Edge Function) using the returned
`refund_cents`, because Stripe calls can't happen inside a database transaction.

**Always show the consequence before confirming:**

```tsx
Alert.alert(
  'Cancel this reservation?',
  outcome.feeCents > 0
    ? `You're cancelling within ${policy.cancellationWindowHours} hours, so a ${formatCents(outcome.feeCents)} fee applies. You'll be refunded ${formatCents(outcome.refundCents)}.`
    : 'This is a free cancellation and the slot will be released.',
  [
    { text: 'Keep reservation', style: 'cancel' },
    { text: 'Cancel reservation', style: 'destructive', onPress: doCancel },
  ]
);
```

Surprise fees generate support tickets and destroy trust. State it plainly.

---

## 8. The mobile booking UX

The flow that makes all this feel simple:

```
Amenity detail
  → calendar (unavailable dates greyed out)
    → time slots for the chosen date
      → party size + notes
        → review: time, duration, fee, cancellation policy
          → pay (if fee > 0)
            → confirmation + add to calendar
```

**UX rules that prevent frustration:**

1. **Grey out what's unavailable — don't hide it.** "That's taken" is more informative
   than an absent option.
2. **Show the policy up front.** Max duration, advance window, and cancellation terms
   on the amenity screen, before someone invests effort.
3. **Refresh availability when the screen focuses**, and subscribe to realtime while
   it's open.
4. **Handle the conflict error gracefully** — return to slot selection with the taken
   slot now correctly greyed, not an error page.
5. **Show the fee before payment**, computed from the same shared rule the server uses.
6. **No optimistic confirmation.** Show "Confirming…" until the server agrees.

```tsx
// Keep availability live while the booking screen is open
useEffect(() => {
  const channel = supabase
    .channel(`amenity:${amenityId}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'reservations',
        filter: `amenity_id=eq.${amenityId}` },
      () => queryClient.invalidateQueries({ queryKey: availabilityKeys.forAmenity(amenityId) })
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [amenityId]);
```

---

## 9. Test cases

The ones that actually matter. Write these.

```
CONCURRENCY
□ Two clients book the same slot simultaneously → exactly one succeeds,
  the other gets a clean "slot taken"
□ Same client double-taps → one reservation (idempotency key)
□ Cancel then immediately rebook the same slot → succeeds

POLICY
□ Booking below min duration → rejected
□ Booking above max duration → rejected
□ Booking inside min-notice window → rejected
□ Booking beyond advance window → rejected
□ Exceeding per-unit active limit → rejected
□ Booking over a blackout → rejected
□ Party size over capacity → rejected

PAYMENT
□ Payment fails → reservation stays pending, then expires, slot released
□ Pending expires while payment in flight → auto-refund issued
□ Payment succeeds → reservation confirmed, push sent

CANCELLATION
□ Outside window → no fee, full refund
□ Inside window → correct fee, correct partial refund
□ Board cancels → no fee to resident, full refund
□ Cancel an already-cancelled reservation → idempotent success
□ Non-owner attempts cancel → forbidden

TIME
□ Booking across a DST spring-forward transition
□ Booking across a DST fall-back transition
□ Resident in a different timezone sees community-local times
□ Booking at 11:59pm local
```

---

## 10. Common bugs

| Bug | Cause | Prevention |
|---|---|---|
| Double booking | Application-level availability check | Exclusion constraint |
| Duplicate booking on double-tap | No idempotency | Unique `idempotency_key` |
| Slot held forever | Pending never expires | Expiry job |
| Charged with no booking | Payment settles after expiry | Auto-refund on that path |
| Wrong time shown | Device timezone used | Community timezone everywhere |
| Impossible slot on DST day | Naive interval arithmetic | Generate slots with `at time zone` |
| Fee mismatch client vs server | Two implementations | One rule in `packages/core` |
| Cancelled slot not rebookable | Constraint includes cancelled | `where status in ('pending','confirmed')` |
| Resident cancels another's booking | Missing authorization | Check unit ownership server-side |

---

## Check yourself

1. Why can't application code prevent double bookings?
2. Why does the exclusion constraint have a `where` clause?
3. Why must pending reservations expire, and what edge case does that create?
4. Where is the booking fee computed, and why not on the client?
5. Why store the community's timezone rather than using the device's?

<details>
<summary>Answers</summary>

1. There's always a window between "check availability" and "insert" during which
   another transaction can do the same. Two concurrent requests both see the slot free
   and both insert. Only an atomic database-level constraint closes it.
2. So that cancelled, completed, and rejected reservations don't block the slot. Without
   it, a cancelled booking would permanently prevent anyone rebooking that time.
3. Otherwise an abandoned checkout holds the slot indefinitely, since pending
   reservations block the constraint. The edge case: the payment may succeed *after*
   expiry, so the webhook must detect a cancelled reservation and auto-refund.
4. In the Postgres function, from the amenity's stored rate. A client-computed fee can
   be modified — someone books the $200 clubhouse for $0.
5. The amenity is physical and its hours are local. A resident travelling to another
   timezone must still see "Saturday 2pm" for a booking that is 2pm at the pool, and
   policy rules like "bookable 9am–9pm" only make sense in community-local time.

</details>

---

**Next:** [Messaging →](./06-messaging.md)
