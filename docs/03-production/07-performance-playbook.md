# Performance Playbook

Diagnosing and fixing slowness. Organized as a playbook — find your symptom, follow the
procedure.

---

## 1. Measure before you optimize

The two numbers that tell you where to look. Shake the device (or `Cmd+D` / `Cmd+M`) →
**Show Perf Monitor**.

| Symptom | Which FPS drops | Where the problem is |
|---|---|---|
| App unresponsive, but scrolling works | **JS FPS** | Your JavaScript |
| Everything frozen, including scroll | **UI FPS** | Native rendering / layout |
| Both drop | Both | Usually a JS problem cascading |

This single distinction halves your search space every time. Get in the habit of
checking it before forming any hypothesis.

**Tools:**

| Tool | Use for |
|---|---|
| React Native DevTools (`j` in Metro) | React Profiler — which components re-render |
| Perf Monitor | Live FPS |
| Flashlight (`flashlight measure`) | Real Android device scores, CI-able |
| Xcode Instruments | Deep iOS profiling, memory |
| Android Studio Profiler | CPU, memory, energy |
| Sentry Performance | Real-user data from production |

> **Test on a cheap Android device.** Your iPhone hides problems that make the app
> unusable for a large share of your users. A $150 Moto G is the most valuable piece of
> test hardware you can own.

---

## 2. Playbook: slow app start

**Target:** cold start to first meaningful paint < 2s on mid-range Android.

### Diagnose

```ts
// index.js — very first line
global.__APP_START__ = Date.now();

// after first meaningful paint
const elapsed = Date.now() - global.__APP_START__;
analytics.track('app_start', { durationMs: elapsed, cold: true });
```

### Fixes, in order of impact

**1. Don't block first paint on the network.**
```tsx
// ❌ splash held until data loads
if (isPending) return null;

// ✅ render the shell immediately, fill it in
return <Screen>{isPending ? <Skeleton /> : <Content data={data} />}</Screen>;
```

**2. Read auth state synchronously.**
MMKV is synchronous (thanks to JSI), so you can decide the initial route during the
first render instead of showing a loading state:
```ts
const cachedSession = mmkv.getString('session');   // no await
```

**3. Defer non-critical work.**
```tsx
useEffect(() => {
  const task = InteractionManager.runAfterInteractions(() => {
    initAnalytics();
    prefetchSecondaryData();
    syncPushToken();
  });
  return () => task.cancel();
}, []);
```

**4. Audit native modules.** Every native dependency adds startup cost. TurboModules
load lazily, which helps a lot — but a library that initializes eagerly still costs
you. Remove what you don't use.

**5. Optimize the splash → first screen handoff.**
```ts
SplashScreen.preventAutoHideAsync();
// hide only when the first screen can actually render
await SplashScreen.hideAsync();
```

**6. Preload fonts.** A font that loads late causes a visible text flash.

---

## 3. Playbook: janky list scrolling

The most common performance complaint. Full treatment in
[lists and performance](../02-curriculum/05-lists-and-performance.md).

### The diagnostic sequence

```
1. Are you using FlashList? If not, that's the fix.
2. Open the React Profiler. Record a scroll.
   → Are rows re-rendering? → memoization problem (JS)
   → Are they not re-rendering but still janky? → native problem
3. JS FPS or UI FPS?
```

### If JS FPS drops

```tsx
// The three fixes, in order
const SiteRow = React.memo(SiteRowImpl);                        // 1. memo the row
const handlePress = useCallback((id) => router.push(...), []);  // 2. stable callbacks
const renderItem = useCallback(({ item }) =>                    // 3. stable renderItem
  <SiteRow item={item} onPress={handlePress} />, [handlePress]);
```

Plus: hoist formatters to module scope, precompute derived values with `useMemo`
outside the list, and never construct `new Intl.NumberFormat()` inside a row.

### If UI FPS drops

- **Images too large** → resize server-side. This is usually it.
- **Deep view hierarchies** → flatten; remove wrapper `View`s that only apply one style
- **Shadows on many rows** → replace with borders
- **`overflow: hidden` + rounded corners on every row** → expensive on Android
- **Blur views in a list** → remove; they're very expensive

---

## 4. Playbook: slow navigation

Transitions should feel instant.

