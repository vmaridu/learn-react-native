# Hamlet HQ — Payments

> 🔴 **The highest-stakes document in this repo.** You are moving other people's money.
> Every rule here exists because violating it produces a real, expensive failure.

---

## 1. The rules

Read these before any code. They are not negotiable, and they are the checklist you use
to review every payment-related diff — yours or an AI's.

1. **Integer cents. Never floats.** `19.99` is not representable in binary floating
   point. `0.1 + 0.2 !== 0.3`. Store and compute `1999`.
2. **The server computes every amount.** A client never sends a price. Ever.
3. **Idempotency keys on every money operation.** Networks retry. Users double-tap.
4. **Stripe is the source of truth for payment status.** Your database records what
   Stripe told you, via webhook. A client saying "payment succeeded" means nothing.
5. **Never store card data.** Not the number, not the CVC, not "just the last four
   plus expiry" in a way you assembled yourself. Stripe holds it; you hold a token.
6. **Every money movement writes a ledger entry.** Append-only. Never updated.
7. **Use Stripe Connect.** Funds settle to the community's account, not yours.
8. **Test every failure path deliberately.** Decline, network drop mid-charge, webhook
   arriving twice, webhook arriving before the client returns, app killed after charge.

---

## 2. Why Stripe Connect

You are collecting dues **on behalf of** each HOA. Their money must land in their bank
account, not yours.

If payments settle to your account and you disburse manually, you are operating as a
money transmitter — which carries licensing requirements in most US states, and is
categorically not something a solo founder should take on.

**Stripe Connect solves this.** Each community becomes a connected account. Funds flow
directly to them; you take an application fee.

**Which Connect type:**

| Type | Onboarding | Who handles disputes | Right for you? |
|---|---|---|---|
| **Standard** | Community creates a full Stripe account | Community | ⚠️ Highest friction |
| **Express** | Stripe-hosted onboarding, light | Stripe/community | ✅ **Yes** |
| **Custom** | You build all onboarding UI | You | ❌ Heavy compliance burden |

**Use Express.** Stripe hosts identity verification and bank details, handles KYC, and
the community gets a dashboard for payouts. You get a link to send the treasurer and
almost no compliance surface.

```ts
// Onboard a community
const account = await stripe.accounts.create({
  type: 'express',
  country: 'US',
  business_type: 'company',
  capabilities: {
    card_payments: { requested: true },
    transfers: { requested: true },
  },
  metadata: { community_id: community.id },
});

const link = await stripe.accountLinks.create({
  account: account.id,
  refresh_url: `${APP_URL}/onboarding/refresh`,
  return_url: `${APP_URL}/onboarding/complete`,
  type: 'account_onboarding',
});
// send link.url to the treasurer
```

Store `stripe_account_id` on the community. **Do not accept payments until
`charges_enabled` is true** — check it before showing any pay button.

---

## 3. The payment flow

The canonical sequence. Every payment in the system follows it.

```
┌────────┐                ┌──────────────┐         ┌────────┐
│ Client │                │Edge Function │         │ Stripe │
└───┬────┘                └──────┬───────┘         └───┬────┘
    │                            │                     │
    │ POST /create-payment       │                     │
    │ {assessmentIds[],          │                     │
    │  idempotencyKey}           │                     │
    │───────────────────────────▶│                     │
    │                            │                     │
    │            1. verify membership + unit           │
    │            2. load assessments from DB           │
    │            3. SUM amounts server-side ◀── never from client
    │            4. insert payments row (pending)      │
    │                            │                     │
    │                            │ createPaymentIntent │
    │                            │ (amount, connected  │
    │                            │  account, idem key) │
    │                            │────────────────────▶│
    │                            │◀────────────────────│
    │◀───────────────────────────│  client_secret      │
    │  {clientSecret}            │                     │
    │                            │                     │
    │  presentPaymentSheet()     │                     │
    │────────────────────────────┼────────────────────▶│
    │                            │                     │
    │  ◀── UI shows "processing", NOT "paid" ──▶       │
    │                            │                     │
    │                            │  webhook:           │
    │                            │  payment_intent.    │
    │                            │  succeeded          │
    │                            │◀────────────────────│
    │            5. verify signature                   │
    │            6. mark payment succeeded              │
    │            7. allocate to assessments             │
    │            8. write ledger entries                │
    │            9. confirm reservation (if any)        │
    │           10. send confirmation push              │
    │                            │                     │
    │◀── realtime: payment succeeded ──                │
    │  UI shows "Paid" ✅        │                     │
```

