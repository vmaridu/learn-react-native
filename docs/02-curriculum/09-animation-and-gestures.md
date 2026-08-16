# Animation and Gestures

Reanimated + Gesture Handler. This is where an app stops feeling like a website.

---

## 1. Why a special library

Recall the [threading model](../01-foundations/01-how-react-native-works.md#2-the-threads):
JS thread and UI thread.

A naive animation updates React state 60 times per second. Every frame needs the JS
thread. When the JS thread is busy — parsing a response, re-rendering a list — frames
drop and the animation stutters.

**Reanimated runs animations on the UI thread**, in "worklets": small functions
compiled to run in a separate JS context on the UI thread. The animation keeps running
at 60/120fps even when your JS thread is completely blocked.

```
❌ JS-driven:  state → render → bridge → native  (every frame, needs JS thread)
✅ Reanimated: worklet runs on UI thread          (JS thread irrelevant)
```

This is not a micro-optimization. It's the difference between "feels native" and
"feels like a webview."

---

## 2. Setup

```bash
npx expo install react-native-reanimated react-native-gesture-handler
```

`babel.config.js` — the plugin **must be last**:

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    plugins: ['react-native-reanimated/plugin'],   // ← must be last
  };
};
```

Wrap the app root:

```tsx
// app/_layout.tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';

<GestureHandlerRootView style={{ flex: 1 }}>
  <Stack />
</GestureHandlerRootView>
```

⚠️ Two extremely common setup bugs:
1. Reanimated plugin not last in the plugins array → cryptic worklet errors
2. `GestureHandlerRootView` missing or without `flex: 1` → gestures silently don't fire

> **Reanimated 4** (current: 4.5.x) requires the New Architecture, which you have. It
> also adds CSS-style animations — see §7.

---

## 3. Core concepts

### Shared values

The animated state primitive. Lives on the UI thread; changing it doesn't re-render
React.

```tsx
import { useSharedValue } from 'react-native-reanimated';

const offset = useSharedValue(0);
offset.value = 100;         // no re-render, runs on the UI thread
```

### Animated styles

```tsx
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

function Card() {
  const offset = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  return (
    <>
      <Animated.View style={animatedStyle} className="h-20 w-20 rounded-xl bg-primary" />
      <Button onPress={() => (offset.value = withSpring(100))}>
        <Text>Move</Text>
      </Button>
    </>
  );
}
```

Note: `Animated.View`, not `View`. Reanimated needs its own components.

### Animation functions

```tsx
withTiming(100, { duration: 300, easing: Easing.out(Easing.cubic) })
withSpring(100, { damping: 15, stiffness: 150 })
withDecay({ velocity: 500 })
withDelay(200, withTiming(100))
withSequence(withTiming(10), withTiming(-10), withTiming(0))
withRepeat(withTiming(1), -1, true)   // infinite, reversing
```

**Springs feel better than timings for anything interactive.** Timing is right for
deterministic transitions (a progress bar); spring is right for anything responding to
a user's touch.

### Worklets

```tsx
const style = useAnimatedStyle(() => {
  'worklet';                    // usually inferred by the babel plugin
  return { opacity: progress.value };
});
```

Worklets run on the UI thread and can't touch normal JS closures freely. To call back
into JS:

```tsx
import { runOnJS } from 'react-native-reanimated';

const gesture = Gesture.Tap().onEnd(() => {
  runOnJS(navigateToDetail)();   // required — you can't call JS-thread fns directly
});
```

Forgetting `runOnJS` is the #1 Reanimated error. If you see "Tried to synchronously
call a non-worklet function on the UI thread," that's this.

---

## 4. Gestures

Gesture Handler v3 has a clean composable API.

```tsx
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const pan = Gesture.Pan()
  .onUpdate((e) => {
    translateX.value = e.translationX;
  })
  .onEnd((e) => {
    translateX.value = withSpring(0, { velocity: e.velocityX });
  });

<GestureDetector gesture={pan}>
  <Animated.View style={animatedStyle} />
