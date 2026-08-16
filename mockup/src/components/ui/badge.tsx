import { Ionicons } from '@expo/vector-icons';
import { cva, type VariantProps } from 'class-variance-authority';
import { View } from 'react-native';

import { cn } from '~/lib/cn';
import { palette } from '~/lib/theme';
import { Text } from './text';

const badgeVariants = cva('flex-row items-center gap-1 self-start rounded-full px-2.5 py-1', {
  variants: {
    tone: {
      neutral: 'bg-muted',
      primary: 'bg-accent',
      success: 'bg-success-soft',
      warning: 'bg-warning-soft',
      destructive: 'bg-destructive-soft',
      solid: 'bg-primary',
      onBrand: 'bg-white/20',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

const badgeText: Record<NonNullable<BadgeProps['tone']>, string> = {
  neutral: 'text-muted-foreground',
  primary: 'text-accent-foreground',
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
  solid: 'text-primary-foreground',
  onBrand: 'text-primary-foreground',
};

const badgeIcon: Record<NonNullable<BadgeProps['tone']>, string> = {
  neutral: palette.mutedForeground,
  primary: palette.accentForeground,
  success: palette.success,
  warning: palette.warning,
  destructive: palette.destructive,
  solid: palette.white,
  onBrand: palette.white,
};

export interface BadgeProps extends VariantProps<typeof badgeVariants> {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  className?: string;
}

export function Badge({ label, icon, tone, className }: BadgeProps) {
  return (
    <View className={cn(badgeVariants({ tone }), className)}>
      {!!icon && <Ionicons name={icon} size={12} color={badgeIcon[tone ?? 'neutral']} />}
      <Text
        className={cn(
          'text-[11px] font-semibold tracking-wide',
          badgeText[tone ?? 'neutral'],
        )}>
        {label}
      </Text>
    </View>
  );
}
