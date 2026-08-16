# Environment Setup

Getting a React Native environment working is the first real difficulty spike. Budget
half a day. It's worth doing properly once rather than fighting it for months.

---

## 1. Decide your path first

| Your machine | iOS development | Android development |
|---|---|---|
| **macOS** | ✅ Full (simulator + device + local builds) | ✅ Full |
| **Windows** | ⚠️ EAS Build only (no simulator) | ✅ Full |
| **Linux** | ⚠️ EAS Build only (no simulator) | ✅ Full |

**If you're on Windows/Linux and shipping iOS:** you can still do this. EAS Build
compiles iOS in Expo's cloud, and you test on a physical iPhone via a development
build or TestFlight. What you lose is the iOS *simulator* and fast local iteration on
iOS-specific native code. For a JS-heavy app this is a very workable setup — many
solo founders ship this way.

**If you're serious about Hamlet HQ long-term**, a used Mac mini (M1/M2) is the single
highest-leverage hardware purchase you can make. Not required to start.

---

## 2. Common to all platforms

### Node.js

Use a version manager, not a system install.

```bash
# macOS/Linux — fnm is fast; nvm also fine
curl -fsSL https://fnm.vercel.app/install | bash
fnm install 22
fnm use 22
fnm default 22

node -v   # v22.x
```

```powershell
# Windows
winget install Schniz.fnm
fnm install 22
fnm use 22
```

> Use an **LTS** version (20 or 22). Odd-numbered Node releases are not supported by
> the React Native toolchain and will waste your time.

### Package manager

This curriculum uses `pnpm` (fast, strict, good for monorepos). npm, yarn, and bun all
work — bun has occasional rough edges with native tooling.

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm -v
```

### Git and a GitHub account

You already have both. Make sure `git` is configured:

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

### Watchman (macOS/Linux, recommended)

Speeds up Metro's file watching significantly on large projects.

```bash
brew install watchman            # macOS
# Linux: build from source or skip — it's optional
```

### Expo CLI

Don't install it globally. The modern approach uses `npx`, which always runs the
version pinned to your project:

```bash
npx expo --version
```

If you have a legacy global `expo-cli` installed, remove it — it's deprecated and
causes confusing errors:

```bash
npm uninstall -g expo-cli
```

---

## 3. Android setup (all host OSes)

### Install JDK 17

React Native's Gradle build requires JDK 17.

```bash
# macOS
brew install --cask zulu@17

# Linux (Debian/Ubuntu)
sudo apt install openjdk-17-jdk

# Windows
winget install Microsoft.OpenJDK.17
```

Verify:
```bash
java -version   # should report 17.x
```

### Install Android Studio

Download from [developer.android.com/studio](https://developer.android.com/studio).

During setup, make sure these are checked:
- Android SDK
- Android SDK Platform
- Android Virtual Device

Then open **Settings → Languages & Frameworks → Android SDK**:

**SDK Platforms tab** — install the latest stable API level (API 35/36 as of 2026),
and check "Show Package Details" to also install:
- Android SDK Platform
- Google APIs Intel/ARM System Image (for the emulator)

**SDK Tools tab** — ensure these are installed:
- Android SDK Build-Tools
- Android SDK Command-line Tools ⚠️ (often missed, and required)
- Android Emulator
- Android SDK Platform-Tools

### Set environment variables

**macOS/Linux** — add to `~/.zshrc` or `~/.bashrc`:

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk        # macOS
# export ANDROID_HOME=$HOME/Android/Sdk              # Linux
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
```

Reload: `source ~/.zshrc`

**Windows** — System Properties → Environment Variables:
- New user variable `ANDROID_HOME` = `C:\Users\<you>\AppData\Local\Android\Sdk`
- Add to `Path`: `%ANDROID_HOME%\platform-tools` and `%ANDROID_HOME%\emulator`

### Verify

```bash
adb --version           # Android Debug Bridge
emulator -list-avds     # your virtual devices
```

If `adb` isn't found, your `PATH` is wrong. Fix that before continuing — nothing else
will work.

### Create an emulator

Android Studio → **Device Manager** → **Create Device**.

