# Over-the-air updates

[CI/CD with EAS](./03-ci-cd-with-eas.md#6-eas-update--ota) covers the *pipeline* side of
EAS Update — what you can ship, runtime versions, `eas update`, rollback. This doc covers
the *runtime* side: what actually happens on a user's phone, how to make updates land
automatically, and how to force one when you have to.

Two questions drive everything here:

1. **When does a downloaded update actually apply?** (Almost never when you assume.)
2. **What do you do when the fix is *not* shippable over the air?**

Versions pinned to Expo SDK 57: `expo-updates@~57.0.14`, `expo-application@~57.0.2`.

---

## 1. The mental model

Three moving parts, and confusing them is the source of every OTA bug:

| Part | What it is | Changes when |
|---|---|---|
| **Binary** | The installed `.apk` / `.ipa` — native code, permissions, entitlements | You run `eas build` and the user installs it |
| **Runtime version** | A compatibility string baked into the binary | You bump it (or bump `expo.version` under the `appVersion` policy) |
| **Update** | A JS bundle + assets, downloaded at runtime | You run `eas update` |

An update reaches a binary **only if their runtime versions match exactly**. That's the
whole safety mechanism: it stops you shipping JS that calls a native module the installed
binary doesn't contain.

**Web equivalent:** an update is a new JS chunk; the runtime version is the API contract
between that chunk and the server that serves it. Except on mobile the "server" is the
native binary, and you cannot redeploy it in thirty seconds.

```
┌─ Binary v1.2.0 (runtimeVersion "1.2.0") ─────────────┐
│  native code · permissions · plugins                 │
│  ┌─ JS bundle ────────────────────────────────────┐  │
│  │  swapped by EAS Update, if runtimeVersion "1.2.0" │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

---

## 2. What happens with zero code

This is the part everyone gets wrong. With the default config:

```json
// app.json
{
  "expo": {
    "runtimeVersion": { "policy": "appVersion" },
    "updates": {
      "url": "https://u.expo.dev/<your-project-id>",
      "enabled": true,
      "checkAutomatically": "ON_LOAD",
      "fallbackToCacheTimeout": 0
    }
  }
}
```

Here is the actual sequence when a user opens the app:

1. App launches **immediately** with the bundle it already has. (`fallbackToCacheTimeout: 0`)
2. In the background, it asks the update server whether a newer update exists.
3. If one does, it downloads it — still in the background, user none the wiser.
4. The downloaded update sits on disk, **unapplied**.
5. **The next time the app cold-starts**, it launches with the new bundle.

> ⚠️ **Users are always one launch behind.** "Automatic" means automatically *downloaded*,
> not automatically *applied*. A user who never fully closes the app can run stale code
> for weeks — and on Android, backgrounding is not closing.

That default is the right trade-off for most changes: no startup delay, no interruption.
But if you shipped a fix at 11pm expecting everyone to have it by morning, they don't.

### Config reference

| Key | Values | Effect |
|---|---|---|
| `checkAutomatically` | `ON_LOAD` | Check on every cold start (default) |
| | `WIFI_ONLY` | Only check on Wi-Fi — kinder to data plans |
| | `ON_ERROR_RECOVERY` | Only check after the previous launch crashed |
| | `NEVER` | You call `checkForUpdateAsync()` yourself |
| `fallbackToCacheTimeout` | `0` | Launch instantly with the cached bundle *(use this)* |
| | `5000` | Block startup up to 5s waiting for a new bundle |
| `useEmbeddedUpdate` | `false` | Skip the bundle compiled into the binary; forces a download on first launch |

**Do not** set `fallbackToCacheTimeout` high to "make updates apply faster." You are
trading a guaranteed slow launch for every user against a marginal freshness gain. Use
the patterns below instead.

---

## 3. Pattern A — silent, next launch (the default)

Zero code. Ship the update, users get it on their next cold start.

```bash
eas update --branch production --message "Fix booking timezone display"
```

**Use for:** copy tweaks, styling, non-urgent bug fixes, new content. Anything where
"most users within a day or two" is fine.

---

## 4. Pattern B — check when the app comes back to the foreground

Fixes the "user never closes the app" hole. Still silent, still applies on next launch —
but now backgrounding and returning counts as a check.

```ts
// src/features/updates/hooks.ts
import * as Updates from 'expo-updates';
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

/**
 * Checks for a new update whenever the app returns from the background.
 * Downloads it silently; it applies on the next cold start.
 */
export function useBackgroundUpdateCheck() {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    // Updates are disabled in dev — bail rather than logging errors every resume.
    if (!Updates.isEnabled) return;

    const subscription = AppState.addEventListener('change', (next: AppStateStatus) => {
      const cameToForeground =
        appState.current.match(/inactive|background/) && next === 'active';
      appState.current = next;
      if (!cameToForeground) return;

      void (async () => {
        try {
          const result = await Updates.checkForUpdateAsync();
          if (result.isAvailable) await Updates.fetchUpdateAsync();
        } catch {
          // Offline, or the update server is unreachable. Not worth surfacing —
          // the app is working fine on the bundle it already has.
        }
      })();
    });

    return () => subscription.remove();
  }, []);
}
```

Mount it once, at the root:

```tsx
// app/_layout.tsx
export default function RootLayout() {
  useBackgroundUpdateCheck();
  return <Stack />;
}
```

---

## 5. Pattern C — tell the user, let them apply it now

The polite version of urgent. An update is downloaded and ready; you offer a restart
instead of waiting for a cold start.

`Updates.useUpdates()` gives you the state without any polling of your own:

```tsx
// src/features/updates/components/update-banner.tsx
import * as Updates from 'expo-updates';
import { View } from 'react-native';

