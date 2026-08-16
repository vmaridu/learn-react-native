# Testing Strategy

What to test on mobile, what not to, and how tests make AI delegation safe.

---

## 1. Why testing matters more when AI writes code

You already know the standard case for tests. Here's the case specific to your
situation:

**Tests are how you delegate safely.** Every behaviour a test pins down is a behaviour
an AI agent cannot silently break. Without tests, "the AI refactored something and now
bookings are broken" is a bug you find in production.

More directly: your `verify` script is what lets an agent iterate autonomously. It
writes code, runs `pnpm verify`, sees a failure, and fixes it — without you. The
richer that gate, the more you can hand off.

> **The rule that follows:** in Tier 3 code (money, auth, permissions), **you write the
> tests, not the AI.** An AI writing tests for its own code tests the behaviour it
> implemented — including the parts that are wrong. It will produce a green suite that
> encodes the bug as expected behaviour.

---

## 2. The mobile testing pyramid

```
        ╱─────────╲
       ╱  Maestro  ╲       5–10 flows.  Slow, high confidence.
      ╱   E2E       ╲
     ╱───────────────╲
    ╱   Component     ╲    ~30 tests.  Critical UI only.
   ╱  Testing Library  ╲
  ╱─────────────────────╲
 ╱      Unit tests       ╲  100+.  Fast, cheap, where logic lives.
╱  Business logic, pure   ╲
───────────────────────────
```

**Different from web:** the E2E layer is proportionally more valuable on mobile,
because so much can only break on a real device — permissions, navigation, native
modules, platform differences. And component tests are proportionally *less* valuable,
because they run in a JS environment that isn't the real renderer.

**Where to spend effort:**

| Layer | Effort | Why |
|---|---|---|
| Pure business logic | 🟢 Heavy | Cheap, fast, catches real bugs |
| Hooks with mocked API | 🟡 Moderate | Caching and invalidation logic |
| Components | 🟡 Light | Only complex/critical ones |
| E2E flows | 🟢 Heavy on 5–10 | The only thing that proves it works |
| Snapshot tests | 🔴 Avoid | High churn, near-zero signal |

---

## 3. Setup

```bash
npx expo install jest-expo jest
pnpm add -D @testing-library/react-native @testing-library/jest-native \
  @types/jest react-test-renderer
```

```js
// jest.config.js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|nativewind|react-native-css-interop)',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
};
```

That `transformIgnorePatterns` line is the thing everyone fights. React Native
libraries ship untranspiled ESM, so Jest must transform them. When you get
`SyntaxError: Cannot use import statement outside a module`, add that package to the
pattern.

```ts
// jest.setup.ts
import '@testing-library/jest-native/extend-expect';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn(),
}));

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn(() => ({
    getString: jest.fn(), set: jest.fn(), delete: jest.fn(), getBoolean: jest.fn(),
  })),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
  Link: 'Link',
}));
```

---

## 4. Unit tests — where the value is

Pure functions extracted from your feature slices. Fast, deterministic, and they test
the logic that actually breaks.

```ts
// features/reservations/utils.test.ts
describe('cancellationOutcome', () => {
  const policy = { cancellationWindowHours: 24, cancellationFeePct: 50 };
  const reservation = { startsAt: '2026-08-20T14:00:00Z', feeCents: 5000 };

  it('is free outside the cancellation window', () => {
    const now = new Date('2026-08-19T10:00:00Z');   // 28h before
    expect(cancellationOutcome(reservation, policy, now))
      .toEqual({ feeCents: 0, refundCents: 5000 });
  });

  it('charges the policy percentage inside the window', () => {
    const now = new Date('2026-08-20T02:00:00Z');   // 12h before
    expect(cancellationOutcome(reservation, policy, now))
      .toEqual({ feeCents: 2500, refundCents: 2500 });
  });

  it('rounds to whole cents', () => {
    const odd = { ...reservation, feeCents: 3333 };
    const now = new Date('2026-08-20T02:00:00Z');
    const result = cancellationOutcome(odd, { ...policy, cancellationFeePct: 33 }, now);
    expect(Number.isInteger(result.feeCents)).toBe(true);
    expect(result.feeCents + result.refundCents).toBe(3333);   // ← no lost cents
  });

  it('treats the exact boundary as free', () => {
    const now = new Date('2026-08-19T14:00:00Z');   // exactly 24h
    expect(cancellationOutcome(reservation, policy, now).feeCents).toBe(0);
  });
});
```

**Note the last two.** "Rounds to whole cents" and "the exact boundary" are the tests
that catch real money bugs, and they're exactly the ones an AI-generated test suite
omits. The `feeCents + refundCents === total` assertion is a genuine invariant worth
asserting everywhere money is split.

**What deserves unit tests here:**

