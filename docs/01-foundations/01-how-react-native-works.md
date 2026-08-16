# How React Native Actually Works

> **Why this doc exists:** you can ship a React Native app without reading this. But
> the first time you have a stutter you can't explain, or a native crash, or someone
> asks "why is your app 40MB," you will need this model. Read it now; it's 20 minutes
> that pays back for years.

---

## 1. The one-sentence version

React Native runs your JavaScript in a JS engine embedded in a native app, and that
JavaScript drives **real native UI widgets** — not a webview, not a canvas.

That last part is the whole point. When you write `<Text>` on iOS you get a real
`UITextView`. On Android you get a real `TextView`. Your app scrolls, animates, and
feels native because it *is* native, driven by JS.

Compare:

| Approach | What renders | Examples |
|---|---|---|
| Webview wrapper | HTML in a browser shell | Cordova, Ionic |
| Custom rendering engine | App draws every pixel itself | Flutter |
| **Native widgets driven by JS** | **Real platform UI components** | **React Native** |

Each has trade-offs. React Native's is: you get real native components and real
platform behavior for free, at the cost of a JS↔native boundary you have to respect.

---

## 2. The threads

This is the model that explains 90% of performance problems.

```
┌────────────────────────────────────────────────────────────┐
│  JS Thread                                                 │
│  Runs your React code, effects, business logic,            │
│  network callbacks, state updates.                         │
│  ─ Single threaded. Block it and the app stops responding. │
└────────────────────────────────────────────────────────────┘
                          ↕  JSI (direct, synchronous)
┌────────────────────────────────────────────────────────────┐
│  Native / UI Thread (Main Thread)                          │
│  Measures + draws native views, handles touch input,       │
│  runs platform APIs.                                       │
│  ─ Block it and the UI literally freezes.                  │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  Background pools                                          │
│  Image decoding, disk I/O, layout (Yoga), native modules   │
│  that opt into their own queues.                           │
└────────────────────────────────────────────────────────────┘
```

**The rules that follow from this:**

- A slow `JSON.parse` of a 5MB response blocks the JS thread → touches still register
  (native thread is fine) but nothing *responds*.
- A heavy synchronous native call blocks the UI thread → the app visibly freezes,
  including scrolling.
- Animations driven by JS state must round-trip through the JS thread every frame →
  if the JS thread is busy, animation stutters. **This is why Reanimated exists**: it
  runs animations on the UI thread so they keep running at 60fps even when JS is busy.
  See [animation and gestures](../02-curriculum/09-animation-and-gestures.md).

> **Web analogy:** the JS thread is like the browser's main thread, and the UI thread
> is like the compositor. `transform`/`opacity` animations on the web stay smooth
> during JS work for exactly the same reason Reanimated animations do.

---

## 3. The New Architecture

Since React Native 0.76 the "New Architecture" is the default, and as of 0.82 the old
bridge-based architecture has been **removed entirely**. Anything you read online
before ~2025 describing "the bridge" is describing a system that no longer exists.

You'll be on RN 0.86 (Expo SDK 57). Everything below is the New Architecture.

### The four pillars

#### JSI — JavaScript Interface

The foundation. A thin C++ layer that lets JavaScript hold **direct references to
native objects** and call their methods synchronously.

The old architecture serialized every JS↔native call to JSON and passed it over an
asynchronous queue (the "bridge"). Every call had serialization cost, and nothing was
synchronous. JSI removes both problems.

```
Old:  JS → JSON.stringify → [async queue] → parse → Native   ❌ slow, async-only
New:  JS → direct C++ function call → Native                 ✅ fast, can be sync
```

Practical consequences you'll actually feel:
- Libraries like **MMKV** can read a value synchronously — `storage.getString('key')`
  returns immediately, no promise. Great for reading auth state at startup.
- **Reanimated** can run your animation worklets on the UI thread.
- Large data transfers no longer serialize through JSON.

#### Fabric — the new renderer

Fabric is the rendering system. What matters to you:

- **Concurrent React works.** Suspense, transitions, and `useDeferredValue` behave as
  they do on the web, because Fabric supports interruptible rendering.
- **Layout is more synchronous**, which removes an entire class of flicker bugs where
  a view would render at the wrong position for one frame.
- The **shadow tree** (a C++ mirror of your component tree) is where layout is
  computed, off the main thread.

#### TurboModules — lazy native modules

Native modules are now loaded **on demand** rather than all at startup.

Under the old system, every native module in your app initialized during launch, even
if the user never used it. If you had 40 libraries, you paid for 40 at startup.
TurboModules load when first accessed. Direct impact on cold-start time.

#### Codegen — type-safe bindings

You declare a native module's interface in TypeScript, and Codegen generates the C++,
Objective-C, and Java glue at build time. Type mismatches become build errors instead
of runtime crashes. Relevant when you write your own native module —
see [native modules](../02-curriculum/10-native-modules-and-config-plugins.md).

### What it buys you

Reported figures from production migrations: ~40% faster cold start, ~40% faster
rendering, ~25% lower memory. Treat exact numbers with skepticism — they're workload
dependent — but the direction is real and consistent.

The practical upshot for you: **you're starting fresh in 2026, so you get all of this
for free and never have to migrate.** Just don't copy patterns from old blog posts.

