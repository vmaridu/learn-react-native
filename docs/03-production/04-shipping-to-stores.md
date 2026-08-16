# Shipping to the Stores

The App Store and Play Store are a genuinely different world from web deployment.
Budget real time for this — first submission commonly takes a week of calendar time.

---

## 1. Accounts

Set these up **early**. Verification takes days, and you don't want it blocking a
launch.

### Apple Developer Program — $99/year

- Individual or Organization. **Organization requires a D-U-N-S number**, which takes
  1–2 weeks to obtain. If Hamlet HQ will be an LLC, start this now.
- Individual accounts show your personal name as the seller. For a startup selling to
  HOA boards, an Organization account looks materially more credible.

### Google Play Developer — $25 one-time

- Individual accounts now require **identity verification** and, for new personal
  accounts, a **closed testing period with 12+ testers for 14 days** before you can
  publish publicly.
- ⚠️ **Plan for this.** It's a hard gate that surprises people at launch. Start the
  closed test as early as you can.
- Organization accounts skip the 12-tester requirement but need a D-U-N-S number too.

---

## 2. Store assets

Prepare these before you need them.

| Asset | iOS | Android |
|---|---|---|
| App icon | 1024×1024 PNG, no alpha, no rounded corners | 512×512 PNG + adaptive icon layers |
| Screenshots | 6.7" required; 6.5"/5.5" optional | Phone required; tablet if supported |
| Feature graphic | — | 1024×500 |
| Preview video | Optional, 15–30s | Optional, YouTube link |
| Description | 4000 chars | 4000 chars |
| Subtitle / short description | 30 chars | 80 chars |
| Keywords | 100 chars, comma-separated | (derived from description) |
| Privacy policy URL | **Required** | **Required** |
| Support URL | Required | Required |

**Screenshots matter more than you think.** Most people decide from the first two.
Use device frames with a short caption on each rather than raw screenshots:

```
1. "Book the clubhouse in 3 taps"
2. "Never miss a community notice"
3. "Pay dues without writing a check"
4. "See every community event"
```

