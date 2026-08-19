/**
 * Resolved token values for the handful of places that need a raw color string
 * rather than a class name: SVG fills, vector-icon `color` props, blur overlays,
 * status/navigation bars.
 *
 * These MUST stay in sync with `global.css`. Components never import raw hex —
 * they use these named exports so there is still a single source of meaning.
 */
export const palette = {
  background: '#FFFFFF',
  foreground: '#12151C',
  card: '#FFFFFF',

  /** Bright lime. An accent — never a flooded background. */
  primary: '#93CD1D',
  /** Near-black. What sits ON lime: icons, labels, checkmarks. Never white. */
  primaryForeground: '#1E3003',
  /** Deeper lime, only where white has to read on top (the brand mark). */
  primaryDeep: '#406714',
  /** A whisper of lime — soft tiles, the balance card, selected rows. */
  primarySoft: '#F8FCEE',

  accent: '#E8F5CC',
  accentForeground: '#2D4A0D',
  /**
   * Brand colour for anything that has to be *read* on a white or soft-lime
   * surface: glyphs, links, focused borders. `primary` is a fill — at 2:1
   * against white it is unreadable as ink, however good it looks as a button.
   */
  brandInk: '#2D4A0D',

  muted: '#F7F7F7',
  mutedForeground: '#6E737C',
  border: '#EBEBEB',

  destructive: '#D32222',
  destructiveSoft: '#FDF1F1',
  success: '#298E5F',
  successSoft: '#F0FAF5',
  warning: '#DD830E',
  warningSoft: '#FEF7EC',

  white: '#FFFFFF',
} as const;

/**
 * Brand gradient — deliberately deeper than `palette.primary` so the white mark
 * on top stays legible. Used by the app icon and `BrandMark` only.
 */
export const brandGradient = ['#2F5809', '#6FA81A'] as const;

export const springConfig = { damping: 18, stiffness: 180, mass: 0.7 };
export const softSpring = { damping: 22, stiffness: 120, mass: 0.9 };

/**
 * Vertical rhythm. Sections breathe at `sectionGap`; anything tighter starts to
 * read as a wall of controls rather than a page.
 */
export const spacing = {
  screenX: 20,
  sectionGap: 36,
  blockGap: 12,
} as const;
