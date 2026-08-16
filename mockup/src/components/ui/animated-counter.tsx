import { useEffect } from 'react';
import { TextInput, type TextStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

/**
 * Formats integer cents as "$1,482.50" on the UI thread.
 * Hand-rolled because Intl is not available inside a worklet.
 */
function formatWorklet(cents: number): string {
  'worklet';
  const rounded = Math.round(Math.abs(cents));
  const dollars = Math.floor(rounded / 100);
  const remainder = rounded % 100;

  let grouped = '';
  const digits = String(dollars);
  for (let i = 0; i < digits.length; i += 1) {
    const fromEnd = digits.length - i;
    grouped += digits[i];
    if (fromEnd > 1 && (fromEnd - 1) % 3 === 0) grouped += ',';
  }

  const sign = cents < 0 ? '-' : '';
  return `${sign}$${grouped}.${remainder < 10 ? '0' : ''}${remainder}`;
}

/**
 * A money figure that counts up on mount. Uses the animated-TextInput `text`
 * prop so the tween never crosses onto the JS thread — a setState-per-frame
 * counter drops frames on Android the moment anything else is happening.
 *
 * `defaultValue` carries the final figure, so if the platform ever ignores the
 * animated `text` prop the reader still sees the correct number.
 */
export function AnimatedCounter({
  valueCents,
  style,
  className,
  durationMs = 900,
  delayMs = 120,
  accessibilityLabel,
}: {
  valueCents: number;
  style?: TextStyle;
  className?: string;
  durationMs?: number;
  delayMs?: number;
  accessibilityLabel?: string;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(
      delayMs,
      withTiming(valueCents, {
        duration: durationMs,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [delayMs, durationMs, progress, valueCents]);

  // `text` is a native-only prop on TextInput and is absent from TextInputProps,
  // so `useAnimatedProps` cannot type it. The cast is the documented way to drive
  // a text value from the UI thread.
  const animatedProps = useAnimatedProps(() => ({
    text: formatWorklet(progress.value),
    // Included so the typed union accepts the object; the value never changes.
    defaultValue: formatWorklet(progress.value),
  })) as never;

  return (
    <AnimatedTextInput
      editable={false}
      style={[{ padding: 0 }, style]}
      className={className}
      animatedProps={animatedProps}
      defaultValue={formatWorklet(valueCents)}
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="text"
      underlineColorAndroid="transparent"
    />
  );
}
