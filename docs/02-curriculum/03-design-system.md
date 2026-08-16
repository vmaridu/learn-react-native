# Design System

React Native Reusables — the shadcn/ui of mobile — plus how to build the design system
Hamlet HQ will need.

---

## 1. The landscape

You have four real options for components in React Native. Understanding why we pick
one matters more than the pick itself.

| Approach | Examples | Model | Trade-off |
|---|---|---|---|
| **Copy-paste primitives** | **React Native Reusables**, NativeCN | You own the code | ✅ Full control, no lock-in. ❌ You maintain it. |
| Universal component libs | Tamagui, gluestack | One codebase, web + native | ✅ Web/native parity. ❌ Heavier, own compiler, steeper learning curve. |
| Native-styled libs | React Native Paper, UI Kitten | Prebuilt themed components | ✅ Fast start. ❌ Opinionated look, hard to customize deeply. |
| Roll your own | — | Build from `View`/`Text` | ✅ Total control. ❌ Slow; you'll rebuild accessibility badly. |

**The pick: React Native Reusables**, for reasons specific to you:

1. It's the direct shadcn/ui port — you already know the mental model
2. Copy-paste ownership means no library fighting your design decisions
3. Built on NativeWind, which you're already using
4. Built on `@rn-primitives/*` — the Radix-equivalent unstyled accessible primitives
5. Your web app (Hamlet HQ will need an admin/board web portal) can use real shadcn,
   and the two will *look the same* because they share the token system

That last point is a genuine strategic advantage for a startup with both a mobile app
and a web dashboard.

---

## 2. Setup

```bash
npx @react-native-reusables/cli@latest init
```

This configures NativeWind, adds the token CSS variables, and creates `lib/utils.ts`
with `cn()`. If you already set NativeWind up manually, it will detect and reconcile.

Add components as you need them — never all at once:

```bash
npx @react-native-reusables/cli@latest add button
npx @react-native-reusables/cli@latest add card input text avatar dialog
```

Each lands in `components/ui/`:

```
components/ui/
├── button.tsx
├── card.tsx
├── input.tsx
└── text.tsx
```

**Open `button.tsx` and read it.** It will look extremely familiar:

```tsx
const buttonVariants = cva(
  'group flex items-center justify-center rounded-md web:ring-offset-background',
  {
    variants: {
      variant: {
        default: 'bg-primary active:opacity-90',
        destructive: 'bg-destructive active:opacity-90',
        outline: 'border border-input bg-background active:bg-accent',
        secondary: 'bg-secondary active:opacity-80',
        ghost: 'active:bg-accent',
        link: '',
      },
      size: {
        default: 'h-10 px-4 py-2 native:h-12 native:px-5 native:py-3',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8 native:h-14',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);
```

Same `cva`, same variant names, same `cn()`. The differences: a companion
`buttonTextVariants` (because no cascade), and `native:` variants for touch-target
sizing.

---

## 3. The no-cascade pattern

This is the one structural adaptation when porting any shadcn component. It shows up
everywhere, so internalize it once.

**Web shadcn — text color cascades:**
```tsx
<button className="bg-primary text-primary-foreground">Book</button>
```

**React Native — it doesn't:**
```tsx
<Pressable className="bg-primary">
  <Text className="text-primary-foreground">Book</Text>
</Pressable>
```

Reusables solves this with a **text context**: the parent publishes its text styles
via React context, and the `<Text>` component reads them.

```tsx
// simplified from reusables
const TextClassContext = React.createContext<string | undefined>(undefined);

function Button({ variant, size, className, ...props }: ButtonProps) {
  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
      <Pressable className={cn(buttonVariants({ variant, size }), className)} {...props} />
    </TextClassContext.Provider>
  );
}

// the Text component picks it up
function Text({ className, ...props }: TextProps) {
  const textClass = React.useContext(TextClassContext);
  return <RNText className={cn('text-base text-foreground', textClass, className)} {...props} />;
}
```

Which lets you write natural, shadcn-like JSX:

```tsx
<Button variant="destructive">
  <Text>Cancel reservation</Text>   {/* automatically gets destructive text color */}
</Button>
```

