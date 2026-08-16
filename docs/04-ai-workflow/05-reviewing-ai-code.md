# Reviewing AI Code

**The most important doc in this section.** You said you'll read the code even though
AI writes it. This is how to do that well.

---

## 1. Why AI code needs a different review

Reviewing a colleague's code and reviewing AI code are different activities, because
the failure modes are different.

| Human code | AI code |
|---|---|
| Bugs cluster where the author was confused | Bugs are **uniformly distributed** — no "this bit looks shaky" signal |
| Style varies; sloppiness is visible | **Uniformly polished**, including the wrong parts |
| Author remembers the tradeoffs | No memory; may contradict a decision from an hour ago |
| Missing pieces look unfinished | Missing pieces look **complete and considered** |
| Author knows what they didn't test | Will state it works without having run it |
| Comments explain real intent | Comments may describe intent the code doesn't implement |

**The core problem: AI code looks equally confident whether it's right or wrong.** Your
usual reviewer instinct — "this section feels rushed" — doesn't fire. You have to
replace intuition with a checklist.

---

## 2. The three-pass method

Don't read a diff top to bottom once. Read it three times with different questions.

### Pass 1 — Shape (30 seconds)

Zoom out. Don't read implementations yet.

- How many files changed? More than ~3 → should this have been split?
- Any files you didn't expect? *(Why is it touching `app.json`?)*
- New dependencies? *(Did you approve that?)*
- New files that duplicate something existing? *(A second `Button`?)*
- Deleted code — do you know why?

**Bail out here if the shape is wrong.** Reviewing the details of a badly-scoped change
wastes the effort. Re-scope and regenerate.

```bash
git diff --stat
git diff --name-only
```

### Pass 2 — Correctness (the real work)

Now read every line. For each block, ask: **what happens when this goes wrong?**

The specific questions that catch real bugs:

**Data and state**
- [ ] What if this array is empty? What if it's `undefined`?
- [ ] What if the query is still loading when this renders?
- [ ] Is the cache invalidated after this mutation? Which keys?
- [ ] Does this handle the error case, or only the happy path?
- [ ] Optimistic update — is there a rollback? Is optimism even appropriate here?

**Async and timing**
- [ ] Two users doing this simultaneously — what happens?
- [ ] The user taps twice quickly — double submission?
- [ ] The request fails halfway — what state are we left in?
- [ ] Is there a race between this and a refetch?
- [ ] Does this clean up on unmount? (subscriptions, timers, listeners)

**React Native specific**
- [ ] Does this run on Android too, or is it iOS-shaped?
- [ ] Safe areas handled?
- [ ] Does it work in dark mode?
- [ ] Is the list virtualized?
- [ ] Are `renderItem`/callbacks stable, or new every render?
- [ ] Permissions — is denial handled? Is `canAskAgain` checked?
- [ ] Does it block the JS thread?

**Security and authorization**
- [ ] Who is allowed to do this, and where is that enforced?
- [ ] Is the check server-side, or only in the UI?
- [ ] Could a modified client bypass it?
- [ ] Is any sensitive data being logged or persisted?

**Money** (Hamlet HQ especially)
- [ ] Are amounts integers (cents), never floats?
- [ ] Is there an idempotency key?
- [ ] What happens if the charge succeeds but the DB write fails?
- [ ] Is the amount computed server-side? *(Never trust a client-sent price.)*

### Pass 3 — Fit

Does this belong in *your* codebase?

- [ ] Follows existing patterns, or invents a new one?
- [ ] Reuses your components, or duplicates them?
- [ ] Naming consistent with the rest of the code?
- [ ] Right layer? (Business logic in a component is a smell)
- [ ] Would you have written something recognizably similar?

---

## 3. The explain-back test

The single most valuable technique, and it takes 60 seconds.

> **Pick the most complex function in the diff. Explain out loud what it does, why it's
> structured that way, and what would break if you deleted any given line.**

If you can't, you have three options:

1. Ask for an explanation, then re-review with understanding
2. Rewrite it yourself in a way you *do* understand
3. Reject it and re-scope into something smaller

**Do not merge it.** This is the discipline that prevents the six-week collapse
described in [the operating model](./01-operating-model.md).

A useful prompt:

```
Explain this function line by line. For each line, tell me what breaks if
I remove it. Then tell me what edge cases it doesn't handle.
```

That last clause is where the value is — models are noticeably willing to identify
gaps in their own output when asked directly.

---

## 4. The React Native failure catalogue

Concrete things AI gets wrong in this specific ecosystem. Check for these explicitly.

### Hallucinated or stale packages

```tsx
import { Calendar } from 'react-native-super-calendar';   // doesn't exist
import AsyncStorage from '@react-native-community/async-storage';  // renamed years ago
```

**Always:** `npm view <package> version time.modified`

### Legacy API patterns

Training data is full of pre-2024 React Native.