import { Button } from '~/components/ui/button';
import { Text } from '~/components/ui/text';

export function UpdateBanner() {
  const { isUpdatePending, isDownloading } = Updates.useUpdates();

  // isUpdatePending flips true once a bundle is downloaded and staged.
  if (!isUpdatePending) return null;

  return (
    <View
      accessibilityRole="alert"
      className="m-4 flex-row items-center gap-3 rounded-3xl border border-border bg-primary-soft p-4">
      <View className="flex-1">
        <Text variant="subheading">Update ready</Text>
        <Text variant="caption" tone="muted" className="mt-0.5">
          Restart to pick up the latest fixes.
        </Text>
      </View>
      <Button
        label="Restart"
        size="sm"
        loading={isDownloading}
        onPress={() => Updates.reloadAsync()}
      />
    </View>
  );
}
```

`reloadAsync()` restarts the JS runtime with the new bundle. It is **not** a native
relaunch — it is fast, roughly a refresh.

**What `useUpdates()` gives you:**

| Field | Use |
|---|---|
| `isUpdateAvailable` | The server has something newer than what you're running |
| `isUpdatePending` | A new bundle is downloaded and staged for next launch |
| `isChecking` / `isDownloading` | Show a spinner |
| `currentlyRunning` | `updateId`, `createdAt`, `isEmbeddedLaunch` — what you're on right now |
| `availableUpdate` | Manifest of the pending one |
| `checkError` / `downloadError` | Diagnose silently, don't show users |

---

## 6. Pattern D — force it 🔴

"Force update" means two completely different things, and picking the wrong one wastes a
day.

| Situation | Can OTA fix it? | Mechanism |
|---|---|---|
| Bad JS shipped — crash, wrong price, broken flow | ✅ Yes | **D1** — force the update to apply now |
| Old *binary* must die — native bug, dropped API, breaking backend change | ❌ No | **D2** — gate the app, send them to the store |

### D1 — force the OTA to apply immediately

Blocking gate at startup. The user cannot proceed on the old bundle.

```tsx
// src/features/updates/components/update-gate.tsx
import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Text } from '~/components/ui/text';

/**
 * 🔴 Blocks the app until a mandatory update is applied.
 *
 * Reserve this for updates that fix something actively harmful — a crash loop, a
 * wrong money figure, a broken auth flow. Every use costs every user a cold start,
 * and a gate that hangs on a flaky network is worse than the bug you're fixing.
 */
