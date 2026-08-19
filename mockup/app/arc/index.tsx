import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';

import { Screen, ScreenHeader, StickyFooter } from '~/components/screen';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { EmptyState, ErrorState } from '~/components/ui/empty-state';
import { PressableScale } from '~/components/ui/pressable-scale';
import { SkeletonList } from '~/components/ui/skeleton';
import { Text } from '~/components/ui/text';
import { ARC_STATUS, useArcRequests, type ArcRequest } from '~/features/compliance';
import { formatDate, formatRelative } from '~/lib/format';
import { palette } from '~/lib/theme';

export default function ArcRequestsScreen() {
  const router = useRouter();

  const { data, isPending, error, refetch } = useArcRequests();

  const openRequest = useCallback(
    (requestId: string) => router.push(`/arc/${requestId}`),
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: ArcRequest }) => {
      const status = ARC_STATUS[item.status];
      return (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`${item.title}, ${status.label}`}
          scaleTo={0.985}
          onPress={() => openRequest(item.id)}
          className="mb-2.5 flex-row gap-3.5 rounded-3xl border border-border bg-card p-4">
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft">
            <Ionicons name="hammer" size={19} color={palette.brandInk} />
          </View>
          <View className="flex-1">
            <Text variant="subheading" numberOfLines={2}>
              {item.title}
            </Text>
            <Text variant="caption" tone="muted" className="mt-1">
              {item.reference} · {item.category} · submitted {formatRelative(item.submittedAt)}
            </Text>
            <View className="mt-2 flex-row flex-wrap gap-1.5">
              <Badge label={status.label} tone={status.tone} />
              <Badge
                label={`Start ${formatDate(item.estimatedStart)}`}
                tone="neutral"
                icon="calendar-outline"
              />
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={palette.mutedForeground} />
        </PressableScale>
      );
    },
    [openRequest],
  );

  const keyExtractor = useCallback((item: ArcRequest) => item.id, []);

  return (
    <Screen>
      <ScreenHeader title="Architectural requests" subtitle="Submit and track ARC applications" />

      {isPending ? (
        <SkeletonList rows={2} />
      ) : error ? (
        <ErrorState message={error.message} onRetry={() => void refetch()} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          icon="hammer-outline"
          title="No applications yet"
          description="Anything that changes the outside of your home needs written approval before work starts."
          actionLabel="Start an application"
          onAction={() => router.push('/arc/new')}
        />
      ) : (
        <View className="flex-1 pt-2">
          <FlashList
            data={data ?? []}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      <StickyFooter>
        <Button
          label="New application"
          size="lg"
          block
          icon="add"
          onPress={() => router.push('/arc/new')}
        />
      </StickyFooter>
    </Screen>
  );
}
