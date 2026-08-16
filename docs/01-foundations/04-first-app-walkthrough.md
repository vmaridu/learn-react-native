# Your First App, Walked Through

Rather than "follow along and type this," this doc creates a real project and then
**explains every file** — so you understand the scaffolding instead of treating it as
magic.

By the end you'll have the actual `apps/trailhead` project skeleton you'll build on
for the rest of the curriculum.

---

## 1. Create the project

From the repo root:

```bash
mkdir -p apps
cd apps
npx create-expo-app@latest trailhead --template default
cd trailhead
```

The `default` template gives you TypeScript + Expo Router + a tab layout. That's the
right starting point.

Run it:

```bash
npx expo start
```

Press `i` for iOS, `a` for Android. You should see a starter screen with two tabs.

---

## 2. The file tree, explained

```
trailhead/
├── app/                    ← ROUTES. File-based routing, like Next.js App Router.
│   ├── _layout.tsx         ← Root layout. Wraps every screen.
│   ├── (tabs)/             ← Route group. Parens = not part of the URL.
│   │   ├── _layout.tsx     ← Tab bar config
│   │   ├── index.tsx       ← "/" route
│   │   └── explore.tsx     ← "/explore" route
│   └── +not-found.tsx      ← 404 screen
├── assets/                 ← Images, fonts. Bundled into the binary.
├── components/             ← Your reusable components
├── constants/              ← Theme values, colors
├── hooks/                  ← Custom hooks
├── app.json                ← App config: name, icon, permissions, plugins
├── package.json
├── tsconfig.json
└── expo-env.d.ts           ← Generated types. Don't edit.
```

### The mapping to what you know

| Expo Router | Next.js App Router |
|---|---|
| `app/` | `app/` |
| `_layout.tsx` | `layout.tsx` |
| `index.tsx` | `page.tsx` |
| `(tabs)/` | `(group)/` |
| `[id].tsx` | `[id]/page.tsx` |
| `+not-found.tsx` | `not-found.tsx` |
| `router.push('/x')` | `router.push('/x')` |

If you know the Next.js App Router, you already know Expo Router's routing model. The
main differences are that layouts here describe **navigators** (stack, tabs, drawer)
rather than DOM wrappers, and there's no server component story — everything is client.

---

## 3. `app/_layout.tsx` — the root layout

This runs before any screen. It's where global providers go.

```tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
```

**What's happening:**

- `<Stack>` declares a **stack navigator** — screens push on top of each other with a
  back gesture, the standard mobile pattern.
- `<Stack.Screen name="(tabs)">` says: the `(tabs)` group is a screen in this stack.
  `headerShown: false` hides the stack header, because the tab layout provides its own.
- Order matters for the initial route.

**This is where you'll add providers** as the app grows. By the end of the practice
app it'll look more like:

```tsx
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AuthProvider>
              <Stack>{/* ... */}</Stack>
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

Same provider-nesting pattern you use on the web. Note `GestureHandlerRootView` must
be the outermost wrapper with `flex: 1` — a very common source of "my gestures don't
work" bugs.

---

## 4. `app/(tabs)/_layout.tsx` — the tab bar

```tsx
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#0f172a' }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Icon name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <Icon name="paperplane.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
```

The `(tabs)` folder name is in parentheses, which makes it a **route group** — it
organizes files without appearing in the URL. So `app/(tabs)/index.tsx` is the route
`/`, not `/tabs`.

You'll use route groups constantly for auth:

```
app/
├── (auth)/          ← unauthenticated screens
│   ├── sign-in.tsx
│   └── sign-up.tsx
└── (app)/           ← authenticated screens
    └── (tabs)/
