# State and Data

Server state, client state, and the thing the web let you ignore: **offline**.

---

## 1. Classify your state first

Most state bugs come from putting state in the wrong place. Classify before you code.

| Kind | Example | Tool |
|---|---|---|
| **Server state** | Campsites, bookings, announcements | **TanStack Query** |
| **Global client state** | Theme, selected community, filters | **Zustand** |
| **Local UI state** | Is this sheet open, input value | `useState` |
| **Form state** | The form being edited | React Hook Form |
| **URL state** | Which site is being viewed | Route params |
| **Persisted preferences** | Notification settings, last community | MMKV |
| **Secrets** | Auth tokens | expo-secure-store |

**The single biggest mistake:** putting server data in Zustand/Redux. It's cached
remote data, not application state. TanStack Query handles caching, refetching,
staleness, deduplication, and offline for you — reimplementing that in a store is
weeks of work you'll get wrong.

---

## 2. TanStack Query setup

Identical library to web, with mobile-specific configuration.

```bash
npx expo install @tanstack/react-query
pnpm add @tanstack/react-query-persist-client @tanstack/query-async-storage-persister
npx expo install react-native-mmkv @react-native-community/netinfo
```

```tsx
// src/lib/query.ts
import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query';
import { AppState, type AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,          // 1 min — mobile data is expensive
      gcTime: 1000 * 60 * 60 * 24,   // keep cache 24h for offline
      retry: 2,
      refetchOnWindowFocus: false,   // we wire app focus manually below
    },
    mutations: { retry: 0 },
  },
});

// Tell Query when the device is online — this is what enables offline behavior
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected && state.isInternetReachable !== false);
  })
);

// Tell Query when the app returns to the foreground (the mobile "window focus")
export function setupAppStateFocus() {
  const sub = AppState.addEventListener('change', (status: AppStateStatus) => {
    focusManager.setFocused(status === 'active');
  });
  return () => sub.remove();
}
```

**These two managers are the mobile-specific part.** Without them, Query has no idea
the device went offline or that the app was backgrounded for two hours. Wire them once
and a lot of correct behavior follows automatically.

---

## 3. Queries

```tsx
// src/features/sites/hooks.ts
export const siteKeys = {
  all: ['sites'] as const,
  lists: () => [...siteKeys.all, 'list'] as const,
  list: (filters: SiteFilters) => [...siteKeys.lists(), filters] as const,
  details: () => [...siteKeys.all, 'detail'] as const,
  detail: (id: string) => [...siteKeys.details(), id] as const,
};

export function useSites(filters: SiteFilters) {
  return useQuery({
    queryKey: siteKeys.list(filters),
    queryFn: () => api.sites.list(filters),
  });
}

export function useSite(id: string) {
  return useQuery({
    queryKey: siteKeys.detail(id),
    queryFn: () => api.sites.get(id),
    enabled: !!id,
  });
}
```

**The query key factory pattern** is worth adopting from day one. It gives you
type-safe, greppable keys and makes invalidation precise:

```ts
queryClient.invalidateQueries({ queryKey: siteKeys.all });        // everything
queryClient.invalidateQueries({ queryKey: siteKeys.lists() });    // all lists
queryClient.invalidateQueries({ queryKey: siteKeys.detail(id) }); // one item
```

It's also enormously helpful when an AI agent is writing data code — the pattern is
obvious from the file, so generated code follows it.

---

## 4. Mutations and optimistic updates

Mobile networks are slow and unreliable. Optimistic updates aren't a nicety here; they
are the difference between an app that feels native and one that feels like a website.

```tsx
export function useToggleFavorite() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ siteId, favorite }: { siteId: string; favorite: boolean }) =>
      api.sites.setFavorite(siteId, favorite),

    onMutate: async ({ siteId, favorite }) => {
      // 1. cancel in-flight refetches so they don't clobber our optimistic write
      await qc.cancelQueries({ queryKey: siteKeys.detail(siteId) });

      // 2. snapshot for rollback
      const previous = qc.getQueryData<Site>(siteKeys.detail(siteId));

      // 3. write the optimistic value
      qc.setQueryData<Site>(siteKeys.detail(siteId), (old) =>
        old ? { ...old, isFavorite: favorite } : old
      );

      return { previous };
    },

    onError: (_err, { siteId }, context) => {
      // 4. roll back
      if (context?.previous) qc.setQueryData(siteKeys.detail(siteId), context.previous);
      Toast.error('Could not update favorite');
    },

    onSettled: (_data, _err, { siteId }) => {
      // 5. reconcile with the server
      qc.invalidateQueries({ queryKey: siteKeys.detail(siteId) });
    },
  });
}
```

Learn this five-step shape — cancel, snapshot, write, rollback, reconcile. It's the
same for every optimistic mutation.

**When not to be optimistic:** anything involving money or a scarce resource. Don't
optimistically show a booking as confirmed — the slot may be gone. Show "Confirming…"
and wait for the server. Optimism is for low-stakes, high-frequency actions (likes,
favorites, read receipts, reordering).

