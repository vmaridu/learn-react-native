import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { cn } from '~/lib/cn';

/** A bar that grows to its value on mount. `value` is 0–1. */
export function Progress({
  value,
  className,
  barClassName,
  delayMs = 0,
  accessibilityLabel,
}: {
  value: number;
  className?: string;
  barClassName?: string;
  delayMs?: number;
  accessibilityLabel?: string;
}) {
  const width = useSharedValue(0);
  const target = Math.max(0, Math.min(1, value));

  useEffect(() => {
    width.value = withDelay(delayMs, withTiming(target, { duration: 700 }));
  }, [delayMs, target, width]);

  const style = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ now: Math.round(target * 100), min: 0, max: 100 }}
      className={cn('h-2 overflow-hidden rounded-full bg-muted', className)}>
      <Animated.View style={style} className={cn('h-full rounded-full bg-primary', barClassName)} />
    </View>
  );
}