</GestureDetector>
```

Available gestures: `Tap`, `Pan`, `Pinch`, `Rotation`, `LongPress`, `Fling`,
`ForceTouch`, `Hover`, `Native`.

### Composition

```tsx
const composed = Gesture.Simultaneous(pinch, rotation);   // both at once
const exclusive = Gesture.Exclusive(doubleTap, singleTap); // first that matches wins
const sequential = Gesture.Sequence(longPress, pan);       // one then the other
```

### A real example: swipe-to-delete

```tsx
function SwipeableRow({ item, onDelete }: Props) {
  const translateX = useSharedValue(0);
  const THRESHOLD = -80;

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])          // don't fight the list's vertical scroll
    .onUpdate((e) => {
      translateX.value = Math.min(0, e.translationX);
    })
    .onEnd(() => {
      if (translateX.value < THRESHOLD) {
        translateX.value = withTiming(-400, {}, (finished) => {
          if (finished) runOnJS(onDelete)(item.id);
        });
      } else {
        translateX.value = withSpring(0);
      }
    });

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));

  return (
    <View>
      <View className="absolute inset-0 items-end justify-center bg-destructive pr-6">
        <Text className="text-white">Delete</Text>
      </View>
      <GestureDetector gesture={pan}>
        <Animated.View style={style} className="bg-background">
          <Row item={item} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
```

**`activeOffsetX([-10, 10])` is the important line.** Without it, the horizontal pan
competes with the list's vertical scroll and both feel broken. Gesture arbitration is
most of the work in real gesture code.

---

## 5. Layout animations

The cheapest wins in the library. Entering/exiting/layout transitions with one prop:

```tsx
import Animated, { FadeIn, FadeOut, SlideInRight, LinearTransition } from 'react-native-reanimated';

<Animated.View
  entering={FadeIn.duration(200)}
  exiting={FadeOut.duration(150)}
  layout={LinearTransition.springify()}
>
  <AnnouncementCard item={item} />
</Animated.View>
```

Presets: `FadeIn/Out`, `SlideIn/Out{Left,Right,Up,Down}`, `ZoomIn/Out`,
`BounceIn/Out`, `FlipIn/Out`, `StretchIn/Out`.

`layout={LinearTransition}` animates position changes when list items reorder or
resize. Add it to list rows and reordering suddenly looks intentional.

⚠️ Layout animations on **FlashList** rows can conflict with view recycling. Test
carefully; prefer them on small, non-virtualized lists.

---

## 6. Scroll-driven animation

The collapsing header — the most requested pattern in mobile apps.

```tsx
import Animated, {
  useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, interpolate, Extrapolation,
} from 'react-native-reanimated';

function SiteDetail() {
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => { scrollY.value = e.contentOffset.y; },
  });

  const headerStyle = useAnimatedStyle(() => ({
    height: interpolate(scrollY.value, [0, 200], [280, 90], Extrapolation.CLAMP),
    opacity: interpolate(scrollY.value, [0, 150], [1, 0], Extrapolation.CLAMP),
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [120, 200], [0, 1], Extrapolation.CLAMP),
  }));

  return (
    <View className="flex-1">
      <Animated.View style={headerStyle} className="overflow-hidden">
        <Image source={site.heroUrl} className="h-full w-full" />
      </Animated.View>
      <Animated.Text style={titleStyle} className="absolute top-14 left-4 text-lg font-semibold">
        {site.name}
      </Animated.Text>
      <Animated.ScrollView onScroll={scrollHandler} scrollEventThrottle={16}>
        {/* content */}
      </Animated.ScrollView>
    </View>
  );
}
```

`interpolate` maps one range onto another — the workhorse of scroll animation.
`Extrapolation.CLAMP` stops values running past the ends (otherwise over-scrolling
produces negative heights).

---

## 7. CSS-style animations (Reanimated 4)

Reanimated 4 added a CSS-like API that's much less code for simple cases:

```tsx
<Animated.View
  style={{
    animationName: {
      from: { opacity: 0, transform: [{ translateY: 20 }] },
      to:   { opacity: 1, transform: [{ translateY: 0 }] },
    },
    animationDuration: '300ms',
    animationTimingFunction: 'ease-out',
  }}
/>
```

And transitions:

```tsx
<Animated.View
  style={{
    backgroundColor: isActive ? 'green' : 'gray',
    transitionProperty: 'backgroundColor',
    transitionDuration: '200ms',
  }}
