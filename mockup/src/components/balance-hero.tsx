import { View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { formatDate } from '~/lib/format';
import { AnimatedCounter } from './ui/animated-counter';
import { Button } from './ui/button';
import { PressableScale } from './ui/pressable-scale';
import { Text } from './ui/text';

/**
 * The card that answers "what do I owe" before the member asks.
 *
 * A soft lime wash rather than a flooded green block — at this size a saturated
 * fill dominates the whole screen and makes everything below it feel secondary.
 * The lime lives in the button instead, where it means "press me".
 *
 * `borderRadius` is set through `style` on purpose. See `AmenityTile`.
 */
export function BalanceHero({
  balanceCents,
  nextDueDate,
  pastDueCents,
  autopayEnabled,
  onPay,
  onDetails,
}: {
  balanceCents: number;
  nextDueDate: string | null;
  pastDueCents: number;
  autopayEnabled: boolean;
  onPay: () => void;
  onDetails: () => void;
}) {
  const settled = balanceCents <= 0;

  return (
    <Animated.View entering={FadeInDown.duration(400)} className="px-5">
      <View style={{ borderRadius: 28 }} className="bg-primary-soft px-6 py-7">
        <View className="flex-row items-center justify-between">
          <Text variant="caption" tone="muted">
            Account balance
          </Text>
          {autopayEnabled && (
            <Text variant="caption" tone="muted">
              Autopay on
            </Text>
          )}
        </View>

        <AnimatedCounter
          valueCents={balanceCents}
          accessibilityLabel="Account balance"
          className="mt-2 font-bold text-foreground"
          style={{ fontSize: 42, lineHeight: 50, letterSpacing: -1.6 }}
        />

        <Animated.View entering={FadeIn.delay(500).duration(400)}>
          <Text variant="caption" tone={pastDueCents > 0 ? 'destructive' : 'muted'} className="mt-1">
            {settled
              ? 'All settled up'
              : pastDueCents > 0
                ? 'Part of this balance is past due'
                : nextDueDate
                  ? `Due ${formatDate(nextDueDate)}`
                  : 'Due on the first of the month'}
          </Text>
        </Animated.View>

        <View className="mt-6 flex-row items-center gap-5">
          <Button
            label={settled ? 'View statement' : 'Pay now'}
            onPress={settled ? onDetails : onPay}
          />
          {!settled && (
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Balance details"
              hitSlop={10}
              scaleTo={0.95}
              onPress={onDetails}>
              <Text variant="subheading" tone="muted">
                Details
              </Text>
            </PressableScale>
          )}
        </View>
      </View>
    </Animated.View>
  );
}
