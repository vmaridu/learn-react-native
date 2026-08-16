# From Web to Native

> **Who this is for:** you, specifically. A React + TypeScript + Tailwind + shadcn/ui
> developer. This doc is the delta between what you know and what you need.

---

## 1. The good news

Roughly 60% of your knowledge transfers untouched:

```tsx
// This is React Native. It is also just React.
function useReservations(communityId: string) {
  return useQuery({
    queryKey: ['reservations', communityId],
    queryFn: () => api.reservations.list(communityId),
  });
}

function ReservationList({ communityId }: { communityId: string }) {
  const { data, isPending, error } = useReservations(communityId);

  if (isPending) return <Skeleton />;
  if (error) return <ErrorState error={error} />;

  return <FlashList data={data} renderItem={({ item }) => <Row item={item} />} />;
}
```

Hooks, composition, context, suspense, TanStack Query, Zod, React Hook Form — all
identical. Your architectural instincts are correct. Your TypeScript is correct.

**What's different is the rendering primitives, the layout engine, and everything
outside the React tree** (build, release, permissions, lifecycle).

---

## 2. The translation table

Print this. You'll use it constantly for the first month.

### Elements

| Web | React Native | Notes |
|---|---|---|
| `<div>` | `<View>` | The generic container. No text inside it directly. |
| `<span>`, `<p>`, `<h1>` | `<Text>` | **All** text must be inside `<Text>`. No exceptions. |
| `<img>` | `<Image>` (use `expo-image`) | `expo-image` for caching/perf. |
| `<button>` | `<Pressable>` | `Pressable` is the modern one. `TouchableOpacity` is legacy. |
| `<input>` | `<TextInput>` | |
| `<textarea>` | `<TextInput multiline>` | |
| `<select>` | `@react-native-picker/picker` or a bottom sheet | Native pickers look very different per platform. |
| `<a href>` | `<Link>` from `expo-router` | |
| `<form>` | No equivalent | Just a `<View>` + submit handler. |
| `<ul>` / `<li>` | `<FlashList>` | Never `.map()` a long list — see [lists](../02-curriculum/05-lists-and-performance.md). |
| Scrollable `<div>` | `<ScrollView>` | For short, finite content only. |
| `<svg>` | `react-native-svg` | |
| `<video>` | `expo-video` | |
| `<iframe>` | `react-native-webview` | |
| Portal / modal | `<Modal>` or a bottom sheet library | |

### Styling

| Web | React Native |
|---|---|
| `class="flex gap-4"` | `className="flex gap-4"` (with NativeWind) |
| CSS files | `StyleSheet.create({})` objects, or NativeWind |
| `px`, `rem`, `%` | Unitless numbers = density-independent pixels. `%` works in some places. |
| `display: block` (default) | Everything is `display: flex` already |
| `flex-direction: row` (default) | **`column` is the default** ⚠️ |
| CSS Grid | ❌ Doesn't exist. Flexbox only. |
| `position: fixed` | ❌ Doesn't exist. Use absolute + safe areas. |
| `position: sticky` | ❌ Doesn't exist. Use list header props. |
| `:hover` | ❌ (mostly) Use `onPressIn`/`onPressOut` |
| `:focus` | `onFocus` / `onBlur` props |
| Media queries | `useWindowDimensions()`, `Platform.select()` |
| `z-index` | `zIndex` — **plus `elevation` on Android** ⚠️ |
| `box-shadow` | `boxShadow` (RN 0.76+) or `shadow*` + `elevation` |
| Cascading / inheritance | ❌ No cascade. Styles don't inherit (except some text props). |
| Global stylesheet | ❌ Every style is scoped to a component |
| `overflow: hidden` | Works, but on Android it can clip shadows |
| `gap` | ✅ Supported |
| `aspect-ratio` | ✅ Supported |
| `transform` | ✅ Supported |

### Platform & browser APIs

| Web | React Native |
|---|---|
| `window` | ❌ — use `Dimensions` / `useWindowDimensions()` |
| `document` | ❌ — no DOM at all |
| `localStorage` | `AsyncStorage`, or **MMKV** (faster, synchronous) |
| `sessionStorage` | In-memory state |
| Cookies | `expo-secure-store` for tokens; there's no cookie jar you manage |
| IndexedDB | `expo-sqlite` (+ Drizzle ORM) |
| `fetch` | ✅ `fetch` works |
| WebSocket | ✅ works |
| `navigator.geolocation` | `expo-location` |
| `navigator.mediaDevices` | `expo-camera` |
| Web Push | `expo-notifications` + APNs/FCM |
| `history.pushState` | `router.push()` from expo-router |
| `alert()` | `Alert.alert()` |
| `console.log` | ✅ works, shows in Metro terminal + DevTools |