**Important:** you must import `Text` from `~/components/ui/text`, not from
`react-native`, or the context is ignored. Enforce this with an ESLint rule:

```js
// eslint.config.js
{
  rules: {
    'no-restricted-imports': ['error', {
      paths: [{
        name: 'react-native',
        importNames: ['Text'],
        message: 'Import Text from ~/components/ui/text instead.',
      }],
    }],
  },
}
```

That rule will save you hours of "why is this text the wrong color."

---

## 4. Mobile patterns that have no web equivalent

Don't port web interactions literally. Mobile has its own vocabulary, and using the
wrong one is what makes an app feel like a website in a wrapper.

| Web pattern | Mobile equivalent |
|---|---|
| Dropdown menu | **Bottom sheet** or **action sheet** |
| Modal dialog | Full-screen modal, or a bottom sheet |
| Hover tooltip | Long-press, or an info icon that opens a sheet |
| Right-click context menu | Long-press menu, or swipe actions on a row |
| Toast (corner) | Snackbar (bottom) or a top banner |
| Multi-column form | Single column, always |
| Sidebar nav | Tab bar (≤5 items) or drawer |
| Breadcrumbs | Back button + screen title |
| Pagination | Infinite scroll |
| Table | Card list |
| Date picker popover | Native date picker (very different per platform) |
| `confirm()` | `Alert.alert()` with destructive styling |

### Bottom sheets

The single most important mobile UI pattern. You'll use it for filters, actions,
detail previews, and forms.

```bash
npx expo install @gorhom/bottom-sheet react-native-gesture-handler react-native-reanimated
```

```tsx
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';

function FilterSheet() {
  const ref = useRef<BottomSheet>(null);

  return (
    <BottomSheet ref={ref} snapPoints={['50%', '90%']} enablePanDownToClose index={-1}>
      <BottomSheetView className="flex-1 p-4">
        <Text className="text-lg font-semibold">Filters</Text>
        {/* ... */}
      </BottomSheetView>
    </BottomSheet>
  );
}
```

Remember `GestureHandlerRootView` at the app root with `flex: 1`, or nothing responds.

### Swipe actions on list rows

```tsx
import { Swipeable } from 'react-native-gesture-handler';

<Swipeable renderRightActions={() => (
  <Pressable onPress={handleCancel} className="w-24 items-center justify-center bg-destructive">
    <Text className="text-white">Cancel</Text>
  </Pressable>
)}>
  <ReservationRow item={item} />
</Swipeable>
```

### Native alerts

```tsx
import { Alert } from 'react-native';

Alert.alert(
  'Cancel reservation?',
  'This frees the slot for other residents. You may be charged a late-cancellation fee.',
  [
    { text: 'Keep it', style: 'cancel' },
    { text: 'Cancel reservation', style: 'destructive', onPress: handleCancel },
  ]
);
```

`style: 'destructive'` renders red on iOS. Use it for anything irreversible.

---

## 5. Design tokens

Your token system is the contract between design and code, and between mobile and web.
Define it once.

**`global.css`** — the source of truth:

```css
@layer base {
  :root {
    /* Surfaces */
    --background: 0 0% 100%;
    --foreground: 222 47% 11%;
    --card: 0 0% 100%;
    --card-foreground: 222 47% 11%;

    /* Brand */
    --primary: 158 64% 32%;          /* Hamlet HQ green */
    --primary-foreground: 0 0% 100%;
    --secondary: 210 40% 96%;
    --secondary-foreground: 222 47% 11%;

    /* Semantic */
    --muted: 210 40% 96%;
    --muted-foreground: 215 16% 47%;
    --accent: 210 40% 96%;
    --accent-foreground: 222 47% 11%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    --success: 142 71% 45%;
    --warning: 38 92% 50%;

    /* Chrome */
    --border: 214 32% 91%;
    --input: 214 32% 91%;
    --ring: 158 64% 32%;

    --radius: 0.75rem;
  }

  .dark:root {
    --background: 222 47% 11%;
    --foreground: 210 40% 98%;
    --card: 222 47% 13%;
    --card-foreground: 210 40% 98%;
    --primary: 158 64% 42%;
    --primary-foreground: 222 47% 11%;
    --muted: 217 33% 17%;
    --muted-foreground: 215 20% 65%;
    --destructive: 0 63% 45%;
    --border: 217 33% 20%;
    --input: 217 33% 20%;
  }
}
```

