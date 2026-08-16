# Styling with NativeWind

Tailwind CSS in React Native. This is the doc where your existing skills pay off most
directly — and where the sharp edges are worth knowing in advance.

---

## 1. What NativeWind actually is

NativeWind takes Tailwind class names and compiles them into React Native style
objects **at build time**. It is not a runtime CSS engine and it does not ship a
browser.

```tsx
<View className="flex-row items-center gap-3 p-4 bg-white rounded-xl" />
```

becomes, effectively:

```tsx
<View style={{
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
  padding: 16,
  backgroundColor: '#fff',
  borderRadius: 12,
}} />
```

Because the transformation happens at build time, there's no per-render style
computation cost — which is why it's preferred over runtime CSS-in-JS libraries here.

### Version reality check (August 2026)

| Line | Version | Tailwind | Status |
|---|---|---|---|
| **NativeWind 4** | **4.2.6** | Tailwind v3 | ✅ **Stable — use this** |
| NativeWind 5 | 5.0.0-preview.4 | Tailwind v4 | ⚠️ Preview, not production-ready |

**Use NativeWind 4.2.x with `tailwindcss@^3`.** NativeWind 5 has been in preview for a
while and brings Tailwind v4's CSS-first config, but it isn't stable yet. Migrating
later is described as mostly compatible — your `className` strings don't change, which
is the bulk of the work.

> **Alternative worth knowing about:** [Uniwind](https://uniwind.dev/) is a newer
> Tailwind-for-RN library built on the Unistyles engine, with full Tailwind v4 support
> and notably better benchmark numbers. It's genuinely promising. For your first
> production app, NativeWind is still the right call — larger ecosystem, and React
> Native Reusables targets it. Revisit at your next major version bump.

---

## 2. Setup

Covered in [the first-app walkthrough](../01-foundations/04-first-app-walkthrough.md#nativewind-tailwind),
but repeated here as the canonical reference.

```bash
npx expo install nativewind react-native-reanimated react-native-safe-area-context
pnpm add -D tailwindcss@^3 prettier-plugin-tailwindcss
npx tailwindcss init
```

**`tailwind.config.js`**
```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: { extend: {} },
  plugins: [],
};
```

⚠️ Getting `content` wrong is the #1 setup bug — classes in unlisted files are silently
dropped. If a class "doesn't work," check this first.

**`global.css`**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**`babel.config.js`**
```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  };
};
```

**`metro.config.js`**
```js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);
module.exports = withNativeWind(config, { input: './global.css' });
```

**Import once** in `app/_layout.tsx`:
```tsx
import '../global.css';
```

Then always restart with `--clear` after config changes:
```bash
npx expo start --clear
```

---

## 3. What works, what doesn't

### ✅ Works as you'd expect

| Category | Examples |
|---|---|
| Layout | `flex`, `flex-1`, `flex-row`, `items-*`, `justify-*`, `gap-*`, `self-*` |
| Spacing | `p-*`, `px-*`, `m-*`, `-mt-*` |
| Sizing | `w-*`, `h-*`, `min-w-*`, `max-h-*`, `w-full`, `aspect-square` |
| Colors | `bg-*`, `text-*`, `border-*`, opacity modifiers `bg-black/60` |
| Typography | `text-lg`, `font-semibold`, `leading-*`, `tracking-*`, `text-center`, `uppercase` |
| Borders | `border`, `border-2`, `border-slate-200`, `rounded-*` |
| Position | `absolute`, `relative`, `top-*`, `inset-*`, `z-*` |
| Transform | `rotate-*`, `scale-*`, `translate-x-*` |
| Opacity | `opacity-*` |
| Dark mode | `dark:*` |
| Responsive | `sm:`, `md:`, `lg:` (based on screen width) |

### ❌ Doesn't work — no native equivalent

| Class | Why |
|---|---|
| `grid-*`, `col-span-*` | No CSS Grid in React Native |
| `float-*`, `clear-*` | No float layout |
| `fixed`, `sticky` | No fixed/sticky positioning |
| `before:`, `after:` | No pseudo-elements |
| `backdrop-*` | Needs `expo-blur` instead |
| `cursor-*` | No cursor (except web) |
| `select-*` | Use the `selectable` prop on `<Text>` |
| `transition-*` (mostly) | Use Reanimated |
| `animate-*` | Use Reanimated |

### ⚠️ Works differently

| Class | Note |
|---|---|
| `space-x-*` / `space-y-*` | Works, but **prefer `gap-*`** — it's cleaner and better supported |
| `shadow-*` | Renders differently per platform; see below |
| `hover:` | Only meaningful on web / with a pointer |
| `overflow-hidden` | Can clip shadows on Android |
| `w-1/2` | Percentage widths work but interact awkwardly with `gap` |

---

## 4. Platform variants

NativeWind adds variants React Native needs:

```tsx
<View className="p-3 ios:pt-4 android:pt-6 web:pt-2" />
```

And interaction states:

```tsx
<Pressable className="bg-slate-900 active:bg-slate-700 disabled:opacity-50" />
```

| Variant | When |
|---|---|
| `ios:` / `android:` / `web:` | Platform |
| `active:` | While pressed |
| `focus:` | Input focused |
| `disabled:` | Disabled state |
| `dark:` | Dark color scheme |

---

## 5. Dark mode

Two pieces: telling NativeWind how to decide, and giving users control.

**`tailwind.config.js`:**
```js
module.exports = {
  darkMode: 'class',
  // ...
};
```

**Follow the OS by default:**
```json
// app.json
{ "expo": { "userInterfaceStyle": "automatic" } }
```

Then `dark:` classes just work:
```tsx
<View className="bg-white dark:bg-slate-900">
  <Text className="text-slate-900 dark:text-slate-50">Hello</Text>
</View>
```

**Let the user override** (Light / Dark / System) with NativeWind's `useColorScheme`:

```tsx
import { useColorScheme } from 'nativewind';

function ThemeToggle() {
  const { colorScheme, setColorScheme } = useColorScheme();

  return (
    <Pressable onPress={() => setColorScheme(colorScheme === 'dark' ? 'light' : 'dark')}>
      <Text>{colorScheme === 'dark' ? '☀️' : '🌙'}</Text>
    </Pressable>
  );
}
```

Persist the choice (MMKV) and restore it at startup, or the app flashes the wrong
theme on every launch.

**Don't forget the non-React chrome:** status bar, splash screen, and navigation bar
have their own theming and are a common source of "the app looks broken in dark mode."

```tsx
<StatusBar style="auto" />   // from expo-status-bar; follows the theme
```

---

## 6. Theming with CSS variables

This is how you get a shadcn-style token system, and it's what React Native Reusables
uses.

**`global.css`:**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222 47% 11%;
    --primary: 222 47% 11%;
    --primary-foreground: 210 40% 98%;
    --muted: 210 40% 96%;
    --muted-foreground: 215 16% 47%;
    --border: 214 32% 91%;
    --destructive: 0 84% 60%;
  }

  .dark:root {
    --background: 222 47% 11%;
    --foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222 47% 11%;
    --muted: 217 33% 17%;
    --muted-foreground: 215 20% 65%;
    --border: 217 33% 17%;
    --destructive: 0 63% 31%;
  }
}
```

**`tailwind.config.js`:**
```js
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        border: 'hsl(var(--border))',
        destructive: 'hsl(var(--destructive))',
      },
    },
  },
};
```

Now you write semantic classes, and dark mode is automatic:

```tsx
<View className="bg-background border-border border rounded-xl p-4">
  <Text className="text-foreground font-semibold">Clubhouse</Text>
  <Text className="text-muted-foreground text-sm">Available 9am–9pm</Text>
