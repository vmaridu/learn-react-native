# Observability

On the web you tail logs. On mobile the code runs on a stranger's phone, on an OS
version you've never tested, in a country you've never visited. Observability isn't
optional — it's the only way you find out anything is wrong.

---

## 1. What you can't see

| Web | Mobile |
|---|---|
| Server logs on demand | ❌ Code runs on a device you can't reach |
| Reproduce with a URL | ❌ Depends on device, OS, app version, network |
| Deploy a fix instantly | ⚠️ OTA for JS; days for native |
| Every user on latest | ❌ Users run versions from months ago |
| One runtime | ❌ Two platforms, dozens of OS versions, thousands of devices |

**The consequence:** if you don't instrument it, you will not know. Users don't file
bug reports — they uninstall.

---

## 2. Sentry — crash and error reporting

```bash
npx expo install @sentry/react-native
```

```json
// app.json
{
  "plugins": [
    ["@sentry/react-native/expo", {
      "organization": "hamlet-hq",
      "project": "mobile"
    }]
  ]
}
```

```ts
// app/_layout.tsx — initialize as early as possible
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: config.sentryDsn,
  environment: config.environment,
  release: `${Application.nativeApplicationVersion}(${Application.nativeBuildVersion})`,
  tracesSampleRate: config.environment === 'production' ? 0.2 : 1.0,
  enableAutoSessionTracking: true,

  // Don't send PII by default
  sendDefaultPii: false,

  beforeSend(event) {
    // Scrub anything sensitive before it leaves the device
    if (event.request?.headers) {
      delete event.request.headers.Authorization;
      delete event.request.headers.apikey;
    }
    return event;
  },

  integrations: [
    Sentry.reactNativeTracingIntegration(),
    Sentry.mobileReplayIntegration({
      maskAllText: true,       // ← mask by default
      maskAllImages: true,
    }),
  ],
});

export default Sentry.wrap(RootLayout);
```

### Source maps — do not skip this

Without source maps, a production stack trace looks like:

```
at t (index.android.bundle:1:284729)
at n (index.android.bundle:1:284801)
```

Useless. With them:

```
at createReservation (src/features/reservations/api.ts:47:12)
at BookingButton (src/features/reservations/components/BookingButton.tsx:23:9)
```

The Expo plugin uploads them automatically on EAS builds when `SENTRY_AUTH_TOKEN` is
set:

```bash
eas secret:create --scope project --name SENTRY_AUTH_TOKEN --value "..."
```

**Verify it worked** by triggering a test error in a production build and checking the
stack trace is readable. Do this once, on your first release — discovering broken
source maps during an incident is miserable.

### Context that makes errors debuggable

```ts
// After sign-in — identify without over-collecting
Sentry.setUser({ id: session.user.id });          // NOT email or name

// Community context
Sentry.setContext('community', {
  id: communityId,
  role: membership.role,
});

// Breadcrumbs for the path leading to the error
Sentry.addBreadcrumb({
  category: 'reservation',
  message: 'Availability loaded',
  level: 'info',
  data: { amenityId, date, slotCount },
});
```

**Breadcrumbs are what turn "TypeError: undefined" into a diagnosis.** Add them at
meaningful transitions: screen views, mutations started, permissions requested,
network state changes.

### Reporting handled errors

```ts
try {
  await createReservation(input);
} catch (error) {
  if (error instanceof ConflictError) {
    // Expected — not an error worth reporting
    showMessage(error.userMessage);
    return;
  }
  Sentry.captureException(error, {
    tags: { feature: 'reservations' },
    extra: { amenityId: input.amenityId },
  });
  showMessage(getUserMessage(error));
}
```

**Don't report expected failures.** A booking conflict is normal product behaviour. If
your Sentry fills with expected errors, you'll stop reading it — and that's how real
crashes get missed.

---

## 3. The metrics that matter

### Crash-free rate — the headline number

| Metric | Target | Meaning |
|---|---|---|
| Crash-free **sessions** | > 99.5% | Sessions without a crash |
| Crash-free **users** | > 99.0% | Users who never crashed |

Below 99% and you have a serious problem. Below 95% and users are uninstalling.

**Watch it per release.** A drop right after a release tells you exactly what caused it.
Set a Sentry alert:

> Alert when crash-free sessions drop below 99% in the last hour.

That alert plus phased rollout is your safety net.

### App start time

```ts
const start = Date.now();
// after first meaningful paint
analytics.track('app_start_complete', { durationMs: Date.now() - start });
```

Targets: cold start < 2s on mid-range Android, < 1.5s on iOS.

### Other technical signals

| Metric | Why |
|---|---|
| ANR rate (Android) | App Not Responding — Play Console penalizes this |
| Slow/frozen frames | Perceived performance |
| Network error rate | Backend or connectivity problems |
| Failed mutations | Something's broken in a flow |
| OTA update adoption | How fast fixes reach users |

---

## 4. Product analytics

Crash reporting tells you what broke. Analytics tells you what people *do* — and for a
startup, that's the more important question.

**PostHog** is a good default: generous free tier, session replay, feature flags,
self-hostable.

```bash
pnpm add posthog-react-native
```

```ts
posthog.capture('reservation_created', {
  amenity_kind: amenity.kind,
  fee_cents: reservation.feeCents,
  days_in_advance: differenceInDays(reservation.startsAt, new Date()),
  community_id: communityId,
});
```

### Event naming

Pick a convention and hold it. `object_verb`, past tense, snake_case:

```
✅ reservation_created, payment_succeeded, broadcast_read, onboarding_completed
❌ CreateReservation, click_button, user did thing, Reservation Created
```

Put the convention in `CLAUDE.md`, or your event names will drift the moment an agent
adds instrumentation.

### The events worth tracking for Hamlet HQ

**Activation funnel** — the metric that predicts churn:
```
app_installed → signup_started → signup_completed →
community_joined → first_action_completed
```

**Core value:**
```
reservation_created / reservation_cancelled
payment_succeeded / payment_failed
broadcast_read
event_rsvp_created
```

**Friction:**
```
permission_denied (which one)
payment_failed (why)
reservation_conflict_hit
offline_action_blocked
error_shown (which error)
```

That last group is the most actionable. `permission_denied` for notifications spiking
means your priming screen isn't working. `reservation_conflict_hit` spiking means your
availability UI is stale.

> ⚠️ **Never put PII in analytics properties.** No names, emails, addresses, or unit
> labels. Use IDs. A `community_id` is fine; "1420 Oak Street" is not.

---

## 5. Structured logging

```ts
// lib/logger.ts
type Level = 'debug' | 'info' | 'warn' | 'error';

function log(level: Level, message: string, context?: Record<string, unknown>) {
  if (__DEV__) {
    console[level === 'debug' ? 'log' : level](message, context);
  }

  Sentry.addBreadcrumb({
    category: 'app',
    message,
    level: level === 'warn' ? 'warning' : level,
    data: context,
  });

  if (level === 'error') {
    Sentry.captureMessage(message, { level: 'error', extra: context });
  }
}

export const logger = {
  debug: (m: string, c?: object) => log('debug', m, c),
  info:  (m: string, c?: object) => log('info', m, c),
  warn:  (m: string, c?: object) => log('warn', m, c),
  error: (m: string, c?: object) => log('error', m, c),
};
```

**Never `console.log` in production code.** It ships in the bundle, can leak sensitive
data into device logs, and costs performance. Ban it:

```js
{ rules: { 'no-console': ['error', { allow: ['warn', 'error'] }] } }
```

---

## 6. Session replay

Sentry and PostHog both offer mobile session replay. Genuinely useful for "user says
booking doesn't work, can't reproduce."

> 🔴 **Mask everything by default.** You are recording screens containing payment
> amounts, home addresses, and residents' names.

```ts
Sentry.mobileReplayIntegration({
  maskAllText: true,
  maskAllImages: true,
  maskAllVectors: true,
});
```

Then selectively unmask only what's safe:

```tsx
<Sentry.Unmask>
  <Text>Book the clubhouse</Text>
</Sentry.Unmask>
```

Sample it low in production (1–5%), and always for sessions that hit an error. And
**disclose it in your privacy policy** — recording user sessions is data collection.

---

## 7. Alerts

Alerts you should actually configure, and nothing more (alert fatigue is real):

