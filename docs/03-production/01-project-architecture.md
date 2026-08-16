# Project Architecture

How to structure a React Native codebase so it's still workable at 50,000 lines — and
so an AI agent generates code that fits it.

---

## 1. The structure

```
apps/mobile/
├── app/                          # ROUTES ONLY. Thin screens.
│   ├── _layout.tsx
│   ├── (auth)/
│   └── (app)/
│       ├── _layout.tsx
│       ├── (tabs)/
│       └── amenity/[id].tsx
├── src/
│   ├── components/
│   │   ├── ui/                   # design system primitives (Reusables)
│   │   └── shared/               # cross-feature composites
│   ├── features/                 # ← THE IMPORTANT ONE
│   │   ├── reservations/
│   │   │   ├── api.ts            # raw data access
│   │   │   ├── keys.ts           # query key factory
│   │   │   ├── hooks.ts          # useReservations, useCreateReservation
│   │   │   ├── schemas.ts        # Zod
│   │   │   ├── types.ts
│   │   │   ├── utils.ts          # pure functions, unit-testable
│   │   │   └── components/       # feature-specific UI
│   │   ├── payments/
│   │   └── broadcasts/
│   ├── lib/                      # infrastructure
│   │   ├── supabase.ts
│   │   ├── query.ts
│   │   ├── storage.ts
│   │   └── utils.ts              # cn(), formatters
│   ├── hooks/                    # generic hooks
│   └── theme/
├── plugins/                      # config plugins
├── assets/
└── __tests__/
```

---

## 2. Feature slices

**The organizing principle: group by feature, not by file type.**

```
❌ Organized by type — every change touches four distant folders
src/
├── components/    (200 files)
├── hooks/         (80 files)
├── api/           (40 files)
└── types/         (40 files)

✅ Organized by feature — a change is local
src/features/
├── reservations/
├── payments/
└── broadcasts/
```

Why this matters more than it seems:

1. **Changes are local.** Adding a field to reservations touches one folder.
2. **Deletion is easy.** Cutting a feature means deleting a folder — no archaeology.
3. **Boundaries are visible.** If `payments/` imports from `broadcasts/`, that's a
   design smell you can *see*.
4. **AI generates correctly.** "Add an `events` slice following `reservations/`"
   produces the right thing, because the pattern is unambiguous.

That last point is worth emphasizing given how you're working. A consistent structure
is a context strategy — see
[context engineering](../04-ai-workflow/04-context-engineering.md).

### The anatomy of a slice

```ts
// features/reservations/api.ts — raw data access, no React
export const reservationsApi = {
  list: (communityId: string, filters?: Filters) =>
    supabase.from('reservations').select('*, amenity:amenities(*)')
      .eq('community_id', communityId).order('starts_at'),

  create: (input: CreateReservationInput) =>
    supabase.rpc('create_reservation', input),

  cancel: (id: string, idempotencyKey: string) =>
    supabase.rpc('cancel_reservation', { p_reservation_id: id, p_idempotency_key: idempotencyKey }),
};
```

```ts
// features/reservations/keys.ts — query key factory
export const reservationKeys = {
  all: ['reservations'] as const,
  lists: () => [...reservationKeys.all, 'list'] as const,
  list: (communityId: string, filters?: Filters) =>
    [...reservationKeys.lists(), communityId, filters] as const,
  detail: (id: string) => [...reservationKeys.all, 'detail', id] as const,
};
```

```ts
// features/reservations/hooks.ts — the ONLY thing components use
export function useReservations(filters?: Filters) {
  const { communityId } = useActiveCommunity();
  return useQuery({
    queryKey: reservationKeys.list(communityId, filters),
    queryFn: () => reservationsApi.list(communityId, filters),
    enabled: !!communityId,
  });
}
```

```ts
// features/reservations/utils.ts — pure, trivially testable
export function canCancelFree(reservation: Reservation, policy: Policy, now: Date) {
  return differenceInHours(reservation.startsAt, now) >= policy.cancellationWindowHours;
}
```

---

## 3. Dependency rules

The rules that keep the graph acyclic. Enforce them with lint, not discipline.

```
app/          →  can import from features/, components/, lib/
features/*    →  can import from components/, lib/, and OTHER features' public API only
components/   →  can import from lib/ ONLY
lib/          →  imports nothing internal
```

**Rules:**

1. **`lib/` imports nothing from `features/` or `components/`.** It's the foundation.
2. **`components/ui/` never imports from `features/`.** A Button knows nothing about
   reservations.
3. **Features may import from other features only via their index.** No reaching into
   internals.
4. **`app/` files stay thin** — compose hooks and components, no business logic.

Enforce with ESLint:

```js
{
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        { group: ['**/features/*/'], message: 'Import from the feature index, not internals' },
        { group: ['@/features/*'], importNames: ['*'],
          message: 'components/ui must not import features' },
      ],
    }],
  },
}
```