**The critical detail: the client never marks anything paid.** It shows "processing"
until the webhook lands and the truth arrives via realtime or refetch.

Why: the payment sheet can succeed while the app is killed, the network drops, or the
user backgrounds it. Stripe's webhook is the only reliable signal.

---

## 4. Creating a payment

```ts
// supabase/functions/create-payment/index.ts
import Stripe from 'https://esm.sh/stripe@latest';

Deno.serve(async (req) => {
  const { assessmentIds, idempotencyKey } = await req.json();

  // 1. Who is calling?
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return json({ error: 'unauthorized' }, 401);

  // 2. Load assessments — with RLS applied, so they can only be the caller's
  const { data: assessments, error } = await supabaseAsUser
    .from('assessments')
    .select('id, unit_id, community_id, amount_cents, status')
    .in('id', assessmentIds);

  if (error || !assessments?.length) return json({ error: 'not_found' }, 404);

  // 3. All must be open, same unit, same community
  if (assessments.some((a) => a.status !== 'open')) {
    return json({ error: 'already_paid' }, 409);
  }
  const unitId = assessments[0].unit_id;
  const communityId = assessments[0].community_id;
  if (assessments.some((a) => a.unit_id !== unitId)) {
    return json({ error: 'mixed_units' }, 400);
  }

  // 4. THE AMOUNT IS COMPUTED HERE, FROM THE DATABASE
  const amountCents = assessments.reduce((sum, a) => sum + a.amount_cents, 0);

  // 5. The community's connected account
  const { data: community } = await supabaseAdmin
    .from('communities')
    .select('stripe_account_id')
    .eq('id', communityId)
    .single();

  if (!community?.stripe_account_id) {
    return json({ error: 'payments_not_enabled' }, 400);
  }

  // 6. Record intent BEFORE calling Stripe
  const { data: payment, error: insertErr } = await supabaseAdmin
    .from('payments')
    .insert({
      community_id: communityId,
      unit_id: unitId,
      profile_id: user.id,
      amount_cents: amountCents,
      status: 'pending',
      idempotency_key: idempotencyKey,
    })
    .select()
    .single();

  // Unique violation = duplicate submit. Return the existing one.
  if (insertErr?.code === '23505') {
    const { data: existing } = await supabaseAdmin
      .from('payments').select('*').eq('idempotency_key', idempotencyKey).single();
    return json({ paymentId: existing.id, clientSecret: existing.client_secret });
  }

  // 7. Create the intent on the connected account
  const intent = await stripe.paymentIntents.create(
    {
      amount: amountCents,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      application_fee_amount: Math.round(amountCents * 0.01),  // your cut
      metadata: {
        payment_id: payment.id,
        community_id: communityId,
        unit_id: unitId,
        assessment_ids: assessmentIds.join(','),
      },
    },
    {
      stripeAccount: community.stripe_account_id,
      idempotencyKey,                       // ← Stripe-level idempotency too
    }
  );

  await supabaseAdmin.from('payments')
    .update({ stripe_payment_intent_id: intent.id })
    .eq('id', payment.id);

  return json({ paymentId: payment.id, clientSecret: intent.client_secret });
});
```

**Note the layers of idempotency:** a unique constraint in your database, *and*
Stripe's own idempotency key. Both, because they protect against different failures —
yours catches a duplicate request before it reaches Stripe; Stripe's catches a retry of
the same API call.

