import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { cn } from '~/lib/cn';
import { palette } from '~/lib/theme';

const SIZES = {
  md: { box: 44, radius: 14, glyph: 20 },
  lg: { box: 52, radius: 16, glyph: 22 },
  xl: { box: 72, radius: 22, glyph: 30 },
} as const;

/**
 * The soft tile that stands in for an amenity photo.
 *
 * Deliberately flat and one colour for every category: four different gradients
 * made a list of six amenities read as a paint chart. Category is already stated
 * in words on the row — it does not also need a hue.
 *
 * `borderRadius` goes through `style`, not a class. Radius applied by class name
 * silently does nothing on some composite components, which is how these ended
 * up rendering as squares.
 */
export function AmenityTile({
  icon,
  size = 'md',
  className,
}: {
  icon: string;
  /** Kept for call-site compatibility; the tile is intentionally single-tone. */
  category?: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const { box, radius, glyph } = SIZES[size];

  return (
    <View
      style={{ width: box, height: box, borderRadius: radius }}
      className={cn('items-center justify-center bg-primary-soft', className)}>
      <Ionicons name={icon as never} size={glyph} color={palette.brandInk} />
    </View>
  );
}