### Tooling & workflow

| Web | React Native |
|---|---|
| Vite / webpack | Metro |
| `npm run dev` | `npx expo start` |
| Browser refresh | Fast Refresh (preserves state) |
| Chrome DevTools | React Native DevTools (press `j` in Metro) |
| Deploy to Vercel | EAS Build → App Store / Play Store |
| Instant deploy | 1–3 day review 😬 (or EAS Update for JS-only, ~instant) |
| Lighthouse | Flashlight (Android), Xcode Instruments |
| Playwright / Cypress | Maestro |
| `.env` at build time | `app.config.ts` + EAS secrets |

### Ecosystem equivalents

| Web | React Native |
|---|---|
| Next.js | Expo |
| Next.js App Router | Expo Router |
| Tailwind CSS | **NativeWind** |
| shadcn/ui | **React Native Reusables** |
| Radix primitives | `@rn-primitives/*` |
| Framer Motion | Reanimated |
| React Router | Expo Router / React Navigation |
| SWR / TanStack Query | TanStack Query (same) |
| Zustand / Redux | Same |
| Vercel Analytics | PostHog / Amplitude |

---

## 3. The six things that will trip you up

### 3.1 All text must be wrapped in `<Text>`

```tsx
<View>Hello</View>              // ❌ Crashes: "Text strings must be rendered within a <Text>"
<View><Text>Hello</Text></View> // ✅
```

This catches everyone. Including conditional renders:

```tsx
<View>{count && <Thing />}</View>   // ❌ if count === 0, renders `0` as a bare string → crash
<View>{count > 0 && <Thing />}</View> // ✅
```

That second one is a **real, common production crash** — on the web `{0 && ...}`
harmlessly renders "0"; in React Native it throws. Lint rule to catch it:
`react/jsx-no-leaked-render`.

### 3.2 `flexDirection` defaults to `column`

The single most disorienting difference. On the web, `display: flex` gives you `row`.
In React Native, everything is already flex, and the default direction is `column` —
because screens are tall.

```tsx
// Web mental model: this is a row
<div className="flex"> A B </div>

// React Native: this is a COLUMN
<View className="flex"> A B </View>

// You must be explicit:
<View className="flex-row"> A B </View>
```

Also: `flex: 1` in RN means "fill available space" and you'll use it far more than on
the web.

### 3.3 There is no cascade

```tsx
// Web: children inherit the color
<div style={{ color: 'red' }}><p>red text</p></div>

// RN: this does nothing to the child
<View style={{ color: 'red' }}><Text>still default color</Text></View>

// You must style the Text itself
<View><Text style={{ color: 'red' }}>red text</Text></View>
```

Nested `<Text>` *does* inherit from parent `<Text>` — that's the one exception, and
it's useful for rich text:

```tsx
<Text className="text-base text-slate-900">
  Reserved by <Text className="font-semibold">Priya</Text> for 2 hours
</Text>
```

### 3.4 Safe areas are your problem now

Phones have notches, dynamic islands, home indicators, and camera cutouts. Content
under them is invisible or untappable.

```tsx
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function Screen() {
  const insets = useSafeAreaInsets();
  return <View style={{ paddingTop: insets.top }}>...</View>;
}
```

Expo Router handles much of this for you in stack/tab screens, but any full-screen or
custom-header UI needs explicit handling. Getting this wrong is the #1 giveaway of an
amateur app.

### 3.5 The keyboard covers your UI

There is no browser auto-scroll-into-view. When the keyboard opens it will cover your
input, and you have to handle it:

- `KeyboardAvoidingView` (built in, fiddly, needs different `behavior` per platform)
- `react-native-keyboard-controller` (much better — recommended)
- Inside lists: `keyboardShouldPersistTaps="handled"` or your first tap gets eaten
  dismissing the keyboard

Covered in [forms and validation](../02-curriculum/06-forms-and-validation.md).

### 3.6 Two platforms, real differences

Not just cosmetic. Things that genuinely differ:

| Concern | iOS | Android |
|---|---|---|
| Back navigation | Swipe from left edge | Hardware/gesture back button — **you must handle it** |
| Shadows | `shadowColor/Offset/Opacity/Radius` | `elevation` |
| Fonts | Font file name | Font family name |
| Permissions | Ask once; denial is near-permanent | Can re-ask; has "don't ask again" |
| Notifications | Requires explicit opt-in prompt | Granted by default pre-13; opt-in on 13+ |
| Status bar | Light/dark content | Also has a background color |
| Ripple/press feedback | Opacity fade | Material ripple |
| Date/time pickers | Wheel | Material dialog |
| Text rendering | Slightly different line heights | Slightly different line heights |
| Background execution | Very restricted | Restricted, varies by OEM ⚠️ |

That last one bites hard: Samsung, Xiaomi, and OnePlus have aggressive battery
managers that kill background work and delay notifications. Test on real Android
hardware, not just a Pixel emulator.

**Test on both platforms every single day.** A bug that only appears on Android is
much cheaper to find on the day you wrote it.

---

## 4. Your Tailwind knowledge, specifically

NativeWind gives you Tailwind syntax that compiles to React Native styles.

**Works as expected:**
```tsx
<View className="flex-row items-center justify-between gap-3 rounded-2xl bg-white p-4">
  <Text className="text-lg font-semibold text-slate-900">Clubhouse</Text>
  <Text className="text-sm text-slate-500">2 slots left</Text>
</View>
```

Layout, spacing, colors, typography, borders, opacity, flex — all work. Dark mode via
`dark:` works. Responsive via breakpoints works (based on screen width).

**Doesn't work (no native analog):**
- `grid-*` — no CSS Grid
- `float-*`, `clear-*`
- `sticky`, `fixed`
- Most pseudo-selectors (`hover:` is limited, `before:`/`after:` don't exist)
- Arbitrary CSS that has no RN property

**Different:**
- `space-x-*` / `space-y-*` — prefer `gap-*`
- Platform variants are added: `ios:`, `android:`, `web:`
- Some values need explicit units where CSS would infer

Full detail: [styling with NativeWind](../02-curriculum/02-styling-with-nativewind.md).

---

## 5. Your shadcn/ui knowledge, specifically

**React Native Reusables** is the direct port, and it works the way you already
expect:

```bash
# Same philosophy: the code is copied into YOUR repo. You own it.
npx @react-native-reusables/cli@latest add button card dialog
```

You get `components/ui/button.tsx` in your project. You edit it. It's yours. No
`node_modules` black box, no fighting a component library's opinions — exactly the
shadcn model.

Under the hood, where shadcn uses Radix primitives, Reusables uses `@rn-primitives/*`
— the same unstyled-accessible-primitive idea, built for native.

| shadcn/ui | React Native Reusables |
|---|---|
| Radix UI primitives | `@rn-primitives/*` |
| Tailwind CSS | NativeWind |
| `cn()` + `tailwind-merge` | same |
| `cva` for variants | same |
| CSS variables for theming | CSS variables (NativeWind supports them) |
| Copy-paste ownership | same |

**What doesn't port:** components that are inherently web (command palette,
hover cards, context menus on right-click). Mobile substitutes exist — bottom sheets,
action sheets, long-press menus — and the mobile pattern is usually *different*, not
just a restyle. Don't force a web interaction onto a phone.

Full detail: [design system](../02-curriculum/03-design-system.md).

---

## 6. Habits to unlearn

| Web habit | Why it breaks | Do instead |
|---|---|---|
| `.map()` over an array to render a list | No virtualization → memory blowup, jank | `FlashList` |
| Reaching for `window` | Doesn't exist | `useWindowDimensions()` |
| Assuming instant deploys | Store review takes days | Plan releases; use EAS Update for JS fixes |
| Storing tokens in `localStorage` | AsyncStorage is unencrypted | `expo-secure-store` |
| Big images, let the browser cope | Mobile memory is tight; decoding is expensive | Resize server-side, use `expo-image` |
| Testing on one browser ≈ all | Platforms genuinely differ | Test iOS + Android daily |
| `console.log` debugging only | Native crashes have no JS stack | Learn native logs (`adb logcat`, Xcode console) |
| Ignoring app lifecycle | Apps get backgrounded, killed, restored | `AppState`, deep links, restoration |
| CSS-in-JS everywhere | Runtime style computation costs more here | NativeWind (compile time) or `StyleSheet.create` |