---

## 5. The webhook

This is where payments become real. It must be bulletproof.

```ts
// supabase/functions/stripe-webhook/index.ts
Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();

  // 1. VERIFY THE SIGNATURE — non-negotiable
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body, signature!, Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    );
  } catch {
    return new Response('invalid signature', { status: 400 });
  }

  // 2. Idempotency — webhooks are delivered AT LEAST ONCE
  const { error: dupe } = await supabaseAdmin
    .from('processed_webhook_events')
    .insert({ event_id: event.id });
  if (dupe?.code === '23505') {
    return new Response('already processed', { status: 200 });
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const intent = event.data.object as Stripe.PaymentIntent;
      await handleSucceeded(intent);
      break;
    }
    case 'payment_intent.payment_failed': {
      await handleFailed(event.data.object as Stripe.PaymentIntent);
      break;
    }
    case 'charge.refunded': {
      await handleRefund(event.data.object as Stripe.Charge);
      break;
    }
    case 'charge.dispute.created': {
      await handleDispute(event.data.object as Stripe.Dispute);
      break;
    }
  }

  return new Response('ok', { status: 200 });
});
```

**Settlement runs in a single transaction** — a Postgres function, so partial failure
is impossible:

```sql
create or replace function settle_payment(
  p_payment_id uuid,
  p_charge_id text,
  p_assessment_ids uuid[]
) returns void
language plpgsql security definer as $$
declare
  v_payment payments%rowtype;
  v_assessment assessments%rowtype;
begin
  select * into v_payment from payments where id = p_payment_id for update;

  if v_payment.status = 'succeeded' then
    return;                                  -- already settled; idempotent
  end if;

  update payments
     set status = 'succeeded',
         stripe_charge_id = p_charge_id,
         succeeded_at = now()
   where id = p_payment_id;

  -- Allocate across assessments, oldest first
  for v_assessment in
    select * from assessments where id = any(p_assessment_ids) order by due_on
  loop
    insert into payment_allocations (payment_id, assessment_id, amount_cents)
    values (p_payment_id, v_assessment.id, v_assessment.amount_cents);

    update assessments set status = 'paid' where id = v_assessment.id;

    insert into ledger_entries
      (community_id, unit_id, entry_type, amount_cents, reference_type, reference_id)
    values
      (v_payment.community_id, v_payment.unit_id, 'payment_received',
       -v_assessment.amount_cents, 'payment', p_payment_id);
  end loop;

  -- Confirm any reservation waiting on this payment
  update reservations
     set status = 'confirmed'
   where payment_id = p_payment_id and status = 'pending';
end $$;
```

`for update` locks the row. `if status = 'succeeded' then return` makes it idempotent.
Both matter — webhooks arrive more than once, and sometimes concurrently.

---

## 6. The client

The mobile side is deliberately thin, because it isn't trusted.

```bash
npx expo install @stripe/stripe-react-native
```

```json
// app.json
{
  "plugins": [[
    "@stripe/stripe-react-native",
    { "merchantIdentifier": "merchant.com.hamlethq.app", "enableGooglePay": true }
  ]]
}
```

```tsx
export function PayButton({ assessmentIds }: { assessmentIds: string[] }) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [state, setState] = useState<'idle'|'preparing'|'processing'>('idle');
  const idempotencyKey = useRef(Crypto.randomUUID()).current;

  async function pay() {
    setState('preparing');
    try {
      const { clientSecret, paymentId } = await api.payments.create({
        assessmentIds,
        idempotencyKey,
      });

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: community.name,
        paymentIntentClientSecret: clientSecret,
        applePay: { merchantCountryCode: 'US' },
        googlePay: { merchantCountryCode: 'US', testEnv: !isProduction },
        allowsDelayedPaymentMethods: true,      // ACH
      });
      if (initError) throw initError;

      const { error } = await presentPaymentSheet();

      if (error) {
        if (error.code === 'Canceled') { setState('idle'); return; }
        throw error;
      }

      // ⚠️ Do NOT mark as paid here. Wait for the webhook.
      setState('processing');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push(`/payments/${paymentId}/processing`);
    } catch (e) {
      setState('idle');
      Alert.alert('Payment failed', getUserMessage(e));
    }
  }

  return (
    <Button onPress={pay} disabled={state !== 'idle'}>
      <Text>{state === 'idle' ? `Pay ${formatCents(total)}` : 'Processing…'}</Text>
    </Button>
  );
}
```