export function UpdateGate({ children }: { children: React.ReactNode }) {
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!Updates.isEnabled) return;

    void (async () => {
      try {
        const check = await Updates.checkForUpdateAsync();
        if (!check.isAvailable) return;

        setApplying(true);
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync(); // never returns — the runtime restarts
      } catch {
        // Offline or the server is down. Let them in on the old bundle rather
        // than trapping them behind a spinner they cannot dismiss.
        setApplying(false);
      }
    })();
  }, []);

  if (!applying) return <>{children}</>;

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-background px-8">
      <ActivityIndicator size="large" />
      <Text variant="heading">Updating</Text>
      <Text variant="body" tone="muted" className="text-center">
        This takes a few seconds. The app will restart on its own.
      </Text>
    </View>
  );
}
```

**The timeout you must add.** The version above waits indefinitely on a slow connection.
Race it:

```ts
const withTimeout = <T,>(promise: Promise<T>, ms: number) =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);

// then
await withTimeout(Updates.fetchUpdateAsync(), 10_000);
```

Ten seconds, then let them in on the old bundle. A user stuck on a spinner uninstalls;
a user on a slightly stale bundle does not.

### D2 — force a *native* upgrade

When the fix needs a new binary, no amount of `expo-updates` will help. You need a
**minimum supported version**, served from your backend, checked at startup.

```ts
// src/features/updates/api.ts
import * as Application from 'expo-application';

export interface VersionGate {
  minimumVersion: string; // e.g. "1.4.0"
  message: string;
}

export async function fetchVersionGate(): Promise<VersionGate> {
  const response = await fetch('https://api.example.com/mobile/version-gate');
  if (!response.ok) throw new Error('Version gate unavailable');
  return response.json();
}

/** Semver-ish compare. Returns true when `current` is behind `minimum`. */
export function isBelowMinimum(current: string, minimum: string): boolean {
  const a = current.split('.').map(Number);
  const b = minimum.split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const left = a[i] ?? 0;
    const right = b[i] ?? 0;
    if (left !== right) return left < right;
  }
  return false;
}

export function currentNativeVersion(): string {
  return Application.nativeApplicationVersion ?? '0.0.0';
}
```

And the screen it drives:

```tsx
// src/features/updates/components/store-update-required.tsx
import { Linking, Platform, View } from 'react-native';

import { Button } from '~/components/ui/button';
import { Text } from '~/components/ui/text';

const STORE_URL = Platform.select({
  android: 'market://details?id=app.hamlethq.mobile',
  ios: 'itms-apps://apps.apple.com/app/id0000000000',
  default: 'https://hamlethq.app/download',
})!;

/** 🔴 Terminal state — deliberately offers no way past it. */
export function StoreUpdateRequired({ message }: { message: string }) {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-background px-8">
      <Text variant="title" className="text-center">
        Time to update
      </Text>
      <Text variant="body" tone="muted" className="text-center">
        {message}
      </Text>
      <Button
        label="Open the store"
        size="lg"
        onPress={() => void Linking.openURL(STORE_URL)}
      />
    </View>
  );
}
```

**Rules for D2, learned the expensive way:**

- **Keep `minimumVersion` server-side.** Hardcoding it in the app means shipping a build
  to change it — which is exactly the situation you're trying to escape.
- **Fail open.** If the version-gate request fails, let the user in. A backend blip must
  not brick every install.
- **Give warning first.** Ship a dismissible "update available" nudge for a week or two
  before the hard gate. A blocking wall with no notice reads as the app breaking.
- **Never gate on `runtimeVersion`.** It is an internal compatibility string, not a
  product version. Use `Application.nativeApplicationVersion`.

---

## 7. Never reload mid-flight 🔴

`reloadAsync()` throws away all in-memory state. Every unsaved form, every half-finished
flow, gone. Do it while someone is paying and you get a support ticket you cannot answer,
because you have no idea whether the charge went through.

Gate reloads on the app being idle:

```ts
// src/features/updates/store.ts
import { create } from 'zustand';

interface CriticalFlowState {
  /** Number of in-flight flows that must not be interrupted. */
  active: number;
  begin: () => void;
  end: () => void;
}

export const useCriticalFlow = create<CriticalFlowState>((set) => ({
  active: 0,
  begin: () => set((s) => ({ active: s.active + 1 })),
  end: () => set((s) => ({ active: Math.max(0, s.active - 1) })),
}));

