# Claude Code Playbook

Claude Code is a terminal-based agentic coding tool. It's strongest at multi-file work,
running commands, and tasks where the agent needs to explore before acting.

---

## 1. What it's best at

| Strength | Example in this project |
|---|---|
| **Multi-file changes** | Adding a feature slice across api/hooks/schemas/components |
| **Running commands** | `pnpm verify`, `expo prebuild`, reading `adb logcat` |
| **Codebase exploration** | "How does auth work in this repo?" |
| **Iterating on failures** | Run tests → read output → fix → re-run, autonomously |
| **Git operations** | Branches, commits, PRs, reading diffs |
| **Long-running tasks** | Migrations, large refactors |
| **Reading logs and stack traces** | Native crash triage |

Where Cursor wins: fast in-editor edits, tab completion, and anything where you want to
watch each keystroke. See [the Cursor playbook](./03-cursor-playbook.md).

---

## 2. Setup

```bash
npm install -g @anthropic-ai/claude-code
cd apps/trailhead
claude
```

First thing in any new repo:

```
/init
```

This generates a `CLAUDE.md` by analyzing your codebase. **Then edit it heavily** —
the generated version is a starting point, not a finished document. See
[context engineering](./04-context-engineering.md).

---

## 3. The commands you'll actually use

| Command | Does |
|---|---|
| `/init` | Generate a starting `CLAUDE.md` |
| `/clear` | Wipe context. **Use between tasks.** |
| `/compact` | Summarize the conversation to free context |
| `/review` | Review the current diff |
| `/security-review` | Security-focused review of pending changes |
| `/model` | Switch model |
| `#` prefix | Add a note to memory / `CLAUDE.md` |
| `@path/to/file` | Pull a specific file into context |
| `!command` | Run a shell command directly |
| `Esc` | Interrupt |
| `Esc Esc` | Rewind to an earlier point in the conversation |

**`/clear` between tasks is the most underused command.** Context from a previous task
actively degrades the next one — the model carries forward assumptions that no longer
apply. Clear it.

### Plan mode

Press `Shift+Tab` to cycle permission modes, including **plan mode** — the agent
explores and proposes, but cannot edit until you approve.

This is the single most valuable feature for the workflow in
[the operating model](./01-operating-model.md). Use it for anything non-trivial.

```
[plan mode]
Add reservation cancellation following the spec in
docs/06-hamlet-hq/05-reservations.md. Explore the existing code first.
```

You get a plan. You correct it. Then you approve and it executes.

---

## 4. Prompting patterns that work

### Point at files explicitly

```
❌  Fix the booking bug
✅  In @src/features/bookings/hooks.ts, useCreateBooking doesn't invalidate
    the availability query after a successful booking, so the slot still
    shows as free. Fix it following the invalidation pattern in
    @src/features/announcements/hooks.ts
```

Specificity is most of prompt quality. The second version needs no exploration and has
no room for misinterpretation.

### Give it a verification loop

```
Implement the cancellation window logic. Then run `pnpm verify` and fix
anything that fails. Don't tell me it's done until verify passes.
```

This is where Claude Code shines over an editor-based tool — it can actually run the
command, read the failure, and iterate without you.

### Ask for a plan first

```
Don't write code yet. Read @src/features/reservations/ and give me a plan:
files you'd change, what changes in each, and anything you're unsure about.
```

### Constrain negatively

```
Implement this using ONLY the existing components in @src/components/ui/.
Do not create new UI components. Do not add dependencies. If you think
something is missing, tell me instead of building it.
```

Negative constraints are remarkably effective and underused. AI's default bias is to
add code; telling it not to is what keeps a codebase from sprawling.

### Ask it to critique itself

```
Review the code you just wrote as a hostile senior engineer. What are the
three most likely bugs? What did you not handle?
```

Surprisingly effective — a fresh critical pass catches real issues, especially edge
cases and error paths.

---

## 5. React Native specific usage

### Reading native errors

Claude Code can run the commands that produce native logs, which is a large advantage:

```
The app crashes on Android when opening the camera. Run
`adb logcat -c && adb logcat | grep -i "AndroidRuntime\|ReactNative"`,
reproduce isn't possible from your side so I'll trigger it — then read the
output and tell me what's wrong.
```

### Version verification

Make this a standing rule in `CLAUDE.md`:

```markdown
## Dependencies
Before suggesting ANY package, verify it exists and is maintained:
`npm view <package> version time.modified`
Install Expo-ecosystem packages with `npx expo install`, never `pnpm add`.
Never suggest a package without New Architecture support.
```

This single rule prevents the most common React Native AI failure.

### Both platforms

```markdown
## Definition of done
A change is not done until it has been verified on BOTH iOS and Android.
If you cannot test a platform, say so explicitly — do not claim it works.
```

### Useful RN-specific prompts

```
Profile why the campsite list drops frames. Read
@src/features/sites/components/SiteRow.tsx and check for the usual causes:
unstable props, inline functions, unmemoized rows, oversized images,
missing getItemType.

This screen doesn't respect safe areas on iPhone. Fix it using
useSafeAreaInsets, following the pattern in @app/(app)/site/[id].tsx

Convert this JS-driven animation to a Reanimated worklet so it survives
JS thread blocking.
```

---

## 6. Hooks