The "processing" screen subscribes to realtime updates on that payment row and flips to
"Paid" when the webhook settles it — usually within a second or two.

---

## 7. Dues and autopay

```sql
-- Idempotent monthly dues generation
insert into assessments (community_id, unit_id, kind, description, amount_cents, due_on, period_start, period_end)
select
  u.community_id, u.id, 'dues',
  to_char(period_start, 'Mon YYYY') || ' dues',
  u.dues_cents, period_start + interval '10 days',
  period_start, period_start + interval '1 month' - interval '1 day'
from units u
cross join (select date_trunc('month', now())::date as period_start) p
where u.dues_cents > 0
on conflict (unit_id, period_start, kind) do nothing;   -- ← idempotent
```

That `on conflict do nothing`, backed by a unique index, is what makes a re-run safe.
Without it, a cron retry double-bills every household in every community.

**Autopay** uses a saved payment method and off-session charges:

```ts
const intent = await stripe.paymentIntents.create({
  amount: amountCents,
  currency: 'usd',
  customer: stripeCustomerId,
  payment_method: savedMethodId,
  off_session: true,
  confirm: true,
}, { stripeAccount, idempotencyKey: `autopay-${assessmentId}` });
```

Off-session charges fail more often (expired cards, insufficient funds, 3DS required).
Handle `authentication_required` by notifying the resident to complete it in-app —
don't just log a failure.

---

## 8. Refunds

```ts
const refund = await stripe.refunds.create({
  payment_intent: payment.stripe_payment_intent_id,
  amount: refundCents,             // partial supported
  reason: 'requested_by_customer',
}, { stripeAccount, idempotencyKey: `refund-${reservationId}` });
```

Refund rules:
- **Only board members and above** can issue refunds
- **Every refund writes a ledger entry** with the actor
- **Reopen the assessment** if a payment is fully refunded
- **Never refund more than was captured** — check `amount - refunded_cents`
- Application fees are refunded proportionally by default

Cancellation refunds follow the amenity's policy:

```ts
// packages/core — shared between client display and server charge
export function cancellationOutcome(
  reservation: Reservation, policy: AmenityPolicy, now: Date
) {
  const hoursUntil = differenceInHours(reservation.startsAt, now);
  if (hoursUntil >= policy.cancellationWindowHours) {
    return { feeCents: 0, refundCents: reservation.feeCents };
  }
  const feeCents = Math.round(reservation.feeCents * policy.cancellationFeePct / 100);
  return { feeCents, refundCents: reservation.feeCents - feeCents };
}
```

`Math.round` — not `Math.floor`, not raw multiplication. Integer cents out.

---

## 9. Disputes

A resident disputes a charge. Stripe pulls the funds immediately and you have a
deadline to respond.

```ts
async function handleDispute(dispute: Stripe.Dispute) {
  await supabaseAdmin.from('disputes').insert({
    stripe_dispute_id: dispute.id,
    payment_id: paymentId,
    amount_cents: dispute.amount,
    reason: dispute.reason,
    status: dispute.status,
    evidence_due_by: new Date(dispute.evidence_details.due_by * 1000),
  });

  await notifyBoard(communityId, {
    title: 'Payment dispute filed',
    body: `A ${formatCents(dispute.amount)} charge has been disputed. Evidence due ${date}.`,
  });
}
```