export const isSafeToReload = () => useCriticalFlow.getState().active === 0;
```

```tsx
// in the checkout screen
useEffect(() => {
  const { begin, end } = useCriticalFlow.getState();
  begin();
  return end;
}, []);
```

Then every reload path checks it:

```ts
if (isSafeToReload()) await Updates.reloadAsync();
```

**Flows that must be protected:** payment, booking confirmation, ballot submission, any
multi-step form with unsaved input, any upload in progress.

---

## 8. Testing it before you trust it

`expo-updates` is **disabled in development**. `Updates.isEnabled` is `false`, every API
is a no-op, and none of the above runs. That means the update code you never tested is
the code that runs for every user.

The only honest test loop:

```bash
# 1. Build and install a release build on a real device
eas build --platform android --profile preview
# install the APK

# 2. Change something visible — a screen title will do
# 3. Publish to the channel that build listens on
eas update --branch preview --message "Test: title change"

# 4. Cold-start the app twice.
#    First launch: downloads in the background, still shows the old title.
#    Second launch: new title.
```

That two-launch behaviour is the single most confusing thing about EAS Update. Watch it
happen once and it stops being confusing.

**Check what a device is actually running:**

```ts
import * as Updates from 'expo-updates';

console.warn({
  channel: Updates.channel,               // 'preview' | 'production'
  runtimeVersion: Updates.runtimeVersion, // must match the update's
  updateId: Updates.updateId,             // null on an embedded launch
  isEmbedded: Updates.isEmbeddedLaunch,   // true = still the bundle from the binary
  createdAt: Updates.createdAt,
});
```

Surface those five values on a hidden debug screen. When a tester says "I don't have the
fix", this answers it in five seconds instead of an hour.

---

## 9. When an update is the problem

You shipped a bad bundle. Fastest recovery, in order:

```bash
# 1. See what's out there
eas update:list --branch production

# 2. Re-publish a known-good update — this becomes the newest update,
#    so devices pull it on their next check
eas update:republish --branch production --group <good-update-id>