---

## 7. What is genuinely, entirely new

No web equivalent — budget real learning time:

1. **Permissions** — camera, location, notifications, photos. Ask at the right moment,
   handle denial gracefully, and know that iOS denial is effectively permanent.
2. **App lifecycle** — foreground, background, killed. State restoration.
3. **Push notifications** — APNs and FCM, tokens, and the fact that delivery is
   *best effort*, never guaranteed.
4. **App store release** — signing, provisioning, certificates, review, metadata,
   privacy labels, phased rollout. This is a genuinely large topic.
5. **Native build systems** — Gradle and Xcode. Even with Expo you'll eventually read
   a Gradle error.
6. **Device fragmentation** — screen sizes, OS versions, OEM behavior, low-end Android.
7. **Offline** — mobile networks drop constantly. Offline is a requirement, not a
   feature.

---

## 8. A worked example

The same UI, both platforms.

**Web (what you'd write today):**
```tsx
export function AmenityCard({ amenity, onBook }: Props) {
  return (
    <div className="flex items-center gap-4 rounded-xl border bg-white p-4 shadow-sm">
      <img src={amenity.imageUrl} alt="" className="h-16 w-16 rounded-lg object-cover" />
      <div className="flex-1">
        <h3 className="font-semibold text-slate-900">{amenity.name}</h3>
        <p className="text-sm text-slate-500">{amenity.availableSlots} slots today</p>
      </div>
      <button
        onClick={onBook}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        Book
      </button>
    </div>
  );
}
```

**React Native (what you'll write):**
```tsx
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';

export function AmenityCard({ amenity, onBook }: Props) {
  return (
    <View className="flex-row items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
      <Image
        source={amenity.imageUrl}
        className="h-16 w-16 rounded-lg"
        contentFit="cover"
        transition={200}
      />
      <View className="flex-1">
        <Text className="font-semibold text-slate-900">{amenity.name}</Text>
        <Text className="text-sm text-slate-500">{amenity.availableSlots} slots today</Text>
      </View>
      <Pressable
        onPress={onBook}
        accessibilityRole="button"
        className="rounded-lg bg-slate-900 px-4 py-2 active:bg-slate-700"
      >
        <Text className="text-sm font-medium text-white">Book</Text>
      </Pressable>
    </View>
  );
}
```

**Diff the two.** Everything you need to internalize is in here:

1. `div` → `View`, `h3`/`p` → `Text`, `button` → `Pressable`
2. **`flex-row` is explicit** — `flex` alone would stack them vertically
3. Button label is wrapped in `<Text>` — a `Pressable` can't hold bare text
4. `hover:` → `active:` (press state, not pointer state)
5. `onClick` → `onPress`
6. `object-cover` → `contentFit="cover"` prop
7. `alt=""` → `accessibilityRole` / `accessibilityLabel`
8. `shadow-sm` dropped — shadows need per-platform care, so an explicit border reads
   better cross-platform
9. `expo-image` instead of `Image` from react-native, for caching and transitions

The structure is the same. The primitives are different. That's the whole transition.

---

## Check yourself

1. Why does `{items.length && <List />}` crash in RN but not on the web?
2. You need a horizontal row of three equal-width cards. What classes?
3. Where do you store a JWT, and why not AsyncStorage?
4. A designer gives you a sticky header. How do you build it?
5. Your text is invisible at the top of the screen on an iPhone 15. Why?

<details>
<summary>Answers</summary>

1. When `items.length` is `0`, the expression evaluates to the number `0`, which RN
   tries to render as a bare text node outside a `<Text>` → crash. On the web it just
   prints "0".
2. `<View className="flex-row gap-3">` with each child `className="flex-1"`.
3. `expo-secure-store` — it uses the iOS Keychain and Android Keystore. AsyncStorage
   is plaintext on disk and readable on a rooted/jailbroken device.
4. Not with `position: sticky`. Use the list's `ListHeaderComponent` with
   `stickyHeaderIndices`, or a separate header `View` outside the scroll area, or an
   animated header driven by scroll offset via Reanimated.
5. It's under the notch/dynamic island. You need safe area insets —
   `useSafeAreaInsets()` or a `SafeAreaView`.

</details>

---

**Next:** [Environment setup →](./03-environment-setup.md)