---

## 5. Offline

This is the section with no web equivalent, and it's what will make Hamlet HQ feel
professional.

### Level 1 — Cache persistence (do this always)

Survive app restarts so users see content instantly instead of a spinner.

```tsx
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { MMKV } from 'react-native-mmkv';

const mmkv = new MMKV();

const persister = createAsyncStoragePersister({
  storage: {
    getItem: (key) => Promise.resolve(mmkv.getString(key) ?? null),
    setItem: (key, value) => { mmkv.set(key, value); return Promise.resolve(); },
    removeItem: (key) => { mmkv.delete(key); return Promise.resolve(); },
  },
});

<PersistQueryClientProvider
  client={queryClient}
  persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 }}
>
  <App />
</PersistQueryClientProvider>
```

Cold start now shows cached data immediately, then revalidates. Huge perceived-speed
win for a few lines of code.

⚠️ **Don't persist sensitive data.** Filter what gets written:

```ts
persistOptions={{
  persister,
  dehydrateOptions: {
    shouldDehydrateQuery: (q) => !q.queryKey.includes('payment-methods'),
  },
}}
```

### Level 2 — Mutation queue

Let users act offline and sync when connectivity returns.

```tsx
const queryClient = new QueryClient({
  defaultOptions: { mutations: { retry: 3, networkMode: 'offlineFirst' } },
});

// register a resumable default for this mutation type
queryClient.setMutationDefaults(['createBooking'], {
  mutationFn: api.bookings.create,
});

// in the component
const mutation = useMutation({ mutationKey: ['createBooking'] });
```

Paused mutations are persisted and resumed on reconnect. **Requires idempotency keys**
— a paused mutation may be retried after the original actually succeeded.

### Level 3 — Local-first database

For genuinely offline-capable apps, use SQLite as the source of truth and sync in the
background.

```bash
npx expo install expo-sqlite
pnpm add drizzle-orm && pnpm add -D drizzle-kit
```

```ts
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

const expo = openDatabaseSync('trailhead.db');
export const db = drizzle(expo);

// reads never touch the network
const bookings = await db.select().from(bookingsTable).where(eq(bookingsTable.userId, uid));
```

Drizzle gives you the same TypeScript-first ergonomics you'd want on the server, and
`expo-sqlite` supports live queries that re-render on change.

**Which level do you need?**

| App | Level |
|---|---|
| Trailhead (practice) | 1, plus 2 for bookings |
| Hamlet HQ v1 | 1 + 2 |
| Hamlet HQ later | 3 if users report poor connectivity |

Don't start at level 3. Sync engines are hard, and conflict resolution is a genuine
distributed-systems problem. Start at 1, add 2 where it matters.

### Show connection state

```tsx
import { useNetInfo } from '@react-native-community/netinfo';

function OfflineBanner() {
  const { isConnected } = useNetInfo();
  if (isConnected !== false) return null;
  return (
    <View className="bg-warning px-4 py-2">
      <Text className="text-center text-sm">You're offline. Changes will sync when reconnected.</Text>
    </View>
  );
}
```

Never let an action silently fail because the device is offline. Tell the user, and
tell them what will happen.

---

## 6. Zustand for client state

For the genuinely-client state that isn't server data.

```ts
// src/features/community/store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'app-state' });

interface CommunityState {
  activeCommunityId: string | null;
  setActiveCommunity: (id: string) => void;
}

export const useCommunityStore = create<CommunityState>()(
  persist(
    (set) => ({
      activeCommunityId: null,
      setActiveCommunity: (id) => set({ activeCommunityId: id }),
    }),
    {
      name: 'community',
      storage: createJSONStorage(() => ({
        getItem: (k) => storage.getString(k) ?? null,
        setItem: (k, v) => storage.set(k, v),
        removeItem: (k) => storage.delete(k),
      })),
    }
  )
);
```

**Always select narrowly**, or every component using the store re-renders on any
change:

```tsx
// ❌ re-renders on any store change
const store = useCommunityStore();

// ✅ re-renders only when this value changes
const activeCommunityId = useCommunityStore((s) => s.activeCommunityId);
```

Keep stores small and domain-scoped. A single god-store is the Redux mistake in a new
wrapper.

---

## 7. Storage: pick the right one

| Need | Use | Why |
|---|---|---|
| Auth tokens, secrets | **expo-secure-store** | Keychain / Keystore, encrypted |
| Preferences, cache, flags | **react-native-mmkv** | Synchronous, ~30x faster than AsyncStorage |
| Legacy / compatibility | AsyncStorage | Async, slower; still fine |
| Structured/relational data | **expo-sqlite** (+ Drizzle) | Queries, joins, offline |
| Large files, images | **expo-file-system** | Filesystem |

