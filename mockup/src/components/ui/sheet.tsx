import type { ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cn } from '~/lib/cn';
import { IconButton } from './button';
import { Text } from './text';

/**
 * A bottom sheet built on Modal. Deliberately not a gesture-driven sheet — the
 * mockup needs one predictable presentation, and a half-implemented drag feels
 * worse than none.
 */
export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  className,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}>
      <Animated.View
        entering={FadeIn.duration(180)}
        exiting={FadeOut.duration(150)}
        className="flex-1 bg-foreground/40">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          className="flex-1"
          onPress={onClose}
        />
        <Animated.View
          entering={SlideInDown.springify().damping(20).stiffness(180)}
          exiting={SlideOutDown.duration(200)}
          style={{ paddingBottom: insets.bottom + 20 }}
          className={cn(
            'rounded-t-4xl border-t border-border bg-background px-5 pt-3',
            className,
          )}>
          <View className="mb-3 h-1 w-10 self-center rounded-full bg-border" />
          <View className="mb-4 flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text variant="title">{title}</Text>
              {!!subtitle && (
                <Text variant="caption" tone="muted" className="mt-1">
                  {subtitle}
                </Text>
              )}
            </View>
            <IconButton icon="close" label="Close" tone="muted" onPress={onClose} />
          </View>
          {children}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
