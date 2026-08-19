import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Screen, ScreenHeader, StickyFooter } from '~/components/screen';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { ErrorState } from '~/components/ui/empty-state';
import { PressableScale } from '~/components/ui/pressable-scale';
import { Progress } from '~/components/ui/progress';
import { Sheet } from '~/components/ui/sheet';
import { Skeleton } from '~/components/ui/skeleton';
import { SuccessOverlay } from '~/components/ui/success-overlay';
import { Text } from '~/components/ui/text';
import {
  closingLabel,
  quorumMet,
  resultsWithShare,
  selectionHint,
  turnoutRatio,
  useCastVote,
  useElection,
} from '~/features/elections';
import { formatDate, pluralize } from '~/lib/format';
import { palette } from '~/lib/theme';

export default function ElectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const electionId = id ?? '';

  const election = useElection(electionId);
  const castVote = useCastVote();
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);

  function toggle(optionId: string) {
    if (!election.data) return;
    const seats = election.data.seats;
    setSelected((current) => {
      if (current.includes(optionId)) return current.filter((o) => o !== optionId);
      if (seats === 1) return [optionId];
      if (current.length >= seats) return current;
      return [...current, optionId];
    });
  }

  function submit() {
    castVote.mutate(
      { electionId, optionIds: selected },
      {
        onSuccess(result) {
          setConfirmOpen(false);
          setSelected([]);
          setReceipt(result.receiptCode);
        },
      },
    );
  }

  if (election.error) {
    return (
      <Screen>
        <ScreenHeader title="Ballot" />
        <ErrorState message={election.error.message} onRetry={() => void election.refetch()} />
      </Screen>
    );
  }

  if (election.isPending || !election.data) {
    return (
      <Screen>
        <ScreenHeader title="Ballot" />
        <View className="gap-3 p-5">
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-24 rounded-3xl" />
          <Skeleton className="h-24 rounded-3xl" />
        </View>
      </Screen>
    );
  }

  const e = election.data;
  const turnout = turnoutRatio(e);
  const canVote = e.status === 'open' && e.eligible && !e.hasVoted;
  const results = resultsWithShare(e);

  return (
    <Screen>
      <ScreenHeader title={e.type === 'referendum' ? 'Referendum' : 'Election'} subtitle={closingLabel(e)} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 28 }}>
        <Animated.View entering={FadeInDown.duration(360)}>
          <Text variant="title">{e.title}</Text>
          <Text variant="callout" tone="muted" className="mt-2.5 leading-[23px]">
            {e.summary}
          </Text>
        </Animated.View>

        {/* Eligibility */}
        <Animated.View
          entering={FadeInDown.delay(70).duration(360)}
          className="mt-5 flex-row items-start gap-3 rounded-3xl border border-border bg-primary-soft p-4">
          <Ionicons
            name={e.eligible ? 'shield-checkmark' : 'shield-outline'}
            size={20}
            color={e.eligible ? palette.brandInk : palette.mutedForeground}
          />
          <View className="flex-1">
            <Text variant="subheading">
              {e.eligible ? 'You are eligible to vote' : 'Your unit is not eligible'}
            </Text>
            <Text variant="caption" tone="muted" className="mt-1">
              {e.eligibilityNote}
            </Text>
          </View>
        </Animated.View>

        {/* Turnout */}
        <Animated.View
          entering={FadeInDown.delay(120).duration(360)}
          className="mt-3 rounded-3xl border border-border bg-card p-4">
          <View className="mb-2 flex-row items-center justify-between">
            <Text variant="subheading">Turnout</Text>
            <Badge
              label={quorumMet(e) ? `Quorum met (${e.quorum}%)` : `${e.quorum}% needed`}
              tone={quorumMet(e) ? 'success' : 'warning'}
            />
          </View>
          <Progress
            value={turnout}
            accessibilityLabel={`Turnout ${Math.round(turnout * 100)} percent`}
          />
          <Text variant="caption" tone="muted" className="mt-2">
            {e.ballotsCast} of {e.eligibleVoters} units have voted · closes{' '}
            {formatDate(e.closesAt.slice(0, 10))}
          </Text>
        </Animated.View>

        {/* Already voted */}
        {e.hasVoted && (
          <Animated.View
            entering={FadeInDown.delay(160).duration(360)}
            className="mt-3 flex-row items-start gap-3 rounded-3xl border border-border bg-success-soft p-4">
            <Ionicons name="checkmark-circle" size={20} color={palette.success} />
            <View className="flex-1">
              <Text variant="subheading">Your ballot is in</Text>
              <Text variant="caption" tone="muted" className="mt-1">
                Receipt {e.receiptCode}. This proves your unit voted — it does not record how, and
                neither does anything else.
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Results (closed) */}
        {e.status === 'closed' && results.length > 0 && (
          <View className="mt-7">
            <Text variant="overline" tone="muted" className="pb-3">
              Results
            </Text>
            <View className="gap-3">
              {results.map((result, index) => (
                <Animated.View
                  key={result.optionId}
                  entering={FadeInDown.delay(index * 90).duration(360)}
                  className="rounded-3xl border border-border bg-card p-4">
                  <View className="mb-2 flex-row items-center justify-between gap-3">
                    <View className="flex-1">
                      <Text variant="subheading">{result.option?.name ?? result.optionId}</Text>
                      {!!result.option?.subtitle && (
                        <Text variant="caption" tone="muted" className="mt-0.5">
                          {result.option.subtitle}
                        </Text>
                      )}
                    </View>
                    <View className="items-end">
                      <Text variant="heading">{Math.round(result.share * 100)}%</Text>
                      <Text variant="caption" tone="muted">
                        {result.votes} {pluralize(result.votes, 'vote')}
                      </Text>
                    </View>
                  </View>
                  <Progress
                    value={result.share}
                    delayMs={index * 120}
                    barClassName={index === 0 ? 'bg-primary' : 'bg-muted-foreground'}
                    accessibilityLabel={`${result.option?.name}: ${Math.round(result.share * 100)} percent`}
                  />
                </Animated.View>
              ))}
            </View>
          </View>
        )}

        {/* Ballot */}
        {e.status === 'open' && (
          <View className="mt-7">
            <View className="flex-row items-center justify-between pb-3">
              <Text variant="overline" tone="muted">
                {e.type === 'referendum' ? 'Your choice' : 'Candidates'}
              </Text>
              <Text variant="caption" tone={selected.length > 0 ? 'primary' : 'muted'}>
                {selectionHint(e)}
                {selected.length > 0 ? ` · ${selected.length} selected` : ''}
              </Text>
            </View>

            <View className="gap-2.5">
              {e.options.map((option, index) => {
                const active = selected.includes(option.id);
                const full = !active && selected.length >= e.seats && e.seats > 1;

                return (
                  <Animated.View
                    key={option.id}
                    entering={FadeInDown.delay(index * 70).duration(360)}>
                    <PressableScale
                      accessibilityRole={e.seats === 1 ? 'radio' : 'checkbox'}
                      accessibilityLabel={`${option.name}. ${option.subtitle}`}
                      accessibilityState={{ selected: active, disabled: !canVote || full }}
                      disabled={!canVote || full}
                      haptic="select"
                      scaleTo={0.985}
                      onPress={() => toggle(option.id)}
                      className={`rounded-3xl border p-4 ${
                        active ? 'border-primary bg-primary-soft' : 'border-border bg-card'
                      } ${!canVote || full ? 'opacity-60' : ''}`}>
                      <View className="flex-row items-start gap-3">
                        <View
                          className={`mt-0.5 h-6 w-6 items-center justify-center border-2 ${
                            e.seats === 1 ? 'rounded-full' : 'rounded-lg'
                          } ${active ? 'border-primary bg-primary' : 'border-border bg-background'}`}>
                          {active && <Ionicons name="checkmark" size={14} color={palette.primaryForeground} />}
                        </View>
                        <View className="flex-1">
                          <Text variant="subheading">{option.name}</Text>
                          <Text variant="caption" tone="muted" className="mt-0.5">
                            {option.subtitle}
                          </Text>
                          <Text variant="caption" className="mt-2 leading-[19px]">
                            {option.statement}
                          </Text>
                        </View>
                      </View>
                    </PressableScale>
                  </Animated.View>
                );
              })}
            </View>
          </View>
        )}

        {!!castVote.error && (
          <Animated.View entering={FadeIn.duration(200)} className="mt-4">
            <View className="flex-row items-start gap-2 rounded-2xl bg-destructive-soft px-4 py-3">
              <Ionicons name="alert-circle" size={18} color={palette.destructive} />
              <Text variant="caption" tone="destructive" className="flex-1">
                {castVote.error.message}
              </Text>
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {canVote && (
        <StickyFooter>
          <Button
            label="Review and cast ballot"
            size="lg"
            block
            icon="lock-closed"
            disabled={selected.length === 0}
            onPress={() => setConfirmOpen(true)}
          />
        </StickyFooter>
      )}

      <Sheet
        visible={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Cast your ballot?"
        subtitle="A ballot cannot be changed once it is cast.">
        <View className="gap-2 rounded-2xl bg-muted p-4">
          {selected.map((optionId) => {
            const option = e.options.find((o) => o.id === optionId);
            return (
              <View key={optionId} className="flex-row items-center gap-2">
                <Ionicons name="checkmark-circle" size={16} color={palette.brandInk} />
                <Text variant="subheading" className="flex-1">
                  {option?.name}
                </Text>
              </View>
            );
          })}
        </View>
        <Text variant="caption" tone="muted" className="mt-3">
          Your identity is verified against the unit-owner registry, then separated from the ballot
          before it is counted.
        </Text>
        <Button
          label="Cast ballot"
          size="lg"
          block
          className="mt-4"
          loading={castVote.isPending}
          onPress={submit}
        />
      </Sheet>

      <SuccessOverlay
        visible={!!receipt}
        title="Ballot cast"
        message="Your vote is counted and anonymous. Keep this receipt if you want to confirm your unit voted."
        detail={receipt ? `Receipt ${receipt}` : undefined}
        primaryLabel="Back to elections"
        onPrimary={() => {
          setReceipt(null);
          router.replace('/elections');
        }}
      />
    </Screen>
  );
}
