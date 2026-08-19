import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Modal, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { haptics } from '~/lib/haptics';
import { palette } from '~/lib/theme';
import { Button } from './button';
import { Text } from './text';

function Ring({ delayMs }: { delayMs: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delayMs,
      withRepeat(withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) }), -1, false),
    );
  }, [delayMs, progress]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + progress.value * 1.5 }],
    opacity: 0.35 * (1 - progress.value),
  }));

  return (
    <Animated.View
      style={style}
      className="absolute h-24 w-24 rounded-full border-2 border-primary"
      pointerEvents="none"
    />
  );
}

/**
 * The confirmation moment shared by booking, payment, voting and submission
 * flows: a spring-scaled lime disc, a checkmark that lands a beat later, and
 * two rings breathing outward behind it.
 */
export function SuccessOverlay({
  visible,
  title,
  message,
  detail,
  primaryLabel = 'Done',
  onPrimary,
  secondaryLabel,
  onSecondary,
}: {
  visible: boolean;
  title: string;
  message: string;
  detail?: string;
  primaryLabel?: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  const disc = useSharedValue(0);
  const check = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      disc.value = 0;
      check.value = 0;
      return;
    }
    haptics.success();
    disc.value = withSpring(1, { damping: 12, stiffness: 160 });
    check.value = withDelay(
      160,
      withSequence(
        withSpring(1.15, { damping: 10, stiffness: 220 }),
        withSpring(1, { damping: 14, stiffness: 200 }),
      ),
    );
  }, [check, disc, visible]);

  const discStyle = useAnimatedStyle(() => ({
    transform: [{ scale: disc.value }],
  }));
  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: check.value }],
    opacity: check.value > 0 ? 1 : 0,
  }));

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(160)}
        className="flex-1 items-center justify-center bg-background px-8">
        <View className="h-28 w-28 items-center justify-center">
          {visible && (
            <>
              <Ring delayMs={0} />
              <Ring delayMs={800} />
            </>
          )}
          <Animated.View
            style={discStyle}
            className="h-24 w-24 items-center justify-center rounded-full bg-primary">
            <Animated.View style={checkStyle}>
              <Ionicons name="checkmark" size={46} color={palette.primaryForeground} />
            </Animated.View>
          </Animated.View>
        </View>

        <Animated.View
          entering={FadeIn.delay(260).duration(320)}
          className="mt-8 items-center">
          <Text variant="title" className="text-center">
            {title}
          </Text>
          <Text variant="callout" tone="muted" className="mt-2 text-center">
            {message}
          </Text>
          {!!detail && (
            <View className="mt-5 rounded-2xl border border-border bg-muted px-4 py-3">
              <Text variant="mono" tone="muted" className="text-center">
                {detail}
              </Text>
            </View>
          )}
        </Animated.View>

        <Animated.View
          entering={FadeIn.delay(400).duration(320)}
          className="mt-10 w-full gap-2">
          <Button label={primaryLabel} block onPress={onPrimary} />
          {!!secondaryLabel && !!onSecondary && (
            <Button
              label={secondaryLabel}
              variant="ghost"
              block
              onPress={onSecondary}
            />
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