/>
```

Use these for simple state-driven animations; use shared values + worklets when a
gesture drives the animation or you need per-frame control.

---

## 8. When to animate (and when not to)

Animation should communicate, not decorate. Good animation is invisible; bad animation
is a delay.

**Animate to:**
- Show state change (loading → loaded)
- Show spatial relationship (this modal came from that button)
- Give feedback (press, success)
- Direct attention (a new item arrived)
- Smooth a jarring transition

**Don't animate:**
- Just because you can
- Anything longer than ~300ms for a routine transition
- Things the user does dozens of times a minute
- Blocking the user from acting

**Duration guide:**

| Interaction | Duration |
|---|---|
| Micro (press, toggle) | 100–150ms |
| Standard transition | 200–300ms |
| Screen/modal transition | 300–400ms |
| Anything > 500ms | Almost certainly too slow |

**Respect reduced motion** — an accessibility requirement, not a nicety:

```tsx
import { useReducedMotion } from 'react-native-reanimated';

const reduceMotion = useReducedMotion();
const style = useAnimatedStyle(() => ({
  opacity: reduceMotion ? 1 : withTiming(opacity.value),
}));
```

---

## 9. Debugging

| Symptom | Cause | Fix |
|---|---|---|
| "Tried to synchronously call a non-worklet function" | Calling JS from a worklet | Wrap in `runOnJS()` |
| Gestures don't fire at all | `GestureHandlerRootView` missing or no `flex: 1` | Add it at the root |
| Animation janky despite Reanimated | You're animating layout props (`width`, `height`, `top`) | Prefer `transform` and `opacity` |
| Value doesn't update | Reassigned the shared value object | Mutate `.value`, don't replace |
| Works in dev, broken in prod | Plugin not last in babel config | Move `react-native-reanimated/plugin` to the end |
| Swipe fights list scroll | No gesture arbitration | `activeOffsetX` / `failOffsetY` |
| Layout animation flickers in a list | Conflicts with view recycling | Remove it, or don't virtualize that list |

**Rule of thumb:** animating `transform` and `opacity` is cheap (the compositor handles
it). Animating `width`, `height`, `margin`, or `top` triggers layout on every frame and
is expensive — same principle as the web.

---

## 10. Exercise

Add motion to Trailhead:

1. **Collapsing header** on the site detail screen, with the title crossfading in
2. **Swipe-to-cancel** on booking rows, with proper gesture arbitration against scroll
3. **Bottom sheet** for filters — gesture-driven, snaps to detents, with a backdrop
   that fades with drag progress
4. **Skeleton shimmer** while content loads (`withRepeat` on a gradient position)
5. **Success animation** when a booking confirms — a check that scales and springs in,
   with haptic feedback
6. **List entrance** — items fade and slide in, staggered by index
7. **Pull-to-refresh** with a custom animated indicator
8. **Reduced motion** respected throughout

**Constraint:** every animation must stay at 60fps *while a large list is loading in
the background*. Test it by triggering a big fetch mid-animation. If your animations
stutter, they aren't actually running on the UI thread — find out why.

---

## Check yourself

1. Why does a Reanimated animation keep running when the JS thread is blocked?
2. When must you use `runOnJS`?
3. Why does swipe-to-delete need `activeOffsetX`?
4. Why is animating `transform: translateX` cheaper than animating `left`?
5. What must you check before shipping any animation, for accessibility?

<details>
<summary>Answers</summary>

1. The animation runs as a worklet in a separate JS context on the **UI thread**, so
   it never needs the main JS thread to compute frames.
2. Whenever a worklet needs to call a normal JS-thread function — navigation, setting
   React state, network calls, analytics. Worklets can't call JS-thread closures
   directly.
3. Without it, the pan gesture activates on the tiniest horizontal movement and
   competes with the list's vertical scroll. `activeOffsetX([-10, 10])` requires ~10px
   of horizontal movement before the pan takes over, so vertical scrolling still wins
   when that's what the user meant.
4. `transform` is handled by the compositor without re-running layout. Changing `left`
   invalidates layout, so Yoga recomputes positions every frame.
5. That it respects the OS "reduce motion" setting — via `useReducedMotion()`. Large
   motion can trigger nausea and vestibular symptoms for some users.

</details>

---

## Sources

- [Reanimated docs](https://docs.swmansion.com/react-native-reanimated/)
- [React Native Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/)
- [Reanimated — CSS animations](https://docs.swmansion.com/react-native-reanimated/docs/css-animations/)

**Next:** [Native modules and config plugins →](./10-native-modules-and-config-plugins.md)
