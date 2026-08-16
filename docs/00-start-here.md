# Start Here

Read this once, end to end. It's 10 minutes and it will save you weeks.

---

## 1. What you're actually signing up for

You want three things at once:

1. **Learn React Native properly** — not "I can make a screen," but "I understand
   the threading model well enough to debug a dropped frame."
2. **Practice on a real app** — muscle memory, not tutorials you follow along with.
3. **Ship Hamlet HQ** — a production HOA platform handling other people's money.

These have very different failure modes, and the biggest risk is confusing them.
The classic founder mistake is to start building the real product on day 3, learn
React Native *through* it, and end up with a codebase whose foundations were laid by
someone (you, three months ago) who didn't know what they were doing yet — and which
now processes payments.

So the plan is deliberately staged:

```
Weeks 1–3    Foundations       Learn the platform. Throwaway code.
Weeks 4–9    Trailhead         Build the practice app. Real quality, low stakes.
Weeks 10–11  Production        Testing, CI/CD, store release. Ship Trailhead.
Weeks 12–14  Hamlet HQ         Start the real thing, on foundations you understand.
```

You will have shipped a real app to TestFlight and Play Console **before** you write
line one of your startup. That is the entire point.

---

## 2. The two mindsets you need to hold simultaneously

### "I am a beginner at this platform"

You're a strong React developer. That's worth a lot — roughly 60% of React Native is
just React. But the other 40% is genuinely new and it's the part that bites:

- Layout behaves differently (no CSS grid, no `position: fixed`, different defaults)
- There are two threads that matter and blocking either one is visible to the user
- Native permissions, app lifecycle, background execution, deep links
- The build system is genuinely complicated, and when it breaks it breaks natively
- Two platforms with real behavioral differences you can't polyfill away

Be humble about that 40%. Most React devs who "know React Native" have never
debugged a native crash or shipped a config plugin.

### "I am a senior engineer building a production system"

Simultaneously: don't write beginner code. You know what good architecture looks
like. You know what tests are for. Apply all of it from day one. The practice app is
practice at *React Native*, not practice at *engineering*.

Concretely: Trailhead gets TypeScript strict mode, tests, CI, and code review — same
as Hamlet HQ would. The only thing that differs is the stakes.

---

## 3. Your existing skills, mapped

Here's the honest accounting of what transfers.

| You know | Transfers? | Notes |
|---|---|---|
| React (hooks, composition, context) | ✅ 100% | Identical. Same React 19.2. |
| TypeScript | ✅ 100% | Identical, and more important here. |
| Tailwind CSS | ✅ ~85% | Via NativeWind. Layout utilities work; some CSS has no native analog. |
| shadcn/ui | ✅ ~80% | Via React Native Reusables — same copy-paste-and-own philosophy. |
| React Router / Next.js routing | ✅ ~80% | Expo Router is file-based, very close to Next.js App Router. |
| TanStack Query | ✅ 100% | Same library, plus offline persistence. |
| React Hook Form + Zod | ✅ 100% | Same libraries. |
| CSS layout | ⚠️ ~50% | Flexbox transfers. Grid, floats, `position: fixed` don't exist. |
| DOM APIs | ❌ 0% | No `window`, no `document`, no `localStorage`. |
| Web deployment | ❌ 0% | App stores are a completely different world. Budget real time for this. |
| Browser DevTools | ⚠️ ~40% | React DevTools works. Network/perf tooling is different. |

**The single biggest adjustment:** on the web you ship a URL and everyone has it in
30 seconds. On mobile you ship a binary through a review process to users who may
never update. Everything about release engineering is different, and it's covered in
[03-production](./03-production/).

---

## 4. What to install before week 1

Full instructions in [environment setup](./01-foundations/03-environment-setup.md).
The short version:

**Required for both platforms:**
- Node.js 20 LTS or 22 LTS (use `nvm` or `fnm`)
- Git
- A package manager — this curriculum uses `pnpm`, but npm/yarn/bun are fine
- [Expo Go](https://expo.dev/go) on a physical phone (for the first two weeks)

**For Android (works on macOS, Windows, Linux):**
- Android Studio + Android SDK + an emulator image
- JDK 17

**For iOS (macOS only — this is a hard requirement):**
- Xcode + Command Line Tools
- iOS Simulator
- CocoaPods

> **If you don't have a Mac:** you can do ~80% of this curriculum on Windows or
> Linux targeting Android. For iOS builds you'll need either a Mac, a cloud Mac
> (MacStadium, Scaleway), or **EAS Build** — which compiles iOS in Expo's cloud and
> is genuinely the pragmatic answer for a solo founder. You still cannot run the iOS
> *simulator* without macOS, but you can build, sign, and ship iOS apps. Details in
> [CI/CD with EAS](./03-production/03-ci-cd-with-eas.md).

**AI tooling:**
- Claude Code (`npm i -g @anthropic-ai/claude-code`)
- Cursor
- Read [the AI operating model](./04-ai-workflow/01-operating-model.md) before you
  point either of them at real code.

---

## 5. The core decision: Expo, not bare React Native

You'll see debate about this. For your situation the answer is unambiguous:
**use Expo.** Specifically the managed workflow with config plugins and development
builds.

**Why:**

- **EAS Build** compiles iOS in the cloud. As a solo founder this is worth the entire
  subscription cost on its own.
- **EAS Update** ships JS-only fixes over the air without an app store review. When
  you have a bug in production at 11pm, this is the difference between a 5-minute fix
  and a 3-day review cycle.
- **Config plugins** mean you get native configuration without hand-editing Xcode
  projects — while still being able to drop to native when you need to.
- The "Expo can't do native modules" objection has been false since SDK 43. With
  development builds you can use *any* native library.
- Expo Router, expo-image, expo-notifications, expo-sqlite are best-in-class and
  maintained in lockstep with the SDK.

**When you'd choose bare RN:** you're integrating into an existing native app, you
need a native capability Expo actively blocks (rare), or you have a dedicated native
team. None of these apply to you.

You can always `expo prebuild` and take full control of the native projects later.
It's a one-way door you're unlikely to walk through, not a cage.

---

## 6. The stack you'll use

Decided once, here, so you never have to re-litigate it mid-project. Full rationale
and rejected alternatives in [stack decisions](./08-reference/stack-decisions.md).

| Concern | Choice | Your web equivalent |
|---|---|---|
| Framework | Expo SDK 57 | Next.js |
| Routing | Expo Router | Next.js App Router |
| Language | TypeScript (strict) | same |
| Styling | NativeWind 4 | Tailwind CSS |
| Components | React Native Reusables | shadcn/ui |
| Server state | TanStack Query | same |
| Client state | Zustand | same |
| Forms | React Hook Form + Zod | same |
| Lists | FlashList 2 | — |
| Animation | Reanimated 4 | Framer Motion |
| Backend | Supabase | Supabase / Postgres |
| Payments | Stripe | same |
| Unit tests | Jest + Testing Library | same |
| E2E | Maestro | Playwright |
| Build/deploy | EAS | Vercel |
| Errors | Sentry | same |

Notice how much is *identical* to your web stack. That's not an accident — it's the
main reason this stack was chosen over, say, Flutter. Your existing knowledge is the
asset; the stack is picked to maximize how much of it carries over.

---

## 7. How to use AI on this project (the short version)

The long version is [04-ai-workflow](./04-ai-workflow/). The rules that matter most:

1. **Never accept code you can't explain.** If you can't explain what a diff does to
   an imaginary colleague, you don't own it yet. Ask the AI to walk you through it,
   or rewrite it yourself. This is non-negotiable and it's the whole reason you're
   doing a practice app first.

2. **AI writes, you architect.** Decide the file structure, the data model, and the
   boundaries yourself. Hand the AI well-scoped work inside those boundaries.

3. **Some code is hand-checked, always.** Money, auth, permissions, migrations, and
   anything touching native config. AI can draft it; you read every line.

4. **Make correctness machine-checkable.** TypeScript strict, ESLint, tests, CI. The
   more the machine can verify, the more you can safely delegate.

5. **Small diffs.** A 40-line diff you review properly beats a 400-line diff you skim.

6. **During weeks 1–3, write code by hand.** You cannot review what you've never
   written. Use AI to explain, not to generate, until you've built the muscle.

That last point is the one people skip, and it's why they end up with a codebase they
can't maintain.

---

## 8. What "done" looks like

You'll know the curriculum worked when you can:

- [ ] Build a screen from a design without looking up flexbox
- [ ] Debug why a list drops frames, and fix it
- [ ] Read a native crash log and know where to start
- [ ] Set up push notifications end to end on both platforms
- [ ] Explain what happens between `<Text>` in JSX and pixels on screen
- [ ] Ship an OTA update, and know when you *can't*
- [ ] Get an app through App Store review
- [ ] Review a 300-line AI-generated PR and find the two real bugs in it

Track progress against [the study plan](./07-study-plan.md).

---

## 9. Your first three actions

1. Set up your environment: [03-environment-setup.md](./01-foundations/03-environment-setup.md)
2. Read the mental-model doc: [02-from-web-to-native.md](./01-foundations/02-from-web-to-native.md)
3. Open [the study plan](./07-study-plan.md) and put week 1 in your calendar.

Then start Week 1.