| Alert | Threshold | Channel |
|---|---|---|
| Crash-free sessions < 99% | 1 hour window | Push + email |
| New crash affecting > 10 users | Immediate | Push |
| Payment failure rate > 5% | 1 hour | Push — **money** |
| Webhook processing errors | Any | Push — **money** |
| API error rate > 2% | 15 min | Email |
| ANR rate rising | Daily digest | Email |

Route the money ones to your phone. Everything else can wait for morning.

---

## 8. Backend observability

Supabase gives you:
- **Logs Explorer** — Postgres, API, and Edge Function logs
- **Query performance** — slow queries, missing indexes
- **Database health** — connections, cache hit rate

Wire Sentry into Edge Functions too:

```ts
Deno.serve(async (req) => {
  try {
    return await handler(req);
  } catch (error) {
    Sentry.captureException(error, { tags: { function: 'create-payment' } });
    return json({ error: 'internal_error' }, 500);
  }
});
```

**A payments audit query worth running weekly:**

```sql
-- Payments stuck in pending for over an hour = something is wrong
select id, amount_cents, created_at, stripe_payment_intent_id
from payments
where status = 'pending' and created_at < now() - interval '1 hour'
order by created_at;
```

If that returns rows, a webhook isn't landing. Catch it before a resident does.

---

## 9. Debugging production issues

The workflow when a user reports something:

```
1. Sentry — is there an error for this user/time?
   → read the stack trace and breadcrumbs
2. Analytics — what did they actually do?
   → the event sequence before the problem
3. Session replay, if sampled
4. Supabase logs — did the request reach the backend? What did it return?
5. Reproduce on the same app version and OS
```

**The most useful thing you can build:** an in-app "Report a problem" button that
attaches the Sentry session ID.

```tsx
async function reportProblem(description: string) {
  const eventId = Sentry.captureMessage('User-reported problem', {
    level: 'info',
    extra: {
      description,
      appVersion: Application.nativeApplicationVersion,
      platform: Platform.OS,
      osVersion: Platform.Version,
      communityId,
    },
  });
  await api.support.create({ description, sentryEventId: eventId });
}
```

Now a support message arrives with full technical context attached, instead of "it
doesn't work."

---

## 10. Checklist

```
□ Sentry initialized before anything else
□ Source maps uploading — VERIFIED on a production build
□ Release + environment tagged on every event
□ User identified by ID only, never email/name
□ Breadcrumbs on screen views, mutations, permissions
□ Expected errors NOT reported as exceptions
□ Session replay masked by default, disclosed in privacy policy
□ PostHog with a documented event naming convention
□ Activation funnel instrumented
□ Friction events instrumented (permission_denied, payment_failed…)
□ No PII in analytics properties
□ no-console lint rule enabled
□ Alerts configured; money alerts go to your phone
□ Edge Functions report to Sentry
□ Weekly stuck-payments query
□ In-app "Report a problem" with Sentry event ID
```

---

## Check yourself

1. Why are source maps critical, and how do you know they're working?
2. Why not report expected errors like booking conflicts to Sentry?
3. Why identify users by ID rather than email in Sentry?
4. Which alerts should reach your phone at night?
5. What does a stuck `pending` payment indicate?

<details>
<summary>Answers</summary>

1. Without them, production stack traces are minified bundle offsets that identify
   nothing. Verify by triggering a deliberate error in a real production build and
   confirming the trace shows readable file names and line numbers.
2. They're normal product behaviour, not defects. Reporting them buries genuine crashes
   in noise, and once your Sentry is noisy you stop reading it — which is how real
   crashes get missed.
3. Emails and names are PII. An ID is enough to correlate reports with a user in your
   own database, without exporting personal data to a third-party service.
4. Money-related ones: payment failure rate spiking, webhook processing errors, and a
   crash-free rate collapse. Everything else can wait until morning.
5. A Stripe webhook isn't being delivered or processed — so residents may have been
   charged without their reservation being confirmed. It's a money-correctness issue and
   needs immediate attention.

</details>

---

## Sources

- [Sentry — React Native](https://docs.sentry.io/platforms/react-native/)
- [PostHog — React Native](https://posthog.com/docs/libraries/react-native)
- [Expo — Using Sentry](https://docs.expo.dev/guides/using-sentry/)

**Next:** [Security and privacy →](./06-security-and-privacy.md)