</View>
```

**This is exactly the shadcn/ui token model.** If you've built a design system on the
web this way, it ports directly — you can literally copy your `:root` block over.

---

## 7. Shadows: the platform trap

Shadows are the most common cross-platform styling frustration.

- **iOS** uses `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`
- **Android** uses `elevation` — a single number, and you cannot control color or
  offset (Android 9+ allows some tinting, but it's limited)

Tailwind's `shadow-*` classes map imperfectly. Options:

**Option A — accept the difference (usually right):**
```tsx
<View className="rounded-xl bg-white shadow-sm" />
```
Ship it. Users don't compare platforms side by side.

**Option B — borders instead of shadows:**
```tsx
<View className="rounded-xl border border-slate-200 bg-white dark:border-slate-800" />
```
Consistent everywhere, and honestly looks better in most modern designs. **This is
what I'd recommend as your default.**

**Option C — explicit per-platform:**
```tsx
const cardShadow = Platform.select({
  ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
  android: { elevation: 3 },
});

<View style={cardShadow} className="rounded-xl bg-white" />
```

Also note: `overflow-hidden` on a parent will clip a child's shadow on Android. If a
shadow disappears, that's usually why.

---

## 8. Composing classes

Same tools as web. Install them:

```bash
pnpm add clsx tailwind-merge class-variance-authority
```

**`src/lib/utils.ts`:**
```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Variants with `cva`** — identical to your shadcn usage:

```tsx
import { cva, type VariantProps } from 'class-variance-authority';

const badgeVariants = cva('rounded-full px-2.5 py-0.5', {
  variants: {
    variant: {
      default: 'bg-primary',
      secondary: 'bg-muted',
      destructive: 'bg-destructive',
      outline: 'border border-border',
    },
  },
  defaultVariants: { variant: 'default' },
});

const badgeTextVariants = cva('text-xs font-medium', {
  variants: {
    variant: {
      default: 'text-primary-foreground',
      secondary: 'text-muted-foreground',
      destructive: 'text-white',
      outline: 'text-foreground',
    },
  },
  defaultVariants: { variant: 'default' },
});

type BadgeProps = React.ComponentProps<typeof View> & VariantProps<typeof badgeVariants> & {
  label: string;
};

export function Badge({ label, variant, className, ...props }: BadgeProps) {
  return (
    <View className={cn(badgeVariants({ variant }), className)} {...props}>
      <Text className={badgeTextVariants({ variant })}>{label}</Text>
    </View>
  );
}
```

⚠️ **Note the two `cva` definitions.** On the web, `text-white` on a parent `<div>`
cascades to the text inside. In React Native **there is no cascade**, so container
styles and text styles must be defined separately and applied to the right elements.
This is the single biggest structural difference when porting shadcn components.

---

## 9. Styling third-party components

`className` only works on components NativeWind knows about. For others, use
`cssInterop` to teach it:

```tsx
import { cssInterop } from 'nativewind';
import { LinearGradient } from 'expo-linear-gradient';

cssInterop(LinearGradient, { className: 'style' });

// now this works
<LinearGradient className="flex-1 rounded-xl" colors={['#000', '#333']} />
```

For components with multiple style props (like `FlashList`):

```tsx
cssInterop(FlashList, {
  className: 'style',
  contentContainerClassName: 'contentContainerStyle',
});
```

Many popular libraries ship NativeWind support already — check before wiring it
yourself.

---

## 10. Performance notes

NativeWind is fast because it compiles at build time, but a few things still matter:

- **Prefer static class strings.** `className="p-4 bg-white"` is fully resolved at
  build time. Heavy runtime string building (`` className={`p-${n}`} ``) defeats that
  and won't be picked up by Tailwind's content scanner anyway.
- **Conditional classes are fine** — `cn('base', isActive && 'bg-primary')` — because
  both branches exist statically in the source.
- **Don't inline `cva` calls inside render** if the config is static; define variants
  at module scope (as above).
- Arbitrary values (`w-[137px]`) work but produce one-off styles; prefer scale values.

---

## 11. Exercise

Port a shadcn component you already know — **Card** — to React Native with NativeWind.

Requirements:
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
- Uses semantic tokens (`bg-card`, `text-card-foreground`, `border-border`)
- Full dark mode support via CSS variables
- `cn()` merging so consumers can override with `className`
- Correct handling of the no-cascade problem for text colors
- Bordered rather than shadowed, for cross-platform consistency

Then use it to render a campsite card, and check it in both themes on both platforms.

This teaches you the exact skill you need for the rest of the project: taking a web
component pattern and re-expressing it natively.

---

## Check yourself

1. Why does `text-white` on a `<View>` not color the `<Text>` inside it?
2. Your new class isn't applying at all. First three things to check?
3. Why prefer `gap-*` over `space-x-*`?
4. How would you build a Light/Dark/System toggle that survives app restarts?
5. Why does your card's shadow vanish on Android when you add `rounded-xl overflow-hidden`?

<details>
<summary>Answers</summary>

1. React Native has no style cascade or inheritance. Colors must be applied to the
   `<Text>` element itself.
2. (a) Is the file covered by `content` in `tailwind.config.js`? (b) Did you restart
   Metro with `--clear`? (c) Is the class one that has no native equivalent (grid,
   float, sticky)?
3. `gap` is a real Yoga property applied by the layout engine. `space-x-*` works by
   applying margins to children, which breaks with wrapping, conditional children, and
   `flex-1` siblings.
4. Store the preference in MMKV, read it synchronously at startup before first render,
   and call `setColorScheme()` from NativeWind's `useColorScheme`. Reading it
   synchronously is what prevents the wrong-theme flash.
5. `overflow: hidden` clips the shadow on Android, since `elevation` draws outside the
   view bounds. Move the overflow clipping to an inner view, or use a border instead.

</details>

---

## Sources

- [NativeWind docs](https://www.nativewind.dev/)
- [NativeWind v5 preview](https://www.nativewind.dev/v5)
- [Tailwind CSS v3 docs](https://v3.tailwindcss.com/)
- [Uniwind (alternative)](https://uniwind.dev/)

**Next:** [Design system →](./03-design-system.md)
