import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { cn } from '~/lib/cn';
import { palette, springConfig } from '~/lib/theme';
import { PressableScale } from './pressable-scale';
import { Text } from './text';

const TRACK_WIDTH = 50;
const KNOB = 24;

/** A lime toggle that springs rather than snaps. */
export function Switch({
  value,
  onValueChange,
  label,
  disabled,
}: {
  value: boolean;
  onValueChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(value ? 1 : 0, springConfig);
  }, [progress, value]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [palette.border, palette.primary],
    ),
  }));

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withTiming(progress.value * (TRACK_WIDTH - KNOB - 6), { duration: 180 }) }],
  }));

  return (
    <PressableScale
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      disabled={disabled}
      haptic="select"
      scaleTo={0.92}
      hitSlop={10}
      onPress={() => onValueChange(!value)}
      className={cn(disabled && 'opacity-40')}>
      <Animated.View
        style={[trackStyle, { width: TRACK_WIDTH, height: 30, borderRadius: 15 }]}
        className="justify-center px-[3px]">
        <Animated.View
          style={[knobStyle, { width: KNOB, height: KNOB, borderRadius: KNOB / 2 }]}
          className="bg-background"
        />
      </Animated.View>
    </PressableScale>
  );
}

export function SwitchRow({
  title,
  description,
  value,
  onValueChange,
  disabled,
}: {
  title: string;
  description?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View className="flex-row items-center gap-4 py-3.5">
      <View className="flex-1">
        <Text variant="subheading">{title}</Text>
        {!!description && (
          <Text variant="caption" tone="muted" className="mt-0.5">
            {description}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        label={title}
        disabled={disabled}
      />
    </View>
  );
}