| Suggested | Should be |
|---|---|
| `TouchableOpacity` | `Pressable` |
| `AsyncStorage` for tokens | `expo-secure-store` |
| `Animated` + `useNativeDriver` | Reanimated worklets |
| `FlatList` for large lists | `FlashList` |
| `componentWillMount` | (long gone) |
| `Image` from react-native | `expo-image` |
| Manual native linking steps | Autolinking / config plugins |
| Bridge/`NativeModules` patterns | TurboModules / Expo Modules API |

### Web patterns leaking in

```tsx
<div onClick={...}>                    // ❌
localStorage.setItem(...)              // ❌
{items.map(i => <Row key={i.id}/>)}    // ❌ for a long list
className="hover:bg-slate-100"         // ❌ no hover on touch
position: 'fixed'                      // ❌ doesn't exist
```

### The `0` render crash

```tsx
{cart.length && <Badge count={cart.length} />}
```
When `length` is `0`, this renders the number `0` as a bare string → **crash**. On the
web it silently prints "0", so this pattern is everywhere in training data.

Catch it with the `react/jsx-no-leaked-render` ESLint rule.

### Missing platform handling

```tsx
// ❌ iOS-shaped
<View style={{ paddingTop: 44 }}>   // hardcoded notch height

// ✅
<View style={{ paddingTop: insets.top }}>
```

Also: shadows without `elevation`, no Android back handling, date pickers that don't
account for Android's self-dismissing dialog.

### Unstable list props

```tsx
// ❌ new function every render → every row re-renders
<FlashList renderItem={({ item }) => <Row item={item} onPress={() => go(item.id)} />} />
```

### Missing cleanup

```tsx
// ❌ leaks
useEffect(() => {
  const sub = Notifications.addNotificationReceivedListener(handler);
}, []);

// ✅
useEffect(() => {
  const sub = Notifications.addNotificationReceivedListener(handler);
  return () => sub.remove();
}, []);
```

### Client-side-only authorization

```tsx
// ❌ this is UI, not security
{user.role === 'board_member' && <DeleteButton />}
```

Hiding a button is not authorization. The server must enforce it — the API can be
called directly. This is the most dangerous category because it *looks* correct and
works in every manual test.

### Float money

```ts
const total = price * 1.08;      // ❌ floating point
const totalCents = Math.round(priceCents * 1.08);   // ✅
```

---

## 5. What AI is genuinely good at

Balance matters — over-suspicion wastes the leverage.

**Reliably good:**
- Boilerplate and scaffolding
- Following a pattern you've established
- TypeScript types from a schema
- Test scaffolding
- Mechanical refactors
- Explaining unfamiliar code
- Catching your typos and simple bugs
- Standard implementations of well-known algorithms

**Reliably weak:**
- Knowing what *should* be built
- Your business rules (unless you wrote them down)
- Concurrency and race conditions
- Anything requiring a full-system mental model
- Knowing what it doesn't know
- Current library versions and ecosystem status
- Distinguishing "works" from "correct"

Calibrate scrutiny to the column, not uniformly.

---

## 6. Tooling that reviews for you

Every check you automate is one you don't have to hold in your head.

```json
{
  "scripts": {
    "verify": "pnpm typecheck && pnpm lint && pnpm test"
  }
}
```

**ESLint rules that catch AI mistakes specifically:**

```js
export default [
  {
    rules: {
      'react/jsx-no-leaked-render': ['error', { validStrategies: ['ternary'] }],
      'react-hooks/exhaustive-deps': 'error',
      'no-restricted-imports': ['error', {
        paths: [
          { name: 'react-native', importNames: ['Text'],
            message: 'Import Text from ~/components/ui/text' },
          { name: 'react-native', importNames: ['Image'],
            message: 'Use expo-image' },
          { name: 'react-native', importNames: ['TouchableOpacity'],
            message: 'Use Pressable' },
          { name: '@react-native-async-storage/async-storage',
            message: 'Use MMKV for prefs, expo-secure-store for secrets' },
        ],
      }],
      'no-restricted-syntax': ['error', {
        selector: "CallExpression[callee.property.name='map'] > ArrowFunctionExpression",
        message: 'Long lists must use FlashList, not .map()',
      }],
    },
  },
];
```

**Use AI to review AI.** A fresh conversation, with no attachment to the code, catches
real issues:

```
Review this diff as a hostile senior React Native engineer. Find the three
most likely production bugs. Focus on: race conditions, error paths,
Android-specific behavior, and authorization.
```

```
/security-review
```

This works because a new context has no commitment to the previous reasoning.

---

## 7. The Tier 3 protocol

For money, auth, migrations, and permissions — the things that hurt.

1. **Read it twice, on different days if possible.** Fresh eyes catch different bugs.
2. **Write the tests yourself.** Don't let the AI write the tests for the code it
   wrote — it tests the behavior it implemented, including the wrong parts.
3. **Enumerate what could go wrong**, then verify each is handled:
   - Concurrent access
   - Partial failure (step 1 succeeds, step 2 fails)
   - Retry / double submit
   - Wrong user attempting the action
   - Malformed or hostile input
4. **Trace the authorization path** from client to database. Where is it *actually*
   enforced?
