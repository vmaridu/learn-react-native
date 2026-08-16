import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Screen, ScreenHeader, StickyFooter } from '~/components/screen';
import { Timeline } from '~/components/timeline';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { ErrorState } from '~/components/ui/empty-state';
import { Input } from '~/components/ui/input';
import { Separator } from '~/components/ui/separator';
import { Sheet } from '~/components/ui/sheet';
import { Skeleton } from '~/components/ui/skeleton';
import { SuccessOverlay } from '~/components/ui/success-overlay';
import { Text } from '~/components/ui/text';
import {
  VIOLATION_STATUS,
  cureLabel,
  disputeSchema,
  useDisputeViolation,
  useViolation,
  type DisputeValues,
} from '~/features/compliance';
import { formatCents, formatDate } from '~/lib/format';
import { palette, tileGradients } from '~/lib/theme';

export default function ViolationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const violationId = id ?? '';

  const violation = useViolation(violationId);
  const dispute = useDisputeViolation();
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputed, setDisputed] = useState(false);

  const { control, handleSubmit, reset } = useForm<DisputeValues>({
    resolver: zodResolver(disputeSchema),
    defaultValues: { reason: '' },
  });

  const onDispute = handleSubmit((values) => {
    dispute.mutate(
      { violationId, reason: values.reason },
      {
        onSuccess() {
          reset();
          setDisputeOpen(false);
          setDisputed(true);
        },
      },
    );
  });

  if (violation.error) {
    return (
      <Screen>
        <ScreenHeader title="Violation" />
        <ErrorState message={violation.error.message} onRetry={() => void violation.refetch()} />
      </Screen>
    );
  }

  if (violation.isPending || !violation.data) {
    return (
      <Screen>
        <ScreenHeader title="Violation" />
        <View className="gap-3 p-5">
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-28 rounded-3xl" />
          <Skeleton className="h-40 rounded-3xl" />
        </View>
      </Screen>
    );
  }

  const v = violation.data;
  const status = VIOLATION_STATUS[v.status];
  const owed = v.fineCents > 0 && !v.finePaid;
  const canDispute = v.status === 'open' || v.status === 'escalated';

  return (
    <Screen>
      <ScreenHeader title={v.reference} subtitle={v.ruleCitation} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 28 }}>
        <Animated.View entering={FadeInDown.duration(360)}>
          <Text variant="title">{v.title}</Text>
          <View className="mt-3 flex-row flex-wrap gap-1.5">
            <Badge label={status.label} tone={status.tone} />
            {v.status === 'open' && (
              <Badge label={cureLabel(v.cureByDate)} tone="neutral" icon="time-outline" />
            )}
            {v.finePaid && v.fineCents > 0 && (
              <Badge label="Fine paid" tone="success" icon="checkmark-circle" />
            )}
          </View>
          <Text variant="callout" className="mt-4 leading-[23px]">
            {v.description}
          </Text>
        </Animated.View>

        {/* Fine */}
        {v.fineCents > 0 && (
          <Animated.View
            entering={FadeInDown.delay(70).duration(360)}
            className={`mt-5 rounded-3xl border p-4 ${
              owed ? 'border-destructive/20 bg-destructive-soft' : 'border-border bg-success-soft'
            }`}>
            <View className="flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-2xl bg-background">
                <Ionicons
                  name={owed ? 'cash-outline' : 'checkmark-circle'}
                  size={20}
                  color={owed ? palette.destructive : palette.success}
                />
              </View>
              <View className="flex-1">
                <Text variant="heading">{formatCents(v.fineCents)}</Text>
                <Text variant="caption" tone="muted" className="mt-0.5">
                  {owed
                    ? `Assessed per the fine schedule · due ${formatDate(v.cureByDate)}`
                    : 'Paid in full'}
                </Text>
              </View>
            </View>
            {owed && (
              <Button
                label="Pay this fine"
                block
                className="mt-3.5"
                icon="card-outline"
                onPress={() => router.push('/checkout?charge=ch-fine')}
              />
            )}
          </Animated.View>
        )}

        {/* Evidence */}
        {v.evidence.length > 0 && (
          <View className="mt-7">
            <Text variant="overline" tone="muted" className="pb-3">
              Photo evidence
            </Text>
            <View className="flex-row flex-wrap gap-2.5">
              {v.evidence.map((photo, index) => (
                <Animated.View
                  key={photo.id}
                  entering={FadeInDown.delay(index * 80).duration(340)}
                  className="w-[47%]">
                  <LinearGradient
                    colors={[tileGradients.outdoors![0], tileGradients.outdoors![1]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="h-28 items-center justify-center rounded-2xl">
                    <Ionicons name="image-outline" size={26} color={palette.white} />
                  </LinearGradient>
                  <Text variant="caption" tone="muted" className="mt-1.5" numberOfLines={1}>
                    {photo.caption}
                  </Text>
                </Animated.View>
              ))}
            </View>
            <Text variant="caption" tone="muted" className="mt-2.5">
              Placeholders — the mockup ships no image files.
            </Text>
          </View>
        )}

        {/* Dispute on record */}
        {!!v.disputeText && (
          <View className="mt-7">
            <Text variant="overline" tone="muted" className="pb-3">
              Your dispute
            </Text>
            <View className="rounded-3xl border border-border bg-card p-4">
              <Text variant="callout" className="leading-[23px]">
                {v.disputeText}
              </Text>
            </View>
          </View>
        )}

        {/* Timeline */}
        <View className="mt-7">
          <Separator />
          <Text variant="overline" tone="muted" className="mb-4 mt-5">
            History
          </Text>
          <Timeline events={v.timeline} />
        </View>
      </ScrollView>

      {canDispute && (
        <StickyFooter>
          <Button
            label="Dispute this violation"
            variant="outline"
            size="lg"
            block
            icon="chatbox-ellipses-outline"
            onPress={() => setDisputeOpen(true)}
          />
        </StickyFooter>
      )}

      <Sheet
        visible={disputeOpen}
        onClose={() => setDisputeOpen(false)}
        title="Dispute this violation"
        subtitle="Management has 30 days to respond. The fine is held while your dispute is open.">
        <Controller
          control={control}
          name="reason"
          render={({ field, fieldState }) => (
            <Input
              label="What happened?"
              placeholder="Explain what the committee got wrong, and reference anything that supports it — a receipt, an approval, a date."
              multiline
              numberOfLines={6}
              value={field.value}
              onChangeText={field.onChange}
              error={fieldState.error?.message ?? dispute.error?.message}
              hint={`${field.value.length} characters`}
            />
          )}
        />
        <Button
          label="Submit dispute"
          size="lg"
          block
          className="mt-4"
          loading={dispute.isPending}
          onPress={onDispute}
        />
      </Sheet>

      <SuccessOverlay
        visible={disputed}
        title="Dispute submitted"
        message={`Management has 30 days to respond on ${v.reference}. The fine is on hold until they do.`}
        primaryLabel="Done"
        onPrimary={() => setDisputed(false)}
      />
    </Screen>
  );
}