**Your best dispute defense is a good audit trail.** For every payment, be able to
produce: what was charged, for what assessment, who authorized it, when, from what
device, and the community's fee policy at that time. That's what `ledger_entries` is
for.

---

## 10. Testing

**Stripe test cards** — run every one of these deliberately:

| Card | Behaviour |
|---|---|
| `4242 4242 4242 4242` | Succeeds |
| `4000 0000 0000 0002` | Declined |
| `4000 0000 0000 9995` | Insufficient funds |
| `4000 0025 0000 3155` | Requires 3D Secure |
| `4000 0000 0000 0341` | Attaches, then fails on charge |

**Failure scenarios that must be tested — not assumed:**

- [ ] Double-tap pay → exactly one charge
- [ ] Network drops between intent creation and sheet → recoverable
- [ ] App killed after sheet succeeds → webhook still settles; UI catches up
- [ ] Webhook delivered twice → settled once
- [ ] Webhook arrives *before* the client returns → UI still correct
- [ ] Refund exceeds captured amount → rejected
- [ ] Payment for an already-paid assessment → rejected
- [ ] Cron runs twice → no duplicate assessments
- [ ] Connected account not yet enabled → pay button hidden with explanation

**Use the Stripe CLI to replay webhooks locally:**

```bash
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
stripe trigger payment_intent.succeeded
```

---

## 11. Review checklist

Every payment-related diff, without exception:

```
□ All amounts are integer cents; no float arithmetic anywhere
□ Amount computed server-side from database values
□ Idempotency key present, unique-constrained, passed to Stripe too
□ Webhook signature verified
□ Webhook handler idempotent (processed_webhook_events)
□ Settlement is atomic (single transaction / Postgres function)
□ Row locked with FOR UPDATE where state is read then written
□ Ledger entry written for every money movement
□ Authorization checked — who can trigger this?
□ Client never asserts payment success
□ Failure path handled and surfaced to the user
□ No card data touched or stored
□ Connected account checked for charges_enabled
□ Tested with declines and duplicate webhooks
```

> This checklist is the concrete application of the
> [Tier 3 protocol](../04-ai-workflow/05-reviewing-ai-code.md#7-the-tier-3-protocol).
> AI can draft payment code. You verify every line against this list. No exceptions,
> including when you're tired and it looks fine.

---

## Check yourself

1. Why can't the client tell your server the payment amount?
2. Why does the client show "processing" rather than "paid" after a successful sheet?
3. What two independent idempotency mechanisms protect a payment, and why both?
4. Why Stripe Connect rather than collecting into your own account?
5. Why is `on conflict do nothing` essential in dues generation?

<details>
<summary>Answers</summary>

1. A modified client can send any number. If the server trusts it, anyone can pay $0
   for anything. The server loads the assessments and sums them itself.
2. The payment sheet succeeding only means Stripe accepted the card. The authoritative
   confirmation arrives by webhook, which can be delayed — and the app may be killed
   before the sheet returns at all. Only the webhook is reliable.
3. A unique constraint on `payments.idempotency_key` (rejects a duplicate request
   before it reaches Stripe) and Stripe's own idempotency key (collapses a retried API
   call). They protect different failure points — your layer catches double submits,
   Stripe's catches network retries of an already-sent request.
4. Collecting HOA dues into your own account and disbursing them makes you a money
   transmitter, which requires state-by-state licensing. Connect settles funds directly
   to each community's own account.
5. Cron jobs re-run — on retry, redeploy, or overlap. Without the conflict clause, a
   second run bills every household twice for the same month.

</details>

---

## Sources

- [Stripe Connect](https://stripe.com/docs/connect)
- [Stripe — Idempotent requests](https://stripe.com/docs/api/idempotent_requests)
- [Stripe — Webhooks best practices](https://stripe.com/docs/webhooks)
- [@stripe/stripe-react-native](https://github.com/stripe/stripe-react-native)

**Next:** [Reservations →](./05-reservations.md)
