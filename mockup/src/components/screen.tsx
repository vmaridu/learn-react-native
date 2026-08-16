import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cn } from '~/lib/cn';
import { palette } from '~/lib/theme';
import { IconButton } from './ui/button';
import { PressableScale } from './ui/pressable-scale';
import { Text } from './ui/text';

/** Root container for every screen. Owns the white ground and the top inset. */
export function Screen({
  children,
  className,
  edges = 'top',
}: {
  children: ReactNode;
  className?: string;
  edges?: 'top' | 'none';
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className={cn('flex-1 bg-background', className)}
      style={{ paddingTop: edges === 'top' ? insets.top : 0 }}>
      {children}
    </View>
  );
}

/** The header used by every pushed (non-tab) screen. */
export function ScreenHeader({
  title,
  subtitle,
  right,
  onBack,
  className,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onBack?: () => void;
  className?: string;
}) {
  const router = useRouter();
  const back = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')));

  return (
    <View
      className={cn(
        'flex-row items-center gap-2 border-b border-border bg-background px-3 pb-3 pt-1',
        className,
      )}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={10}
        scaleTo={0.88}
        onPress={back}
        className="h-11 w-11 items-center justify-center rounded-full">
        <Ionicons name="chevron-back" size={24} color={palette.foreground} />
      </PressableScale>
      <View className="flex-1">
        <Text variant="subheading" numberOfLines={1}>
          {title}
        </Text>
        {!!subtitle && (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {right}
    </View>
  );
}

/** Big-title header for the five tab roots. */
export function TabHeader({
  title,
  subtitle,
  actionIcon,
  actionLabel,
  onAction,
}: {
  title: string;
  subtitle?: string;
  actionIcon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Animated.View
      entering={FadeInDown.duration(320)}
      className="flex-row items-end justify-between gap-3 px-5 pb-4 pt-2">
      <View className="flex-1">
        <Text variant="display">{title}</Text>
        {!!subtitle && (
          <Text variant="caption" tone="muted" className="mt-1">
            {subtitle}
          </Text>
        )}
      </View>
      {!!actionIcon && !!actionLabel && !!onAction && (
        <IconButton
          icon={actionIcon}
          label={actionLabel}
          onPress={onAction}
          className="border border-border bg-background"
        />
      )}
    </Animated.View>
  );
}

export function SectionHeader({
  title,
  actionLabel,
  onAction,
  className,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <View className={cn('flex-row items-center justify-between px-5 pb-2.5', className)}>
      <Text variant="overline" tone="muted">
        {title}
      </Text>
      {!!actionLabel && !!onAction && (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          hitSlop={8}
          scaleTo={0.94}
          onPress={onAction}>
          <Text variant="caption" tone="primary" className="font-semibold">
            {actionLabel}
          </Text>
        </PressableScale>
      )}
    </View>
  );
}

/** Sticky bottom action bar used by the booking, payment and ballot flows. */
export function StickyFooter({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="border-t border-border bg-background px-5 pt-3"
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
      {children}
    </View>
  );
}