**1. Don't fetch on mount — prefetch on intent.**
```tsx
// prefetch when the row becomes visible, before the tap
<Pressable
  onPressIn={() => queryClient.prefetchQuery({
    queryKey: siteKeys.detail(site.id),
    queryFn: () => api.sites.get(site.id),
  })}
  onPress={() => router.push(`/site/${site.id}`)}
>
```

Prefetching on `onPressIn` buys you the 100–200ms between press and release — often
enough for the data to arrive before the screen renders.

**2. Pass what you already have.**
```tsx
router.push({ pathname: '/site/[id]', params: { id: site.id, name: site.name } });
// render the title instantly from params while the full record loads
```

**3. Defer heavy work until after the transition.**
```tsx
useFocusEffect(useCallback(() => {
  const task = InteractionManager.runAfterInteractions(loadHeavyThing);
  return () => task.cancel();
}, []));
```

**4. Use `placeholderData`** so the detail screen renders with list data immediately:
```tsx
useQuery({
  queryKey: siteKeys.detail(id),
  queryFn: () => api.sites.get(id),
  placeholderData: () =>
    queryClient.getQueryData<Site[]>(siteKeys.lists())?.find((s) => s.id === id),
});
```

---

## 5. Playbook: janky animations

**The rule: if it's not on the UI thread, it will stutter.**

```tsx
// ❌ JS-driven — every frame needs the JS thread
const [offset, setOffset] = useState(0);

// ✅ Reanimated worklet — runs on the UI thread
const offset = useSharedValue(0);
const style = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));
```

**Animate the cheap properties:**

| Cheap (compositor) | Expensive (triggers layout) |
|---|---|
| `transform: translateX/Y` | `left`, `top`, `margin` |
| `transform: scale` | `width`, `height` |
| `opacity` | `padding` |
| `transform: rotate` | `flex` |

Same principle as the web. Animating `height` re-runs Yoga layout every frame.

**Test under load:** trigger a large fetch while an animation runs. If it stutters, it's
not actually on the UI thread — find out why (usually a `runOnJS` in the wrong place,
or a missing `'worklet'` directive).

---

## 6. Playbook: high memory / OOM crashes

Usually images.

```tsx
// ❌ decodes a 12MP image into memory for a 56px thumbnail
<Image source={{ uri: photo.originalUrl }} style={{ width: 56, height: 56 }} />

// ✅
<Image
  source={{ uri: thumbnailUrl }}      // server-resized
  recyclingKey={photo.id}
  cachePolicy="memory-disk"
  style={{ width: 56, height: 56 }}
/>
```

**Rules:**
- Serve images at roughly 2× their display size, never more
- Use `expo-image` — it handles downsampling and memory pressure
- Set `recyclingKey` in lists
- Compress before upload (see [native APIs](../02-curriculum/08-native-apis.md))

**Other memory leaks to check:**
- Event listeners not removed in `useEffect` cleanup
- Realtime channels not unsubscribed
- Timers not cleared
- Large objects captured in long-lived closures

Profile with Xcode Instruments (Allocations) or Android Studio's Memory Profiler.

---

## 7. Playbook: large bundle / slow download

```bash
npx expo export --platform ios
npx react-native-bundle-visualizer
```

**Common wins:**

```ts
// ❌ pulls in the whole library
import _ from 'lodash';
import moment from 'moment';

// ✅
import debounce from 'lodash/debounce';
import { format } from 'date-fns';        // or just use Intl
```

- Drop `moment` (very large, and it bundles all locales) for `date-fns` or native `Intl`
- Audit for duplicate dependencies doing the same job
- Compress and right-size bundled assets
- Use `.webp` for images where supported
- Only bundle the font weights you actually use

**Targets:** iOS < 40MB, Android AAB < 25MB. Beyond ~100MB, iOS blocks cellular
download entirely, which materially hurts installs.

---

## 8. Playbook: slow queries

Sometimes it's the backend, not the app.

```sql
explain analyze
select * from reservations
where community_id = '...' and starts_at > now()
order by starts_at limit 20;
```

**The indexes Hamlet HQ needs:**

```sql
create index on reservations (community_id, starts_at);
create index on reservations (unit_id, status);
create index on assessments (unit_id, status, due_on);
create index on broadcasts (community_id, published_at desc);
create index on memberships (profile_id, status);
create index on memberships (community_id, role);
```

