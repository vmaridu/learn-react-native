# CI/CD with EAS

The release pipeline. This is the part of mobile development with no web equivalent,
and it's where most solo founders lose the most time.

---

## 1. The three EAS services

| Service | Does | Web analogue |
|---|---|---|
| **EAS Build** | Compiles iOS and Android in the cloud | CI build |
| **EAS Submit** | Uploads to App Store Connect / Play Console | Deploy |
| **EAS Update** | Ships JS-only changes over the air | Instant deploy |

**Why this matters for you specifically:** EAS Build compiles iOS **without a Mac**.
For a solo founder, this alone justifies the cost. And EAS Update means a JS bug found
at 11pm is fixed in 10 minutes rather than after a 1–3 day review.

```bash
npm install -g eas-cli
eas login
eas init
```

---

## 2. Build profiles

`eas.json` is the heart of the pipeline.

```json
{
  "cli": { "version": ">= 12.0.0", "appVersionSource": "remote" },
  "build": {
    "base": {
      "node": "22.11.0",
      "env": { "EXPO_PUBLIC_ENV": "development" }
    },
    "development": {
      "extends": "base",
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development",
      "env": {
        "APP_VARIANT": "development",
        "EXPO_PUBLIC_ENV": "development"
      },
      "ios": { "simulator": true },
      "android": { "buildType": "apk" }
    },
    "preview": {
      "extends": "base",
      "distribution": "internal",
      "channel": "preview",
      "env": {
        "APP_VARIANT": "staging",
        "EXPO_PUBLIC_ENV": "staging"
      },
      "android": { "buildType": "apk" }
    },
    "production": {
      "extends": "base",
      "channel": "production",
      "autoIncrement": true,
      "env": {
        "APP_VARIANT": "production",
        "EXPO_PUBLIC_ENV": "production"
      },
      "android": { "buildType": "app-bundle" }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "you@example.com",
        "ascAppId": "1234567890",
        "appleTeamId": "ABCD123456"
      },
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

**Key decisions encoded here:**

| Setting | Why |
|---|---|
| `appVersionSource: remote` | EAS manages build numbers — no more "I forgot to bump it" |
| `autoIncrement` on production | Build number increments automatically |
| `buildType: apk` for dev/preview | Directly installable; AAB isn't |
| `buildType: app-bundle` for production | Required by Play Store |
| `simulator: true` for dev iOS | Runs in the simulator without a device |
| `channel` per profile | Routes EAS Updates correctly |

---

## 3. App variants

Install dev, staging, and production side by side on one device. Non-negotiable once
you have real users — you must never test against production data by accident.

```ts
// app.config.ts
import type { ExpoConfig, ConfigContext } from 'expo/config';

const variant = process.env.APP_VARIANT ?? 'production';

const names = {
  development: 'Hamlet (Dev)',
  staging: 'Hamlet (Stg)',
  production: 'Hamlet HQ',
} as const;

const ids = {
  development: 'com.hamlethq.app.dev',
  staging: 'com.hamlethq.app.staging',
  production: 'com.hamlethq.app',
} as const;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: names[variant],
  slug: 'hamlet-hq',
  scheme: 'hamlethq',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    bundleIdentifier: ids[variant],
    supportsTablet: true,
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
  },
  android: {
    package: ids[variant],
    edgeToEdgeEnabled: true,
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    ['expo-notifications', { icon: './assets/notification-icon.png', color: '#0f766e' }],
    ['@stripe/stripe-react-native', { merchantIdentifier: 'merchant.com.hamlethq.app' }],
    ['@sentry/react-native/expo', { organization: 'hamlet-hq', project: 'mobile' }],
  ],
  experiments: { typedRoutes: true },
  extra: { eas: { projectId: process.env.EAS_PROJECT_ID } },
});
```

> `ITSAppUsesNonExemptEncryption: false` saves you an export-compliance questionnaire on
> every single TestFlight upload. Set it if you only use standard HTTPS.

---

## 4. Secrets

Three tiers, and confusing them is a security incident.

| Kind | Where | Visible to users? |
|---|---|---|
| Public config (Supabase URL, anon key, Stripe **publishable** key) | `EXPO_PUBLIC_*` env | ✅ **Yes — embedded in the bundle** |
| Build-time secrets (service account keys, Sentry auth token) | EAS secrets | ❌ No |
| Runtime secrets (Stripe **secret** key, service role key) | Supabase Edge Function env | ❌ No — never in the app |

```bash
eas secret:create --scope project --name SENTRY_AUTH_TOKEN --value "..."
eas secret:create --scope project --name GOOGLE_SERVICE_ACCOUNT --type file --value ./key.json
eas secret:list
```

> 🔴 **`EXPO_PUBLIC_*` variables are in the JS bundle.** Anyone can download your app
> from the App Store, unzip the IPA, and read them. They are configuration, not secrets.
>
> A Supabase anon key is *designed* to be public — RLS is what protects your data. A
> Stripe **secret** key in `EXPO_PUBLIC_STRIPE_SECRET` would let anyone charge cards on
> your account. Know which is which.

---

## 5. GitHub Actions

### PR checks

```yaml
# .github/workflows/pr.yml
name: PR
on: pull_request

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }

      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test -- --coverage
      - run: npx expo-doctor
      - run: npx expo install --check

  rls-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase start
      - run: supabase test db          # ← the authorization suite
