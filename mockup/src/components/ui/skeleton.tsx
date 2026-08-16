import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { cn } from '~/lib/cn';

/** A quietly pulsing placeholder block. */
export function Skeleton({ className }: { className?: string }) {
  const pulse = useSharedValue(0.5);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(1, { duration: 700 }), withTiming(0.5, { duration: 700 })),
      -1,
      false,
    );
  }, [pulse]);

  const style = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View style={style} className={cn('rounded-2xl bg-muted', className)} />
  );
}

/** The standard "screen is loading" arrangement — used by every list screen. */
export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <View className="gap-3 px-5 pt-2" accessibilityLabel="Loading" accessibilityRole="progressbar">
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} className="rounded-3xl border border-border bg-card p-5">
          <View className="flex-row items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-2xl" />
            <View className="flex-1 gap-2">
              <Skeleton className="h-4 w-1/2 rounded-lg" />
              <Skeleton className="h-3 w-3/4 rounded-lg" />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}
