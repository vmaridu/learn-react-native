import { useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { cn } from '~/lib/cn';
import { springConfig } from '~/lib/theme';
import { PressableScale } from './pressable-scale';
import { Text } from './text';

/**
 * A segmented control whose white pill slides between segments on a spring.
 * The pill is a single absolutely-positioned view, so the animation runs on the
 * UI thread and never re-renders the segments.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
  className?: string;
}) {
  const [width, setWidth] = useState(0);
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const offset = useSharedValue(0);
  const segmentWidth = width > 0 ? (width - 8) / options.length : 0;

  const onLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    setWidth(next);
    offset.value = (index * (next - 8)) / options.length;
  };

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
    width: segmentWidth,
  }));

  return (
    <View
      onLayout={onLayout}
      className={cn('h-12 flex-row rounded-2xl bg-muted p-1', className)}>
      {segmentWidth > 0 && (
        <Animated.View
          style={[pillStyle, { position: 'absolute', top: 4, left: 4, bottom: 4 }]}
          className="rounded-xl border border-border bg-background"
        />
      )}
      {options.map((option, i) => {
        const selected = option.value === value;
        return (
          <PressableScale
            key={option.value}
            accessibilityRole="tab"
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
            haptic="select"
            scaleTo={0.97}
            className="flex-1 items-center justify-center"
            onPress={() => {
              offset.value = withSpring((i * (width - 8)) / options.length, springConfig);
              onChange(option.value);
            }}>
            <Text
              className={cn(
                'text-[14px] font-semibold',
                selected ? 'text-foreground' : 'text-muted-foreground',
              )}>
              {option.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}
