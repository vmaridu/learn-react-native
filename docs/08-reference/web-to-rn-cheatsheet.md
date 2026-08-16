# Web → React Native Cheatsheet

Print this. Keep it open for your first month.

---

## Elements

| Web | React Native |
|---|---|
| `<div>` | `<View>` |
| `<span>` `<p>` `<h1>`–`<h6>` | `<Text>` (all text must be inside one) |
| `<img>` | `<Image>` from `expo-image` |
| `<button>` | `<Pressable>` |
| `<input>` | `<TextInput>` |
| `<textarea>` | `<TextInput multiline>` |
| `<select>` | Bottom sheet with a list (recommended) |
| `<a href>` | `<Link>` from `expo-router` |
| `<form>` | `<View>` + submit handler |
| `<ul>`/`<ol>` | `<FlashList>` |
| Scrollable `<div>` | `<ScrollView>` (short content only) |
| `<svg>` | `react-native-svg` |
| `<video>` | `expo-video` |
| `<iframe>` | `react-native-webview` |
| `<hr>` | `<View className="h-px bg-border" />` |
| `<table>` | Card list — tables don't work on phones |

## Events

| Web | React Native |
|---|---|
| `onClick` | `onPress` |
| `onDoubleClick` | `onPress` with tap-count, or Gesture Handler |
| `onMouseDown` / `onMouseUp` | `onPressIn` / `onPressOut` |
| `onContextMenu` | `onLongPress` |
| `onChange` (input) | `onChangeText` (gives the string, not an event) |
| `onSubmit` | `onSubmitEditing` |
| `onFocus` / `onBlur` | same |
| `onScroll` | same (needs `scrollEventThrottle`) |
| `onMouseEnter` | ❌ no hover |

## CSS → React Native styles

| Web | React Native |
|---|---|
| `display: flex` | default — everything is flex |
| `flex-direction: row` | **must be explicit** — default is `column` |
| `display: grid` | ❌ doesn't exist |
| `position: fixed` | ❌ — use `absolute` outside the ScrollView |
| `position: sticky` | ❌ — use `stickyHeaderIndices` |
| `float` | ❌ |
| `px` / `rem` | unitless numbers (dp) |
| `background-color` | `backgroundColor` |
| `padding: 4px 8px` | `paddingVertical` + `paddingHorizontal` |
| `font-weight: 600` | `fontWeight: '600'` (**string**) |
| `box-shadow` | `boxShadow`, or `shadow*` (iOS) + `elevation` (Android) |
| `z-index` | `zIndex` + `elevation` on Android |
| `overflow: scroll` | `<ScrollView>` |
| `:hover` | ❌ — use `onPressIn`/`onPressOut` |
| `::before` / `::after` | ❌ |
| `@media` | `useWindowDimensions()` / `Platform.select()` |
| CSS cascade | ❌ **no inheritance** (except nested `<Text>`) |
| Global stylesheet | ❌ all styles are component-scoped |
| `gap` | ✅ works |
| `aspect-ratio` | ✅ works |
| `transform` | ✅ works |

## Tailwind classes

| Works ✅ | Doesn't ❌ | Different ⚠️ |
|---|---|---|
| `flex-*`, `items-*`, `justify-*` | `grid-*`, `col-span-*` | `space-x-*` → prefer `gap-*` |
| `p-*`, `m-*`, `gap-*` | `float-*`, `clear-*` | `shadow-*` → platform differences |
| `w-*`, `h-*`, `aspect-*` | `fixed`, `sticky` | `hover:` → use `active:` |
| `bg-*`, `text-*`, `border-*` | `before:`, `after:` | `overflow-hidden` clips Android shadows |
| `rounded-*`, `opacity-*` | `backdrop-*` | |
| `text-lg`, `font-*`, `leading-*` | `cursor-*` | |
| `absolute`, `relative`, `top-*` | `transition-*`, `animate-*` | |
| `dark:`, `sm:`/`md:`/`lg:` | `select-*` | |
| **New:** `ios:`, `android:`, `active:` | | |

## Browser APIs