# 3. Nuclear option: point the branch back at the embedded bundle
eas channel:edit production --branch <branch-with-no-updates>
```

**Republish, don't revert-and-rebuild.** Republishing takes seconds; a build takes
fifteen minutes and a store review takes days.

Rehearse this on `preview` before you need it on `production`. The middle of an incident
is not when you want to be reading the flags.

> ⚠️ **A bad update that crashes on launch cannot be replaced by another update** — the
> app dies before it can check. This is why `checkAutomatically: "ON_ERROR_RECOVERY"`
> exists, and why you smoke-test a release build before publishing to `production`.

---

## 10. Debugging

| Symptom | Likely cause | Check |
|---|---|---|
| Update never arrives | Runtime version mismatch | `Updates.runtimeVersion` on device vs the `eas update` output |
| Update never arrives | Wrong channel | `Updates.channel` vs `--branch` and the channel→branch mapping |
| Nothing happens in dev | Updates disabled in dev | Expected. `Updates.isEnabled === false`. Test on a release build |
| Change visible on relaunch only | Working as designed | Pattern C or D1 if you need it sooner |
| Native change didn't ship | Native changes can't go OTA | Rebuild. See the [can/cannot list](./03-ci-cd-with-eas.md#what-you-can-ship-ota) |
| Works on Android, not iOS | Separate builds, separate runtime versions | Confirm both binaries are on the same `expo.version` |
| Update applied, then reverted | The new bundle crashed; automatic rollback | Check crash reporting — the previous bundle is the fallback |

---

## 11. Choosing a pattern

| Change | Pattern | Why |
|---|---|---|
| Copy fix, styling tweak | **A** — silent, next launch | Nobody needs it today |
| Bug fix, moderate urgency | **B** — check on foreground | Reaches long-lived sessions within a day |
| Important fix, want it today | **C** — banner with restart | User keeps control; no interruption |
| Crash loop, wrong money figure | **D1** — blocking gate 🔴 | Harm outweighs the cold start |
| Native bug, breaking API change | **D2** — store gate 🔴 | OTA physically cannot fix it |

Most teams need A and B. C is worth building once. D is for the day you are very glad
you built it in advance, and should be rare enough that you remember every time you used
it.

---

## 12. Exercise

Build the update surface for Trailhead:

1. `useBackgroundUpdateCheck()` at the root, silent, no-op in dev.
2. An `<UpdateBanner />` that appears when `isUpdatePending` and offers a restart.
3. A `useCriticalFlow` guard, wired into the booking confirmation screen, and prove the
   banner's restart button refuses to fire while a booking is in flight.
4. `<UpdateGate />` with a 10-second timeout that fails open. Force it to trigger by
   publishing an update, then cold-starting.
5. A debug screen (gated behind five taps on the version label) showing `channel`,
   `runtimeVersion`, `updateId`, `isEmbeddedLaunch` and `createdAt`.
6. A `<StoreUpdateRequired />` gate driven by a `minimumVersion` your backend returns.
   Fail open when the request fails — test it by pointing at a dead URL.

**Constraint:** do the whole exercise against a **release build on a real device**. The
entire feature is invisible in development, so a version that only "works" in Expo Go is
a version you have not tested at all.

---

## Check yourself

1. You publish an update at 11pm. A user has the app open. When do they get it?
2. What is the difference between `isUpdateAvailable` and `isUpdatePending`?
3. Why must a forced-update gate fail open?
4. Why can't you gate a store upgrade on `runtimeVersion`?
5. Your update introduced a crash on launch. Can you fix it with another update?
6. Why is none of this testable in Expo Go or a dev build?

<details>
<summary>Answers</summary>

1. Not that night, and possibly not for weeks. The default `ON_LOAD` check only runs on
   a **cold start**, and even then the downloaded bundle applies on the launch *after*
   that. A user who only backgrounds the app never cold-starts it. Pattern B (foreground
   check) plus Pattern C (restart prompt) is what actually gets it to them.

2. `isUpdateAvailable` means the server has something newer than what is running.
   `isUpdatePending` means a newer bundle has been **downloaded and staged** and will be
   used on the next launch. Only `isUpdatePending` justifies offering a restart — prompt
   on `isUpdateAvailable` and the restart applies nothing, because the download hasn't
   finished.

3. Because the gate sits between the user and the entire app. If the check throws on a
   flaky network, a dead endpoint or an expired certificate and you fail *closed*, every
   install is bricked simultaneously — including for people whose version was fine. The
   downside of failing open is that some users stay on an old build a little longer; the
   downside of failing closed is a total outage you cannot fix over the air.

4. `runtimeVersion` is an internal compatibility string between a binary and a JS bundle.
   Under the `appVersion` policy it happens to look like your version, but under other
   policies it is a fingerprint or an arbitrary string, and it is not something a user
   can act on. Gate on `Application.nativeApplicationVersion` — the version the store
   actually shows.

5. Usually not. If the app crashes before `expo-updates` can complete its check, it never
   learns a fix exists — it dies on the bad bundle every launch. `expo-updates` will roll
   back to the last known-good bundle in many crash-on-launch cases, and
   `checkAutomatically: "ON_ERROR_RECOVERY"` exists for exactly this, but neither is
   guaranteed. The reliable answer is to smoke-test a release build before publishing to
   `production`.

6. `expo-updates` is compiled out in development: `Updates.isEnabled` is `false` and
   every API is a no-op, because in dev the bundle comes from Metro. Expo Go has no
   binary of yours at all. So the update path — the one that runs for 100% of users — is
   the one path that never executes on your machine. It has to be tested on an installed
   release build.

</details>

---

## Sources

- [EAS Update — introduction](https://docs.expo.dev/eas-update/introduction/)
- [expo-updates API reference](https://docs.expo.dev/versions/v57.0.0/sdk/updates/)
- [Runtime versions](https://docs.expo.dev/eas-update/runtime-versions/)
- [Downloading updates — patterns](https://docs.expo.dev/eas-update/download-updates/)
- [Rollbacks](https://docs.expo.dev/eas-update/rollbacks/)
- [Debugging EAS Update](https://docs.expo.dev/eas-update/debug/)
- [expo-application](https://docs.expo.dev/versions/v57.0.0/sdk/application/)

**Next:** [AI workflow → The operating model](../04-ai-workflow/01-operating-model.md)
