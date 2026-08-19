import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { View } from 'react-native';

import { PressableScale } from '~/components/ui/pressable-scale';
import { Text } from '~/components/ui/text';
import { palette } from '~/lib/theme';
import type { Amenity } from '../types';
import { AmenityTile } from './amenity-tile';

/**
 * One amenity, one line of explanation.
 *
 * The card used to carry a category chip and a max-duration chip under the
 * blurb. Both are on the detail screen where they matter; on a browse list they
 * were three type sizes and two icons per row for information nobody scans.
 */
export const AmenityCard = memo(function AmenityCard({
  amenity,
  onPress,
}: {
  amenity: Amenity;
  onPress: (amenityId: string) => void;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${amenity.name}. ${amenity.blurb}`}
      accessibilityHint="Opens availability and booking"
      scaleTo={0.985}
      onPress={() => onPress(amenity.id)}
      className="flex-row items-center gap-4 py-4">
      <AmenityTile icon={amenity.icon} size="lg" />
      <View className="flex-1">
        <Text variant="subheading" numberOfLines={1}>
          {amenity.name}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={2} className="mt-1">
          {amenity.blurb}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={palette.mutedForeground} />
    </PressableScale>
  );
});