| Function | Why |
|---|---|
| `cancellationOutcome` | Money |
| `calculateReservationFee` | Money |
| `isSlotAvailable` | Correctness |
| `canUserCancel` | Authorization |
| `formatCents` | Used everywhere |
| `resolveAudience` | Privacy — wrong audience = leak |
| Date/timezone helpers | Notoriously bug-prone |

---

## 5. Hook tests

```tsx
// features/reservations/hooks.test.tsx
function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useCreateReservation', () => {
  it('invalidates availability after a successful booking', async () => {
    const invalidate = jest.spyOn(QueryClient.prototype, 'invalidateQueries');
    jest.spyOn(reservationsApi, 'create').mockResolvedValue(mockReservation);

    const { result } = renderHook(() => useCreateReservation(), { wrapper });
    result.current.mutate(validInput);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidate).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: expect.arrayContaining(['availability']) })
    );
  });

  it('surfaces a friendly message on slot conflict', async () => {
    jest.spyOn(reservationsApi, 'create')
      .mockRejectedValue(new ConflictError('That slot was just booked.'));

    const { result } = renderHook(() => useCreateReservation(), { wrapper });
    result.current.mutate(validInput);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(getUserMessage(result.current.error)).toMatch(/just booked/);
  });
});
```

**Cache invalidation is the highest-value thing to test at this layer.** A missing
`invalidateQueries` is invisible in manual testing (you navigate away and back, and it
refetches anyway) but produces stale-data bugs in production.

---

## 6. Component tests

Test **behaviour**, not implementation.

```tsx
describe('BookingButton', () => {
  it('is disabled while offline', () => {
    render(<BookingButton amenityId="1" />, { wrapper: offlineWrapper });
    expect(screen.getByRole('button', { name: /book/i })).toBeDisabled();
  });

  it('shows the fee before confirming', async () => {
    render(<BookingButton amenityId="1" />, { wrapper });
    fireEvent.press(screen.getByRole('button', { name: /book/i }));
    expect(await screen.findByText('$50.00')).toBeVisible();
  });

  it('prevents double submission', async () => {
    const create = jest.spyOn(reservationsApi, 'create').mockResolvedValue(mockReservation);
    render(<BookingButton amenityId="1" />, { wrapper });

    const button = screen.getByRole('button', { name: /book/i });
    fireEvent.press(button);
    fireEvent.press(button);
    fireEvent.press(button);

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
  });
});
```

**Query by accessibility role and label**, not test IDs. It tests what a screen-reader
user experiences, so a component that's untestable this way is usually also
inaccessible.

```tsx
// ✅ tests the accessible name
screen.getByRole('button', { name: /book the clubhouse/i })

// ❌ passes even if the button is invisible to assistive tech
screen.getByTestId('book-btn')
```

**Don't snapshot test.** Snapshots on React Native components churn constantly, and a
diff of 400 lines of serialized view tree tells you nothing. The failure mode is that
everyone runs `-u` reflexively, which makes them worse than nothing.

---

## 7. E2E with Maestro

Maestro is the right E2E tool for React Native — YAML flows, tolerant of async, runs on
real devices and simulators, and dramatically simpler than Detox.

```bash
curl -fsSL "https://get.maestro.mobile.dev" | bash
```

```yaml
# .maestro/book-amenity.yaml
appId: com.hamlethq.app.dev
---
- launchApp:
    clearState: true

- tapOn: "Sign in"
- tapOn:
    id: "email-input"
- inputText: "resident@example.com"
- tapOn:
    id: "password-input"
- inputText: "test-password"
- tapOn: "Sign in"

- assertVisible: "Discover"

- tapOn: "Clubhouse"
- assertVisible: "Book"
- tapOn: "Book"

- tapOn: "Saturday 20"
- tapOn: "2:00 PM"
- tapOn: "Continue"

- assertVisible: "$50.00"
- assertVisible: "Free cancellation until"
- tapOn: "Confirm booking"

- assertVisible:
    text: "Booking confirmed"
    timeout: 20000

- tapOn: "Bookings"
- assertVisible: "Clubhouse"
```

**The five flows to cover** (these are your regression safety net):

1. **Sign up → onboard → first action** — the funnel that matters most
2. **Book an amenity → pay → confirm** — the core value
3. **Cancel a booking → fee shown → refund** — money out
4. **Receive a broadcast → tap notification → read** — the messaging loop
5. **Offline: browse cached, attempt booking, see clear message** — the degraded path

Run them:
```bash
maestro test .maestro/                    # all
maestro test .maestro/book-amenity.yaml   # one
maestro studio                            # interactive recorder
```

**Maestro Cloud** runs these on real device farms — worth it once you have paying
customers, since OEM-specific bugs only appear on real hardware.

---

## 8. Testing RLS

> 🔴 **The highest-value test suite in Hamlet HQ**, because the failure is silent and
> catastrophic. Nothing in your app crashes when RLS is too permissive — it just quietly
> exposes neighbours' data.

