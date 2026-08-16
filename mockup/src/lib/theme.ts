/**
 * Resolved token values for the handful of places that need a raw color string
 * rather than a class name: gradients, SVG fills, vector-icon `color` props,
 * status/navigation bars.
 *
 * These MUST stay in sync with `global.css`. Components never import raw hex —
 * they use these named exports so there is still a single source of meaning.
 */
export const palette = {
  background: '#FFFFFF',
  foreground: '#12161F',
  card: '#FFFFFF',
  primary: '#4E9412',
  primaryDeep: '#2F5809',
  primarySoft: '#F2FBE6',
  accent: '#DBF7B2',
  accentForeground: '#2F5809',
  muted: '#F5F6FA',
  mutedForeground: '#69707F',
  border: '#E4E7EE',
  destructive: '#C82828',
  destructiveSoft: '#FDF2F2',
  success: '#22815A',
  successSoft: '#F1FAF6',
  warning: '#D2790D',
  warningSoft: '#FEF7EC',
  white: '#FFFFFF',
} as const;

/** Brand gradient — deep lime to mid lime. Used on hero surfaces only. */
export const brandGradient = [palette.primaryDeep, palette.primary] as const;

/** Per-amenity-category tile gradients, all lime-family so the app reads as one system. */
export const tileGradients: Record<string, readonly [string, string]> = {
  social: ['#3E7A0C', '#69B317'],
  sport: ['#2F5809', '#4E9412'],
  wellness: ['#4E9412', '#8CCB3A'],
  outdoors: ['#345F13', '#7ABF25'],
};

export const springConfig = { damping: 18, stiffness: 180, mass: 0.7 };
export const softSpring = { damping: 22, stiffness: 120, mass: 0.9 };