A rule the machine enforces is worth ten conventions in a README — especially when an
agent is writing the imports.

---

## 4. Thin screens

```tsx
// ❌ app/(app)/amenity/[id].tsx — 300 lines of logic in a route file
export default function AmenityScreen() {
  const { id } = useLocalSearchParams();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [slots, setSlots] = useState([]);

  useEffect(() => {
    supabase.from('reservations').select('*')...   // data access in a screen
  }, [id, selectedDate]);

  const fee = amenity.feeCents * duration / 60;     // business logic in a screen
  // ...280 more lines
}
```

```tsx
// ✅ thin — composes, doesn't implement
export default function AmenityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: amenity, isPending, error } = useAmenity(id);

  if (isPending) return <AmenitySkeleton />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (!amenity) return <NotFound />;

  return (
    <ScrollView>
      <AmenityHero amenity={amenity} />
      <AmenityPolicy amenity={amenity} />
      <AvailabilityCalendar amenityId={id} />
      <BookButton amenityId={id} />
    </ScrollView>
  );
}
```

**Why:**
- Business logic in `utils.ts` is unit-testable without mounting a navigator
- Components are reusable and testable in isolation
- The screen reads as a description of the page
- Merge conflicts drop dramatically

**The test:** if you can't understand what a screen does from its JSX in 15 seconds,
it's too fat.

---

## 5. Naming

Consistency matters more than the specific convention. Pick these and don't
re-litigate:

| Thing | Convention | Example |
|---|---|---|
| Component files | PascalCase | `AmenityCard.tsx` |
| Hook files | camelCase | `hooks.ts`, `useAmenity.ts` |
| Route files | kebab-case | `sign-in.tsx`, `[id].tsx` |
| Utils/api | camelCase | `api.ts`, `utils.ts` |
| Folders | kebab-case | `features/trail-reports/` |
| Components | PascalCase | `AmenityCard` |
| Hooks | `use` prefix | `useAmenity` |
| Booleans | `is`/`has`/`can` | `isPending`, `canCancel` |
| Handlers | `handle` prefix | `handleSubmit` |
| Handler props | `on` prefix | `onSubmit` |
| Types | PascalCase, no `I` | `Reservation` |
| Zod schemas | camelCase + `Schema` | `createReservationSchema` |
| Constants | SCREAMING_SNAKE | `MAX_PARTY_SIZE` |
| DB columns | snake_case | `starts_at` |

**On the snake_case boundary:** the database uses `snake_case`, TypeScript uses
`camelCase`. Convert once, at the API layer, so the rest of the app never sees database
casing:

```ts
// features/reservations/api.ts
function toDomain(row: ReservationRow): Reservation {
  return {
    id: row.id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    feeCents: row.fee_cents,
    status: row.status,
  };
}
```

Doing this once at the boundary beats `reservation.starts_at` leaking into 40
components.

---

## 6. Types

**Generate database types, don't hand-write them:**

```bash
npx supabase gen types typescript --project-id <id> > src/lib/database.types.ts
```

Run it in CI so drift is caught immediately.

**Layer your types:**

```ts
// 1. Database row — generated
type ReservationRow = Database['public']['Tables']['reservations']['Row'];

// 2. Domain type — what the app works with
export type Reservation = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: ReservationStatus;
  feeCents: number;
};

// 3. Input types — what a mutation accepts
export type CreateReservationInput = z.infer<typeof createReservationSchema>;
```

**Zod at every trust boundary.** TypeScript types are erased at runtime; they're a
compile-time promise about data you don't control:

```ts
export async function getReservation(id: string): Promise<Reservation> {
  const { data, error } = await supabase.from('reservations').select().eq('id', id).single();
  if (error) throw error;
  return reservationSchema.parse(data);   // ← runtime validation
}
```

Without `.parse()`, a schema change or a null column produces a crash three screens
later with no useful stack trace.

---

## 7. Error handling

**Typed errors, not strings:**

```ts
// lib/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public userMessage: string,
    public cause?: unknown
  ) { super(message); }
}

export class ConflictError extends AppError {
  constructor(userMessage: string, cause?: unknown) {
    super('Conflict', 'CONFLICT', userMessage, cause);
  }
}

export function getUserMessage(error: unknown): string {
  if (error instanceof AppError) return error.userMessage;
  if (error instanceof Error && error.message.includes('Network')) {
    return "You appear to be offline. Check your connection and try again.";
  }
  return 'Something went wrong. Please try again.';
}
```

Map infrastructure errors to domain errors at the API boundary:

```ts
export async function createReservation(input: CreateReservationInput) {
  const { data, error } = await supabase.rpc('create_reservation', input);

  if (error) {
    if (error.code === '23P01') throw new ConflictError('That slot was just booked. Please pick another time.');
    if (error.message.includes('TOO_SOON')) throw new AppError('too soon', 'TOO_SOON', 'This amenity requires more advance notice.');
    if (error.message.includes('TOO_MANY_ACTIVE')) throw new AppError('limit', 'LIMIT', 'You already have the maximum number of active bookings.');
    throw new AppError(error.message, 'UNKNOWN', getUserMessage(error), error);
  }

  return reservationSchema.parse(data);
}
```

Now the UI just calls `getUserMessage(error)` and always shows something useful.

**Error boundaries per route group**, so one broken screen doesn't white-screen the app:

```tsx
// app/(app)/_layout.tsx
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View className="flex-1 items-center justify-center gap-4 p-6">
      <H2>Something went wrong</H2>
      <Body className="text-center text-muted-foreground">{getUserMessage(error)}</Body>
      <Button onPress={retry}><Text>Try again</Text></Button>
    </View>
  );
}
```

Expo Router picks up an exported `ErrorBoundary` from a layout automatically.

---

## 8. Configuration

```ts
// lib/config.ts — one place, validated at startup
import { z } from 'zod';

const configSchema = z.object({
  supabaseUrl: z.string().url(),
  supabaseAnonKey: z.string().min(1),
  stripePublishableKey: z.string().startsWith('pk_'),
  environment: z.enum(['development', 'staging', 'production']),
  sentryDsn: z.string().url().optional(),
});

export const config = configSchema.parse({
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  stripePublishableKey: process.env.EXPO_PUBLIC_STRIPE_KEY,
  environment: process.env.EXPO_PUBLIC_ENV ?? 'development',
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
});

// Fail loudly rather than silently charging real cards in a test build
if (config.environment !== 'production' && config.stripePublishableKey.startsWith('pk_live')) {
  throw new Error('Live Stripe key in a non-production build');
}
```

Failing at startup with a clear message beats a mysterious runtime failure — and the
Stripe guard has prevented real incidents for real teams.

> ⚠️ **`EXPO_PUBLIC_*` variables are embedded in the bundle and readable by anyone who
> downloads your app.** They are not secrets. Anything genuinely secret (service role
> keys, Stripe secret keys) lives only in Edge Functions and EAS secrets. See
> [security](./06-security-and-privacy.md).

---

## 9. Monorepo

```
hamlet-hq/
├── apps/
│   ├── mobile/
│   └── web/
├── packages/
│   ├── core/        # types, Zod schemas, business rules — PURE TS
│   ├── api/         # generated DB types + typed client
│   └── tokens/      # design tokens
├── supabase/
├── pnpm-workspace.yaml
└── turbo.json
```

`packages/core` is the highest-value package: business rules that must agree across
mobile, web, and Edge Functions.

**Its one hard rule: no platform imports.** No React, no React Native, no Next.js. It
must run in Deno. Put that in its `CLAUDE.md`.

Metro needs to know about the workspace:

```js
// apps/mobile/metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

module.exports = withNativeWind(config, { input: './global.css' });
```

**Don't start with a monorepo.** Start with `apps/mobile`. Add the workspace when you
actually build the web dashboard — premature monorepo tooling is a tax you pay daily
for a benefit you don't yet have.

---

## 10. Checklist

```
□ Features grouped by domain, not by file type
□ Every slice has the same file layout
□ Screens are thin — no business logic in app/
□ Components use hooks, never api.ts directly
□ Dependency rules enforced by ESLint
□ Business logic in pure, testable functions
□ Zod validation at every trust boundary
□ Typed errors with user-facing messages
□ Error boundaries per route group
□ Config validated at startup
□ Database types generated, checked in CI
□ Naming conventions documented in CLAUDE.md
```

---

## Check yourself

1. Why group by feature rather than by file type?
2. Why must components go through hooks rather than calling `api.ts`?
3. Where does snake_case → camelCase conversion happen, and why there?
4. Why validate with Zod when you already have TypeScript types?
5. What's the one rule for `packages/core`?

<details>
<summary>Answers</summary>

1. Changes stay local to one folder, deleting a feature is deleting a folder,
   cross-feature coupling becomes visible, and the repeated structure lets an AI agent
   extrapolate the pattern correctly.
2. Hooks are where caching, invalidation, optimistic updates, and error mapping live.
   Bypassing them scatters that logic and makes components untestable without mocking
   the network.
3. Once, at the API boundary. Otherwise database column casing leaks into every
   component, and a column rename becomes a codebase-wide change.
4. TypeScript types are erased at runtime — they're a compile-time assertion about data
   you don't control. Zod actually checks it, so a schema change or unexpected null
   fails loudly at the boundary instead of crashing three screens later.
5. Pure TypeScript only — no React, React Native, or Next.js imports, because it must
   run in both clients and in Deno Edge Functions.

</details>

---

**Next:** [Testing strategy →](./02-testing-strategy.md)