```

---

## 5. A screen

```tsx
import { View, Text } from 'react-native';

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-2xl font-bold text-slate-900">Trailhead</Text>
    </View>
  );
}
```

Notes:
- Default export is required — Expo Router uses it as the screen component.
- `flex-1` makes the view fill the screen. Without it, it shrinks to content.
- Everything else is React you already know.

---

## 6. `app.json` — the app config

The most important config file in the project. It controls the native build.

```json
{
  "expo": {
    "name": "Trailhead",
    "slug": "trailhead",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "trailhead",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourname.trailhead"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.yourname.trailhead",
      "edgeToEdgeEnabled": true
    },
    "plugins": ["expo-router", "expo-splash-screen"],
    "experiments": { "typedRoutes": true }
  }
}
```

**Fields that matter:**

| Field | Why it matters |
|---|---|
| `name` | Shown under the app icon on the home screen |
| `slug` | Expo project identifier |
| `version` | User-visible version (e.g. "1.2.0") |
| `scheme` | Deep link scheme — `trailhead://` |
| `bundleIdentifier` / `package` | **Permanent app identity.** Cannot be changed after store submission. Choose carefully: reverse-DNS, e.g. `com.hamlethq.app`. |
| `plugins` | Config plugins that modify the native project at build time |
| `newArchEnabled` | New Architecture — should be `true` |
| `typedRoutes` | Generates TypeScript types for your routes. **Turn this on.** |

> ⚠️ **`bundleIdentifier` and `package` are forever.** Once you ship to the App Store
> or Play Store with an ID, it's permanently bound to that listing. Pick the real one
> now, even for the practice app.

### Prefer `app.config.ts` over `app.json`

As soon as you need environment-dependent config (different API URLs per environment,
secrets from EAS), switch to a TypeScript config:

```ts
// app.config.ts
import type { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: process.env.APP_VARIANT === 'development' ? 'Trailhead (Dev)' : 'Trailhead',
  slug: 'trailhead',
  ios: {
    ...config.ios,
    bundleIdentifier:
      process.env.APP_VARIANT === 'development'
        ? 'com.yourname.trailhead.dev'
        : 'com.yourname.trailhead',
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
    eas: { projectId: 'your-project-id' },
  },
});
```

This lets you install dev and production builds **side by side** on the same device —
which you absolutely want. Covered in [CI/CD](../03-production/03-ci-cd-with-eas.md).

---

## 7. Set up the real stack

The default template is bare. Let's add what the curriculum actually uses.

### TypeScript strict mode

Edit `tsconfig.json`:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "paths": { "@/*": ["./*"] }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

`noUncheckedIndexedAccess` is the one people skip. Turn it on now — it catches a whole
class of `array[0]` bugs, and retrofitting it later is painful.

### NativeWind (Tailwind)

```bash
npx expo install nativewind react-native-reanimated react-native-safe-area-context
pnpm add -D tailwindcss@^3
npx tailwindcss init
```

> **Version note:** NativeWind's stable line is **v4.2.x**, which targets **Tailwind
> v3**. NativeWind v5 (targeting Tailwind v4) is still in preview as of August 2026 —
> don't use it for production yet. Pin `tailwindcss@^3`.

`tailwind.config.js`:
```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: { extend: {} },
  plugins: [],
};
```

`global.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`babel.config.js`:
```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  };
};
```

`metro.config.js`:
```js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);
module.exports = withNativeWind(config, { input: './global.css' });
```

Then import the CSS once in `app/_layout.tsx`:
```tsx
import '../global.css';
```

Restart with `npx expo start --clear`. Now `className` works.

### The rest of the stack

```bash
# Data & state
npx expo install @tanstack/react-query zustand

# Forms
pnpm add react-hook-form zod @hookform/resolvers

# Lists
npx expo install @shopify/flash-list

# Gestures & animation
npx expo install react-native-gesture-handler react-native-reanimated

# Storage
npx expo install expo-secure-store react-native-mmkv