5. **Read the migration line by line.** Is it reversible? Does it drop anything?
6. **Test with a hostile client** — call the API directly with a modified payload.

### A worked Tier 3 review

```ts
// AI-generated
export async function cancelReservation(id: string) {
  const { data: reservation } = await supabase
    .from('reservations').select('*').eq('id', id).single();

  const hoursUntil = differenceInHours(new Date(reservation.starts_at), new Date());
  const fee = hoursUntil < 24 ? reservation.amount_cents * 0.5 : 0;

  if (fee > 0) {
    await stripe.charges.create({ amount: fee, customer: reservation.customer_id });
  }

  await supabase.from('reservations').update({ status: 'cancelled' }).eq('id', id);
  return { success: true, fee };
}
```

Reads fine. It's badly broken. Findings:

1. **No authorization.** Any authenticated user can cancel any reservation by ID.
2. **Fee computed client-side.** If this runs in the app, a modified client sets
   `fee = 0`. Must be server-side.
3. **Float math.** `amount_cents * 0.5` can produce `1250.0000000000002`. Stripe
   rejects non-integers, or you charge the wrong amount. Use `Math.round`.
4. **No idempotency key.** A retry double-charges.
5. **Not atomic.** Charge succeeds → update fails → user charged for a reservation
   still marked active, and they'll cancel again.
6. **No state check.** Cancelling an already-cancelled reservation charges again.
7. **Unhandled null.** `.single()` throws if not found; nothing catches it.
8. **Slot not released.** Cancelling should free availability — that's the entire
   point.
9. **`{ success: true }` is unconditional.** It returns success even where errors were
   swallowed.

**Nine real defects in twelve plausible-looking lines.** Every one would have shipped
if reviewed casually. This is what Tier 3 scrutiny is for — and why money code goes in
a Postgres function with row locking, not a client-callable helper.

---

## 8. Your review checklist

Print this. Use it until it's automatic.

```
SHAPE
□ Scope is right; diff is small enough to review properly
□ No unexpected files touched
□ No unapproved dependencies
□ Nothing duplicates existing code

CORRECTNESS
□ Empty / null / loading states handled
□ Error paths handled, not just the happy path
□ Cleanup on unmount
□ No race conditions; concurrent use considered
□ Double-tap / retry safe
□ Cache invalidation correct

REACT NATIVE
□ Works on iOS AND Android (actually run, not assumed)
□ Safe areas respected
□ Dark mode works
□ Lists virtualized; props stable
□ Permissions handle denial and canAskAgain
□ Accessibility roles and labels present
□ No web-only patterns

SECURITY
□ Authorization enforced server-side
□ No secrets in code or logs
□ Input validated at the trust boundary
□ Nothing sensitive persisted unencrypted

MONEY (if applicable)
□ Integer cents, no floats
□ Amounts computed server-side
□ Idempotency key present
□ Atomic, or compensating action on failure
□ State machine transitions are legal

FIT
□ Follows existing patterns
□ Reuses existing components
□ Right architectural layer
□ I can explain every line
```

---

## 9. Exercise

Deliberate practice at finding AI bugs:

1. Ask an AI to build a feature **without any of your context files** — no `CLAUDE.md`,
   fresh session. Something real: "add reservation cancellation with a fee."
2. Review it with the checklist above. **Write down every defect you find.**
3. Then ask a *fresh* AI session: "Review this as a hostile senior engineer, focusing
   on race conditions, authorization, and money handling."
4. Compare its findings to yours.

**Anything it found that you missed is a gap in your review skill.** Anything you found
that it missed is evidence your judgment is adding real value.

Repeat monthly. Your hit rate is the number that matters — it's the direct measure of
whether you can safely go faster.

---

## Check yourself

1. Why doesn't normal code-review intuition work on AI output?
2. What's the explain-back test, and what do you do when you fail it?
3. Why shouldn't the AI write tests for its own code in Tier 3?
4. `{user.isAdmin && <DeleteButton />}` — what's wrong?
5. Nine bugs were listed in that cancellation function. Which is most dangerous, and why?

<details>
<summary>Answers</summary>

1. Human bugs cluster where the author was uncertain, and that uncertainty is visible
   in the code. AI output is uniformly polished, so the "this looks shaky" signal never
   fires — correct and incorrect code look identical.
2. Explain the most complex function aloud, including what breaks if you remove any
   line. If you can't: get it explained and re-review, rewrite it yourself, or reject
   and re-scope. Never merge it.
3. It tests the behavior it implemented — including the parts that are wrong. The tests
   will pass and encode the bug as expected behavior.
4. It's UI, not authorization. The API can be called directly by a modified client.
   Authorization must be enforced server-side; hiding a button only hides it.
5. The missing authorization check — any authenticated user can cancel any reservation
   by ID. The float math and idempotency issues cost money and are recoverable; a
   missing authorization boundary is a security incident, it's silent, and it passes
   every manual test because your own UI never sends the wrong ID.

</details>

---

**Next:** [Production → Project architecture](../03-production/01-project-architecture.md)