**Select only what you need:**
```ts
// ❌ over-fetching, including a large joined description field
supabase.from('reservations').select('*, amenity:amenities(*)')

// ✅
supabase.from('reservations').select('id, starts_at, ends_at, status, amenity:amenities(id, name, image_url)')
```

Over-fetching costs bandwidth (which users pay for on cellular), parse time on the JS
thread, and memory.

**Watch RLS performance.** Policies run per row. A policy calling a slow function on a
large table will show up in `explain analyze`. Keep helper functions `stable` and
indexed on what they query.

---

## 9. Performance budget

Set targets, measure them, and fail CI when they regress.

| Metric | Target | Measure with |
|---|---|---|
| Cold start (mid-range Android) | < 2000ms | Custom timing + analytics |
| Warm start | < 800ms | " |
| Navigation transition | < 300ms | Profiler |
| List scroll FPS | ≥ 58 | Perf Monitor / Flashlight |
| API p95 | < 500ms | Sentry / Supabase |
| iOS download size | < 40MB | App Store Connect |
| Android AAB | < 25MB | Play Console |
| Memory (steady state) | < 200MB | Instruments |
| Crash-free sessions | > 99.5% | Sentry |

```yaml
# CI regression gate
- run: flashlight test --bundleId com.hamlethq.app.dev --testCommand ./perf/scroll.yaml
- run: flashlight report --threshold 70    # fail below score 70
```

---

## 10. The optimization order

Don't optimize randomly. This is roughly the ROI order for a React Native app:

```
1. Use FlashList for lists                          ← biggest single win
2. Right-size images, use expo-image                ← second biggest
3. Memoize list rows + stable props
4. Move animations to Reanimated worklets
5. Don't block first paint on the network
6. Add database indexes
7. Defer non-critical startup work
8. Select only needed columns
9. Trim the bundle
10. Micro-optimize renders                          ← rarely matters
```

Most apps get 90% of available improvement from the first four. If you're doing #10
before #1, you're optimizing the wrong thing.

---

## 11. Checklist

```
MEASUREMENT
□ Perf Monitor checked before forming any hypothesis
□ Tested on a low-end physical Android device
□ Startup time instrumented and tracked in analytics
□ Sentry Performance enabled

LISTS
□ FlashList everywhere, never .map() for data
□ Rows memoized, callbacks stable
□ getItemType for heterogeneous rows
□ Images right-sized with recyclingKey

STARTUP
□ First paint not blocked on network
□ Auth read synchronously from MMKV
□ Non-critical work deferred via InteractionManager
□ Fonts preloaded

ANIMATION
□ Reanimated worklets, not JS-driven state
□ Only transform/opacity animated
□ Verified smooth while a large fetch runs

BACKEND
□ Indexes on all common query paths
□ Only needed columns selected
□ RLS policies checked with explain analyze

BUDGET
□ Targets documented
□ CI fails on regression
```

---

## Check yourself

1. UI FPS drops but JS FPS is fine. Where do you look?
2. Why does animating `height` cost more than animating `scale`?
3. Why is MMKV being synchronous a startup-performance advantage?
4. What's the highest-ROI performance fix in a typical RN app?
5. Why test on a cheap Android device specifically?

<details>
<summary>Answers</summary>

1. The native side — view hierarchy depth, image decoding, shadows or blur, or
   expensive layout. Your JavaScript is keeping up; rendering isn't.
2. `height` invalidates layout, so Yoga recomputes positions for the subtree every
   frame. `scale` is a transform applied by the compositor without re-running layout.
3. You can read the stored session during the first render instead of awaiting it,
   which lets you decide the initial route immediately — no loading flash, and the
   splash screen hides at exactly the right moment.
4. Using FlashList instead of `.map()` in a ScrollView for any data-driven list. It's
   usually the single biggest win, followed by right-sizing images.
5. Your development device hides problems. A large share of real users are on low-end
   Android hardware where an unoptimized list is unusable rather than merely imperfect —
   and simulators run at your Mac's speed, so they lie too.

</details>

---

## Sources

- [React Native — Performance](https://reactnative.dev/docs/performance)
- [Flashlight](https://github.com/bamlab/flashlight)
- [FlashList](https://shopify.github.io/flash-list/)

**Next:** [AI workflow → The operating model](../04-ai-workflow/01-operating-model.md)
