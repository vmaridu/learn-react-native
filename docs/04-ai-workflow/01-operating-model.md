# The AI Operating Model

How working engineers actually use Claude Code and Cursor on production codebases —
and the discipline that separates leverage from liability.

---

## 1. The honest framing

You said you'll be reading the code even though AI generates it. That instinct is
correct, and it's the single thing that determines whether AI makes you faster or
buries you.

Here's the failure mode, stated plainly:

> AI makes it *feel* productive to generate code you don't understand. You ship
> features fast for six weeks. Then you hit a bug in a system nobody — including you —
> understands, and you can't fix it, because you never built the mental model. Your
> velocity goes to zero at exactly the moment you have users.

This is now a common startup failure pattern. It's not a hypothetical.

The counter-discipline is simple to state and hard to hold:

> **Never merge code you can't explain to another engineer.**

Everything in this section is machinery for making that sustainable at speed.

---

## 2. The loop

The workflow that actually works, in five phases:

```
┌──────────┐   ┌──────────┐   ┌───────────┐   ┌────────┐   ┌────────┐
│  SPEC    │ → │   PLAN   │ → │ IMPLEMENT │ → │ REVIEW │ → │ VERIFY │
└──────────┘   └──────────┘   └───────────┘   └────────┘   └────────┘
    you        you + AI            AI            you       machine
```

| Phase | Owner | What happens |
|---|---|---|
| **Spec** | **You** | What are we building, what are the constraints, what does done mean |
| **Plan** | You + AI | Files to touch, approach, edge cases. **Approve before code.** |
| **Implement** | AI | Writes the code, in small scoped chunks |
| **Review** | **You** | Read every line. Question anything unclear. |
| **Verify** | Machine | Types, lint, tests, and running it on both platforms |

**The two phases you must never delegate are Spec and Review.** Those are the ones
that require judgment and build understanding. Implementation is the part that's
genuinely commoditized.

### Why planning first matters so much

The single biggest quality lever is **making the AI plan before it writes code**.

Without a plan you get a 400-line diff touching nine files, built on assumptions you
never saw. With a plan you get a 10-line proposal you can correct in 30 seconds,
before any code exists.

```
You:  Before writing any code, give me a plan: which files you'll change,
      what each change does, and any decisions you're unsure about.
      Don't write code yet.

AI:   [plan]

You:  Two changes: use the existing useCommunity hook rather than a new
      one, and put the availability check server-side, not in the component.
      Now implement.
```

That 30-second correction saves an hour of reviewing and unpicking wrong code. Both
Claude Code and Cursor have explicit plan modes for this — use them.

---

## 3. The three tiers of delegation

Not all code deserves the same scrutiny. Triage explicitly.

### 🟢 Tier 1 — Delegate freely

Mechanical, verifiable, low-blast-radius:

- Boilerplate components and screens from a clear spec
- Test scaffolding
- Type definitions from an API schema
- Refactors that types and tests fully cover
- Migrations of a known pattern across many files
- Documentation and comments
- Storybook/kitchen-sink entries

**Review:** skim for correctness, rely on the machine checks.

### 🟡 Tier 2 — Delegate with careful review

Real logic, contained blast radius:

- Feature implementation within an architecture you defined
- Data-fetching hooks and cache invalidation
- Form validation
- Navigation flows
- Animations and gestures
- Performance optimizations

**Review:** read every line. Explain it back to yourself. Test the edge cases the AI
didn't.

### 🔴 Tier 3 — Draft only, you own it

Where mistakes are expensive or invisible:

- **Anything touching money.** Payments, refunds, dues, payouts.
- **Auth and authorization.** Sessions, tokens, roles, RLS policies.
- **Database migrations.** Especially destructive ones.
- **Security boundaries.** What a resident can see about a neighbor.
- **Native config and permissions.** Entitlements, plugins, app IDs.
- **Anything irreversible.** Deletes, external API writes, notifications to real people.

**Review:** treat AI output as a first draft from a talented contractor you've never
met. Read it twice. Write the tests yourself. Have the AI critique its own work in a
separate conversation.

> For Hamlet HQ specifically: **reservations, payments, and broadcast messaging are
> all Tier 3.** A double-booking annoys someone. A double-charge is a chargeback and a
> lost customer. A broadcast to the wrong community is a privacy incident.

---

## 4. Make correctness machine-checkable