Hooks run shell commands on lifecycle events. The highest-value use is **automatic
verification** — the agent can't tell you it's done if the gate fails.

`.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "cd apps/trailhead && npx tsc --noEmit 2>&1 | head -30"
          }
        ]
      }
    ]
  }
}
```

Now every file edit is immediately typechecked, and the agent sees the errors and fixes
them without you asking.

Other useful hooks:
- Run Prettier on write
- Run ESLint on the changed file
- Block edits to sensitive paths (migrations, payment code) so they always come to you

> Use the `update-config` skill to set these up correctly — hook config is fiddly and
> easy to get subtly wrong.

---

## 7. Subagents

For work that would blow out your main context, delegate to a subagent with its own
window:

```
Use a subagent to audit every screen in app/ for missing safe-area
handling. Report back a list of files and what's wrong with each — don't
fix anything yet.
```

Good subagent tasks: broad audits, exploratory research, running a long test suite,
anything read-heavy where you only want the conclusion.

Bad subagent tasks: anything where you want to watch the reasoning, or where the work
needs your ongoing correction.

---

## 8. MCP servers

MCP connects Claude Code to external systems. The ones worth wiring for this project:

| Server | Gives you |
|---|---|
| **GitHub** | PRs, issues, CI status, review comments |
| **Supabase** | Query your actual schema instead of guessing |
| **Sentry** | Pull a real stack trace into the conversation |
| **Playwright/Puppeteer** | Drive the web dashboard for E2E |

The Supabase one is especially valuable — it lets the agent read your real schema
rather than inferring it, which eliminates a whole class of wrong-column bugs.

```
Read the actual bookings table schema via the Supabase MCP server, then
write the TypeScript types to match. Don't guess at column names.
```

---

## 9. Git workflow

Claude Code is good at git, which makes the small-diff discipline easier to hold:

```
Create a branch for this work, commit what we've done with a clear
message, and open a PR with a description of the change and how to test it.
```

Then review the PR diff on GitHub — a different surface from the terminal, which
genuinely catches different things. Reading your own code in a new context is one of
the cheapest quality wins available.

```
/review
```
gives you a code review of the current diff before you even push.

---

## 10. Anti-patterns

| Don't | Why | Instead |
|---|---|---|
| Run for hours in one conversation | Context drifts; early decisions get forgotten | `/clear` between tasks |
| Accept a huge diff because it "looks right" | Looking right is not being right | Re-scope into slices |
| Let it pick libraries unverified | Hallucinated/abandoned packages | Require `npm view` |
| Skip plan mode on complex work | You review wrong code instead of a wrong plan | `Shift+Tab` |
| Let it edit `ios/` or `android/` | Managed workflow — those are generated | Config plugins; block via hooks |
| Trust "I tested it" | It usually can't run your app on a device | Verify yourself on both platforms |
| Give it credentials in the prompt | They persist in transcripts | Env vars and EAS secrets |

---

## 11. A realistic session

```bash
cd apps/trailhead
claude
```

```
> /clear

> [Shift+Tab to plan mode]
> Read docs/05-practice-app/01-trailhead-spec.md, section "Announcements".
> Then explore @src/features/ to see the existing slice pattern.
> Give me a plan for the announcements feature. No code yet.

[reviews plan, corrects two things]

> Use the existing query key factory pattern, and announcements must be
> readable offline — persist them. Now implement just the api, keys, and
> schemas files. Stop before components.

[reviews the diff — 3 files, ~120 lines]

> Good. Now the hooks, including realtime invalidation following
> @src/features/bookings/hooks.ts

[reviews]

> Now the UI. Use only existing components from @src/components/ui.

[reviews]

> Run pnpm verify and fix anything that fails.

[watches it iterate]

> Now review everything you wrote as a hostile senior engineer. What are
> the three most likely bugs?

[reads the critique, fixes one real issue]

> Commit this and open a PR.
```

Four reviewable diffs, a plan you approved, machine verification, a self-critique pass,
and a PR. That's the workflow.

---

## Check yourself

1. When do you use plan mode, and what does it prevent?
2. Why `/clear` between tasks?
3. What hook would most improve your React Native workflow?
4. Why is Claude Code better than an editor tool at fixing failing tests?
5. What standing rule prevents the most common RN-specific AI failure?

<details>
<summary>Answers</summary>

1. Any non-trivial change. It prevents you from reviewing *wrong code* when you could
   have corrected a *wrong plan* in a fraction of the time.
2. Context from a previous task carries forward stale assumptions and decisions that
   no longer apply, which measurably degrades output on the next task.
3. A `PostToolUse` hook running `tsc --noEmit` on every edit — the agent sees type
   errors immediately and fixes them without a round trip through you.
4. It can actually run the test command, read the failure output, edit, and re-run
   autonomously. Editor tools generally need you to shuttle output back manually.
5. Requiring `npm view <package> version time.modified` before suggesting any
   dependency — this catches hallucinated and abandoned packages, which is the highest-
   frequency AI failure in the fast-moving React Native ecosystem.

</details>

---

## Sources

- [Claude Code documentation](https://code.claude.com/docs/)
- [Claude Code — Hooks](https://code.claude.com/docs/en/hooks)
- [Model Context Protocol](https://modelcontextprotocol.io/)

**Next:** [Cursor playbook →](./03-cursor-playbook.md)
