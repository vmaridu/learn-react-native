import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useTabDockClearance } from '~/components/tab-bar';
import { Screen, TabHeader } from '~/components/screen';
import { ChipRow } from '~/components/ui/chip';
import { EmptyState, ErrorState } from '~/components/ui/empty-state';
import { SearchInput } from '~/components/ui/input';
import { SkeletonList } from '~/components/ui/skeleton';
import { AmenityCard, useAmenities, useReservations, type Amenity } from '~/features/amenities';
import { Separator } from '~/components/ui/separator';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'social', label: 'Social' },
  { value: 'sport', label: 'Sport' },
  { value: 'wellness', label: 'Wellness' },
  { value: 'outdoors', label: 'Outdoors' },
] as const;

type Filter = (typeof FILTERS)[number]['value'];

export default function AmenitiesScreen() {
  const router = useRouter();
  const dockClearance = useTabDockClearance();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const { data, isPending, error, refetch } = useAmenities();
  const reservations = useReservations();

  const upcomingCount =
    reservations.data?.filter(
      (r) => r.status === 'confirmed' && r.date >= new Date().toISOString().slice(0, 10),
    ).length ?? 0;

  const amenities = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? []).filter((amenity) => {
      if (filter !== 'all' && amenity.category !== filter) return false;
      if (!q) return true;
      return (
        amenity.name.toLowerCase().includes(q) ||
        amenity.blurb.toLowerCase().includes(q) ||
        amenity.location.toLowerCase().includes(q)
      );
    });
  }, [data, filter, query]);

  const openAmenity = useCallback(
    (amenityId: string) => router.push(`/amenity/${amenityId}`),
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: Amenity }) => <AmenityCard amenity={item} onPress={openAmenity} />,
    [openAmenity],
  );

  const keyExtractor = useCallback((item: Amenity) => item.id, []);

  return (
    <Screen>
      <TabHeader
        title="Book"
        subtitle="Reserve a shared space"
        actionIcon="albums-outline"
        actionLabel={`Your bookings${upcomingCount > 0 ? `, ${upcomingCount} upcoming` : ''}`}
        onAction={() => router.push('/reservations')}
      />

      <Animated.View entering={FadeInDown.delay(60).duration(320)} className="gap-3 px-5 pb-3">
        <SearchInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search amenities"
        />
        <ChipRow options={FILTERS} value={filter} onChange={setFilter} />
      </Animated.View>

      {isPending ? (
        <SkeletonList rows={4} />
      ) : error ? (
        <ErrorState message={error.message} onRetry={() => void refetch()} />
      ) : amenities.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title="Nothing matches"
          description="Try a different search or clear the category filter."
          actionLabel="Clear filters"
          onAction={() => {
            setQuery('');
            setFilter('all');
          }}
        />
      ) : (
        <View className="flex-1">
          <FlashList
            data={amenities}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            ItemSeparatorComponent={Separator}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingBottom: dockClearance,
            }}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
    </Screen>
  );
}