Recommendation: **Pixel 7** with the latest API level and Google Play services.

> **Performance tip:** enable hardware acceleration. On macOS it's automatic. On
> Windows enable Hyper-V or install Intel HAXM. On Linux, ensure KVM is available
> (`kvm-ok`). Without it, the emulator is unusably slow.

Launch it:
```bash
emulator -avd Pixel_7_API_35
```

---

## 4. iOS setup (macOS only)

### Install Xcode

From the Mac App Store. It's ~10GB and takes a while.

Then:

```bash
# Install command line tools
xcode-select --install

# Point xcode-select at the full Xcode (not just CLT)
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer

# Accept the license
sudo xcodebuild -license accept

# Install the iOS platform + simulator runtime
xcodebuild -downloadPlatform iOS
```

Open Xcode once manually to let it finish installing components.

### Install CocoaPods

The iOS dependency manager. React Native still uses it.

```bash
# Preferred: via Homebrew (avoids Ruby version headaches)
brew install cocoapods

pod --version
```

> If you hit Ruby version errors, install a modern Ruby via `rbenv` and use that
> rather than macOS's system Ruby.

### Verify the simulator

```bash
open -a Simulator
xcrun simctl list devices | grep Booted
```

---

## 5. Physical devices

**Test on real hardware early and often.** Simulators lie about performance, and never
reproduce camera, GPS accuracy, push notification, or battery behavior.

### Android device

1. Settings → About phone → tap **Build number** 7 times → Developer options unlock
2. Settings → Developer options → enable **USB debugging**
3. Connect via USB, accept the trust prompt
4. Verify: `adb devices` should list it

### iOS device

1. Connect via USB, trust the computer
2. In Xcode: Settings → Accounts → add your Apple ID
3. A free Apple ID gets you 7-day development builds. A **paid Apple Developer
   account ($99/year)** gets you TestFlight, push notifications, and App Store
   distribution — you'll need it before Hamlet HQ ships, and probably before you
   finish the practice app.

---

## 6. Verify everything

Create a throwaway project and run it on both platforms.

```bash
cd /tmp
npx create-expo-app@latest verify-setup
cd verify-setup
npx expo start
```

Then press:
- `a` → opens Android emulator
- `i` → opens iOS simulator (macOS)
- `w` → opens in a browser
- `j` → opens React Native DevTools
- `r` → reload
- `?` → show all commands

**If you see the starter screen on both platforms, you're done.** Delete the folder.

Also run Expo's built-in doctor, which catches most misconfigurations:

```bash
npx expo-doctor
```

---

## 7. Expo Go vs development builds

An important distinction that confuses newcomers.

| | Expo Go | Development build |
|---|---|---|
| What it is | A prebuilt app from the app stores | **Your** app, compiled with your native deps |
| Setup | Install from App Store / Play Store | `eas build --profile development` |
| Custom native modules | ❌ Only what Expo Go bundles | ✅ Anything |
| Speed to start | Instant | ~15 min first build |
| Good for | Weeks 1–3, learning, quick demos | Everything real |

**Use Expo Go for the first two or three weeks** while you're learning core concepts.
The moment you need a library Expo Go doesn't bundle (Stripe, a custom native module,
certain notification configs), switch to a development build. That's expected and
normal — it isn't "ejecting."

Creating one:

```bash
npm install -g eas-cli
eas login
eas build --profile development --platform android   # or ios
```

Then install the resulting build on your device/emulator. From then on,
`npx expo start --dev-client` connects to it and you still get Fast Refresh.

---

## 8. Editor setup

### VS Code / Cursor extensions

- **ESLint**
- **Prettier**
- **Tailwind CSS IntelliSense** ← configure it for NativeWind (below)
- **Expo Tools**
- **Error Lens** (inline errors — genuinely improves the loop)

### Make Tailwind IntelliSense work with NativeWind

Add to `.vscode/settings.json`:

```json
{
  "tailwindCSS.includeLanguages": {
    "typescriptreact": "javascript",
    "typescript": "javascript"
  },
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cn\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ],
  "editor.quickSuggestions": { "strings": "on" }
}
```