**Rules for using tokens:**

1. **Never hardcode a color in a component.** `bg-[#0f172a]` is a bug. Use
   `bg-background`, `bg-primary`, `text-muted-foreground`.
2. **Semantic names, not visual names.** `--destructive`, not `--red`. When you
   rebrand, you change one file.
3. **Every token needs a dark value.** Untested dark mode is worse than no dark mode.
4. **Share this file with your web app.** Literally the same `:root` block works in
   shadcn on the web.

### Typography scale

Define it once and don't improvise:

```tsx
// src/components/ui/typography.tsx
export function H1({ className, ...props }: TextProps) {
  return <Text className={cn('text-3xl font-bold tracking-tight text-foreground', className)} {...props} />;
}
export function H2({ className, ...props }: TextProps) {
  return <Text className={cn('text-xl font-semibold text-foreground', className)} {...props} />;
}
export function Body({ className, ...props }: TextProps) {
  return <Text className={cn('text-base text-foreground', className)} {...props} />;
}
export function Muted({ className, ...props }: TextProps) {
  return <Text className={cn('text-sm text-muted-foreground', className)} {...props} />;
}
```

Using semantic typography components instead of ad-hoc classes is what keeps a
codebase visually consistent once an AI agent is generating screens for you.

---

## 6. Icons

```bash
npx expo install lucide-react-native react-native-svg
```

Lucide is the same icon set shadcn uses, so web and mobile match exactly.

```tsx
import { Calendar, MapPin } from 'lucide-react-native';
import { cssInterop } from 'nativewind';

// teach NativeWind to style icons
cssInterop(Calendar, { className: { target: 'style', nativeStyleToProp: { color: true } } });

<Calendar className="text-muted-foreground" size={16} />
```

Reusables' `init` sets up an icon wrapper for this. Alternatively use
`@expo/vector-icons` (bundled, no extra dep) if you don't need Lucide specifically.

---

## 7. Building your own components

When Reusables doesn't have what you need — and for Hamlet HQ it often won't
(reservation calendars, payment rows, announcement cards) — build them consistently.

The checklist for every component you write:

- [ ] Accepts `className` and merges via `cn()` so callers can override
- [ ] Variants via `cva` if there's more than one visual form
- [ ] Uses semantic tokens, no hardcoded colors
- [ ] Text styles applied to `<Text>`, not the container
- [ ] `accessibilityRole` + `accessibilityLabel` on interactive elements
- [ ] Touch targets ≥ 44pt (use `hitSlop` if the visual is smaller)
- [ ] Tested in light **and** dark
- [ ] Tested on iOS **and** Android
- [ ] Loading and empty states considered
- [ ] Props typed; extends the underlying RN component's props

**A worked example — the reservation status badge:**

```tsx
import { View, type ViewProps } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { Text } from '~/components/ui/text';
import { cn } from '~/lib/utils';

const badge = cva('self-start rounded-full px-2.5 py-1', {
  variants: {
    status: {
      confirmed: 'bg-success/15',
      pending: 'bg-warning/15',
      cancelled: 'bg-destructive/15',
      completed: 'bg-muted',
    },
  },
  defaultVariants: { status: 'pending' },
});

const badgeText = cva('text-xs font-medium', {
  variants: {
    status: {
      confirmed: 'text-success',
      pending: 'text-warning',
      cancelled: 'text-destructive',
      completed: 'text-muted-foreground',
    },
  },
  defaultVariants: { status: 'pending' },
});

type Props = ViewProps & VariantProps<typeof badge> & { label: string };

export function StatusBadge({ status, label, className, ...props }: Props) {
  return (
    <View
      className={cn(badge({ status }), className)}
      accessibilityRole="text"
      accessibilityLabel={`Status: ${label}`}
      {...props}
    >
      <Text className={badgeText({ status })}>{label}</Text>
    </View>
  );
}
```