The more the machine verifies, the more you can safely delegate. This is the real
unlock — and it's why the [production](../03-production/) section matters so much for
AI-assisted work specifically.

**Set these up before you start delegating heavily:**

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --max-warnings 0",
    "test": "jest",
    "verify": "pnpm typecheck && pnpm lint && pnpm test"
  }
}
```

| Gate | Catches |
|---|---|
| **TypeScript strict** | Hallucinated APIs, wrong shapes, null handling |
| **Typed routes** | Navigation to routes that don't exist |
| **ESLint** | Unused code, bad patterns, React hook violations |
| **Zod at boundaries** | Data that isn't what the types claim |
| **Unit tests** | Business logic regressions |
| **Maestro E2E** | Flows that are broken end to end |
| **CI on every PR** | Everything above, before merge |

Then instruct your agents: *"Run `pnpm verify` before telling me you're done."*

A failing typecheck is a conversation the AI can have with itself. A subtle
authorization bug is one only you will catch.

---

## 5. Small diffs

**A 40-line diff you review properly beats a 400-line diff you skim.** This is the
most-violated rule in AI-assisted development.

Practical rules:

- One task per conversation. Start a new one when the task changes.
- If a change spans more than ~3 files, break it up.
- Commit at each working checkpoint, so you can bisect and revert cleanly.
- If a diff is too big to review carefully, **don't review it carefully — throw it away
  and re-scope.** Reviewing badly is worse than not reviewing, because it feels like
  you did.

```bash
# The habit
git add -p          # stage hunk by hunk — forces you to look at each one
git diff --staged   # read what you're about to commit
```

`git add -p` is genuinely one of the best tools for AI-assisted work. It makes
skimming physically inconvenient.

---

## 6. Learn first, delegate second

**In weeks 1–3 of the study plan, write code by hand.**

This will feel slow and unnecessary. It isn't. You cannot review what you've never
written. The value of your review is entirely a function of your ability to recognize
what's wrong — and that comes from having made the mistakes yourself.

A staged approach:

| Weeks | AI usage |
|---|---|
| 1–3 | **Explain only.** Ask questions, get concepts explained, review *your* code. Don't generate. |
| 4–6 | **Generate, then rewrite.** Have AI produce it, then write it yourself without looking, and diff. |
| 7–9 | **Generate and review.** Normal delegation with careful review. |
| 10+ | **Full workflow.** Spec → plan → implement → review, with tiered scrutiny. |

Weeks 4–6 in particular are worth the discomfort. Diffing your implementation against
the AI's teaches you more than either alone — you'll see idioms you didn't know, and
you'll catch things it got wrong.

**Good "explain mode" prompts:**

```
Explain what this code does line by line, and tell me what would break
if I removed the useCallback.

I wrote this component. Review it as a senior React Native engineer.
What's wrong with it, and what would you do differently?

Why does React Native need Reanimated instead of just animating with
useState? Explain the threading model.
```

---

## 7. Context is the whole game

An AI that doesn't know your codebase writes plausible code that doesn't fit it. Most
"the AI is bad at this" moments are actually context failures.

The fixes, in order of leverage:

1. **`CLAUDE.md` / `.cursor/rules`** — the project constitution. Stack, conventions,
   what not to do. This is the highest-leverage file in your repo.
2. **A kitchen-sink screen** — so the AI can see what components exist and reuse them
   instead of inventing new ones.
3. **Consistent patterns** — if every feature slice looks the same, the AI extrapolates
   correctly. Inconsistency compounds.
4. **Point at specific files** — `@src/features/bookings/hooks.ts` beats "the bookings
   code."
5. **Say what *not* to do** — negative constraints are underused and very effective.

Covered in detail in [context engineering](./04-context-engineering.md).

---

## 8. The anti-patterns

| Anti-pattern | Why it hurts | Do instead |
|---|---|---|
| "Build the whole booking feature" | Huge unreviewable diff, wrong assumptions baked in | Spec → plan → one slice at a time |
| Accepting code you don't understand | Debt that compounds invisibly | Ask for an explanation, or rewrite it |
| Letting AI choose the architecture | You lose the mental model of your own system | You design; AI fills in |
| Same conversation for hours | Context drifts, earlier decisions get forgotten | New conversation per task |
| No tests, "AI wrote it so it's fine" | Nothing catches regressions | Tests are how you delegate safely |
| Trusting library recommendations | Training data is old; packages get abandoned or hallucinated | `npm view <pkg>` every time |
| Skipping review when you're tired | This is exactly when bugs land | Stop working instead |
| Letting AI write migrations unreviewed | Data loss is unrecoverable | Read every migration twice |
| Vibe-coding payments | Chargebacks, fraud, legal exposure | Tier 3 discipline |

---

## 9. A worked example

**Task:** add amenity reservation cancellation to Hamlet HQ.

### ❌ The bad way

```
Add the ability to cancel reservations
```

You get: a component with inline business logic, a direct Supabase call bypassing your
API layer, no refund handling, no cancellation-window rule, no optimistic update, no
tests, and a new `Button` component that duplicates the one you already have.

### ✅ The good way

**Step 1 — you write the spec:**

```
Feature: cancel a reservation

