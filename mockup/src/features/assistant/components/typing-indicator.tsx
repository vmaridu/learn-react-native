import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

function Dot({ delayMs }: { delayMs: number }) {
  const bounce = useSharedValue(0);

  useEffect(() => {
    bounce.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(withTiming(1, { duration: 320 }), withTiming(0, { duration: 320 })),
        -1,
        false,
      ),
    );
  }, [bounce, delayMs]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -4 * bounce.value }],
    opacity: 0.45 + bounce.value * 0.55,
  }));

  return <Animated.View style={style} className="h-2 w-2 rounded-full bg-primary" />;
}

/** Three lime dots walking — the assistant is reading the community's documents. */
export function TypingIndicator() {
  return (
    <View
      accessibilityLabel="The assistant is typing"
      className="max-w-[80%] flex-row items-center gap-1.5 self-start rounded-3xl rounded-bl-lg border border-border bg-card px-4 py-3.5">
      <Dot delayMs={0} />
      <Dot delayMs={140} />
      <Dot delayMs={280} />
    </View>
  );
}
