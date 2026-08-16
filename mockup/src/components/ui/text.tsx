import { cva, type VariantProps } from 'class-variance-authority';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { cn } from '~/lib/cn';

/**
 * The only Text in the app. Never import Text from 'react-native' in a screen —
 * CLAUDE.md non-negotiable #5.
 *
 * React Native does not cascade text styles, so every variant sets its own
 * colour explicitly rather than inheriting from a parent.
 */
const textVariants = cva('text-foreground', {
  variants: {
    variant: {
      display: 'text-[34px] leading-[38px] font-bold tracking-tighter',
      title: 'text-[26px] leading-[31px] font-bold tracking-tight',
      heading: 'text-[19px] leading-[24px] font-semibold tracking-tight',
      subheading: 'text-[15px] leading-[20px] font-semibold',
      body: 'text-[15px] leading-[22px]',
      callout: 'text-[16px] leading-[23px]',
      caption: 'text-[13px] leading-[18px]',
      overline: 'text-[11px] leading-[14px] font-semibold uppercase tracking-[1.4px]',
      mono: 'text-[13px] leading-[18px] font-mono tracking-wider',
    },
    tone: {
      default: 'text-foreground',
      muted: 'text-muted-foreground',
      primary: 'text-primary',
      onPrimary: 'text-primary-foreground',
      destructive: 'text-destructive',
      success: 'text-success',
      warning: 'text-warning',
      accent: 'text-accent-foreground',
    },
  },
  defaultVariants: { variant: 'body', tone: 'default' },
});

export type TextProps = RNTextProps & VariantProps<typeof textVariants>;

export function Text({ className, variant, tone, ...props }: TextProps) {
  return <RNText className={cn(textVariants({ variant, tone }), className)} {...props} />;
}
