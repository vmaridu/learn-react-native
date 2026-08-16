# Cursor Playbook

Cursor is an AI-native editor. It's strongest at tight edit loops, in-context
completion, and work where you want to see and shape every change as it happens.

---

## 1. When to use Cursor vs Claude Code

You have both. Use them for different things — this is the practical split most
engineers land on.

| Task | Tool | Why |
|---|---|---|
| Writing a component while looking at the design | **Cursor** | Tight loop, immediate visual feedback |
| Renaming a concept across 30 files | **Claude Code** | Agentic multi-file work |
| "Why is this list janky?" | **Cursor** | You're reading code, it's right there |
| Fix failing tests until green | **Claude Code** | Runs commands, iterates autonomously |
| Adding a field to a form | **Cursor** | Small, local, tab-completion carries it |
| Building a whole feature slice | **Claude Code** | Multi-file, needs planning |
| Learning: "explain this file" | **Cursor** | Inline, in context, low friction |
| Reading `adb logcat` output | **Claude Code** | It can run the command |
| Reviewing a PR diff | **Claude Code** | `/review`, git-native |
| Refactoring one function | **Cursor** | `Cmd+K` is faster than a conversation |

**The heuristic:** if the work is *in the file you're looking at*, use Cursor. If it
requires exploring, running commands, or touching many files, use Claude Code.

Neither is a replacement for the other, and you'll switch several times an hour.

---

## 2. The three modes

### Tab completion

Multi-line, context-aware completion. Predicts the *next edit*, not just the next
token — including edits in other parts of the file.

This is Cursor's genuinely distinctive feature and the thing you'll use most. It's
excellent at:
- Repetitive patterns (adding the fourth field to a form)
- Following the shape of surrounding code
- Propagating a rename through a file

**Learn to trust it selectively.** It's very good at "more of the same" and poor at
anything requiring judgment. Accept fast, but read what you accepted.

### `Cmd+K` — inline edit

Select code, `Cmd+K`, describe the change. Diff appears inline; accept or reject.

Best for:
```
extract this into a custom hook
add loading and error states
memoize this row component
convert to use the cn() helper
```

The tightest loop available. For a localized change, faster than any conversation.

### `Cmd+L` — chat / agent

The conversational panel. Cursor's agent mode can make multi-file edits and run
commands, overlapping with Claude Code.

Use it for medium-sized work where you want to stay in the editor. For large agentic
work, Claude Code's terminal-native model is generally better.

---

## 3. Rules files

Cursor's equivalent of `CLAUDE.md`, and the highest-leverage configuration you can do.

Modern Cursor uses `.cursor/rules/*.mdc` files with frontmatter controlling when each
applies.

```
.cursor/rules/
├── project.mdc           # always applied
├── react-native.mdc      # applies to .tsx files
├── styling.mdc           # applies to component files
└── data.mdc              # applies to features/**/api.ts, hooks.ts
```

### `project.mdc` — always on

```mdc
---
description: Core project conventions
alwaysApply: true
---

# Trailhead / Hamlet HQ — Project Rules

## Stack (do not deviate without asking)
- Expo SDK 57, React Native 0.86, React 19.2, TypeScript strict
- Expo Router (file-based, typed routes enabled)
- NativeWind 4.2.x with Tailwind v3 — NOT Tailwind v4
- React Native Reusables for UI primitives (components/ui/)
- TanStack Query for server state, Zustand for client state
- React Hook Form + Zod for forms
- FlashList for all lists
- Supabase backend

## Non-negotiables
- Never install a package without verifying it exists: `npm view <pkg> version`
- Install Expo packages with `npx expo install`, never `pnpm add`
- Never edit ios/ or android/ — they are generated. Use config plugins.
- Never hardcode colors. Use semantic tokens (bg-background, text-foreground).
- Import Text from ~/components/ui/text, never from react-native
- All lists use FlashList, never .map() in a ScrollView
- Tokens go in expo-secure-store, never MMKV or AsyncStorage

## Definition of done
Code is not done until `pnpm verify` passes and it's been checked on
BOTH iOS and Android. If you can't verify a platform, say so explicitly.

## Ask before
- Adding a dependency
- Creating a new UI component (check components/ui/ first)
- Changing the database schema
- Touching anything related to payments or authorization
```

### `react-native.mdc` — scoped by glob

```mdc
---
description: React Native component conventions
globs: ["**/*.tsx"]
---

- Every text string must be inside <Text>. Never render bare strings.
- Never use `{count && <X/>}` — use `{count > 0 && <X/>}` (renders 0 otherwise)
- flexDirection defaults to column. Be explicit with flex-row.
- Interactive elements need accessibilityRole and accessibilityLabel
- Touch targets ≥44pt — use hitSlop on small icon buttons
- Use Pressable, not TouchableOpacity
- Use expo-image, not react-native's Image
- Screens in app/ stay thin — logic goes in src/features/
```

**Glob-scoped rules are better than one giant file** — the model gets the rules
relevant to what it's editing, without diluting attention with irrelevant ones.

---

## 4. Context management

### `@` references

```
@src/features/bookings/hooks.ts    a file
@src/features/bookings/            a folder
@Codebase                          semantic search over the repo
@Docs                              indexed documentation
@Web                               web search
@Git                               diffs and history
```

**Index the right docs.** Cursor Settings → Features → Docs → Add:

```
https://docs.expo.dev
https://reactnative.dev/docs
https://www.nativewind.dev
https://reactnativereusables.com
https://tanstack.com/query/latest/docs
https://docs.swmansion.com/react-native-reanimated
https://supabase.com/docs
```

This meaningfully reduces hallucinated APIs, because the model can look up the real
one. For a fast-moving ecosystem like React Native, this is one of the best
configuration investments available.

```
@Docs expo-notifications — what's the correct way to handle a
notification tap when the app is killed?
```

### `.cursorignore`

Keep noise out of the index:

```
node_modules/
ios/
android/
.expo/
dist/
*.log
```

Indexing generated native folders wastes context and produces suggestions to edit
files you shouldn't touch.

---

## 5. Cursor for learning

Because you're learning React Native, Cursor's inline explanation loop is genuinely
valuable — arguably more than its generation.

**Select code → `Cmd+L` → ask:**

```
Explain this line by line. I'm coming from React web — what's different here?

Why does this use useCallback? What breaks without it?

What would a senior React Native engineer criticize about this component?

Show me three ways to write this and explain the tradeoffs.
```

**The rewrite drill** (weeks 4–6 of the study plan):

1. Write the component yourself
2. `Cmd+L`: "Review this as a senior RN engineer. Don't rewrite it — tell me what's wrong."
3. Fix it yourself based on the feedback
4. *Then* ask for its version and diff against yours

This builds real skill. Generating first and reading after builds much less.

---

## 6. React Native specific tips

### Live preview loop

Cursor + Expo's Fast Refresh is a tight loop:

```
Terminal:  npx expo start
Simulator: side by side with the editor
Cursor:    Cmd+K to change styling → save → see it instantly
```

For styling and layout work, this beats any agentic workflow. You're iterating
visually, and the feedback is sub-second.

### Screenshot-driven UI

Cursor accepts images. Paste a design screenshot:

```
Build this screen with NativeWind, using only components from
@src/components/ui/. Match the spacing and hierarchy. Use semantic
tokens, no hardcoded colors.
```

Effective for layout. **Always check the result on both platforms** — generated UI
tends to be iOS-shaped and often ignores Android specifics like elevation and the
hardware back button.

### The RN-specific things to watch for

Cursor's training skews toward React web. Watch for these in every suggestion:

| It will suggest | Should be |
|---|---|
| `<div>`, `<span>`, `onClick` | `<View>`, `<Text>`, `onPress` |
| `localStorage` | MMKV / SecureStore |
| `.map()` over a list | FlashList |
| `TouchableOpacity` | `Pressable` |
| `Image` from react-native | `expo-image` |
| `AsyncStorage` for tokens | `expo-secure-store` |
| `StyleSheet.create` when you use NativeWind | `className` |
| `hover:` classes | `active:` |
| Tailwind v4 syntax | Tailwind v3 (NativeWind 4 targets v3) |

Your `.cursor/rules` files are how you prevent most of these systematically.

---

## 7. Using both together

They share the filesystem, so they compose naturally:

```
Claude Code:  plan and scaffold the feature slice across files
     ↓
Cursor:       refine the UI with Cmd+K, live-preview against the simulator
     ↓
Claude Code:  run pnpm verify, fix failures, write tests, open the PR
```

**Keep the rules aligned.** Maintain `CLAUDE.md` and `.cursor/rules/project.mdc` with
the same content — or, better, have one be the source of truth and the other reference
it:

```mdc
---
alwaysApply: true
---
Follow all conventions in @CLAUDE.md — it is the authoritative
project constitution.
```

One source of truth avoids the two tools drifting into different house styles, which
produces an inconsistent codebase.

---

## 8. Anti-patterns

| Don't | Why |
|---|---|
| Accept tab completions without reading | They're confident and frequently subtly wrong |
| Use agent mode for large refactors | Claude Code is better; Cursor's strength is the tight loop |
| Skip rules files | You'll re-explain the same conventions daily |
| Leave `ios/`/`android/` indexed | Wasted context, suggestions to edit generated files |
| Trust styling output without checking Android | Generated UI skews iOS |
| Use it as your only tool | The two tools genuinely have different strengths |
| Let it write Tailwind v4 syntax | NativeWind 4 targets Tailwind v3 |

---

## Check yourself

1. Component styling with the simulator open — which tool, and why?
2. Rename a domain concept across 30 files — which tool, and why?
3. Why glob-scoped rules instead of one big rules file?
4. Why index the Expo and NativeWind docs?
5. What's the most common category of wrong suggestion in RN, and how do you prevent it?

<details>
<summary>Answers</summary>

1. Cursor. `Cmd+K` plus Fast Refresh gives sub-second visual feedback; an agentic loop
   adds latency without adding value for a visual task.
2. Claude Code. It's multi-file agentic work that benefits from exploration, running
   the typechecker, and iterating on failures autonomously.
3. The model receives only the rules relevant to the file type it's editing. One large
   file dilutes attention across irrelevant instructions.
4. React Native's ecosystem moves fast, so training data goes stale quickly. Indexed
   docs let the model look up the real current API instead of recalling an old one.
5. Web-React patterns leaking into React Native — `div`, `onClick`, `localStorage`,
   `.map()` over lists. Prevent it with explicit rules files listing the correct
   substitutes.

</details>

---

## Sources

- [Cursor documentation](https://docs.cursor.com/)
- [Cursor — Rules](https://docs.cursor.com/context/rules)

**Next:** [Context engineering →](./04-context-engineering.md)