Note the paired `cva` definitions — that's the no-cascade pattern applied.

---

## 8. Keeping web and mobile consistent

Hamlet HQ will need a web dashboard for HOA boards (managing dues, approving
reservations, sending broadcasts). Nobody manages a community from a phone.

Strategy for keeping them coherent without over-engineering:

**Share:**
- ✅ Design tokens (the `:root` CSS variables — literally the same file)
- ✅ Icon set (Lucide both places)
- ✅ Zod schemas and TypeScript types (put them in a shared package)
- ✅ Business logic and validation rules
- ✅ API client

**Don't share:**
- ❌ Components. Mobile and web interactions genuinely differ; forcing shared
  components produces something bad on both.

A monorepo makes the sharing easy:

```
hamlet-hq/
├── apps/
│   ├── mobile/          # Expo
│   └── web/             # Next.js + shadcn
├── packages/
│   ├── core/            # types, zod schemas, business logic
│   ├── api/             # generated client
│   └── tokens/          # the shared CSS variables
```

> **Tamagui reconsidered:** if sharing *components* between web and native becomes a
> hard requirement, Tamagui is the serious option — it genuinely compiles to both.
> The cost is a heavier toolchain and a smaller ecosystem. For your situation
> (mobile-first product, web dashboard with different UX), NativeWind + Reusables on
> mobile and Tailwind + shadcn on web is the lower-risk, higher-velocity choice.

---

## 9. Exercise

Build the **Hamlet HQ component inventory** in Trailhead. Create, with variants,
dark mode, and accessibility:

1. `Button` — from Reusables, then extend with a `loading` state (spinner, disabled)
2. `Card` — with header/content/footer slots
3. `StatusBadge` — as above
4. `Avatar` — image with initials fallback
5. `EmptyState` — icon, title, description, optional action
6. `ListRow` — the avatar/content/accessory pattern, pressable
7. `Sheet` — a bottom sheet wrapper with a consistent header
8. `ConfirmDialog` — wraps `Alert.alert` with a typed API

Then build a **kitchen-sink screen** at `app/(app)/_kitchen-sink.tsx` rendering every
component in every variant, light and dark. This becomes your visual regression
surface and your reference when an AI agent asks "what components exist?"

> 💡 Point Claude Code at the kitchen sink screen and your `components/ui/` folder in
> your `CLAUDE.md`. It will then reuse your components instead of inventing new ones —
> one of the highest-leverage context tricks there is. See
> [context engineering](../04-ai-workflow/04-context-engineering.md).

---

## Check yourself

1. Why does Reusables define both `buttonVariants` and `buttonTextVariants`?
2. Why import `Text` from `~/components/ui/text` rather than `react-native`?
3. What's the mobile equivalent of a dropdown menu, and why not port the web one?
4. You want to rebrand from green to blue. How many files should change?
5. Why not share components between the mobile app and the web dashboard?

<details>
<summary>Answers</summary>

1. React Native has no style cascade — container styles can't set text color, so text
   styles must be defined and applied separately.
2. The Reusables `Text` reads `TextClassContext`, which is how parent components pass
   text styling down. React Native's `Text` ignores it, so you'd get unstyled text.
3. A bottom sheet or action sheet. A dropdown anchored to a trigger is designed for a
   precise pointer and a large screen; on a phone it produces tiny touch targets and
   awkward positioning near screen edges.
4. One — `global.css`. That's the entire point of semantic tokens. (If more than one
   changes, someone hardcoded a color.)
5. The interaction patterns are genuinely different — sheets vs dropdowns, tabs vs
   sidebars, single-column vs multi-column forms. A shared component ends up being a
   compromise that's mediocre on both. Share tokens, types, and logic instead.

</details>

---

## Sources

- [React Native Reusables](https://reactnativereusables.com/)
- [React Native Reusables — GitHub](https://github.com/founded-labs/react-native-reusables)
- [rn-primitives](https://rnprimitives.com/)
- [@gorhom/bottom-sheet](https://gorhom.dev/react-native-bottom-sheet/)

**Next:** [Navigation →](./04-navigation.md)
