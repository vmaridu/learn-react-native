# Components and Layout

The primitives you'll use every day, and the layout engine that positions them.

---

## 1. The core components

React Native ships a small set of primitives. Almost every UI is built from these six.

### `<View>`

The container. Your `<div>`.

```tsx
<View className="flex-row items-center gap-3 p-4">
  {/* children */}
</View>
```

- Cannot contain bare text
- Already `display: flex`
- Maps to `UIView` (iOS) / `android.view.ViewGroup` (Android)

### `<Text>`

All text. Every string on screen lives inside one.

```tsx
<Text
  className="text-base text-slate-900"
  numberOfLines={2}
  ellipsizeMode="tail"
>
  A long campsite description that will be truncated after two lines…
</Text>
```

Useful props:
| Prop | Does |
|---|---|
| `numberOfLines` | Truncate after N lines |
| `ellipsizeMode` | `head` / `middle` / `tail` / `clip` |
| `selectable` | Allow the user to select and copy |
| `adjustsFontSizeToFit` | Shrink to fit (iOS mostly) |
| `allowFontScaling` | Respect OS text-size settings — **leave this on** for accessibility |

Nested `<Text>` inherits, which is how you do rich text:

```tsx
<Text className="text-base text-slate-700">
  Reserved by <Text className="font-semibold text-slate-900">Priya</Text> until 4pm
</Text>
```

### `<Pressable>`

The modern touchable. Use this, not `TouchableOpacity`/`TouchableHighlight` (legacy).

```tsx
<Pressable
  onPress={handleBook}
  onLongPress={handlePreview}
  accessibilityRole="button"
  accessibilityLabel="Book the clubhouse"
  hitSlop={8}
  className="rounded-lg bg-slate-900 px-4 py-3 active:bg-slate-700"
>
  <Text className="text-white">Book</Text>
</Pressable>
```

Key details:
- **`hitSlop`** expands the touch target beyond the visual bounds. Apple's HIG says
  44×44pt minimum, Material says 48×48dp. Small icon buttons *need* this.
