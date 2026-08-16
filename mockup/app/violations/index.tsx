import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen, ScreenHeader } from '~/components/screen';
import { Badge } from '~/components/ui/badge';
import { EmptyState, ErrorState } from '~/components/ui/empty-state';
import { PressableScale } from '~/components/ui/pressable-scale';
import { SkeletonList } from '~/components/ui/skeleton';
import { Text } from '~/components/ui/text';
import { VIOLATION_STATUS, cureLabel, useViolations, type Violation } from '~/features/compliance';
import { formatCents, formatRelative } from '~/lib/format';
import { palette } from '~/lib/theme';

export default function ViolationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isPending, error, refetch } = useViolations();

  const openViolation = useCallback(
    (violationId: string) => router.push(`/violations/${violationId}`),
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: Violation }) => {
      const status = VIOLATION_STATUS[item.status];
      const owed = item.fineCents > 0 && !item.finePaid;

      return (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`${item.title}, ${status.label}`}
          scaleTo={0.985}
          onPress={() => openViolation(item.id)}
          className="mb-2.5 flex-row gap-3.5 rounded-3xl border border-border bg-card p-4">
          <View
            className={`h-11 w-11 items-center justify-center rounded-2xl ${
              item.status === 'resolved' ? 'bg-success-soft' : 'bg-warning-soft'
            }`}>
            <Ionicons
              name={item.status === 'resolved' ? 'checkmark-circle' : 'warning'}
              size={20}
              color={item.status === 'resolved' ? palette.success : palette.warning}
            />
          </View>
          <View className="flex-1">
            <Text variant="subheading" numberOfLines={2}>
              {item.title}
            </Text>
            <Text variant="caption" tone="muted" className="mt-1">
              {item.reference} · {item.ruleCitation} · {formatRelative(item.reportedAt)}
            </Text>
            <View className="mt-2 flex-row flex-wrap gap-1.5">
              <Badge label={status.label} tone={status.tone} />
              {owed && <Badge label={`${formatCents(item.fineCents)} due`} tone="destructive" />}
              {item.finePaid && item.fineCents > 0 && (
                <Badge label="Fine paid" tone="success" icon="checkmark-circle" />
              )}
              {item.status === 'open' && (
                <Badge label={cureLabel(item.cureByDate)} tone="neutral" icon="time-outline" />
              )}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={palette.mutedForeground} />
        </PressableScale>
      );
    },
    [openViolation],
  );

  const keyExtractor = useCallback((item: Violation) => item.id, []);

  return (
    <Screen>
      <ScreenHeader title="Violations" subtitle="Notices, disputes and fines" />

      {isPending ? (
        <SkeletonList rows={3} />
      ) : error ? (
        <ErrorState message={error.message} onRetry={() => void refetch()} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          icon="checkmark-circle-outline"
          title="Nothing on record"
          description="You have no violation notices. Good neighbouring."
        />
      ) : (
        <View className="flex-1 pt-2">
          <FlashList
            data={data ?? []}
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
