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
import { REQUEST_STATUS, useServiceRequests, type ServiceRequest } from '~/features/compliance';
import { formatRelative } from '~/lib/format';
import { palette } from '~/lib/theme';

export default function ServiceRequestsScreen() {
  const router = useRouter();
  const { data, isPending, error, refetch } = useServiceRequests();

  const openRequest = useCallback(
    (requestId: string) => router.push(`/requests/${requestId}`),
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: ServiceRequest }) => {
      const status = REQUEST_STATUS[item.status];
      return (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`${item.title}, ${status.label}`}
          scaleTo={0.985}
          onPress={() => openRequest(item.id)}
          className="mb-2.5 flex-row gap-3.5 rounded-3xl border border-border bg-card p-4">
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft">
            <Ionicons name="megaphone" size={19} color={palette.brandInk} />
          </View>
          <View className="flex-1">
            <Text variant="subheading" numberOfLines={2}>
              {item.title}
            </Text>
            <Text variant="caption" tone="muted" className="mt-1">
              {item.reference} · {item.category} · {formatRelative(item.submittedAt)}
            </Text>
            <View className="mt-2 flex-row flex-wrap gap-1.5">
              <Badge label={status.label} tone={status.tone} />
              {item.priority === 'urgent' && <Badge label="Urgent" tone="destructive" />}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={palette.mutedForeground} />
        </PressableScale>
      );
    },
    [openRequest],
  );

  const keyExtractor = useCallback((item: ServiceRequest) => item.id, []);

  return (
    <Screen>
      <ScreenHeader title="Service requests" subtitle="Issues you have reported to management" />

      {isPending ? (
        <SkeletonList rows={2} />
      ) : error ? (
        <ErrorState message={error.message} onRetry={() => void refetch()} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          icon="megaphone-outline"
          title="Nothing reported"
          description="Broken lights, landscaping, noise, parking — anything the association should know about."
          actionLabel="Report something"
          onAction={() => router.push('/requests/new')}
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
          label="Report an issue"
          size="lg"
          block
          icon="add"
          onPress={() => router.push('/requests/new')}
        />
      </StickyFooter>
    </Screen>
  );
}