- `active:` in NativeWind maps to the pressed state.
- Always set `accessibilityRole` and a label — see
  [accessibility](#7-accessibility-is-not-optional).
- The `children` can be a function receiving `{ pressed }` if you need finer control:

```tsx
<Pressable>
  {({ pressed }) => <Text style={{ opacity: pressed ? 0.6 : 1 }}>Tap</Text>}
</Pressable>
```

### `<Image>` — use `expo-image`

The built-in `<Image>` works, but `expo-image` is strictly better: disk + memory
caching, better decoding, transitions, placeholders, and it handles memory pressure.

```tsx
import { Image } from 'expo-image';

<Image
  source={{ uri: site.imageUrl }}
  placeholder={{ blurhash: site.blurhash }}
  contentFit="cover"
  transition={200}
  cachePolicy="memory-disk"
  className="h-40 w-full rounded-xl"
/>
```

| `expo-image` | CSS equivalent |
|---|---|
| `contentFit="cover"` | `object-fit: cover` |
| `contentPosition` | `object-position` |
| `transition={200}` | fade-in on load |
| `placeholder` | blurhash/thumbhash while loading |

> **Performance rule:** never load a 4000px image to display it at 80px. Resize
> server-side (Supabase Storage transforms, Cloudinary, imgproxy). Decoding a huge
> image costs memory and time, and on low-end Android it will OOM-crash your app.

### `<TextInput>`

```tsx
<TextInput
  value={value}
  onChangeText={setValue}
  placeholder="Search campsites"
  keyboardType="default"
  autoCapitalize="none"
  autoCorrect={false}
  returnKeyType="search"
  onSubmitEditing={handleSearch}
  className="rounded-lg border border-slate-300 px-3 py-2"
/>
```

`keyboardType` matters a lot for UX — `email-address`, `numeric`, `phone-pad`,
`decimal-pad`. Getting it right is a cheap, visible quality win.

⚠️ It's `onChangeText` (gives you the string), not `onChange` (gives you an event).

### `<ScrollView>`

For **short, finite** content. Renders all children immediately.

```tsx
<ScrollView
  contentContainerClassName="p-4 gap-4"
  showsVerticalScrollIndicator={false}
  keyboardShouldPersistTaps="handled"
>
  {/* a settings screen, a form, a detail page */}
</ScrollView>
```

⚠️ **Never put a long or unbounded list in a ScrollView.** Use `FlashList`. See
[lists and performance](./05-lists-and-performance.md).

Note the distinction:
- `className` styles the scroll container itself
- `contentContainerClassName` styles the inner content wrapper — this is where padding
  and gap go

---

## 2. Flexbox in React Native

Layout is Flexbox, computed by **Yoga** (a C++ engine). It's ~95% the same as CSS
flexbox, with a few deliberate differences.

### The differences from CSS

| Property | CSS default | React Native default |
|---|---|---|
| `display` | `block` | `flex` (always) |
| `flexDirection` | `row` | **`column`** |
| `alignContent` | `stretch` | `flex-start` |
| `flexShrink` | `1` | `0` |
| `position` | `static` | `relative` |

The `flexDirection: column` default is the one that will confuse you for a week.
Screens are tall, so stacking vertically is the common case.

The `flexShrink: 0` default is the one that will cause bugs: children don't shrink by
default, so text can overflow its container instead of truncating. Fix with
`className="flex-1"` or `shrink`.

### The patterns you'll use constantly

**Fill the screen:**
```tsx
<View className="flex-1">
```

**Center something:**
```tsx
<View className="flex-1 items-center justify-center">
```

**Row with space between:**
```tsx
<View className="flex-row items-center justify-between">
```

**Row where the middle expands:**
```tsx
<View className="flex-row items-center gap-3">
  <Avatar />
  <View className="flex-1">          {/* takes remaining space */}
    <Text numberOfLines={1}>Long title that truncates</Text>
  </View>
  <Badge />
</View>
```

This is *the* list-row pattern. You'll write it hundreds of times. The `flex-1` on the
middle is what makes truncation work.

**Equal columns:**
```tsx
<View className="flex-row gap-3">
  <View className="flex-1"><Card /></View>
  <View className="flex-1"><Card /></View>
</View>
```

**Pin something to the bottom:**
```tsx
<View className="flex-1">
  <View className="flex-1">{/* content */}</View>
  <View className="p-4">{/* footer sticks to bottom */}</View>
</View>
```

### No CSS Grid

There is no grid. For a grid layout you have two options:

1. **`FlashList` with `numColumns`** — correct for real data, virtualized
2. **Flex wrap** — fine for a handful of fixed items

```tsx
<View className="flex-row flex-wrap gap-3">
  {items.map((i) => (
    <View key={i.id} style={{ width: '48%' }}><Card item={i} /></View>
  ))}
</View>
```

Percentage widths + gap can fight each other. For anything non-trivial, compute the
item width from `useWindowDimensions()`.

---

## 3. Absolute positioning

Works like CSS, with `position: 'absolute'` relative to the nearest positioned parent.

```tsx
<View className="relative">
  <Image className="h-48 w-full" source={...} />
  <View className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1">
    <Text className="text-xs text-white">2 left</Text>
  </View>
</View>
```

**There is no `position: fixed`.** For a floating action button or a bottom bar that
stays put, put it outside the scroll view:

```tsx
<View className="flex-1">
  <FlashList ... />
  <View className="absolute bottom-8 right-6">
    <FAB />
  </View>
</View>
```

---

## 4. Safe areas

Notches, dynamic islands, home indicators, and rounded corners eat your layout.

```bash
npx expo install react-native-safe-area-context
```

Wrap the app once:
```tsx
// app/_layout.tsx
<SafeAreaProvider>
  <Stack />
</SafeAreaProvider>
```

Then use the hook — it's more flexible than `<SafeAreaView>`:

```tsx
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function Screen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ paddingTop: insets.top, paddingBottom: insets.bottom }} className="flex-1">
      ...
    </View>
  );
}
```

**Why the hook beats `<SafeAreaView>`:** you often want the *background* to extend
under the notch while only the *content* is inset. A background image that stops at
the notch looks broken. With insets you control exactly which element gets the padding.

**In a scrolling list**, apply the bottom inset to the content container, not the list
— otherwise you get dead space that can't scroll:

```tsx
<FlashList
  contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
  ...
/>
```

**Android edge-to-edge:** with `edgeToEdgeEnabled: true` in `app.json` (the modern
default), your app draws behind the system bars on Android too, so insets matter on
both platforms.

---

## 5. Platform differences

### `Platform`

```tsx
import { Platform } from 'react-native';

Platform.OS          // 'ios' | 'android' | 'web'
Platform.Version     // iOS: '18.2'  Android: 34 (API level)

const padding = Platform.select({ ios: 12, android: 16, default: 12 });

// Whole-value branching
const shadow = Platform.select({
  ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  android: { elevation: 3 },
});
```

With NativeWind you can also use variants:
```tsx
<View className="p-3 ios:p-3 android:p-4" />
```

### Platform-specific files

Metro resolves these automatically:

```
Header.tsx          ← shared
Header.ios.tsx      ← used on iOS
Header.android.tsx  ← used on Android
```

```tsx
import { Header } from './Header';  // correct file picked at build time
```

**Use this sparingly.** Two full implementations diverge over time. Prefer
`Platform.select` for small differences and reserve separate files for genuinely
different UIs (e.g. a date picker).

### Android hardware back button

There is no web equivalent, and forgetting it is a classic bug.

```tsx
import { BackHandler } from 'react-native';
import { useFocusEffect } from 'expo-router';

useFocusEffect(
  useCallback(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (hasUnsavedChanges) {
        confirmDiscard();
        return true;   // we handled it — don't navigate back
      }
      return false;    // let the default happen
    });
    return () => sub.remove();
  }, [hasUnsavedChanges])
);
```

Expo Router handles the common navigation case for you. You only need this for
intercepts — unsaved changes, closing a custom modal, exiting a flow.

---

## 6. Styling without NativeWind

You'll use NativeWind, but you must be able to read `StyleSheet` code — every library
and most Stack Overflow answers use it.

```tsx
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: '600', color: '#0f172a' },
});

<View style={styles.container}>
  <Text style={styles.title}>Hello</Text>
</View>
```

Rules:
- Property names are camelCase: `backgroundColor`, `paddingHorizontal`
- Values are unitless numbers (dp), or strings for colors/percentages
- `fontWeight` must be a **string**: `'600'` not `600`
- Combine with an array: `style={[styles.base, isActive && styles.active]}`
- No cascade, no inheritance

Shorthand that doesn't exist: there's no `padding: '4px 8px'`. Use
`paddingHorizontal` / `paddingVertical`, or `padding` plus overrides.

---

## 7. Accessibility is not optional

Mobile accessibility is more visible than on the web — screen reader users on mobile
are a large population, and both stores surface accessibility issues.

```tsx
<Pressable
  accessibilityRole="button"
  accessibilityLabel="Book the clubhouse for Saturday"
  accessibilityHint="Opens the booking confirmation screen"
  accessibilityState={{ disabled: isFull }}
>
```

| Prop | Purpose |
|---|---|
| `accessibilityRole` | `button`, `link`, `header`, `image`, `switch`, `search`… |
| `accessibilityLabel` | What the element *is* |
| `accessibilityHint` | What happens when you activate it |
| `accessibilityState` | `disabled`, `selected`, `checked`, `expanded` |
| `accessible` | Groups children into one focusable element |

**Test it for real:**
- iOS: Settings → Accessibility → VoiceOver (learn the triple-click shortcut)
- Android: Settings → Accessibility → TalkBack

Also: honor `allowFontScaling` (on by default — don't disable it), maintain 4.5:1
contrast, and ensure touch targets are ≥44pt.

Spend 20 minutes navigating your own app with VoiceOver on. It's uncomfortable and
extremely instructive.

---

## 8. Common layout bugs

| Symptom | Cause | Fix |
|---|---|---|
| Nothing renders | Parent has no height | Add `flex-1` |
| Text overflows instead of truncating | `flexShrink: 0` default | `flex-1` on the wrapper + `numberOfLines` |
| Content under the notch | No safe area handling | `useSafeAreaInsets()` |
| Shadow invisible on Android | Android needs `elevation` | Add `elevation`, or use a border |
| Shadow clipped | `overflow: hidden` on parent | Move overflow to an inner view |
| Items stack vertically unexpectedly | `column` is the default | Add `flex-row` |
| Can't tap a small icon | Touch target too small | `hitSlop={8}` |
| Gap not working | Very old RN | Supported now; check your version |
| List scrolls but can't reach the last item | Missing bottom inset | Bottom padding on `contentContainerStyle` |
| Tapping a button in a list dismisses keyboard instead | Default tap behavior | `keyboardShouldPersistTaps="handled"` |

---

## 9. Exercise

Build a **campsite detail screen**:

- Hero image, full-bleed, extending under the status bar
- Back button floating over the image, respecting the top safe area
- Title + location row
- A row of three stat blocks (capacity / price / rating), equal widths
- Description text, truncated to 3 lines with a "Read more" toggle
- Bottom action bar pinned above the home indicator with a "Reserve" button
- Content scrolls under the fixed bottom bar
- Works on both platforms, light and dark

Constraints: no external layout library, `expo-image` for the hero, VoiceOver-navigable.

This exercises: full-bleed layout with insets, absolute positioning, flex rows, text
truncation with state, pinned footer, scroll-under behavior. It's the single most
common real-world screen shape.

---

## Check yourself

1. Why does `<View><Text>a</Text><Text>b</Text></View>` stack vertically?
2. Your row's title pushes the badge off screen. What's wrong?
3. When do you use `SafeAreaView` vs `useSafeAreaInsets`?
4. Why is `expo-image` preferred over `Image`?
5. How do you make a 24×24 icon button meet accessibility guidelines?

<details>
<summary>Answers</summary>

1. `flexDirection` defaults to `column` in React Native.
2. The title's container isn't shrinking — `flexShrink` defaults to `0`. Wrap the
   title in `<View className="flex-1">` and add `numberOfLines={1}` to the `Text`.
3. `useSafeAreaInsets` whenever you need control over *which* element gets the
   padding — especially when a background should extend under the notch, or when you
   need the inset inside a list's content container. `SafeAreaView` is a convenience
   for simple full-screen content.
4. Disk + memory caching, better decode handling, blurhash placeholders, transitions,
   and it recovers from memory pressure instead of crashing.
5. `hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}` to expand the touch target
   to ~44pt, plus `accessibilityRole="button"` and an `accessibilityLabel`.

</details>

---

## Sources

- [React Native — Core components](https://reactnative.dev/docs/components-and-apis)
- [React Native — Layout with Flexbox](https://reactnative.dev/docs/flexbox)
- [expo-image](https://docs.expo.dev/versions/latest/sdk/image/)
- [React Native — Accessibility](https://reactnative.dev/docs/accessibility)

**Next:** [Styling with NativeWind →](./02-styling-with-nativewind.md)