```sql
-- supabase/tests/rls_reservations.test.sql
begin;
select plan(5);

-- Set up two residents in different units
insert into profiles (id, display_name, email) values
  ('11111111-1111-1111-1111-111111111111', 'Resident A', 'a@test.com'),
  ('22222222-2222-2222-2222-222222222222', 'Resident B', 'b@test.com');
-- … memberships, units, reservations …

-- Act as resident A
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111"}';

select is(
  (select count(*)::int from reservations),
  1,
  'Resident A sees only their own reservation'
);

select is(
  (select count(*)::int from reservations where unit_id = '<unit-b>'),
  0,
  'Resident A cannot see unit B reservations'
);

select is(
  (select count(*)::int from payments where unit_id = '<unit-b>'),
  0,
  'Resident A cannot see unit B payments'
);

-- Cross-tenant: a member of community 1 must not see community 2 at all
select is(
  (select count(*)::int from broadcasts where community_id = '<community-2>'),
  0,
  'No cross-community broadcast leakage'
);

-- Board member sees the whole community
set local request.jwt.claims to '{"sub":"<board-member-id>"}';
select is(
  (select count(*)::int from reservations),
  2,
  'Board member sees all community reservations'
);

select * from finish();
rollback;
```

```bash
supabase test db
```

**Add a test for every new table and every new policy.** Run them in CI. This is the
suite that protects the company.

---

## 9. What not to test

Time spent here is time not spent on tests that matter:

| Don't test | Why |
|---|---|
| Third-party libraries | TanStack Query is already tested |
| Trivial components | A `<Text>` wrapper needs no test |
| Snapshots | High churn, no signal, reflexively updated |
| Implementation details | Tests break on refactors that changed nothing |
| Styling | Use a visual review; tests here are brittle |
| Generated code | Types, DB clients |
| React itself | `useState` works |

**The heuristic:** if a test would only fail when you *intentionally* changed behaviour,
it's a good test. If it fails when you rename a variable, delete it.

---

## 10. CI integration

```yaml
# .github/workflows/ci.yml
name: CI
on: [pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }

      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test --coverage
      - run: npx expo-doctor

      - name: Check for dependency drift
        run: npx expo install --check
```

Details on the full pipeline in [CI/CD with EAS](./03-ci-cd-with-eas.md).

---

## 11. Coverage

**Don't chase a percentage.** 80% coverage of trivial components is worse than 40%
coverage concentrated on money, authorization, and availability logic.

Reasonable targets:

| Area | Target |
|---|---|
| `features/*/utils.ts` (pure logic) | 90%+ |
| Payment and reservation logic | 100% — no exceptions |
| RLS policies | Every policy, every role |
| Hooks | 60% |
| Components | 30% |
| Screens | E2E only |

---

## 12. Checklist

```
□ Jest + Testing Library configured, transformIgnorePatterns correct
□ Pure business logic extracted and unit tested
□ Money calculations tested at boundaries and for rounding
□ Cache invalidation tested in mutation hooks
□ Critical components tested by accessibility role
□ 5 Maestro flows covering the core journeys
□ RLS tests for every table and role
□ CI runs typecheck, lint, test, expo-doctor on every PR
□ No snapshot tests
□ YOU wrote the Tier 3 tests, not the AI
```

---

## Check yourself

1. Why shouldn't the AI write tests for its own Tier 3 code?
2. Why is E2E proportionally more valuable on mobile than on web?
3. Why query by accessibility role instead of test ID?
4. Why is the RLS test suite the most important one in Hamlet HQ?
5. What's wrong with snapshot tests here?

<details>
<summary>Answers</summary>

1. It tests the behaviour it implemented, including the incorrect parts — producing a
   green suite that encodes the bug as expected behaviour. You'd have less signal than
   with no tests, because the green build creates false confidence.
2. So much of a mobile app can only break outside the JS layer — permissions,
   navigation, native modules, platform and OEM differences. Only a test running the
   real app on a real device exercises those.
3. It tests the accessible name a screen-reader user hears, so the test doubles as an
   accessibility check. A component you can't query by role is usually one that's
   invisible to assistive technology.
4. Because an over-permissive policy causes no crash, no error, and no visible symptom —
   it silently exposes residents' payment and reservation data to their neighbours.
   Nothing else in the test suite can catch it.
5. They churn on every unrelated change, produce enormous unreadable diffs, and the
   universal response is to run `-u` without reading — which means they provide no
   signal while creating the impression of coverage.

</details>

---

## Sources

- [Testing Library — React Native](https://callstack.github.io/react-native-testing-library/)
- [Maestro](https://maestro.mobile.dev/)
- [jest-expo](https://docs.expo.dev/develop/unit-testing/)
- [Supabase — Database testing](https://supabase.com/docs/guides/local-development/testing/overview)

**Next:** [CI/CD with EAS →](./03-ci-cd-with-eas.md)
