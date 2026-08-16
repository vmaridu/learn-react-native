import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { View } from 'react-native';

import { Badge } from '~/components/ui/badge';
import { PressableScale } from '~/components/ui/pressable-scale';
import { Text } from '~/components/ui/text';
import { formatDate, formatTimeRange } from '~/lib/format';
import { palette } from '~/lib/theme';
import type { ReservationWithAmenity } from '../types';
import { isUpcoming } from '../utils';
import { AmenityTile } from './amenity-tile';

export const ReservationCard = memo(function ReservationCard({
  reservation,
  onCancel,
  onPress,
}: {
  reservation: ReservationWithAmenity;
  onCancel: (reservationId: string) => void;
  onPress: (amenityId: string) => void;
}) {
  const upcoming = isUpcoming(reservation);
  const cancelled = reservation.status === 'cancelled';
  const waitlisted = reservation.status === 'waitlisted';

  return (
    <View className="mb-3 rounded-3xl border border-border bg-card p-4">
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${reservation.amenity.name} on ${formatDate(reservation.date)}`}
        scaleTo={0.985}
        onPress={() => onPress(reservation.amenityId)}
        className="flex-row items-center gap-4">
        <AmenityTile
          icon={reservation.amenity.icon}
          category={reservation.amenity.category}
          size="lg"
          className={cancelled ? 'opacity-40' : undefined}
        />
        <View className="flex-1">
          <Text variant="subheading" numberOfLines={1}>
            {reservation.amenity.name}
          </Text>
          <Text variant="caption" tone="muted" className="mt-1">
            {formatDate(reservation.date)} · {formatTimeRange(reservation.start, reservation.minutes)}
          </Text>
          <View className="mt-2 flex-row flex-wrap items-center gap-1.5">
            {cancelled && <Badge label="Cancelled" tone="neutral" />}
            {waitlisted && (
              <Badge
                label={`Waitlist · #${reservation.waitlistPosition ?? 1}`}
                tone="warning"
                icon="hourglass-outline"
              />
            )}
            {!cancelled && !waitlisted && upcoming && (
              <Badge label="Confirmed" tone="success" icon="checkmark-circle" />
            )}
            {!cancelled && !upcoming && <Badge label="Past" tone="neutral" />}
            {reservation.guests > 0 && (
              <Badge label={`${reservation.guests} guests`} tone="neutral" icon="people-outline" />
            )}
            {!!reservation.recurringWeeks && (
              <Badge label="Weekly" tone="primary" icon="repeat" />
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={palette.mutedForeground} />
      </PressableScale>

      {upcoming && !cancelled && (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`Cancel ${reservation.amenity.name} on ${formatDate(reservation.date)}`}
          haptic="press"
          scaleTo={0.97}
          onPress={() => onCancel(reservation.id)}
          className="mt-3 h-10 flex-row items-center justify-center gap-1.5 rounded-2xl border border-border bg-background">
          <Ionicons name="close-circle-outline" size={16} color={palette.destructive} />
          <Text variant="caption" tone="destructive" className="font-semibold">
            Cancel reservation
          </Text>
        </PressableScale>
      )}
    </View>
  );
});