---

## 4. Hermes: the JS engine

React Native runs your JS in **Hermes**, an engine Meta built specifically for mobile.
As of RN 0.84, **Hermes V1** is the default.

Hermes optimizes for things mobile cares about that V8 doesn't prioritize:

- **Bytecode is precompiled at build time.** Your JS is compiled to Hermes bytecode
  during the build, not parsed on the user's phone at launch. Big startup win.
- **Low memory footprint**, which matters on cheap Android devices.
- **Small binary size.**

Things to know:
- Debugging uses **React Native DevTools** (Chrome DevTools protocol) — breakpoints,
  profiler, network inspector. Press `j` in the Metro terminal.
- Hermes supports modern JS. Some very new proposals may lag slightly.
- Source maps matter — without them, production stack traces are bytecode offsets.
  Uploading source maps to Sentry is covered in
  [observability](../03-production/05-observability.md).

---

## 5. What happens when you run your app

Walking the full path, cold start to pixels:

```
1.  User taps the icon
2.  OS launches the native app process (AppDelegate.swift / MainActivity.kt)
3.  React Native runtime initializes; Hermes VM starts
4.  Your JS bundle loads
      • DEV: fetched from the Metro dev server over the network
      • PROD: read from disk, already compiled to Hermes bytecode
5.  index.js runs → registers your root component
6.  React renders your tree → produces a React element tree
7.  Fabric builds the shadow tree (C++)
8.  Yoga computes layout (flexbox) on the shadow tree
9.  Fabric creates/updates real native views (UIView / android.view.View)
10. The platform draws them
11. Touches arrive on the native thread → routed to JS handlers
```

Steps 6–10 repeat on every state change, but React + Fabric diff so only what changed
is touched — same reconciliation model you know from the web.

**Where startup time goes**, roughly, and what you can do:

| Phase | Typical cost | Your lever |
|---|---|---|
| Native init | 100–300ms | Fewer native modules; TurboModules help automatically |
| Bundle load | 50–200ms | Smaller bundle, lazy-load routes |
| First render | 50–500ms | Don't do heavy work in the root component |
| Data fetch | varies | Show skeletons; cache; don't block first paint on network |

Covered in depth in the [performance playbook](../03-production/07-performance-playbook.md).

---

## 6. Metro: the bundler

Metro is React Native's bundler — the Vite/webpack of this world.

What's different from web bundlers:

- **Platform-specific resolution.** `Button.ios.tsx` and `Button.android.tsx` are
  resolved automatically based on target platform. Very useful; use it sparingly.
- **No tree-shaking by default** in the way you're used to. Import discipline matters
  more — `import { thing } from 'lib'` can still pull in the whole library.
- **Fast Refresh** is the hot-reload equivalent, and it preserves component state.
- Assets (images, fonts) are handled by Metro and bundled or served.

You'll edit `metro.config.js` mainly to add NativeWind, SVG transformers, or monorepo
paths.

---

## 7. The mental model to keep

When something is slow or weird, ask in this order:

1. **Which thread is blocked?** JS thread (app unresponsive but scrolls) or UI thread
   (everything frozen)?
2. **How many times am I crossing the JS↔native boundary?** A per-frame or
   per-list-item crossing is a smell.
3. **Is this running on every render?** Same React rules you already know.
4. **Is this a native problem or a JS problem?** If the stack trace has Objective-C or
   Java in it, you're in a different debugging world — see
   [environment setup](./03-environment-setup.md) for how to read native logs.

---

## Check yourself

You've absorbed this if you can answer:

1. Why does an animation stutter when a network response arrives, and what fixes it?
2. Why is `expo-image` faster than a naive `<Image>` implementation? *(Hint: which
   thread decodes the image?)*
3. What does the app do differently in dev vs production when loading the JS bundle?
4. Why does adding 20 native libraries hurt startup less on the New Architecture than
   it used to?
5. If you `JSON.parse` a 10MB payload in a `useEffect`, what will the user experience
   look like — frozen, or scrollable-but-unresponsive?

<details>
<summary>Answers</summary>

1. The animation is driven by JS state, so each frame needs the JS thread, which is
   now busy parsing/handling the response. Fix: run the animation on the UI thread
   with Reanimated worklets, or use `useNativeDriver` for the legacy Animated API.
2. `expo-image` decodes and caches images off the JS and UI threads, and reuses
   native image loading libraries (SDWebImage / Glide) that handle downsampling.
3. Dev fetches the bundle over HTTP from Metro (so it can hot reload). Production
   reads precompiled Hermes bytecode from disk.
4. TurboModules load lazily on first access, so unused modules cost nothing at start.
5. Scrollable but unresponsive — scrolling is handled natively, but any JS handler
   (taps, state updates) will queue until the parse finishes.

</details>

---

## Sources

- [React Native — Architecture overview](https://reactnative.dev/architecture/overview)
- [React Native — New Architecture](https://reactnative.dev/architecture/landing-page)
- [Hermes](https://hermesengine.dev/)
- [Expo SDK 57 changelog](https://expo.dev/changelog/sdk-57)

**Next:** [From web to native →](./02-from-web-to-native.md)