```

### Preview builds on PRs

```yaml
# .github/workflows/preview.yml
name: Preview build
on:
  pull_request:
    types: [labeled]

jobs:
  build:
    if: github.event.label.name == 'build-preview'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: pnpm install --frozen-lockfile
      - run: eas build --profile preview --platform all --non-interactive --no-wait
```

Label-gated, because builds consume EAS credits — you don't want one on every push.

### Production release

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    tags: ['v*']

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: expo/expo-github-action@v8
        with: { eas-version: latest, token: ${{ secrets.EXPO_TOKEN }} }

      - run: pnpm install --frozen-lockfile
      - run: pnpm verify

      - run: eas build --profile production --platform all --non-interactive
      - run: eas submit --profile production --platform all --non-interactive
```

Tag-triggered, so releases are deliberate:

```bash
git tag v1.2.0 && git push origin v1.2.0
```

---

## 6. EAS Update — OTA

**The most useful feature for a solo founder.** Ship JS/asset changes without a store
review.

```bash
npx expo install expo-updates

eas update --branch production --message "Fix booking timezone display"
```

### What you CAN ship OTA

- ✅ JavaScript / TypeScript changes
- ✅ React components, styles, business logic
- ✅ Images, fonts, other bundled assets
- ✅ Most bug fixes

### What you CANNOT ship OTA

- ❌ New native dependencies
- ❌ Changes to `app.json` native config (permissions, plugins)
- ❌ SDK upgrades
- ❌ New permissions
- ❌ Anything requiring a rebuild

**The mental model:** an OTA update replaces the JS bundle inside an existing binary.
If your change requires different native code, it needs a new binary.

### Runtime versions — the safety mechanism

```json
// app.json
{ "expo": { "runtimeVersion": { "policy": "appVersion" } } }
```

An update only reaches builds with a matching runtime version. This is what prevents
you shipping JS that calls a native module the installed binary doesn't have — which
would crash on launch, for everyone, with no way to recover except a store update.

**Bump `runtimeVersion` whenever native code changes.** The `appVersion` policy ties it
to your version string, which handles this automatically if you bump versions on native
changes.

### Rollback

```bash
eas update:republish --branch production --group <previous-update-id>
```

Practice this **before** you need it. When production is broken at 11pm is not when you
want to read the docs.

### Update strategy

```ts
// app.json
{
  "expo": {
    "updates": {
      "enabled": true,
      "checkAutomatically": "ON_LOAD",
      "fallbackToCacheTimeout": 0
    }
  }
}
```

`fallbackToCacheTimeout: 0` means the app launches instantly with the cached bundle and
downloads the update in the background, applying it on next launch. Better UX than
blocking startup on a network request.

For urgent fixes, prompt the user:

```tsx
const { isUpdateAvailable, isUpdatePending } = Updates.useUpdates();

useEffect(() => {
  if (isUpdatePending) {
    Alert.alert('Update ready', 'Restart to apply the latest fixes.', [
      { text: 'Later' },
      { text: 'Restart', onPress: () => Updates.reloadAsync() },
    ]);
  }
}, [isUpdatePending]);
```

> ⚠️ **Store policy:** OTA updates must not substantially change the app's purpose or
> add features that would need review. Bug fixes and improvements are fine; shipping a
> whole new feature set to bypass review is a policy violation that can get you removed.

---

## 7. Credentials

The part that confuses everyone. Let EAS manage it.

```bash
eas credentials
```

**iOS** needs:
- Distribution certificate
- Provisioning profile
- Push notification key (APNs)

**Android** needs:
- Upload keystore
- Google Play service account JSON

EAS generates and stores all of these. **Do not manage them manually** unless you have a
specific reason.

