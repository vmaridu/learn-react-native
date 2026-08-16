import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { formatDate } from '~/lib/format';
import { brandGradient, palette } from '~/lib/theme';
import { AnimatedCounter } from './ui/animated-counter';
import { Button } from './ui/button';
import { Text } from './ui/text';

/**
 * The card that answers "what do I owe" before the member asks. The figure
 * counts up on mount; everything else fades in behind it.
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
      <LinearGradient
        colors={[brandGradient[0], brandGradient[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="overflow-hidden rounded-[28px] p-5">
        <View className="flex-row items-center justify-between">
          <Text variant="overline" className="text-primary-foreground/80">
            Account balance
          </Text>
          {autopayEnabled && (
            <View className="flex-row items-center gap-1 rounded-full bg-white/20 px-2.5 py-1">
              <Ionicons name="repeat" size={12} color={palette.white} />
              <Text className="text-[11px] font-semibold text-primary-foreground">
                Autopay on
              </Text>
            </View>
          )}
        </View>

        <AnimatedCounter
          valueCents={balanceCents}
          accessibilityLabel={`Account balance`}
          className="mt-2 font-bold text-primary-foreground"
          style={{ fontSize: 44, lineHeight: 52, letterSpacing: -1.5 }}
        />

        <Animated.View entering={FadeIn.delay(500).duration(400)}>
          {settled ? (
            <Text variant="caption" className="mt-1 text-primary-foreground/80">
              You are all settled up. Nothing is due.
            </Text>
          ) : (
            <Text variant="caption" className="mt-1 text-primary-foreground/80">
              {pastDueCents > 0
                ? 'Part of this balance is past due'
                : nextDueDate
                  ? `Next due ${formatDate(nextDueDate)}`
                  : 'Due on the first of the month'}
            </Text>
          )}
        </Animated.View>

        <View className="mt-5 flex-row gap-2">
          <Button
            label={settled ? 'View statement' : 'Pay now'}
            variant="onBrand"
            className="flex-1"
            onPress={settled ? onDetails : onPay}
          />
          {!settled && (
            <Button label="Details" variant="onBrandOutline" className="flex-1" onPress={onDetails} />
          )}
        </View>
      </LinearGradient>
    </Animated.View>
  );
}