# Images
npx expo install expo-image
```

### React Native Reusables (your shadcn)

```bash
npx @react-native-reusables/cli@latest init
npx @react-native-reusables/cli@latest add button card input text
```

This drops components into `components/ui/` that **you own** — same as shadcn. Open
`components/ui/button.tsx` and read it. It'll look very familiar: `cva` variants,
a `cn()` helper, forwarded props.

---

## 8. Recommended project structure

The default template's flat structure won't scale. Restructure now:

```
trailhead/
├── app/                      ← routes ONLY. Thin screens.
│   ├── _layout.tsx
│   ├── (auth)/
│   └── (app)/
│       ├── _layout.tsx
│       ├── (tabs)/
│       └── site/[id].tsx
├── src/
│   ├── components/
│   │   └── ui/               ← Reusables components (yours to edit)
│   ├── features/             ← feature slices
│   │   ├── bookings/
│   │   │   ├── api.ts
│   │   │   ├── hooks.ts
│   │   │   ├── components/
│   │   │   └── types.ts
│   │   └── announcements/
│   ├── lib/                  ← supabase client, utils, cn()
│   ├── hooks/
│   └── theme/
├── assets/
└── ...config files
```

**The key rule:** files in `app/` are thin. A screen wires together components and
hooks; it doesn't contain business logic. This keeps routes readable and makes the
real logic testable without a navigation context.

Full rationale in [project architecture](../03-production/01-project-architecture.md).

---

## 9. Add quality gates now

Do this before writing features, not after. These gates are also what make AI-assisted
development safe — they're the machine-checkable contract.

```bash
pnpm add -D eslint eslint-config-expo prettier prettier-plugin-tailwindcss \
  typescript @types/react
```

`package.json` scripts:
```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "lint": "eslint . --max-warnings 0",
    "format": "prettier --write .",
    "typecheck": "tsc --noEmit",
    "test": "jest",
    "verify": "pnpm typecheck && pnpm lint && pnpm test"
  }
}
```

`pnpm verify` is the command you (and your AI agents) run before every commit.

---

## 10. First real exercise

Build this screen from scratch, by hand, **without AI**. It's small, and it forces
every core concept:

**A campsite list screen.**

Requirements:
- Header with a title and a filter button
- Scrollable list of 10 hardcoded campsites
- Each row: image (left), name + location + price (middle), availability badge (right)
- Tapping a row navigates to `/site/[id]`
- The detail screen shows the site name from the route param
- Works on iOS and Android, respects safe areas
- Dark mode support via NativeWind's `dark:`

What this forces you to learn: `View`/`Text`/`Image`/`Pressable`, flexbox layout,
NativeWind classes, `FlashList`, Expo Router navigation and params, safe areas,
platform testing.

**Do it by hand.** Look things up. Get frustrated. This is the single highest-value
two hours in the entire curriculum, because everything after this you'll be able to
review critically — including AI output.

<details>
<summary>Hints if you're stuck</summary>

- Dynamic route: create `app/(app)/site/[id].tsx`
- Read the param: `const { id } = useLocalSearchParams<{ id: string }>()`
- Navigate: `router.push(`/site/${site.id}`)` or `<Link href={...} asChild><Pressable>`
- `FlashList` needs `estimatedItemSize`
- Safe area: `useSafeAreaInsets()` from `react-native-safe-area-context`
- Dark mode: `className="bg-white dark:bg-slate-900"`

</details>

---

## Check yourself

1. What's the difference between `app/(tabs)/index.tsx` and `app/tabs/index.tsx`?
2. Why must `GestureHandlerRootView` be the outermost provider?
3. You want dev and prod builds installed side by side. What changes?
4. Where does business logic live, and why not in `app/`?
5. Why `npx expo install` instead of `pnpm add` for Expo packages?

<details>
<summary>Answers</summary>

1. Parentheses make it a route group — it organizes files without adding a URL
   segment. `(tabs)/index.tsx` → `/`. `tabs/index.tsx` → `/tabs`.
2. Gesture Handler needs a native root view to intercept touches before they reach
   React's touch system. If it isn't at the root (with `flex: 1`), gestures inside it
   silently don't fire.
3. Different `bundleIdentifier`/`package` per variant, driven by an env var in
   `app.config.ts`. Different IDs = the OS treats them as different apps.
4. In `src/features/*`. Screens in `app/` are route entry points; keeping them thin
   means logic is testable without mounting a navigator, and routes stay readable.
5. `expo install` resolves the version compatible with your SDK. `pnpm add` grabs
   `latest`, which is a leading cause of mysterious runtime breakage.

</details>

---

## Sources

- [Expo Router — Introduction](https://docs.expo.dev/router/introduction/)
- [Expo — Config plugins](https://docs.expo.dev/config-plugins/introduction/)
- [NativeWind — Installation](https://www.nativewind.dev/getting-started/installation)

**Next:** [Core curriculum → Components and layout](../02-curriculum/01-components-and-layout.md)