> 🔴 **Back up your Android keystore.** If you lose it, you **cannot update your app on
> Google Play — ever.** You'd have to publish a new listing and lose all your users and
> reviews.
>
> ```bash
> eas credentials      # → Android → Download keystore
> ```
> Store it in a password manager. Do this today, not later.
>
> (Google Play App Signing mitigates this if enabled, but back it up regardless.)

---

## 8. Versioning

Two numbers, and they do different things:

| | Purpose | Example |
|---|---|---|
| `version` | User-visible | `1.2.0` |
| `buildNumber` (iOS) / `versionCode` (Android) | Must increase every upload | `47` |

With `appVersionSource: "remote"` and `autoIncrement: true`, EAS handles the build
number. You only manage `version`, using semver:

- **Patch** (1.2.0 → 1.2.1) — bug fixes, usually OTA-able
- **Minor** (1.2.0 → 1.3.0) — new features
- **Major** (1.2.0 → 2.0.0) — significant redesign

---

## 9. The release checklist

```
PRE-RELEASE
□ pnpm verify passes
□ Maestro flows pass on both platforms
□ RLS tests pass
□ Tested on a physical iOS device
□ Tested on a physical Android device (ideally a cheap one)
□ Tested on a Samsung or Xiaomi (battery manager behaviour)
□ Dark mode checked on every changed screen
□ Accessibility pass on new screens
□ version bumped
□ Release notes written
□ Sentry release created; source maps uploaded

BUILD
□ eas build --profile production --platform all
□ Install and smoke-test the production build itself
□ Verify it points at PRODUCTION Supabase and LIVE Stripe

SUBMIT
□ eas submit --platform all
□ App Store: submit for review
□ Play: promote internal → closed → open → production

POST-RELEASE
□ Watch Sentry for 24h
□ Watch crash-free rate
□ Watch store reviews
□ Have a rollback plan ready
```

---

## 10. Phased rollout

Never release to 100% of users at once.

**iOS** — App Store Connect → "Phased Release for Automatic Updates": 1%, 2%, 5%, 10%,
20%, 50%, 100% over 7 days. Pausable.

**Android** — Play Console staged rollout, and you control the percentage directly.
Start at 10%.

**Why it matters:** if version 1.3.0 crashes on Android 12, a staged rollout means 10%
of users affected instead of everyone, and you halt it before it spreads. Combined with
Sentry alerts, this is the single most effective safety mechanism in mobile releases.

---

## 11. Costs

Realistic budget for a solo founder:

| Item | Cost |
|---|---|
| Apple Developer Program | $99/year |
| Google Play Developer | $25 one-time |
| EAS Production plan | ~$99/month (free tier exists, with limited concurrency) |
| Supabase Pro | ~$25/month |
| Sentry | Free tier is generous |

**~$150/month** to run a production mobile startup. Start on free tiers — EAS's free
tier is workable while you're learning; you'll want the paid plan once build queue times
start costing you real hours.

---

## Check yourself

1. What can and cannot ship via EAS Update?
2. What does `runtimeVersion` protect against?
3. Why must you back up your Android keystore?
4. Why separate `bundleIdentifier` per app variant?
5. Which key is safe in `EXPO_PUBLIC_*` and which is not?

<details>
<summary>Answers</summary>

1. Can: JS/TS, components, styles, logic, bundled assets. Cannot: new native
   dependencies, native config changes, new permissions, SDK upgrades — anything
   requiring a recompiled binary.
2. Shipping a JS bundle to a binary that doesn't have the native code it needs. Without
   matching runtime versions, an update could reference a native module the installed
   app lacks, crashing on launch for everyone with no recovery path except a store
   update.
3. Losing it means you can never update your app on Google Play again — you'd have to
   publish a new listing and lose all existing users, reviews, and ranking.
4. Different IDs make the OS treat them as separate apps, so dev, staging, and
   production install side by side. Without it you can only have one, and you'll
   eventually test against production data by accident.
5. Safe: Supabase URL and anon key (designed to be public; RLS protects the data),
   Stripe *publishable* key. Not safe: Stripe *secret* key, Supabase service role key —
   those live only in Edge Functions, never in the client bundle.

</details>

---

## Sources

- [EAS Build](https://docs.expo.dev/build/introduction/)
- [EAS Update](https://docs.expo.dev/eas-update/introduction/)
- [EAS Submit](https://docs.expo.dev/submit/introduction/)
- [Expo — App variants](https://docs.expo.dev/tutorial/eas/multiple-app-variants/)

**Next:** [Shipping to the stores →](./04-shipping-to-stores.md)