Rules:
- Only the reservation owner or a board member can cancel
- Free cancellation up to 24h before start
- Within 24h: cancellation fee per the community's policy, charged via Stripe
- Cancelling frees the slot immediately for others
- The resident gets a confirmation notification
- Cancelled reservations remain visible in history, marked cancelled

Out of scope: partial cancellation, rescheduling
```

**Step 2 — ask for a plan, not code:**

```
Read src/features/reservations/ and follow the existing patterns there.
Give me a plan for this feature: files to change, what changes in each,
and any decisions you're unsure about. Don't write code yet.

[paste spec]
```

**Step 3 — correct the plan:**

```
Three changes:
- The cancellation-window check goes in the Postgres function, not the
  hook. The client can't be trusted with the fee rule.
- Reuse ConfirmDialog from components/ui, don't build a new modal.
- The fee charge and the slot release must be in one transaction. If the
  charge fails, the cancellation fails.
```

**Step 4 — implement in slices:**

```
Implement just the database migration and the Postgres function.
Stop there.
```

Review it. Then:

```
Now the API layer and the hook.
```

Review. Then the UI. Three reviewable diffs instead of one unreviewable one.

**Step 5 — verify:**

```
Run pnpm verify. Then write a Maestro test for: cancel outside the
window (no fee), cancel inside the window (fee shown and confirmed),
and cancel while offline (queued, no double charge).
```

**Step 6 — your review pass:**

Because this touches money, it's Tier 3. Read every line. Specifically check:
- Can a non-owner cancel? (authorization)
- What if the Stripe charge succeeds but the DB write fails? (consistency)
- What if the user taps cancel twice? (idempotency)
- What if the reservation was already cancelled? (state machine)

Those four questions are ones the AI reliably under-thinks, and they're exactly where
production bugs live.

---

## 10. Your daily rhythm

```
Morning
  1. Pick one task from the plan
  2. Write the spec — 5 minutes, in your own words
  3. Ask for a plan; correct it
  4. Implement in slices; review each

Throughout
  5. pnpm verify before every commit
  6. Run on iOS AND Android before calling anything done
  7. New conversation when the task changes

End of day
  8. Push a branch, open a PR (even solo — it's a review surface)
  9. Read your own diff one more time
 10. Note anything you accepted but didn't fully understand — go back to it
```

That last item is the important one. Keep an explicit list of "things in my codebase I
don't fully understand." If it's growing, slow down. If it's empty, you can go faster.

---

## Check yourself

1. Which two phases of the loop must you never delegate, and why?
2. Which tier is a Supabase RLS policy, and how should you review it?
3. Why write code by hand for the first three weeks?
4. Why is `git add -p` useful specifically for AI-assisted work?
5. Your AI suggests `react-native-super-calendar`. First action?

<details>
<summary>Answers</summary>

1. Spec and Review. Spec is where judgment about *what to build* lives; Review is
   where you build and maintain the mental model of your own system. Delegating either
   means you no longer understand your product.
2. Tier 3 — it's an authorization boundary. Read every line, reason about what each
   policy permits for each role, and write tests that attempt access as the wrong
   user. An RLS bug is a data breach, and it's silent.
3. You cannot review what you've never written. Review quality depends entirely on
   pattern recognition built from your own mistakes.
4. It makes skimming physically inconvenient — you must look at each hunk to stage it.
   That's precisely the failure mode with large AI diffs.
5. `npm view react-native-super-calendar version time.modified` — verify it exists and
   is maintained. LLMs hallucinate and recommend abandoned packages frequently,
   especially in fast-moving ecosystems like React Native.

</details>

---

**Next:** [Claude Code playbook →](./02-claude-code-playbook.md)
