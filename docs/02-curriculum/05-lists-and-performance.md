# Lists and Performance

Lists are where mobile apps feel fast or feel broken. This is the highest-value
performance topic in React Native.

---

## 1. Why `.map()` is wrong

On the web you render 500 rows with `.map()` and the browser copes — it only paints
what's visible, and DOM nodes are cheap-ish.

In React Native, every rendered row creates **real native views**. 500 rows might be
5,000 native views, all in memory, all measured by Yoga. On a low-end Android phone
that's a multi-second freeze, then an out-of-memory crash.

```tsx
// ❌ Fine for 10 items. Catastrophic for 500.
<ScrollView>
  {sites.map((site) => <SiteRow key={site.id} site={site} />)}
</ScrollView>
```

**Virtualization** renders only what's visible plus a small buffer, recycling views as
you scroll.

### The decision rule

| Item count | Use |
|---|---|
| < ~20, fixed, known | `ScrollView` + `.map()` is fine |
| Anything unbounded or from an API | **`FlashList`** |
| Long static content (settings, article) | `ScrollView` |

If the data comes from a network call, assume it can grow. Use `FlashList`.

---

## 2. FlashList

Shopify's `FlashList` is the recommended list. v2 was rewritten for the New
Architecture and is significantly better than v1 — notably, **it no longer needs
`estimatedItemSize`** in most cases.

```bash
npx expo install @shopify/flash-list
```

```tsx
import { FlashList } from '@shopify/flash-list';

<FlashList
  data={sites}
  renderItem={({ item }) => <SiteRow site={item} />}
  keyExtractor={(item) => item.id}
  ItemSeparatorComponent={() => <View className="h-px bg-border" />}
  ListEmptyComponent={<EmptyState title="No campsites yet" />}
  ListHeaderComponent={<SearchBar />}
  onEndReached={loadMore}
  onEndReachedThreshold={0.5}
  refreshing={isRefetching}
  onRefresh={refetch}
  contentContainerStyle={{ padding: 16 }}
/>
```

### Why it beats `FlatList`

- Recycles native views instead of unmounting/remounting them
- Much better memory behavior with large datasets
- Fewer blank cells during fast scrolling
- `FlatList` is still fine for small/simple lists, but there's little reason to choose it

### `getItemType` — the underused prop

If your list mixes row shapes, tell FlashList so it recycles like with like:

```tsx
<FlashList
  data={feed}
  getItemType={(item) => item.kind}   // 'announcement' | 'event' | 'reservation'
  renderItem={({ item }) => {
    switch (item.kind) {
      case 'announcement': return <AnnouncementCard item={item} />;
      case 'event':        return <EventCard item={item} />;
      case 'reservation':  return <ReservationRow item={item} />;
    }
  }}
/>
```

Without this, FlashList recycles a tall card into a short row's slot and has to rebuild
the view tree — visible jank. Hamlet HQ's community feed is exactly this case.

