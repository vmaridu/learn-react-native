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
import { Progress } from '~/components/ui/progress';
import { SkeletonList } from '~/components/ui/skeleton';
import { Text } from '~/components/ui/text';
import {
  closingLabel,
  quorumMet,
  turnoutRatio,
  useElections,
  type Election,
} from '~/features/elections';
import { palette } from '~/lib/theme';

export default function ElectionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isPending, error, refetch } = useElections();

  const openElection = useCallback(
    (electionId: string) => router.push(`/elections/${electionId}`),
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: Election }) => {
      const turnout = turnoutRatio(item);
      const needsVote = item.status === 'open' && !item.hasVoted;

      return (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`${item.title}. ${closingLabel(item)}`}
          scaleTo={0.985}
          onPress={() => openElection(item.id)}
          className="mb-3 rounded-3xl border border-border bg-card p-4">
          <View className="flex-row items-start gap-3.5">
            <View
              className={`h-11 w-11 items-center justify-center rounded-2xl ${
                needsVote ? 'bg-primary' : 'bg-muted'
              }`}>
              <Ionicons
                name={item.status === 'closed' ? 'bar-chart' : 'checkbox'}
                size={20}
                color={needsVote ? palette.primaryForeground : palette.mutedForeground}
              />
            </View>
            <View className="flex-1">
              <Text variant="subheading" numberOfLines={2}>
                {item.title}
              </Text>
              <Text variant="caption" tone="muted" numberOfLines={2} className="mt-1">
                {item.summary}
              </Text>
              <View className="mt-2 flex-row flex-wrap gap-1.5">
                {needsVote && <Badge label="Your ballot is open" tone="primary" icon="time" />}
                {item.hasVoted && (
                  <Badge label="You voted" tone="success" icon="checkmark-circle" />
                )}
                <Badge label={closingLabel(item)} tone="neutral" />
                {item.status !== 'upcoming' && (
                  <Badge
                    label={quorumMet(item) ? 'Quorum met' : 'Below quorum'}
                    tone={quorumMet(item) ? 'success' : 'warning'}
                  />
                )}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.mutedForeground} />
          </View>

          <View className="mt-3.5">
            <View className="mb-1.5 flex-row items-center justify-between">
              <Text variant="caption" tone="muted">
                Turnout
              </Text>
              <Text variant="caption" tone="muted">
                {item.ballotsCast} of {item.eligibleVoters} units · {Math.round(turnout * 100)}%
              </Text>
            </View>
            <Progress
              value={turnout}
              accessibilityLabel={`Turnout ${Math.round(turnout * 100)} percent`}
            />
          </View>
        </PressableScale>
      );
    },
    [openElection],
  );

  const keyExtractor = useCallback((item: Election) => item.id, []);

  return (
    <Screen>
      <ScreenHeader title="Elections" subtitle="Ballots, turnout and results" />

      {isPending ? (
        <SkeletonList rows={3} />
      ) : error ? (
        <ErrorState message={error.message} onRetry={() => void refetch()} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          icon="checkbox-outline"
          title="No ballots"
          description="Elections and referenda appear here when the board opens one."
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
