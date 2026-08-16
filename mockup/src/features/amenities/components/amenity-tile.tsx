import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { cn } from '~/lib/cn';
import { palette, tileGradients } from '~/lib/theme';
import type { AmenityCategory } from '../types';

/**
 * The lime gradient square that stands in for an amenity photo. The mockup ships
 * no stock photography — a gradient plus a glyph is honest about being a mockup
 * and keeps the app fully offline.
 */
export function AmenityTile({
  icon,
  category,
  size = 'md',
  className,
}: {
  icon: string;
  category: AmenityCategory;
  size?: 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const gradient = tileGradients[category] ?? tileGradients.social!;
  const box =
    size === 'xl' ? 'h-24 w-24 rounded-3xl' : size === 'lg' ? 'h-16 w-16 rounded-2xl' : 'h-14 w-14 rounded-2xl';
  const glyph = size === 'xl' ? 40 : size === 'lg' ? 28 : 24;

  return (
    <LinearGradient
      colors={[gradient[0], gradient[1]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className={cn('items-center justify-center overflow-hidden', box, className)}>
      <Ionicons name={icon as never} size={glyph} color={palette.white} />
    </LinearGradient>
  );
}
