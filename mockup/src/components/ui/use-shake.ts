import { useCallback, useEffect, useState } from 'react';
import {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { haptics } from '~/lib/haptics';

/**
 * "That was wrong" as motion instead of another line of red text.
 *
 * Returns a style to spread onto an Animated.View and a `trigger` to call when
 * a submission is rejected. Each call runs exactly one shake.
 */
export function useShake(amplitude = 8) {
  const [nonce, setNonce] = useState(0);
  const offset = useSharedValue(0);

  useEffect(() => {
    if (nonce === 0) return;
    haptics.error();
    offset.value = withSequence(
      withTiming(-amplitude, { duration: 55 }),
      withTiming(amplitude, { duration: 55 }),
      withTiming(-amplitude * 0.6, { duration: 55 }),
      withTiming(0, { duration: 55 }),
    );
  }, [amplitude, nonce, offset]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  const trigger = useCallback(() => setNonce((count) => count + 1), []);

  return { style, trigger };
}
