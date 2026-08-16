# Native Modules and Config Plugins

What to do when the JavaScript layer isn't enough. You'll need this less often than
you fear — but knowing where the escape hatch is changes how confidently you build.

---

## 1. The escalation ladder

Work down this list. Stop at the first rung that solves your problem.

```
1. An Expo SDK module already does it              ← 80% of the time
2. A community library does it                     ← 15%
3. A config plugin adjusts native config           ← 4%
4. Write a native module with Expo Modules API     ← 1%
5. Prebuild + hand-edit native code                ← ~never
```

Most "I need native code" moments are actually "I haven't found the right library
yet." Check [Expo's SDK list](https://docs.expo.dev/versions/latest/) and
[React Native Directory](https://reactnative.directory/) first.

---

## 2. Config plugins

A config plugin is a function that modifies your native project during `prebuild`. It
lets you change `Info.plist`, `AndroidManifest.xml`, Gradle files, and entitlements
**without checking `ios/` and `android/` into git**.

This is the key to the managed workflow: your native config is *code*, generated
reproducibly, not hand-edited files that drift.

### Using one

Most libraries ship a plugin:

```json
// app.json
{
  "expo": {
    "plugins": [
      "expo-router",
      ["expo-camera", { "cameraPermission": "Attach photos to trail reports." }],
      ["expo-notifications", {
        "icon": "./assets/notification-icon.png",
        "color": "#0f766e"
      }],
      ["@stripe/stripe-react-native", {
        "merchantIdentifier": "merchant.com.hamlethq.app",
        "enableGooglePay": true
      }]
    ]
  }
}
```

Then:
```bash
npx expo prebuild --clean
```

### Writing one

When you need a native setting no plugin exposes. Example — adding a URL scheme your
app can query on iOS:

```js
// plugins/withQuerySchemes.js
const { withInfoPlist } = require('expo/config-plugins');

module.exports = function withQuerySchemes(config, schemes = []) {
  return withInfoPlist(config, (config) => {
    config.modResults.LSApplicationQueriesSchemes = [
      ...(config.modResults.LSApplicationQueriesSchemes ?? []),
      ...schemes,
    ];
    return config;
  });
};
```

```js
// app.config.js
module.exports = {
  expo: {
    plugins: [['./plugins/withQuerySchemes', ['whatsapp', 'venmo']]],
  },
};
```

Common mod helpers:

| Helper | Modifies |
|---|---|
| `withInfoPlist` | iOS `Info.plist` |
| `withEntitlementsPlist` | iOS entitlements |
| `withAndroidManifest` | `AndroidManifest.xml` |
| `withAppBuildGradle` | app-level `build.gradle` |
| `withProjectBuildGradle` | project-level `build.gradle` |
| `withGradleProperties` | `gradle.properties` |
| `withDangerousMod` | Arbitrary file access (last resort) |

**Verify what a plugin produced** before trusting it:

```bash
npx expo prebuild --clean
cat ios/YourApp/Info.plist
cat android/app/src/main/AndroidManifest.xml
```

This is a habit worth building — especially when an AI agent wrote the plugin.

---

## 3. Writing a native module

When you genuinely need platform code: an SDK with no RN wrapper, a
performance-critical algorithm, or deep OS integration.

The **Expo Modules API** is dramatically nicer than the old bridge approach — Kotlin
and Swift, no Objective-C bridging headers, no manual TurboModule spec files.

### Scaffold

```bash
npx create-expo-module@latest --local hamlet-gate
```

`--local` creates it inside your app at `modules/hamlet-gate/` — right for
app-specific code you don't intend to publish.

```
modules/hamlet-gate/
├── android/src/main/java/.../HamletGateModule.kt
├── ios/HamletGateModule.swift
├── src/index.ts
└── expo-module.config.json
```

### iOS (Swift)

```swift
import ExpoModulesCore

public class HamletGateModule: Module {
  public func definition() -> ModuleDefinition {
    Name("HamletGate")

    // Synchronous
    Function("isSupported") { () -> Bool in
      return true
    }

    // Asynchronous — returns a Promise to JS
    AsyncFunction("unlock") { (gateId: String) async throws -> String in
      let result = try await GateSDK.shared.unlock(id: gateId)
      return result.token
    }

    // Events to JS
    Events("onGateStateChanged")
  }
}
```

### Android (Kotlin)

```kotlin
package expo.modules.hamletgate

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class HamletGateModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("HamletGate")

    Function("isSupported") { true }

    AsyncFunction("unlock") { gateId: String ->
      GateSdk.unlock(gateId).token
    }

    Events("onGateStateChanged")
  }
}
```

### TypeScript surface

```ts
// modules/hamlet-gate/src/index.ts
import { requireNativeModule } from 'expo-modules-core';

interface HamletGateModule {
  isSupported(): boolean;
  unlock(gateId: string): Promise<string>;
}

export default requireNativeModule<HamletGateModule>('HamletGate');
```

Usage is then ordinary TypeScript:

```ts
import HamletGate from '~/modules/hamlet-gate';

if (HamletGate.isSupported()) {
  const token = await HamletGate.unlock(gate.id);
}
```

Note how similar the two platform implementations look — that's the point of the Expo
Modules API. The old approach required Objective-C headers, `RCT_EXPORT_METHOD`
macros, and manual type marshalling.

---

## 4. Prebuild and the native folders

```bash
npx expo prebuild            # generate ios/ and android/
npx expo prebuild --clean    # delete and regenerate
```

**The critical mental model:** in the managed workflow, `ios/` and `android/` are
**build artifacts**, like `dist/`. They're generated from `app.json` + plugins.

Which means:

```gitignore
# .gitignore
/ios
/android
```

**Do not commit them.** The moment you do, `prebuild --clean` becomes destructive and
you've silently opted into maintaining native projects by hand — the "bare workflow,"
with all its upgrade pain.

### Two workflows

| | Managed (CNG) | Bare |
|---|---|---|
| `ios/`, `android/` in git | ❌ generated | ✅ committed |
| Native config via | Config plugins | Hand-editing |
| SDK upgrades | Usually painless | Manual merge work |
| Native code | Local modules | Anywhere |
| **Recommended for you** | ✅ | ❌ |

**Stay managed.** If you ever need to inspect generated native code, run `prebuild`
locally, look, and delete it again.

### Running with native code locally

```bash
npx expo run:ios       # prebuild + compile + install + launch
npx expo run:android
```

Slower than `expo start`, but required after adding native dependencies.

---

## 5. Choosing a third-party library

You'll evaluate dozens of libraries. A quick, honest checklist:

- [ ] **New Architecture support** — critical. Legacy-only libraries are dead as of RN 0.82.
- [ ] Commit in the last ~6 months
- [ ] Issues being triaged (not hundreds open and ignored)
- [ ] TypeScript types shipped
- [ ] Expo config plugin, or documented Expo compatibility
- [ ] Downloads consistent with the problem's popularity
- [ ] Not a solo unmaintained project for anything load-bearing
- [ ] License compatible with commercial use

Check [reactnative.directory](https://reactnative.directory/) — it flags New
Architecture support and Expo Go compatibility directly.

**Red flags:** last publish >18 months ago, "works with RN 0.68" in the README, no
TypeScript, requires manual native linking instructions.

> 💡 **AI-specific warning:** LLMs confidently recommend libraries that are abandoned,
> renamed, or hallucinated entirely — training data skews old. **Always verify a
> suggested package exists and is maintained** before installing it:
> ```bash
> npm view <package> version time.modified
> ```
> This is one of the highest-frequency AI failure modes in React Native specifically,
> because the ecosystem churns fast. See
> [reviewing AI code](../04-ai-workflow/05-reviewing-ai-code.md).

---

## 6. Upgrading

```bash
npx expo install expo@latest
npx expo install --fix          # align all deps to the new SDK
npx expo-doctor                 # verify
```

Then read the changelog for breaking changes and test on both platforms.

**Cadence:** Expo ships a major SDK roughly every 4–6 months, with older versions
receiving critical fixes for about a year. Falling more than two SDKs behind makes
upgrades much harder — libraries move on, and you end up doing several migrations at
once.

**Practical policy for Hamlet HQ:** upgrade one SDK behind latest. Let others find the
sharp edges for a few weeks, then move. Never let yourself get three behind.

---

## 7. Exercise

Two parts, escalating:

**Part A — a config plugin.** Add a custom URL scheme and an iOS entitlement without
touching `ios/` by hand. Verify by running `prebuild` and reading the generated
`Info.plist`. Then delete `ios/` and confirm your app still builds from config alone.

**Part B — a local native module.** Build a `TrailBeacon` module that returns the
device's battery level, on both platforms.

- `isSupported(): boolean` (sync)
- `getBatteryLevel(): Promise<number>` (async)
- `onBatteryLow` event when below 20%

Yes, `expo-battery` already does this — that's deliberate. The goal is to write Swift
and Kotlin, wire the TypeScript surface, and see the round trip work, on a problem
where you can check your answer against a known-good implementation.

---

## Check yourself

1. Why shouldn't `ios/` and `android/` be committed in a managed project?
2. When is a config plugin the right tool vs. a native module?
3. How do you verify a config plugin actually did what you intended?
4. What's the first thing to check about a library an AI recommends?
5. Why is "New Architecture support" now non-negotiable?

<details>
<summary>Answers</summary>

1. They're generated artifacts. Committing them means `prebuild --clean` destroys real
   work, native config silently drifts from `app.json`, and SDK upgrades become manual
   merges — you've effectively moved to the bare workflow.
2. A config plugin changes native *configuration* (plists, manifests, Gradle,
   entitlements). A native module adds native *behavior* — new functions callable from
   JS. If you're adding a key to a file, it's a plugin.
3. Run `npx expo prebuild --clean` and read the generated `Info.plist` /
   `AndroidManifest.xml`. Don't assume — verify the output.
4. That it exists and is maintained: `npm view <pkg> version time.modified`. LLMs
   frequently suggest packages that are abandoned, renamed, or fabricated.
5. The legacy bridge architecture was removed in React Native 0.82. A library that
   only supports the old architecture simply won't work.

</details>

---

## Sources

- [Expo — Config plugins](https://docs.expo.dev/config-plugins/introduction/)
- [Expo Modules API](https://docs.expo.dev/modules/overview/)
- [Expo — Continuous Native Generation](https://docs.expo.dev/workflow/continuous-native-generation/)
- [React Native Directory](https://reactnative.directory/)

**Next:** [Production → Project architecture](../03-production/01-project-architecture.md)
