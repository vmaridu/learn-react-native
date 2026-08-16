import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { View } from 'react-native';

import { PressableScale } from '~/components/ui/pressable-scale';
import { Text } from '~/components/ui/text';
import { formatDuration } from '~/lib/format';
import { palette } from '~/lib/theme';
import type { Amenity } from '../types';
import { CATEGORY_LABELS } from '../utils';
import { AmenityTile } from './amenity-tile';

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
      scaleTo={0.98}
      onPress={() => onPress(amenity.id)}
      className="mb-3 flex-row items-center gap-4 rounded-3xl border border-border bg-card p-4">
      <AmenityTile icon={amenity.icon} category={amenity.category} size="lg" />
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text variant="subheading" numberOfLines={1} className="flex-1">
            {amenity.name}
          </Text>
        </View>
        <Text variant="caption" tone="muted" numberOfLines={2} className="mt-1">
          {amenity.blurb}
        </Text>
        <View className="mt-2 flex-row items-center gap-3">
          <View className="flex-row items-center gap-1">
            <Ionicons name="pricetag-outline" size={12} color={palette.mutedForeground} />
            <Text variant="caption" tone="muted">
              {CATEGORY_LABELS[amenity.category]}
            </Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Ionicons name="time-outline" size={12} color={palette.mutedForeground} />
            <Text variant="caption" tone="muted">
              up to {formatDuration(amenity.rules.maxDurationMinutes)}
            </Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={palette.mutedForeground} />
    </PressableScale>
  );
});