```ts
// Secrets
import * as SecureStore from 'expo-secure-store';
await SecureStore.setItemAsync('refresh_token', token);
const token = await SecureStore.getItemAsync('refresh_token');

// Fast KV — note: synchronous, thanks to JSI
import { MMKV } from 'react-native-mmkv';
const storage = new MMKV();
storage.set('onboarded', true);
const onboarded = storage.getBoolean('onboarded');   // no await
```

MMKV being **synchronous** is a real architectural advantage: you can read auth state
during the first render instead of showing a loading flash. That's the trick behind a
splash screen that hides at exactly the right moment.

> ⚠️ **Never put tokens in AsyncStorage or MMKV.** Both store plaintext on disk,
> readable on a rooted/jailbroken device or via a device backup. Tokens go in
> SecureStore. This is a real finding in mobile security audits.

---

## 8. Realtime

Hamlet HQ needs realtime: a broadcast should appear immediately, and a booked slot
should disappear from other users' screens.

```ts
// Supabase realtime → TanStack Query cache
useEffect(() => {
  const channel = supabase
    .channel(`community:${communityId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'announcements', filter: `community_id=eq.${communityId}` },
      () => queryClient.invalidateQueries({ queryKey: announcementKeys.list(communityId) })
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [communityId, queryClient]);
```

**Invalidate rather than patching the cache from the payload.** It's one extra request
but avoids an entire category of cache-corruption bugs where your local patch and the
server's truth diverge. Optimize to direct `setQueryData` only if you measure a real
problem.

**Unsubscribe when backgrounded.** A live socket burns battery:

```tsx
useEffect(() => {
  const sub = AppState.addEventListener('change', (s) => {
    if (s === 'active') channel.subscribe();
    else supabase.removeChannel(channel);
  });
  return () => sub.remove();
}, []);
```

---

## 9. The data layer structure

```
src/
├── lib/
│   ├── supabase.ts        # client
│   ├── query.ts           # QueryClient, online/focus managers
│   └── storage.ts         # MMKV + SecureStore wrappers
└── features/
    └── bookings/
        ├── api.ts         # raw calls, returns typed data
        ├── keys.ts        # query key factory
        ├── hooks.ts       # useBookings, useCreateBooking
        ├── schemas.ts     # Zod, shared with server
        └── types.ts
```

**The rule: components never call `api.ts` directly.** They use hooks. That keeps
caching, error handling, and optimistic logic in one place, and makes components
trivially testable by mocking the hook.

```tsx
// ❌
const data = await api.bookings.list();

// ✅
const { data } = useBookings();
```

---

## 10. Exercise

Build Trailhead's data layer:

1. **Query client** with online + focus managers wired to NetInfo and AppState
2. **Persistence** to MMKV, excluding anything sensitive
3. **Feature slice** for bookings: keys, api, hooks, schemas
4. **Optimistic favorite** with rollback — test by turning on airplane mode
5. **Offline booking queue** with idempotency keys that syncs on reconnect
6. **Realtime** announcements that invalidate on insert
7. **Offline banner** showing connection state
8. **Zustand store** for the active community, persisted, with narrow selectors

**Test protocol:** put the device in airplane mode, create a booking, kill the app,
reopen it, turn networking back on. The booking should sync exactly once. If it syncs
twice, your idempotency handling is wrong — and that's precisely the bug that would
double-charge a Hamlet HQ resident.

---

## Check yourself

1. Why shouldn't server data live in Zustand?
2. What do `onlineManager` and `focusManager` do, and why are they mobile-specific?
3. Why is an optimistic update wrong for confirming a booking?
4. Where do auth tokens go, and why not MMKV?
5. Why invalidate on a realtime event instead of patching the cache directly?

<details>
<summary>Answers</summary>

1. It's cached remote data with an owner elsewhere. You'd have to reimplement
   staleness, deduplication, refetching, retry, and garbage collection — all of which
   TanStack Query already does correctly.
2. `onlineManager` tells Query whether the device has connectivity (so it can pause
   and resume); `focusManager` tells it the app returned to the foreground (the mobile
   analog of window focus). The web defaults assume a browser tab, which doesn't
   describe a mobile app's lifecycle.
3. The slot is a scarce resource — another user may take it in the same moment.
   Showing "confirmed" and then reverting is far worse than showing "confirming…"
   briefly. Optimism belongs on low-stakes actions.
4. `expo-secure-store`, which uses the iOS Keychain and Android Keystore. MMKV and
   AsyncStorage write plaintext to disk, which is readable on a compromised device or
   through a backup.
5. Patching from an event payload can drift from server truth (partial payloads,
   out-of-order events, missed messages while backgrounded). Invalidation costs one
   request and is always correct.

</details>

---

## Sources

- [TanStack Query — React Native](https://tanstack.com/query/latest/docs/framework/react/react-native)
- [TanStack Query — Offline](https://tanstack.com/query/latest/docs/framework/react/guides/network-mode)
- [react-native-mmkv](https://github.com/mrousavy/react-native-mmkv)
- [Drizzle + Expo SQLite](https://orm.drizzle.team/docs/connect-expo-sqlite)

**Next:** [Native APIs →](./08-native-apis.md)
