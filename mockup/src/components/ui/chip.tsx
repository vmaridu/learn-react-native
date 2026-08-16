import { Ionicons } from '@expo/vector-icons';
import { ScrollView, View } from 'react-native';

import { cn } from '~/lib/cn';
import { palette } from '~/lib/theme';
import { PressableScale } from './pressable-scale';
import { Text } from './text';

export function Chip({
  label,
  selected,
  onPress,
  icon,
  className,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  className?: string;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      haptic="select"
      scaleTo={0.94}
      onPress={onPress}
      className={cn(
        'h-10 flex-row items-center gap-1.5 rounded-full border px-4',
        selected ? 'border-primary bg-primary' : 'border-border bg-background',
        className,
      )}>
      {!!icon && (
        <Ionicons
          name={icon}
          size={14}
          color={selected ? palette.white : palette.mutedForeground}
        />
      )}
      <Text
        className={cn(
          'text-[14px] font-semibold',
          selected ? 'text-primary-foreground' : 'text-muted-foreground',
        )}>
        {label}
      </Text>
    </PressableScale>
  );
}

/**
 * A horizontally scrolling filter row. Not a data-driven list — the option set
 * is fixed and short, so a ScrollView is correct here rather than FlashList.
 */
export function ChipRow<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: readonly { value: T; label: string; icon?: keyof typeof Ionicons.glyphMap }[];
  value: T;
  onChange: (next: T) => void;
  className?: string;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2 px-5"
      className={cn('-mx-5 grow-0', className)}>
      {options.map((option) => (
        <Chip
          key={option.value}
          label={option.label}
          icon={option.icon}
          selected={value === option.value}
          onPress={() => onChange(option.value)}
        />
      ))}
      <View className="w-1" />
    </ScrollView>
  );
}
