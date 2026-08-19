import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useCallback, useMemo, useState } from 'react';
import { Linking, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen, ScreenHeader } from '~/components/screen';
import { Badge } from '~/components/ui/badge';
import { ChipRow } from '~/components/ui/chip';
import { EmptyState, ErrorState } from '~/components/ui/empty-state';
import { SearchInput } from '~/components/ui/input';
import { PressableScale } from '~/components/ui/pressable-scale';
import { SkeletonList } from '~/components/ui/skeleton';
import { Text } from '~/components/ui/text';
import {
  filterProviders,
  useServiceProviders,
  type ServiceProvider,
} from '~/features/directory';
import { palette } from '~/lib/theme';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'Childcare', label: 'Childcare' },
  { value: 'Pets', label: 'Pets' },
  { value: 'Tutoring', label: 'Tutoring' },
  { value: 'Notary', label: 'Notary' },
  { value: 'Home repair', label: 'Home repair' },
  { value: 'Landscaping', label: 'Landscaping' },
  { value: 'Cleaning', label: 'Cleaning' },
] as const;

type Filter = (typeof FILTERS)[number]['value'];

export default function ServicesScreen() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const { data, isPending, error, refetch } = useServiceProviders();

  const providers = useMemo(
    () => filterProviders(data ?? [], filter, query),
    [data, filter, query],
  );

  const renderItem = useCallback(({ item }: { item: ServiceProvider }) => {
    return (
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`Call ${item.name}, ${item.category}`}
        accessibilityHint="Opens your phone app"
        scaleTo={0.985}
        onPress={() => void Linking.openURL(`tel:${item.phone.replace(/\D/g, '')}`)}
        className="mb-2.5 rounded-3xl border border-border bg-card p-4">
        <View className="flex-row items-start gap-3.5">
          <View
            className={`h-11 w-11 items-center justify-center rounded-2xl ${
              item.kind === 'resident' ? 'bg-accent' : 'bg-muted'
            }`}>
            <Ionicons
              name={item.kind === 'resident' ? 'home' : 'briefcase'}
              size={19}
              color={item.kind === 'resident' ? palette.accentForeground : palette.mutedForeground}
            />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text variant="subheading" numberOfLines={1} className="flex-1">
                {item.name}
              </Text>
              {item.verified && (
                <Ionicons name="shield-checkmark" size={14} color={palette.brandInk} />
              )}
            </View>
            <Text variant="caption" tone="muted" className="mt-0.5">
              {item.category}
              {item.unit ? ` · ${item.unit}` : ' · external provider'}
            </Text>
            <Text variant="caption" tone="muted" numberOfLines={2} className="mt-1.5">
              {item.blurb}
            </Text>
            <View className="mt-2 flex-row flex-wrap items-center gap-1.5">
              <Badge label={item.rateLabel} tone="primary" />
              <Badge
                label={`${item.rating.toFixed(1)} · ${item.reviewCount} reviews`}
                tone="neutral"
                icon="star"
              />
              {item.kind === 'resident' && <Badge label="Neighbour" tone="success" />}
            </View>
          </View>
        </View>

        <View className="mt-3 flex-row items-center gap-1.5 border-t border-border pt-3">
          <Ionicons name="call-outline" size={15} color={palette.brandInk} />
          <Text variant="caption" tone="primary" className="font-semibold">
            {item.phone}
          </Text>
        </View>
      </PressableScale>
    );
  }, []);

  const keyExtractor = useCallback((item: ServiceProvider) => item.id, []);

  return (
    <Screen>
      <ScreenHeader title="Service directory" subtitle="Neighbours and vetted providers" />

      <View className="gap-3 px-5 py-4">
        <SearchInput value={query} onChangeText={setQuery} placeholder="Search services" />
        <ChipRow options={FILTERS} value={filter} onChange={setFilter} />
      </View>

      {isPending ? (
        <SkeletonList rows={4} />
      ) : error ? (
        <ErrorState message={error.message} onRetry={() => void refetch()} />
      ) : providers.length === 0 ? (
        <EmptyState
          icon="briefcase-outline"
          title="Nothing in that category"
          description="This is a listing directory — the association does not take a cut or handle payment."
          actionLabel="Show everything"
          onAction={() => {
            setFilter('all');
            setQuery('');
          }}
        />
      ) : (
        <View className="flex-1">
          <FlashList
            data={providers}
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
    </Screen>
  );
}
