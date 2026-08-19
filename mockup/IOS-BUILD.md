# Building for iOS

How to turn `mockup/` into an app you can run on the iOS Simulator or install on an
iPhone.

Two routes:

| | Route | Needs | Time (first run) |
|---|---|---|---|
| **1** | [EAS Build (cloud)](#route-1--eas-build-cloud) | Node + a free or paid Apple account, depending on target | ~15 min |
| **2** | [Local Xcode build](#route-2--local-xcode-build) | A **Mac** + Xcode | ~10 min after setup |

**Route 1 is the recommended one** if you're not on a Mac, or don't want Xcode installed
at all. Unlike Android there is no plain "download and tap to install" file — Apple's
model is either the Simulator (no account, Mac only), a device you've registered ahead of
time, or TestFlight. Read [Why iOS is different from the Android APK flow](#why-ios-is-different-from-the-android-apk-flow)
before picking a path if that's surprising.

> Just want to *look* at the app without building anything? Install **Expo Go** from the
> App Store, run `npx expo start`, and scan the QR code with the **Camera app** (not
> Expo Go itself — the Camera app is what triggers the deep link on iOS). That is not an
> installed app, but it takes two minutes. See the
> [README](./README.md#option-a--expo-go-on-ios-fastest-2-minutes-no-build).

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

Create a free account at [expo.dev](https://expo.dev) first if you do not have one. This
is your **Expo** account — separate from your Apple ID.

### Step 3. Link the project

```bash
cd mockup
eas init
```

This writes an `extra.eas.projectId` into `app.json`. **Commit that change** — without it
every machine creates a different project. Skip this step if you already ran it for the
Android build; the project ID is shared across platforms.

### Step 4. Build

Pick the target that matches what you actually have.

#### 4a. Simulator build — no Apple account, needs a Mac to run it

```bash
eas build --platform ios --profile preview-simulator
```

Nothing to sign, nothing to register. This produces a `.app` (wrapped in a `.tar.gz`) that
only runs in the iOS Simulator — it cannot go on a physical iPhone. Use this to check the
build itself works before dealing with Apple's device/account requirements.

#### 4b. Device build — needs a paid Apple Developer Program membership ($99/yr)

Real iPhones only run apps signed by Apple. For a build outside the App Store
(**ad hoc distribution**), every device has to be registered by its UDID *before* the
build runs.

```bash
# 1. Register the phone (opens a link — open it on the iPhone, or scan the QR it prints)
eas device:create

# 2. Build for the registered device(s)
eas build --platform ios --profile preview
```

On the first build, EAS asks to log into your Apple Developer account and offers to
generate a Distribution Certificate and an ad hoc provisioning profile. **Say yes** — it
stores and reuses both, so later builds don't ask again. This step requires an **active,
paid** Apple Developer Program membership; a free Apple ID is not enough for this route
(it is enough for Option 4a, and for local Simulator/device builds in Route 2).

#### The first build stops early. That is expected.

The `preview` and `preview-simulator` profiles set a `channel`, which means their builds
can receive over-the-air updates. The first time you build (Android or iOS, whichever you
do first), the CLI notices `expo-updates` is missing, installs it, writes the updates
config, and then stops:

```
✔ Configured runtimeVersion for Android and iOS with "{"policy":"appVersion"}"
✔ Installed expo-updates and configured EAS Update.
Command must be re-run to pick up new updates configuration.
    Error: build command failed.
```

**This is a one-time setup step, not a broken build.** Run the same command again and it
goes through. If you already did this while building the Android APK, iOS skips straight
past it.

```bash
git add app.json package.json package-lock.json
git commit -m "Configure EAS Update for iOS builds"
```

### Step 5. Install it

**Simulator build:**

```bash
eas build:run --platform ios
```

This downloads the most recent iOS build and installs it straight onto a booted
Simulator. (No booted Simulator yet? `open -a Simulator` first.) Or download the
`.tar.gz` from the build page, unarchive it, and:

```bash
xcrun simctl install booted path/to/HamletHQ.app
```

**Device build:**

When the build finishes the CLI prints a build page URL and a QR code.

1. On the iPhone, open the **Camera app** and point it at the QR code (or open the build
   page URL directly in Safari on the phone).
2. Tap the install link, confirm, and wait for it to appear on the home screen.

If "Unable to Install" or the build page says the device isn't eligible: the phone almost
certainly wasn't registered (`eas device:create`) **before** this particular build ran.
Registering a device after the fact does not retroactively add it — rebuild.

### Rebuilding later

```bash
eas build --platform ios --profile preview            # device
eas build --platform ios --profile preview-simulator  # simulator
```

`eas.json` sets `appVersionSource: "remote"`, so EAS increments the iOS build number
itself. Bump `expo.version` in `app.json` when you want a visibly different version
number.

```bash
eas build:list --platform ios
eas build:view          # opens the most recent build
```

### Pushing changes without rebuilding

Both iOS profiles above are on the `preview` update channel — the same one the Android
APK uses — so a single `eas update` reaches every installed tester on either platform:

```bash
eas update --branch preview --message "Tweaked the booking flow"
```

Same caveats as Android: only reaches installs whose `expo.version` matches the build
that shipped, and a published update is downloaded on the next cold start but only
*applied* on the one after that. You still need a **new build** for anything native —
adding a package with native code, or editing `app.json`.
[Over-the-air updates](../docs/03-production/08-over-the-air-updates.md) has the details.

### Sharing with more than a handful of people — TestFlight

Ad hoc device registration doesn't scale past a few phones you can personally collect
UDIDs from, and it's capped at 100 devices per membership year. TestFlight sidesteps
device registration entirely:

```bash
eas build --platform ios --profile production
eas submit --platform ios
```

Add testers by email in App Store Connect. Internal testers (up to 100, your team) get
the build instantly with no review; external testers (up to 10,000) require one light
review of the first build, typically under a day. See
[Shipping to the Stores § 6](../docs/03-production/04-shipping-to-stores.md#6-testflight-and-internal-testing)
for the full flow, including the App Store Connect setup this needs.

---

## Route 2 — Local Xcode build

### Prerequisites

- **A Mac.** Unlike Android, there is no cross-platform local option — Xcode only runs
  on macOS. On Linux or Windows, Route 1 is the only path.
- **Xcode** (from the Mac App Store) plus its command line tools:
  ```bash
  xcode-select --install
  ```
- **CocoaPods**, if not already present:
  ```bash
  sudo gem install cocoapods
  ```
- Any Apple ID signed into Xcode is enough for the Simulator or your own device
  (**Xcode → Settings → Accounts**). A free ID gets you "personal team" signing, which
  is enough to run on your own device but expires after **7 days** — see
  [Troubleshooting](#troubleshooting). A paid Apple Developer Program membership removes
  that limit and is required to distribute to other people's devices.

### Step 1. Generate the native project

```bash
cd mockup
npx expo prebuild --platform ios --clean
```

This creates `ios/` from `app.json`. It is **gitignored on purpose** — treat it as build
output. Never hand-edit it; configuration belongs in `app.json` or a config plugin under
`plugins/`, and the next `prebuild` will overwrite anything you change by hand.

### Step 2. Build and run

```bash
# Simulator — no Apple account needed at all
npx expo run:ios

# Your own physical device, connected over USB or the same Wi-Fi
npx expo run:ios --device
```

`--device` opens a picker for which connected/paired device to target. The first time you
build for a device, Xcode prompts you to sign in with an Apple ID and picks a personal
team automatically if you don't have a paid membership configured.

Prefer Xcode's own UI (to pick a specific simulator, inspect build logs, or choose a
signing team by hand)?

```bash
open ios/HamletHQ.xcworkspace
```

then **Product → Run**. Always open the `.xcworkspace`, never the `.xcodeproj` — CocoaPods
wires native dependencies through the workspace.

### Step 3 (device only). Trust the developer certificate

The first launch on a physical device shows **"Untrusted Developer"** and refuses to
open. This is expected for anything not distributed through TestFlight or the App Store:

**Settings → General → VPN & Device Management → [your Apple ID] → Trust**

Simulator builds never hit this — no signing, no certificate, nothing to trust.

### Signing

A **Simulator** build needs no signing identity at all. A **device** build needs one:
either a free personal-team certificate from your own Apple ID (7-day expiry — re-run
`npx expo run:ios --device` to renew) or, for anything you intend to hand to someone
else, a paid Apple Developer Program membership. If you get there, Route 1 is easier:
EAS generates and stores ad hoc or App Store certificates for you.

---

## Verify the build before you ship it

```bash
cd mockup
npm run verify                          # typecheck, lint, 65 unit tests
npx expo export --platform ios          # proves the JS bundle compiles
```

`expo export` catches import errors, bad routes and Metro problems in about 30 seconds —
much cheaper than finding them 15 minutes into a cloud build.

---

## App Store (later, not needed for testing)

TestFlight (above) covers real users before launch. Full store submission — accounts,
privacy labels, App Review, Sign in with Apple — is its own project:
[Shipping to the Stores](../docs/03-production/04-shipping-to-stores.md).

```bash
eas build --platform ios --profile production
eas submit --platform ios
```

---

## Why iOS is different from the Android APK flow

Android lets any device install any signed `.apk` you hand it — that's what
[`ANDROID-BUILD.md`](./ANDROID-BUILD.md) Option B/C produce. iOS has no equivalent:
every install has to be authorized by Apple in one of three ways, and none of them is
"download a file and tap it":

| | Who can install it | Needs an Apple Developer Program membership? | Expires |
|---|---|---|---|
| **Simulator** | Anyone with a Mac, no iPhone required | No | Never |
| **Ad hoc device build** | Only iPhones registered by UDID *before* the build | Yes ($99/yr) | 1 year, or when the profile is revoked |
| **TestFlight** | Anyone you invite by email, no device registration | Yes ($99/yr) | Build expires after 90 days |
| **Personal-team local build** (Route 2, no paid account) | Only your own device, built from your own Mac | No, but limited to devices Xcode itself installs to | 7 days |

That's why this guide branches early: pick Simulator if you just want to see it running
and don't have an Apple Developer Program membership; pick the device route once you do.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Installed expo-updates and configured EAS Update. Command must be re-run` | One-time EAS Update setup on the first build (Android or iOS, whichever ran first) | Not a failure — run the same `eas build` command again, then commit the `app.json` / `package.json` changes |
| "Untrusted Developer" on the phone | Personal-team or ad hoc signed build, not yet trusted | Settings → General → VPN & Device Management → trust the profile |
| App stops launching after about a week | Free personal-team provisioning profile expired (7 days) | Re-run `npx expo run:ios --device` to renew, or move to a paid Apple Developer Program membership |
| "Unable to Install" / device not eligible for an ad hoc build | Device wasn't registered before that build ran | `eas device:create`, then rebuild — registering after the fact doesn't retroactively add the device |
| EAS build fails fetching credentials | No active Apple Developer Program membership, or first-time credentials setup was declined | `eas credentials` to walk through certificate/profile setup manually; confirm the membership is active at developer.apple.com |
| Simulator build won't launch — "no simulator runtime" | No iOS runtime downloaded in Xcode | Xcode → Settings → Platforms → download an iOS runtime |
| CocoaPods errors during `prebuild` or `run:ios` | Stale Pods | `cd ios && pod install --repo-update`, or delete `ios/Pods` and `ios/Podfile.lock` and run `npx expo prebuild --platform ios --clean` again |
| Metro cannot connect from the phone | Same as Android | `npx expo start --tunnel` |
| Fonts or icons missing after a build | Stale Metro cache | `npx expo start -c` |

---

## What gets built

| Field | Value | Where to change it |
|---|---|---|
| App name | Hamlet HQ | `app.json` → `expo.name` |
| Bundle identifier | `app.hamlethq.mockup` | `app.json` → `expo.ios.bundleIdentifier` |
| Version | `1.0.0` | `app.json` → `expo.version` |
| Build number | managed by EAS | `eas.json` → `appVersionSource: "remote"` |
| Icon | `assets/icon.png` | regenerate, keep 1024×1024, no alpha channel |
| Splash | white ground, lime mark | `app.json` → `expo.plugins` → `expo-splash-screen` |

Changing anything in `app.json` requires a fresh build — those values are baked into the
native project, not shipped over the air.
