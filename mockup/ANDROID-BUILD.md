# Building an Android APK

How to turn `mockup/` into an `.apk` file you can install on a phone.

Two routes:

| | Route | Needs | Time (first run) |
|---|---|---|---|
| **1** | [EAS Build (cloud)](#route-1--eas-build-cloud) | Node + a free Expo account | ~15 min |
| **2** | [Local Gradle build](#route-2--local-gradle-build) | Node + JDK 17 + Android SDK | ~10 min after setup |

**Route 1 is the recommended one.** It needs nothing installed beyond Node — no Android
Studio, no SDK, no JDK — and it manages the signing keystore for you.

> Just want to *look* at the app without building anything? Install **Expo Go** from the
> Play Store, run `npx expo start`, and scan the QR code. That is not an installed app,
> but it takes two minutes. See the [README](./README.md#option-a--expo-go-fastest-2-minutes-no-build).

---

## Before either route

```bash
cd mockup
npm install
npm run verify     # typecheck + lint + tests — catch problems before a 15-minute build
```

Node 20 or newer (`node -v`).

---

## Route 1 — EAS Build (cloud)

### Step 1. Install the CLI

```bash
npm install -g eas-cli
eas --version
```

### Step 2. Sign in

```bash
eas login
```

Create a free account at [expo.dev](https://expo.dev) first if you do not have one.

### Step 3. Link the project

```bash
cd mockup
eas init
```

This writes an `extra.eas.projectId` into `app.json`. **Commit that change** — without it
every machine creates a different project.

### Step 4. Build the APK

```bash
eas build --platform android --profile preview
```

On the first build EAS offers to generate an Android keystore. **Say yes.** It stores and
reuses it, so every later build installs as an upgrade rather than a separate app.

The `preview` profile in [`eas.json`](./eas.json) is already configured for a sideloadable
APK:

```jsonc
"preview": {
  "distribution": "internal",
  "android": { "buildType": "apk" }   // ← without this you get an .aab, which will NOT install on a phone
}
```

#### The first build stops early. That is expected.

The `preview` and `production` profiles set a `channel`, which means their builds can
receive over-the-air updates. The first time you build, the CLI notices `expo-updates`
is missing, installs it, writes the updates config, and then stops:

```
✔ Configured runtimeVersion for Android and iOS with "{"policy":"appVersion"}"
✔ Installed expo-updates and configured EAS Update.
Command must be re-run to pick up new updates configuration.
    Error: build command failed.
```

**This is a one-time setup step, not a broken build.** Run the same command again and it
goes through:

```bash
eas build --platform android --profile preview
```

Commit what it changed — `expo-updates` in `package.json`, and `runtimeVersion`,
`updates.url` and `extra.eas.projectId` in `app.json`:

```bash
git add app.json package.json package-lock.json
git commit -m "Configure EAS Update for Android builds"
```

Those values are tied to your Expo account, which is why they are not committed here
already.

#### If you would rather not have OTA updates at all

Delete the `"channel"` lines from `preview` and `production` in `eas.json`. Builds then
skip the `expo-updates` setup entirely and never hit the re-run step. You lose the
ability to push JS-only changes to installed testers with `eas update` — for a mockup
that gets passed around, that is usually worth keeping.

### Step 5. Install it

When the build finishes the CLI prints a build page URL and a QR code.

**From the phone (easiest):**

1. Scan the QR code with the camera.
2. Tap the download link on the build page.
3. Open the downloaded file and confirm the install.

**From the computer,** with the phone connected over USB and USB debugging on:

```bash
# download the .apk from the build page first
adb install -r ~/Downloads/hamlet-hq-mockup.apk
```

The first sideload triggers a permission prompt. Allow it under **Settings → Apps →
Special app access → Install unknown apps**, and pick whichever app is doing the install
(Chrome, Files, etc.). This is normal for anything not from the Play Store.

### Rebuilding later

```bash
eas build --platform android --profile preview
```

`eas.json` sets `appVersionSource: "remote"`, so EAS increments the Android `versionCode`
itself. Bump `expo.version` in `app.json` when you want a visibly different version number.

To watch or re-download past builds:

```bash
eas build:list --platform android
eas build:view          # opens the most recent build
```

### Pushing changes without rebuilding

Because the `preview` profile is on an update channel, JS-only changes — screens, copy,
styling, mock data — can go out to already-installed testers in seconds:

```bash
eas update --branch preview --message "Tweaked the booking flow"
```

They pick it up on the next app launch. No new APK, no reinstall.

You still need a **new build** when you change anything native: adding or removing a
package with native code, or editing `app.json` (name, icon, package, splash,
permissions, plugins).

One catch: `runtimeVersion` uses the `appVersion` policy, so an update only reaches
builds with a matching `expo.version`. Bump `expo.version` and existing installs stop
receiving updates until you ship them a new APK. Leave it alone while you are iterating.

A second catch worth knowing before you rely on this: a published update is **downloaded**
on the next cold start and **applied** on the one after that, so testers are always one
launch behind unless you add code to check and reload.
[Over-the-air updates](../docs/03-production/08-over-the-air-updates.md) covers that,
plus how to force an update and how to gate on a minimum native version.

---

## Route 2 — Local Gradle build

### Prerequisites

- **JDK 17** — `java -version` should report 17.
- **Android SDK** — install Android Studio, or `cmdline-tools` plus:
  ```bash
  sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0"
  ```
- Environment:
  ```bash
  export ANDROID_HOME="$HOME/Android/Sdk"       # macOS: ~/Library/Android/sdk
  export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"
  ```

### Step 1. Generate the native project

```bash
cd mockup
npx expo prebuild --platform android --clean
```

This creates `android/` from `app.json`. It is **gitignored on purpose** — treat it as
build output. Never hand-edit it; configuration belongs in `app.json` or a config plugin
under `plugins/`, and the next `prebuild` will overwrite anything you change by hand.

### Step 2. Build

```bash
cd android
./gradlew assembleRelease
```

The APK lands at:

```
mockup/android/app/build/outputs/apk/release/app-release.apk
```

### Step 3. Install

```bash
adb devices                                     # confirm the phone is listed
adb install -r app/build/outputs/apk/release/app-release.apk
```

### One command instead of three

With a device attached, this builds, installs and launches in one go:

```bash
cd mockup
npx expo run:android --variant release
```

Drop `--variant release` for a debug build that hot-reloads against Metro.

### Signing

`assembleRelease` here signs with the standard Android **debug keystore**. That is fine
for putting the app on your own phone, and *not* fine for distribution — Play Store
uploads need a real upload key. If you get there, use Route 1: EAS generates and stores
that key for you.

---

## Verify the build before you ship it

```bash
cd mockup
npm run verify                              # typecheck, lint, 65 unit tests
npx expo export --platform android          # proves the JS bundle compiles
```

`expo export` catches import errors, bad routes and Metro problems in about 30 seconds —
much cheaper than finding them 15 minutes into a cloud build.

---

## Play Store (later, not needed for sideloading)

The store takes an **App Bundle**, not an APK. The `production` profile is already set up
for it:

```bash
eas build --platform android --profile production   # produces an .aab
eas submit --platform android                       # uploads it
```

An `.aab` cannot be installed on a phone directly — that is what `preview` is for.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Installed expo-updates and configured EAS Update. Command must be re-run` | One-time EAS Update setup on the first build | Not a failure — run the same `eas build` command again, then commit the `app.json` / `package.json` changes |
| Downloaded file will not install | You built an `.aab`, not an `.apk` | Use `--profile preview`; check `eas.json` has `"buildType": "apk"` |
| "App not installed" | An existing copy has the same package but a different signature | Uninstall `app.hamlethq.mockup` first, then reinstall |
| "Install blocked" / "unknown apps" | Sideloading not permitted yet | Settings → Apps → Special app access → Install unknown apps → allow for your browser or file manager |
| `adb: no devices/emulators found` | USB debugging off, or the prompt was never accepted | Enable Developer Options → USB debugging, run `adb devices`, accept the dialog on the phone |
| EAS fails at "Install dependencies" | Stale or conflicting lockfile | `rm -rf node_modules package-lock.json && npm install`, commit the lockfile, rebuild |
| `SDK location not found` | `ANDROID_HOME` unset | Export it (see prerequisites) or add `sdk.dir=/path/to/sdk` to `android/local.properties` |
| Gradle fails on a Java version | Wrong JDK | JDK 17. `java -version` to check; set `JAVA_HOME` if you have several |
| App launches to a white screen | Stale Metro cache | `npx expo start -c` |
| Fonts or icons missing | Same | `npx expo start -c`, or rebuild after `expo prebuild --clean` |

---

## What gets built

| Field | Value | Where to change it |
|---|---|---|
| App name | Hamlet HQ | `app.json` → `expo.name` |
| Package | `app.hamlethq.mockup` | `app.json` → `expo.android.package` |
| Version | `1.0.0` | `app.json` → `expo.version` |
| `versionCode` | managed by EAS | `eas.json` → `appVersionSource: "remote"` |
| Icon | `assets/icon.png`, `assets/android-icon-*.png` | regenerate, keep 1024×1024 |
| Splash | white ground, lime mark | `app.json` → `expo.plugins` → `expo-splash-screen` |

Changing anything in `app.json` requires a fresh build — those values are baked into the
native project, not shipped over the air.
