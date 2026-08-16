import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen, ScreenHeader } from '~/components/screen';
import { Button } from '~/components/ui/button';
import { EmptyState, ErrorState } from '~/components/ui/empty-state';
import { Segmented } from '~/components/ui/segmented';
import { Sheet } from '~/components/ui/sheet';
import { SkeletonList } from '~/components/ui/skeleton';
import { Text } from '~/components/ui/text';
import {
  ReservationCard,
  isUpcoming,
  useCancelBooking,
  useReservations,
  type ReservationWithAmenity,
} from '~/features/amenities';

const TABS = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
] as const;

export default function ReservationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<(typeof TABS)[number]['value']>('upcoming');
  const [pendingCancel, setPendingCancel] = useState<string | null>(null);

  const { data, isPending, error, refetch } = useReservations();
  const cancel = useCancelBooking();

  const reservations = useMemo(() => {
    const all = data ?? [];
    return tab === 'upcoming'
      ? all.filter((r) => isUpcoming(r) || r.status === 'waitlisted')
      : all.filter((r) => !isUpcoming(r) && r.status !== 'waitlisted');
  }, [data, tab]);

  const openAmenity = useCallback(
    (amenityId: string) => router.push(`/amenity/${amenityId}`),
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: ReservationWithAmenity }) => (
      <ReservationCard
        reservation={item}
        onCancel={setPendingCancel}
        onPress={openAmenity}
      />
    ),
    [openAmenity],
  );

  const keyExtractor = useCallback((item: ReservationWithAmenity) => item.id, []);

  return (
    <Screen>
      <ScreenHeader title="Your bookings" subtitle="Reservations and waitlists" />

      <View className="px-5 py-4">
        <Segmented options={TABS} value={tab} onChange={setTab} />
      </View>

      {isPending ? (
        <SkeletonList rows={3} />
      ) : error ? (
        <ErrorState message={error.message} onRetry={() => void refetch()} />
      ) : reservations.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title={tab === 'upcoming' ? 'Nothing booked yet' : 'No past bookings'}
          description={
            tab === 'upcoming'
              ? 'The clubhouse, courts, cabana and garden are all bookable from the Book tab.'
              : 'Bookings move here once the date passes.'
          }
          actionLabel={tab === 'upcoming' ? 'Browse amenities' : undefined}
          onAction={tab === 'upcoming' ? () => router.push('/(tabs)/amenities') : undefined}
        />
      ) : (
        <View className="flex-1">
          <FlashList
            data={reservations}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingBottom: insets.bottom + 16,
            }}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      <Sheet
        visible={!!pendingCancel}
        onClose={() => setPendingCancel(null)}
        title="Cancel this booking?"
        subtitle="The slot goes straight back into the pool, and anyone on the waitlist is notified.">
        {!!cancel.error && (
          <View className="mb-3 rounded-2xl bg-destructive-soft px-4 py-3">
            <Text variant="caption" tone="destructive">
              {cancel.error.message}
            </Text>
          </View>
        )}
        <View className="gap-2">
          <Button
            label="Cancel booking"
            variant="destructive"
            size="lg"
            block
            loading={cancel.isPending}
            onPress={() => {
              if (!pendingCancel) return;
              cancel.mutate(pendingCancel, { onSuccess: () => setPendingCancel(null) });
            }}
          />
          <Button
            label="Keep it"
            variant="secondary"
            size="lg"
            block
            onPress={() => setPendingCancel(null)}
          />
        </View>
      </Sheet>
    </Screen>
  );
}