> **Alternative:** [Legend List](https://github.com/LegendApp/legend-list) is a newer,
> lighter virtualized list with strong benchmarks and a simpler API. Worth evaluating,
> but FlashList has the bigger ecosystem and Shopify's production usage behind it.

---

## 3. Making rows fast

The list container is rarely the problem. **The row is.**

### Memoize the row

```tsx
const SiteRow = React.memo(function SiteRow({ site, onPress }: Props) {
  return (
    <Pressable onPress={() => onPress(site.id)} className="flex-row items-center gap-3 p-4">
      <Image source={site.thumbUrl} className="h-14 w-14 rounded-lg" />
      <View className="flex-1">
        <Text numberOfLines={1} className="font-medium">{site.name}</Text>
        <Text numberOfLines={1} className="text-sm text-muted-foreground">{site.location}</Text>
      </View>
      <StatusBadge status={site.status} label={site.statusLabel} />
    </Pressable>
  );
});
```

### Stabilize callbacks

`React.memo` is useless if you pass a new function every render:

```tsx
// ❌ new function identity each render → every row re-renders
<FlashList renderItem={({ item }) => <SiteRow site={item} onPress={(id) => router.push(`/site/${id}`)} />} />

// ✅ stable
const handlePress = useCallback((id: string) => router.push(`/site/${id}`), []);
const renderItem = useCallback(
  ({ item }: { item: Site }) => <SiteRow site={item} onPress={handlePress} />,
  [handlePress]
);

<FlashList data={sites} renderItem={renderItem} />
```

### Keep row work trivial

Everything in a row body runs for every visible row, on every scroll-triggered render.

```tsx
// ❌ formatting, date math, and array work per row per render
function Row({ item }) {
  const price = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.cents / 100);
  const when = formatDistanceToNow(new Date(item.startsAt));
  const tags = item.tags.filter(t => t.visible).sort();
  ...
}

// ✅ precompute once, outside the list
const rows = useMemo(
  () => sites.map((s) => ({ ...s, priceLabel: fmt(s.cents), whenLabel: rel(s.startsAt) })),
  [sites]
);
```

Building an `Intl.NumberFormat` is genuinely expensive. Hoist formatters to module
scope:

```tsx
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
```

### Row checklist

- [ ] Wrapped in `React.memo`
- [ ] Props are primitives or stable references
- [ ] Callbacks memoized with `useCallback`
- [ ] No inline object/array literals in props (`style={{...}}` creates a new object)
- [ ] Images sized appropriately and cached
- [ ] No date/currency/regex construction inside the row
- [ ] Fixed or predictable height where possible
- [ ] `getItemType` set if rows are heterogeneous

---

## 4. Images in lists

The most common cause of list jank.

```tsx
import { Image } from 'expo-image';

<Image
  source={{ uri: site.thumbUrl }}
  placeholder={{ blurhash: site.blurhash }}
  contentFit="cover"
  transition={150}
  cachePolicy="memory-disk"
  recyclingKey={site.id}          // ← important in recycled lists
  style={{ width: 56, height: 56, borderRadius: 8 }}
/>
```

**`recyclingKey`** tells `expo-image` that a recycled view now shows a different image,
preventing the previous image from flashing in the new row.

**Serve correctly-sized images.** Displaying a 3000×2000 photo in a 56×56 thumbnail
means decoding 6 megapixels into memory for 3,136 pixels of output. With Supabase
Storage:

```ts
const thumb = supabase.storage.from('sites').getPublicUrl(path, {
  transform: { width: 112, height: 112, resize: 'cover' },   // 2x for retina
}).data.publicUrl;
```

This one change often fixes "my list is janky" outright.

---

## 5. Pagination

Infinite scroll with TanStack Query:

```tsx
const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  refetch,
  isRefetching,
} = useInfiniteQuery({
  queryKey: ['sites', filters],
  queryFn: ({ pageParam }) => api.sites.list({ cursor: pageParam, ...filters }),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (lastPage) => lastPage.nextCursor,
});

const sites = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);

<FlashList
  data={sites}
  renderItem={renderItem}
  keyExtractor={(item) => item.id}
  onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
  onEndReachedThreshold={0.5}
  ListFooterComponent={isFetchingNextPage ? <ActivityIndicator className="py-4" /> : null}
  refreshing={isRefetching}
  onRefresh={refetch}
/>
```

**Use cursor pagination, not offset.** With `LIMIT/OFFSET`, an item inserted while the
user scrolls shifts everything and they see duplicates or skips. Cursors are stable.

---

## 6. Measuring performance

Don't guess. Measure.

### React Native DevTools

Press `j` in the Metro terminal. You get the React Profiler — record a scroll, look for
components rendering that shouldn't be.

### FPS monitor

Shake the device (or `Cmd+D` / `Cmd+M`) → **Show Perf Monitor**.

Two numbers matter:
- **UI FPS** — the native thread. Drops = layout/rendering too expensive.
- **JS FPS** — the JS thread. Drops = your JavaScript is too slow.

Target 60 (or 120 on ProMotion). Sustained dips below ~50 during scroll are visible to
users.

### Why you must test on a low-end device

Your iPhone 15 Pro will hide problems that make the app unusable on a $150 Android
phone. If Hamlet HQ is for HOA communities, your users span every device tier.

Get a cheap real Android device (a Moto G or similar) and test on it weekly. Or use an
emulator with reduced CPU/RAM. **Simulator performance is not real performance** —
your Mac's CPU is doing the work.

### Flashlight (Android)

```bash
npm i -g @perf-profiler/flashlight
flashlight measure
```

Gives you a real performance score, FPS, CPU, and RAM on a physical Android device.
Can be run in CI to catch regressions.

---

## 7. Other performance essentials

### `InteractionManager` — defer work past animations

```tsx
useEffect(() => {
  const task = InteractionManager.runAfterInteractions(() => {
    prefetchNextScreenData();
  });
  return () => task.cancel();
}, []);
```

Keeps navigation transitions smooth by deferring non-urgent work until they finish.

### Concurrent React

Fabric supports concurrent features, so these work as on the web:

```tsx
const deferredQuery = useDeferredValue(query);
const results = useMemo(() => filter(items, deferredQuery), [items, deferredQuery]);
```

Keeps typing responsive while an expensive filter lags behind.

### Don't block the JS thread

```tsx
// ❌ freezes the app
const parsed = JSON.parse(hugeString);

// ✅ chunk it, or move it off-thread
// - paginate server-side so payloads stay small
// - use a Reanimated worklet for compute-heavy transforms
// - for genuinely heavy work, consider react-native-worklets
```

### Bundle size

```bash
npx expo export --platform ios
npx react-native-bundle-visualizer   # inspect what's big
```

Common wins: import specific functions (`import debounce from 'lodash/debounce'`, not
the whole library), drop moment.js for `date-fns` or `Intl`, lazy-load heavy screens.

### Startup time

- Don't do network calls before first paint — render a skeleton
- Keep the root layout light
- Use `expo-splash-screen` correctly: hide only when the first screen is genuinely ready
- Fonts: preload with `expo-font`, don't block on remote fonts

---

## 8. The jank debugging flowchart

```
Is the list janky?
├─ Is UI FPS dropping? (native thread)
│  ├─ Rows too complex → flatten the view hierarchy
│  ├─ Images too large → resize server-side, use expo-image
│  └─ Shadows/blur on many rows → replace with borders
└─ Is JS FPS dropping? (JS thread)
   ├─ Rows re-rendering → React.memo + useCallback + stable props
   ├─ Expensive work in render → useMemo, precompute, hoist formatters
   ├─ Not virtualized → switch to FlashList
   └─ Heavy work on scroll → debounce, or move to a worklet
```

Start by identifying *which* FPS number is dropping. It halves the search space
immediately.

---

## 9. Exercise

Build Trailhead's **campsite discovery list** and make it fast:

Requirements:
- Infinite scroll, cursor pagination, 20 per page
- Pull to refresh
- Search box filtering (debounced, keeps typing responsive)
- Mixed row types: sponsored cards, regular rows, "you have a booking here" rows
- Thumbnails with blurhash placeholders
- Empty, loading (skeleton), and error states
- Smooth at 60fps on a low-end Android device with 500+ items loaded

Then **measure it**: record a Profiler session while scrolling, and confirm rows are
not re-rendering unnecessarily. Write down your FPS before and after optimizing.

This is the exercise that most improves your instincts. Do it properly.

---

## Check yourself

1. Why does `.map()` over 500 items behave so much worse in RN than on the web?
2. Your rows are `React.memo`'d but still re-render. Most likely cause?
3. What does `getItemType` do, and when does it matter?
4. UI FPS drops but JS FPS is fine. Where do you look?
5. Why cursor pagination instead of offset?

<details>
<summary>Answers</summary>

1. Each item creates real native views (often several per row). 500 rows can be
   thousands of native views held in memory and measured by the layout engine — the
   browser, by contrast, is heavily optimized for large DOM trees and only paints
   what's visible.
2. Unstable props — an inline arrow function, an inline object/array literal, or a
   `renderItem` that isn't memoized. Any of these change identity every render and
   defeat `memo`.
3. It tells FlashList which rows share a shape so it recycles compatible views.
   Matters whenever the list contains structurally different row types.
4. The native side: view hierarchy depth, image decoding, shadows/blur, or expensive
   layout. JS is keeping up; rendering isn't.
5. Offset pagination shifts when items are inserted or deleted between requests,
   causing duplicated or skipped rows. A cursor points at a stable position.

</details>

---

## Sources

- [FlashList docs](https://shopify.github.io/flash-list/)
- [React Native — Performance](https://reactnative.dev/docs/performance)
- [expo-image](https://docs.expo.dev/versions/latest/sdk/image/)
- [Flashlight](https://github.com/bamlab/flashlight)

**Next:** [Forms and validation →](./06-forms-and-validation.md)