| Web | React Native |
|---|---|
| `window` | ❌ — `useWindowDimensions()` |
| `document` | ❌ no DOM |
| `localStorage` | `react-native-mmkv` (sync, fast) |
| `sessionStorage` | in-memory state |
| Cookies | `expo-secure-store` for tokens |
| IndexedDB | `expo-sqlite` + Drizzle |
| `fetch` | ✅ works |
| `WebSocket` | ✅ works |
| `navigator.geolocation` | `expo-location` |
| `navigator.mediaDevices` | `expo-camera` |
| `navigator.clipboard` | `expo-clipboard` |
| `navigator.share` | `Share` from react-native |
| Web Push | `expo-notifications` |
| `history.pushState` | `router.push()` |
| `alert()` / `confirm()` | `Alert.alert()` |
| `window.open()` | `Linking.openURL()` |
| `console.log` | ✅ works (Metro terminal + DevTools) |
| Service workers | ❌ — different offline model |

## Libraries

| Web | React Native |
|---|---|
| Next.js | Expo |
| Next.js App Router | Expo Router |
| React Router | Expo Router / React Navigation |
| Tailwind CSS | NativeWind |
| shadcn/ui | React Native Reusables |
| Radix UI | `@rn-primitives/*` |
| Framer Motion | Reanimated |
| lucide-react | lucide-react-native |
| TanStack Query | ✅ same |
| Zustand | ✅ same |
| React Hook Form | ✅ same (with `<Controller>`) |
| Zod | ✅ same |
| Playwright / Cypress | Maestro |
| Vitest / Jest | Jest + jest-expo |
| Vercel | EAS Build + Submit |
| next/image | expo-image |

## Tooling

| Web | React Native |
|---|---|
| Vite / webpack | Metro |
| `npm run dev` | `npx expo start` |
| Browser refresh | Fast Refresh (preserves state) |
| Chrome DevTools | React Native DevTools (`j` in Metro) |
| Lighthouse | Flashlight (Android), Instruments (iOS) |
| `.env` | `app.config.ts` + EAS secrets |
| Deploy | `eas build` + `eas submit` |
| Instant deploy | `eas update` (JS only) |

---

## Gotchas that cost people hours

```tsx
// 1. Bare text crashes
<View>Hello</View>                     // ❌
<View><Text>Hello</Text></View>        // ✅

// 2. The zero-render crash
{items.length && <List />}             // ❌ renders `0` → crash
{items.length > 0 && <List />}         // ✅

// 3. Column is the default
<View className="flex">A B</View>      // stacks vertically
<View className="flex-row">A B</View>  // ✅ side by side

// 4. No cascade
<View className="text-white">          // ❌ does nothing
  <Text>hi</Text>
</View>
<View><Text className="text-white">hi</Text></View>   // ✅

// 5. Text overflows instead of truncating (flexShrink defaults to 0)
<View className="flex-row">
  <View className="flex-1">            // ✅ this makes truncation work
    <Text numberOfLines={1}>{longTitle}</Text>
  </View>
</View>

// 6. First button tap eaten by the keyboard
<ScrollView keyboardShouldPersistTaps="handled">   // ✅

// 7. fontWeight must be a string
{ fontWeight: 600 }                    // ❌
{ fontWeight: '600' }                  // ✅

// 8. Content under the notch
const insets = useSafeAreaInsets();
<View style={{ paddingTop: insets.top }}>   // ✅

// 9. Gestures silently don't work
<GestureHandlerRootView style={{ flex: 1 }}>   // ✅ must be at root, with flex:1

// 10. Tiny touch targets
<Pressable hitSlop={8}>                // ✅ expand to ≥44pt
```

---

## Quick commands

```bash
# Dev
npx expo start                 # start
npx expo start --clear         # clear Metro cache (fixes a lot)
  i / a / w                    # open iOS / Android / web
  j                            # React Native DevTools
  r                            # reload

# Health
npx expo-doctor                # diagnose
npx expo install --check       # find version drift
npx expo install --fix         # fix it

# Native
npx expo prebuild --clean      # regenerate ios/ and android/
npx expo run:ios               # build + run natively
adb logcat | grep -i "ReactNative\|AndroidRuntime"

# Build & ship
eas build --profile production --platform all
eas submit --platform all
eas update --branch production --message "Fix X"

# Verify a package before installing (do this every time)
npm view <package> version time.modified
```

---

## The escalating reset

When everything is broken and you don't know why — in order, don't skip:

```bash
npx expo start --clear                        # 1. Metro cache
rm -rf node_modules && pnpm install           # 2. JS deps
npx expo install --check                      # 3. version drift
rm -rf ios android && npx expo prebuild --clean  # 4. native (safe if managed)
npx expo-doctor                               # 5. diagnose
```

---

**Back to:** [Portal index](../README.md)
