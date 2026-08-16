# Navigation

Expo Router — file-based routing that will feel immediately familiar if you know the
Next.js App Router.

---

## 1. The model

Expo Router sits on top of React Navigation and gives it file-based routing. You get
the URL-driven mental model of the web, with real native navigation underneath —
stack push animations, swipe-back gestures, native tab bars.

```
app/
├── _layout.tsx              → root layout (a navigator)
├── index.tsx                → /
├── (tabs)/
│   ├── _layout.tsx          → tab navigator
│   ├── index.tsx            → /
│   └── explore.tsx          → /explore
├── site/
│   ├── [id].tsx             → /site/:id
│   └── [id]/reviews.tsx     → /site/:id/reviews
├── (modals)/
│   └── filter.tsx           → /filter (presented as a modal)
└── +not-found.tsx           → 404
```

| File pattern | Meaning |
|---|---|
| `index.tsx` | The route for the containing folder |
| `[id].tsx` | Dynamic segment |
| `[...rest].tsx` | Catch-all |
| `(group)/` | Route group — organizes files, not in the URL |
| `_layout.tsx` | Declares a navigator for this level |
| `+not-found.tsx` | Fallback |
| `+html.tsx` | Web-only document shell |

---

## 2. Navigators

Layouts describe **navigators**, not DOM wrappers. This is the main conceptual
difference from Next.js.

### Stack

Screens push on top of each other. Back gesture/button pops. The default for most
flows.

```tsx
// app/_layout.tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Back',
        contentStyle: { backgroundColor: 'white' },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="site/[id]" options={{ title: 'Campsite' }} />
      <Stack.Screen
        name="(modals)/filter"
        options={{ presentation: 'modal', title: 'Filters' }}
      />
    </Stack>
  );
}
```

Useful `presentation` values:
| Value | Effect |
|---|---|
| `card` | Standard push (default) |
| `modal` | Slides up from the bottom |
| `formSheet` | iOS sheet with detents |
| `transparentModal` | Overlay preserving the screen behind |
| `fullScreenModal` | Covers everything |

### Tabs

```tsx
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Home, Calendar, Bell, User } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: 'hsl(158 64% 32%)',
        tabBarInactiveTintColor: 'hsl(215 16% 47%)',
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index"    options={{ title: 'Home',     tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }} />
      <Tabs.Screen name="bookings" options={{ title: 'Bookings', tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} /> }} />
      <Tabs.Screen name="alerts"   options={{ title: 'Alerts',   tabBarIcon: ({ color, size }) => <Bell color={color} size={size} />, tabBarBadge: unread || undefined }} />
      <Tabs.Screen name="profile"  options={{ title: 'Profile',  tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }} />
    </Tabs>
  );
}
```

> **Design rule:** 3–5 tabs. Fewer and a tab bar is overkill; more and the targets get
> too small and the labels truncate. If you need more top-level destinations, use a
> drawer or a "More" tab.

### Drawer

```bash
npx expo install expo-router react-native-gesture-handler react-native-reanimated @react-navigation/drawer
```

```tsx
// app/_layout.tsx
import { Drawer } from 'expo-router/drawer';

export default function Layout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer />
    </GestureHandlerRootView>
  );
}
```

Drawers are more of an Android pattern; iOS users expect tabs. For Hamlet HQ, tabs for
residents and a drawer (or a separate section) for board-member tools is a reasonable
split.

---

## 3. Navigating

### Declarative — `<Link>`

```tsx
import { Link } from 'expo-router';

<Link href="/site/123">
  <Text>View campsite</Text>
</Link>

// wrapping a custom component
<Link href={`/site/${site.id}`} asChild>
  <Pressable className="rounded-xl border p-4">
    <Text>{site.name}</Text>
  </Pressable>
</Link>

// replace instead of push
<Link href="/home" replace>
```

`asChild` is the same idea as Radix's `asChild` — it forwards props to the child
instead of rendering its own wrapper.

### Imperative — `router`

```tsx
import { router, useRouter } from 'expo-router';

router.push('/site/123');                     // add to the stack
router.replace('/home');                      // replace current
router.back();                                // pop
router.dismiss();                             // dismiss a modal
router.dismissAll();                          // dismiss all modals
router.canGoBack();                           // boolean

// with params
router.push({ pathname: '/site/[id]', params: { id: '123', from: 'search' } });
```

### Reading params

```tsx
import { useLocalSearchParams } from 'expo-router';

export default function SiteScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const { data } = useQuery({ queryKey: ['site', id], queryFn: () => api.sites.get(id) });
  // ...
}
```

`useLocalSearchParams` vs `useGlobalSearchParams`: local returns params for *this*
screen and doesn't re-render when other screens change. **Prefer local** — global
causes surprising re-renders across the stack.

