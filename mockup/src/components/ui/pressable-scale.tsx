import { forwardRef, useCallback } from 'react';
import { Pressable, type PressableProps, type View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { haptics } from '~/lib/haptics';
import { springConfig } from '~/lib/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends PressableProps {
  /** How far to compress on press. 1 = no movement. */
  scaleTo?: number;
  /** Dim on press in addition to the scale. */
  dim?: boolean;
  haptic?: 'none' | 'tap' | 'press' | 'select';
}

/**
 * The app's single interactive surface. Every tappable thing uses this so the
 * whole UI shares one press feel — a spring compress, never an opacity flash.
 *
 * Pressable, never TouchableOpacity (CLAUDE.md anti-patterns).
 */
export const PressableScale = forwardRef<View, PressableScaleProps>(function PressableScale(
  { scaleTo = 0.96, dim = false, haptic = 'tap', onPressIn, onPressOut, style, ...props },
  ref,
) {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * (1 - scaleTo) }],
    opacity: dim ? 1 - pressed.value * 0.25 : 1,
  }));

  const handlePressIn = useCallback<NonNullable<PressableProps['onPressIn']>>(
    (event) => {
      pressed.value = withSpring(1, springConfig);
      if (haptic === 'tap') haptics.tap();
      if (haptic === 'press') haptics.press();
      if (haptic === 'select') haptics.select();
      onPressIn?.(event);
    },
    [haptic, onPressIn, pressed],
  );

  const handlePressOut = useCallback<NonNullable<PressableProps['onPressOut']>>(
    (event) => {
      pressed.value = withSpring(0, springConfig);
      onPressOut?.(event);
    },
    [onPressOut, pressed],
  );

  return (
    <AnimatedPressable
      ref={ref}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animatedStyle, style]}
      {...props}
    />
  );
});
