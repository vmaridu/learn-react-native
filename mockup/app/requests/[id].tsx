import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Screen, ScreenHeader } from '~/components/screen';
import { Timeline } from '~/components/timeline';
import { Badge } from '~/components/ui/badge';
import { ErrorState } from '~/components/ui/empty-state';
import { Separator } from '~/components/ui/separator';
import { Skeleton } from '~/components/ui/skeleton';
import { Text } from '~/components/ui/text';
import { PRIORITY_LABELS, REQUEST_STATUS, useServiceRequest } from '~/features/compliance';
import { palette } from '~/lib/theme';

export default function ServiceRequestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const request = useServiceRequest(id ?? '');

  if (request.error) {
    return (
      <Screen>
        <ScreenHeader title="Request" />
        <ErrorState message={request.error.message} onRetry={() => void request.refetch()} />
      </Screen>
    );
  }

  if (request.isPending || !request.data) {
    return (
      <Screen>
        <ScreenHeader title="Request" />
        <View className="gap-3 p-5">
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-40 rounded-3xl" />
        </View>
      </Screen>
    );
  }

  const r = request.data;
  const status = REQUEST_STATUS[r.status];

  return (
    <Screen>
      <ScreenHeader title={r.reference} subtitle={r.category} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 28 }}>
        <Animated.View entering={FadeInDown.duration(360)}>
          <Text variant="title">{r.title}</Text>
          <View className="mt-3 flex-row flex-wrap gap-1.5">
            <Badge label={status.label} tone={status.tone} />
            <Badge label={PRIORITY_LABELS[r.priority]} tone="neutral" />
          </View>
          <Text variant="callout" className="mt-4 leading-[23px]">
            {r.detail}
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(70).duration(360)}
          className="mt-5 flex-row items-center gap-3 rounded-3xl border border-border bg-card p-4">
          <View className="h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft">
            <Ionicons name="location-outline" size={18} color={palette.brandInk} />
          </View>
          <View className="flex-1">
            <Text variant="caption" tone="muted">
              Location
            </Text>
            <Text variant="subheading" className="mt-0.5">
              {r.location}
            </Text>
          </View>
        </Animated.View>

        <View className="mt-7">
          <Separator />
          <Text variant="overline" tone="muted" className="mb-4 mt-5">
            Progress
          </Text>
          <Timeline events={r.timeline} />
        </View>
      </ScrollView>
    </Screen>
  );
}