Tools: [Fastlane frameit](https://docs.fastlane.tools/actions/frameit/), Figma
templates, or [Screenshots Pro](https://screenshots.pro).

---

## 3. Privacy disclosures

Both stores require you to declare what data you collect. **Getting this wrong is a
rejection, and lying is a removal.**

### App Store — Privacy Nutrition Labels

Declared in App Store Connect. For Hamlet HQ you'll be declaring roughly:

| Data | Collected | Linked to user | Used for tracking |
|---|---|---|---|
| Name | ✅ | ✅ | ❌ |
| Email | ✅ | ✅ | ❌ |
| Phone | ✅ | ✅ | ❌ |
| Physical address (unit) | ✅ | ✅ | ❌ |
| Payment info | ✅ (via Stripe) | ✅ | ❌ |
| Photos | ✅ | ✅ | ❌ |
| Coarse location | ✅ | ✅ | ❌ |
| Crash data | ✅ | ❌ | ❌ |
| Usage data | ✅ | ❌ | ❌ |

**"Used for tracking"** has a specific meaning: linking data with third-party data for
advertising. If you answer yes, you must implement App Tracking Transparency. For
Hamlet HQ the answer should be **no** across the board — don't create an ATT
requirement you don't need.

### Play Console — Data Safety

Similar form, plus:
- Whether data is encrypted in transit (yes — HTTPS)
- Whether users can request deletion (**yes — required**)
- Data retention policy

### Account deletion — required by both

Apple has required in-app account deletion since 2022. Play requires a deletion path
too, including a **web URL** that works without installing the app.

```tsx
// Settings → Delete account
async function deleteAccount() {
  Alert.alert(
    'Delete your account?',
    'This permanently removes your profile, reservations, and payment history. Your community will be notified. This cannot be undone.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: confirmDelete },
    ]
  );
}
```

⚠️ Deletion interacts with your financial records. You cannot simply delete a resident
who has payment history — you have accounting and legal retention obligations. The
right approach:

- Anonymize the profile (name → "Former resident", clear email/phone/avatar)
- **Retain** ledger entries and payments, unlinked from personal identifiers
- Delete auth credentials so they can't sign in
- Document this in your privacy policy

---

## 4. Common rejection reasons

The ones that will actually hit you.

| Reason | Fix |
|---|---|
| **Vague permission strings** | "This app needs camera access" → "Attach photos to maintenance requests" |
| **Broken demo account** | Provide working credentials in App Review notes, and **test them yourself** |
| **Missing account deletion** | Add it |
| **Crashes on review device** | Test on the oldest OS you support |
| **Incomplete app** | No placeholder screens, no "coming soon" |
| **Sign in with Apple missing** | If you offer Google/Facebook login, Apple login is **mandatory** on iOS |
| **Payments outside IAP** | See below — important for you |
| **Privacy policy URL 404s** | Host it before submitting |
| **Login required with no way to see anything** | Consider a demo mode or explain in notes |

### Sign in with Apple

If Hamlet HQ offers Google Sign-In, **you must also offer Sign in with Apple** on iOS.
There's no way around this.

```bash
npx expo install expo-apple-authentication
```

```json
{ "expo": { "ios": { "usesAppleSignIn": true } } }
```

Simplest way to avoid the requirement entirely: offer only email/magic-link auth in v1.

### In-app purchase vs external payments — read this carefully

Apple requires IAP (and takes 15–30%) for **digital goods and services consumed in the
app**. It does **not** apply to physical goods or real-world services.

**HOA dues and amenity reservations are real-world services.** Booking a physical
clubhouse and paying property dues are analogous to booking a hotel room — Stripe is
correct and IAP does not apply.

**But:** be explicit in your App Review notes.

> "Hamlet HQ facilitates payment for real-world services: homeowners association dues
> and reservations of physical community amenities (pool, clubhouse, tennis courts).
> Per App Store Review Guideline 3.1.3(e), these are physical/real-world services and
> are processed via Stripe rather than in-app purchase."

If you ever add a *digital* subscription (premium app features), that portion does need
IAP. Keep the line clear.

---

## 5. Submission

```bash
eas build --profile production --platform all
eas submit --profile production --platform all
```

### App Store Connect

1. Create the app listing (bundle ID must match exactly)
2. Fill metadata, screenshots, privacy labels
3. Select the build (~15 min to process after upload)
4. **App Review Information** — demo account, notes, contact
5. Submit

**Review time:** typically 24–48 hours now. Rejections come with a message; you reply
in Resolution Center. A rejection is normal, not a disaster — read it carefully, fix,
resubmit.

### Play Console

1. Create the app
2. Complete all "Set up your app" tasks (content rating, target audience, data safety,
   ads declaration)
3. Upload the AAB to **Internal testing** first
4. Promote: Internal → Closed → Open → Production

**Review time:** a few hours to a few days. First submissions take longest.

⚠️ Remember the **12 testers for 14 days** requirement on new personal accounts. Start
that clock early.

---

## 6. TestFlight and internal testing

Get the app to real users **before** public release.

**TestFlight (iOS):**
- Internal testers (up to 100, your team) — no review needed, instant
- External testers (up to 10,000) — requires a light review of the first build
- Builds expire after 90 days

**Play internal testing:**
- Up to 100 testers
- No review
- Available within minutes

```bash
eas submit --platform ios --profile production    # → TestFlight
eas submit --platform android --profile production # → internal track
```

**Get five real people using Trailhead** before Hamlet HQ. Watching someone use your app
for the first time, without helping them, is uncomfortable and more informative than any
amount of self-testing.

---

## 7. Store listing optimization

You'll compete on discoverability eventually. The basics:

**Title** — 30 chars. Include the primary keyword.
`Hamlet HQ: HOA Community`

**Subtitle** (iOS) — 30 chars.
`Reserve, pay, stay informed`

**Keywords** (iOS) — 100 chars, comma-separated, no spaces, no repeats from the title.
`hoa,homeowners,association,community,amenity,clubhouse,dues,neighborhood,property`

**Description** — first three lines are what people see before "more". Lead with the
value.

**For a B2B2C product like yours**, most installs will come from a board telling
residents to install it, not from search. So prioritize:
1. A memorable, findable exact name
2. Screenshots that reassure ("this is legitimate, my board really uses this")
3. Reviews — ask happy residents at the right moment

---

## 8. After launch

**Watch for 48 hours:**
- Sentry crash-free rate (target > 99.5%)
- Store reviews
- Support email
- Analytics funnel — where do people drop off?

**Respond to every review** for the first few months. It's visible to prospective
customers, and a board evaluating you *will* read them.

**Have a rollback plan:**
- JS bug → `eas update:republish` (minutes)
- Native bug → halt the phased rollout, submit a fix (days)

That asymmetry is why phased rollout matters so much.

---

## 9. First-launch checklist

```
ACCOUNTS
□ Apple Developer active (D-U-N-S if Organization)
□ Google Play Developer active, identity verified
□ 12 testers / 14 days started (new personal Play accounts)

LEGAL
□ Privacy policy hosted and reachable
□ Terms of service hosted
□ Account deletion works, in-app AND via web URL
□ Data retention documented

ASSETS
□ Icons: 1024×1024 (iOS), 512×512 + adaptive (Android)
□ Screenshots for all required sizes
□ Feature graphic (Android)
□ Description, subtitle, keywords

COMPLIANCE
□ Privacy labels / Data safety completed accurately
□ Permission strings specific and user-facing
□ Sign in with Apple, if any social login is offered
□ App Review note explaining Stripe vs IAP
□ Content rating completed

TECHNICAL
□ Production build points at production backend + LIVE Stripe
□ Sentry with source maps
□ Tested on oldest supported OS version
□ Tested on a low-end Android device
□ Demo account works — verified by you, today

SUBMIT
□ TestFlight / internal testing first
□ 5+ external testers
□ Their bugs fixed
□ Phased rollout enabled
```

---

## Check yourself

1. Why don't HOA dues require Apple's in-app purchase?
2. What triggers the Sign in with Apple requirement?
3. Why can't you hard-delete a resident with payment history?
4. What's the Play Store gate that surprises new solo developers?
5. Why enable phased rollout?

<details>
<summary>Answers</summary>

1. IAP applies to digital goods and services consumed within the app. Dues and amenity
   reservations are payments for real-world services and physical facilities, which
   guideline 3.1.3(e) exempts — the same category as booking a hotel room.
2. Offering any third-party social login (Google, Facebook) on iOS makes Sign in with
   Apple mandatory. Offering only email/magic-link avoids it.
3. Financial and accounting records have retention obligations, and ledger integrity
   matters for the community's books. Anonymize the profile and delete credentials
   while retaining unlinked financial records — and document that in your privacy
   policy.
4. New personal Play Developer accounts must run a closed test with 12+ testers for 14
   continuous days before publishing publicly. It's a hard calendar gate.
5. A bad build reaches a small percentage of users instead of everyone, and you can halt
   it. Native bugs take days to fix through review, so limiting blast radius is the only
   real protection.

</details>

---

## Sources

- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Play Console — Policy Center](https://play.google.com/console/about/policy/)
- [Expo — App stores best practices](https://docs.expo.dev/distribution/app-stores/)

**Next:** [Observability →](./05-observability.md)
