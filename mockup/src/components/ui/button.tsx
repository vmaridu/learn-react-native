import { Ionicons } from '@expo/vector-icons';
import { cva, type VariantProps } from 'class-variance-authority';
import { ActivityIndicator, View } from 'react-native';

import { cn } from '~/lib/cn';
import { palette } from '~/lib/theme';
import { PressableScale, type PressableScaleProps } from './pressable-scale';
import { Text } from './text';

const buttonVariants = cva(
  'flex-row items-center justify-center gap-2 rounded-2xl border border-transparent',
  {
    variants: {
      variant: {
        primary: 'bg-primary',
        secondary: 'bg-secondary border-border',
        outline: 'bg-background border-border',
        ghost: 'bg-transparent',
        accent: 'bg-accent',
        destructive: 'bg-destructive',
        onBrand: 'bg-background',
        onBrandOutline: 'border-white/40 bg-white/10',
      },
      size: {
        sm: 'h-10 px-4',
        md: 'h-12 px-5',
        lg: 'h-14 px-6',
        icon: 'h-11 w-11 px-0',
      },
      block: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'primary', size: 'md', block: false },
  },
);

const labelVariants = cva('font-semibold', {
  variants: {
    variant: {
      primary: 'text-primary-foreground',
      secondary: 'text-foreground',
      outline: 'text-foreground',
      ghost: 'text-primary',
      accent: 'text-accent-foreground',
      destructive: 'text-destructive-foreground',
      onBrand: 'text-primary',
      onBrandOutline: 'text-primary-foreground',
    },
    size: {
      sm: 'text-[14px]',
      md: 'text-[15px]',
      lg: 'text-[16px]',
      icon: 'text-[15px]',
    },
  },
  defaultVariants: { variant: 'primary', size: 'md' },
});

const iconColors: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: palette.white,
  secondary: palette.foreground,
  outline: palette.foreground,
  ghost: palette.primary,
  accent: palette.accentForeground,
  destructive: palette.white,
  onBrand: palette.primary,
  onBrandOutline: palette.white,
};

export interface ButtonProps
  extends Omit<PressableScaleProps, 'children'>,
    VariantProps<typeof buttonVariants> {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconRight?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
}

export function Button({
  label,
  icon,
  iconRight,
  loading = false,
  variant,
  size,
  block,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const tint = iconColors[variant ?? 'primary'];

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      disabled={isDisabled}
      haptic="press"
      className={cn(
        buttonVariants({ variant, size, block }),
        isDisabled && 'opacity-40',
        className,
      )}
      {...props}>
      {loading ? (
        <ActivityIndicator size="small" color={tint} />
      ) : (
        <>
          {!!icon && <Ionicons name={icon} size={18} color={tint} />}
          {size !== 'icon' && (
            <Text className={cn(labelVariants({ variant, size }))}>{label}</Text>
          )}
          {!!iconRight && <Ionicons name={iconRight} size={18} color={tint} />}
        </>
      )}
    </PressableScale>
  );
}

/** A borderless circular icon button with a generous hit area. */
export function IconButton({
  icon,
  label,
  tone = 'default',
  className,
  ...props
}: Omit<PressableScaleProps, 'children'> & {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tone?: 'default' | 'muted' | 'primary' | 'onBrand';
}) {
  const color =
    tone === 'primary'
      ? palette.primary
      : tone === 'muted'
        ? palette.mutedForeground
        : tone === 'onBrand'
          ? palette.white
          : palette.foreground;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={12}
      scaleTo={0.88}
      className={cn('h-11 w-11 items-center justify-center rounded-full', className)}
      {...props}>
      <View pointerEvents="none">
        <Ionicons name={icon} size={22} color={color} />
      </View>
    </PressableScale>
  );
}