### Typed routes

Turn this on. It makes route strings type-checked.

```json
// app.json
{ "expo": { "experiments": { "typedRoutes": true } } }
```

Now `router.push('/sight/123')` is a **compile error**. Given that AI agents will be
generating navigation code, this catches a whole class of hallucinated routes before
runtime.

---

## 4. Auth-gated navigation

The pattern you'll use in both Trailhead and Hamlet HQ.

```
app/
├── _layout.tsx           ← decides which group to show
├── (auth)/
│   ├── _layout.tsx
│   ├── sign-in.tsx
│   └── sign-up.tsx
└── (app)/
    ├── _layout.tsx       ← guards
    └── (tabs)/
```

**Root layout with a splash gate:**

```tsx
// app/_layout.tsx
import { Stack, SplashScreen } from 'expo-router';
import { useEffect } from 'react';
import { useAuth, AuthProvider } from '~/features/auth/context';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { session, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) SplashScreen.hideAsync();
  }, [isLoading]);

  if (isLoading) return null;   // splash stays up

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
```

`<Stack.Protected guard={...}>` is the modern declarative approach — when the guard is
false the screens inside are unmounted and the router redirects automatically.

**The older redirect pattern** (still common, and what you'll see in most tutorials):

```tsx
function RootNavigator() {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) router.replace('/sign-in');
    else if (session && inAuthGroup) router.replace('/');
  }, [session, segments, isLoading]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
```

Both work. `Stack.Protected` is cleaner and avoids a flash of the wrong screen.

⚠️ **Critical detail: don't hide the splash screen until auth state is resolved.**
Otherwise the user sees the sign-in screen flash before being dropped into the app.
Read the stored session synchronously (MMKV or SecureStore) to make this fast.

---

## 5. Deep links

Deep links are how a push notification opens the right screen, and how a shared link
works. Get this right early — retrofitting is painful.

**Configure the scheme:**
```json
// app.json
{ "expo": { "scheme": "hamlethq" } }
```

Now `hamlethq://site/123` opens that screen. Expo Router maps URLs to routes
automatically — no manual linking config needed. That's a major advantage over raw
React Navigation.

**Universal / App Links** (real `https://` URLs that open your app):

```json
{
  "expo": {
    "ios": {
      "associatedDomains": ["applinks:hamlethq.com"]
    },
    "android": {
      "intentFilters": [{
        "action": "VIEW",
        "autoVerify": true,
        "data": [{ "scheme": "https", "host": "hamlethq.com" }],
        "category": ["BROWSABLE", "DEFAULT"]
      }]
    }
  }
}
```

You also must host verification files on your domain:
- iOS: `https://hamlethq.com/.well-known/apple-app-site-association`
- Android: `https://hamlethq.com/.well-known/assetlinks.json`

**Testing:**
```bash
# iOS simulator
xcrun simctl openurl booted "hamlethq://site/123"

# Android
adb shell am start -W -a android.intent.action.VIEW -d "hamlethq://site/123"
```

**Handling a notification tap:**
```tsx
import * as Notifications from 'expo-notifications';

useEffect(() => {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const url = response.notification.request.content.data?.url;
    if (typeof url === 'string') router.push(url);
  });
  return () => sub.remove();
}, []);
```

Include a `url` field in every push payload you send. It costs nothing and makes every
notification actionable.

---

## 6. Headers

```tsx
// Static, from the layout
<Stack.Screen name="site/[id]" options={{ title: 'Campsite', headerLargeTitle: true }} />

// Dynamic, from the screen itself
export default function SiteScreen() {
  const { data } = useSite(id);
  return (
    <>
      <Stack.Screen options={{ title: data?.name ?? 'Loading…' }} />
      <View>...</View>
    </>
  );
}

// Custom right button
<Stack.Screen options={{
  headerRight: () => (
    <Pressable onPress={share} hitSlop={8}>
      <Share2 size={20} />
    </Pressable>
  ),
}} />
```

Hiding the header for a custom design:
```tsx
<Stack.Screen options={{ headerShown: false }} />
```
…but then **you** own the safe-area padding and the back affordance. Don't ship a
screen with no way back.

---

## 7. Modals

```tsx
// app/_layout.tsx
<Stack.Screen name="(modals)/filter" options={{ presentation: 'modal' }} />
```

```tsx
// app/(modals)/filter.tsx
export default function FilterModal() {
  return (
    <View className="flex-1 p-4">
      <Text className="text-lg font-semibold">Filters</Text>
      <Button onPress={() => router.back()}>
        <Text>Apply</Text>
      </Button>
    </View>
  );
}
```

**Modal vs bottom sheet — how to choose:**

| Use a modal screen when | Use a bottom sheet when |
|---|---|
| It's a full task (create, edit) | It's a quick choice or filter |
| It should be deep-linkable | It's ephemeral |
| It has its own navigation stack | It's a single view |
| It needs a full keyboard flow | It's mostly taps |

Modals are routes, so they're deep-linkable and appear in navigation state. Sheets are
component state. That distinction usually decides it.

---

## 8. Navigation lifecycle

Screens stay mounted when you navigate away. This surprises web developers.

```tsx
import { useFocusEffect } from 'expo-router';

// runs every time the screen comes into focus
useFocusEffect(
  useCallback(() => {
    analytics.screen('SiteDetail');
    return () => stopVideoPlayback();   // cleanup on blur
  }, [])
);

// just need the boolean?
const isFocused = useIsFocused();
```

**Why this matters:** a `useEffect` with `[]` runs once when the screen first mounts,
*not* every time the user returns to it. If you need to refresh data on return, use
`useFocusEffect` — or better, let TanStack Query's `refetchOnMount`/staleness handle
it. See [state and data](./07-state-and-data.md).

Also: video, timers, and location subscriptions keep running on unfocused screens
unless you stop them. That's a real battery-drain bug.

---

## 9. Common mistakes

| Mistake | Consequence | Fix |
|---|---|---|
| `router.push` in a loop / on every render | Stack fills with duplicates | Guard it; use `replace` where appropriate |
| Not handling Android back | User exits the app mid-form | `BackHandler` intercept |
| Splash hidden before auth resolves | Flash of the sign-in screen | Gate `hideAsync()` on auth loading |
| Business logic in `app/` files | Untestable, unreusable | Keep screens thin |
| `useGlobalSearchParams` everywhere | Re-renders across the stack | Use `useLocalSearchParams` |
| Deep links added late | Push notifications can't route | Design routes for linkability up front |
| Header hidden without a back button | User is trapped | Always provide a way back |
| Assuming `useEffect([])` reruns on return | Stale data | `useFocusEffect` or query staleness |

---

## 10. Exercise

Build Trailhead's full navigation shell:

```
app/
├── _layout.tsx                    Root: providers + auth gate + splash
├── (auth)/
│   ├── sign-in.tsx
│   └── sign-up.tsx
└── (app)/
    ├── _layout.tsx
    ├── (tabs)/
    │   ├── _layout.tsx            4 tabs, badge on alerts
    │   ├── index.tsx              Discover
    │   ├── bookings.tsx
    │   ├── alerts.tsx
    │   └── profile.tsx
    ├── site/
    │   ├── [id].tsx               Detail, dynamic title
    │   └── [id]/book.tsx          Booking flow
    └── (modals)/
        └── filters.tsx            Modal presentation
```

Requirements:
- Typed routes enabled; a wrong path is a compile error
- Auth gate with no flash of the wrong screen
- `hamlethq://site/123` deep-links correctly (test on both platforms)
- Alerts tab shows an unread badge
- Booking screen intercepts Android back with an "abandon booking?" confirm
- Detail screen title comes from loaded data, with a loading placeholder

---

## Check yourself

1. Difference between `(tabs)` and `tabs` as a folder name?
2. `push` vs `replace` — when does the difference matter for the user?
3. Why doesn't `useEffect(() => {...}, [])` refetch when returning to a screen?
4. How does a push notification open a specific screen?
5. Modal route vs bottom sheet — how do you decide?

<details>
<summary>Answers</summary>

1. Parentheses make it a route group: it organizes files without adding a URL segment.
   `(tabs)/index.tsx` → `/`; `tabs/index.tsx` → `/tabs`.
2. `push` adds to the stack so back returns to the previous screen. `replace` swaps it
   so back skips it. Use `replace` after sign-in (you don't want back returning to the
   login form) and for redirects.
3. The screen stays mounted when you navigate away, so it never remounts. Use
   `useFocusEffect`, or rely on TanStack Query staleness/refetch.
4. The push payload carries a `url`/deep-link. A
   `addNotificationResponseReceivedListener` reads it on tap and calls `router.push`.
   The app's `scheme` and route structure make the URL resolvable.
5. Modal if it's a full task, needs to be deep-linkable, or has its own stack. Sheet
   if it's a quick, ephemeral choice like filters or an action list.

</details>

---

## Sources

- [Expo Router docs](https://docs.expo.dev/router/introduction/)
- [Expo Router — Authentication](https://docs.expo.dev/router/advanced/authentication/)
- [Expo — Linking](https://docs.expo.dev/linking/into-your-app/)
- [React Navigation](https://reactnavigation.org/)

**Next:** [Lists and performance →](./05-lists-and-performance.md)