Without this you lose autocomplete on `className`, which is a large daily quality-of-
life hit.

---

## 9. Reading native logs

When something crashes below the JS layer, `console.log` won't help. Learn these now
so you're not helpless later.

**Android:**
```bash
adb logcat                                  # everything (very noisy)
adb logcat *:E                              # errors only
adb logcat | grep -i "ReactNative\|AndroidRuntime"   # the useful filter
adb logcat -c                               # clear the buffer first
```

**iOS:**
- Xcode → Window → Devices and Simulators → select device → **Open Console**
- Or: `npx expo run:ios` runs it attached to your terminal and prints native logs

**Crash symbolication:** production crashes come back as memory addresses unless you
upload source maps and dSYMs. Set this up when you set up Sentry —
[observability](../03-production/05-observability.md).

---

## 10. Troubleshooting

The errors you will actually hit, and what they mean.

### `Unable to resolve module X`
Metro's cache is stale or the dep isn't installed.
```bash
npx expo start --clear
# still broken?
rm -rf node_modules && pnpm install
```

### `Command PhaseScriptExecution failed` (iOS)
Usually stale pods.
```bash
cd ios && pod install --repo-update && cd ..
# nuclear option
rm -rf ios/Pods ios/Podfile.lock && cd ios && pod install && cd ..
```

### `SDK location not found` (Android)
`ANDROID_HOME` isn't set, or `android/local.properties` is missing.
```bash
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
```

### `Execution failed for task ':app:...'` (Gradle)
```bash
cd android && ./gradlew clean && cd ..
# and if that fails
rm -rf ~/.gradle/caches
```

### Metro port 8081 already in use
```bash
npx expo start --port 8082
# or kill it
lsof -ti:8081 | xargs kill -9
```

### App connects to Metro on simulator but not on a physical device
Same Wi-Fi network required. If that's fine, try tunnel mode:
```bash
npx expo start --tunnel
```

### Everything is broken and you don't know why

The escalating reset sequence — try in order, don't skip to the end:

```bash
# 1. Clear Metro cache
npx expo start --clear

# 2. Reinstall JS deps
rm -rf node_modules && pnpm install

# 3. Check for version mismatches (very common cause)
npx expo install --check

# 4. Full native regeneration (safe in managed workflow —
#    ios/ and android/ are generated artifacts)
rm -rf ios android && npx expo prebuild --clean

# 5. Diagnose
npx expo-doctor
```

> ⚠️ Step 4 deletes `ios/` and `android/`. That's safe **only** if you haven't
> hand-edited native files. If you have, you should have been using a config plugin —
> see [native modules and config plugins](../02-curriculum/10-native-modules-and-config-plugins.md).

### `npx expo install --check` — use this constantly

Expo pins compatible versions of every library per SDK. Version drift is one of the
top causes of mysterious breakage.

```bash
npx expo install --check   # report mismatches
npx expo install --fix     # fix them
```

**Always install Expo-ecosystem packages with `npx expo install`, not `pnpm add`** —
it picks the version compatible with your SDK.

---

## Setup checklist

- [ ] Node 20 or 22 LTS via a version manager
- [ ] pnpm (or your preferred package manager)
- [ ] JDK 17
- [ ] Android Studio + SDK + command-line tools + emulator
- [ ] `ANDROID_HOME` set; `adb` works
- [ ] Xcode + CocoaPods (macOS)
- [ ] iOS simulator opens
- [ ] Physical Android device with USB debugging
- [ ] Physical iOS device trusted
- [ ] `npx create-expo-app` runs on **both** platforms
- [ ] `npx expo-doctor` is clean
- [ ] Editor extensions + Tailwind IntelliSense configured
- [ ] `eas-cli` installed and logged in
- [ ] You know how to read `adb logcat`

---

## Sources

- [Expo — Set up your environment](https://docs.expo.dev/get-started/set-up-your-environment/)
- [React Native — Environment setup](https://reactnative.dev/docs/environment-setup)
- [Expo — Development builds](https://docs.expo.dev/develop/development-builds/introduction/)

**Next:** [Your first app, walked through →](./04-first-app-walkthrough.md)
