import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { palette } from '~/lib/theme';
import { Button } from './button';
import { Text } from './text';

export function EmptyState({
  icon = 'sparkles-outline',
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Animated.View entering={FadeIn.duration(220)} className="items-center px-8 py-14">
      <View className="h-16 w-16 items-center justify-center rounded-3xl bg-primary-soft">
        <Ionicons name={icon} size={28} color={palette.primary} />
      </View>
      <Text variant="heading" className="mt-4 text-center">
        {title}
      </Text>
      <Text variant="body" tone="muted" className="mt-2 text-center">
        {description}
      </Text>
      {!!actionLabel && !!onAction && (
        <Button label={actionLabel} variant="secondary" className="mt-5" onPress={onAction} />
      )}
    </Animated.View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View className="items-center px-8 py-14">
      <View className="h-16 w-16 items-center justify-center rounded-3xl bg-destructive-soft">
        <Ionicons name="cloud-offline-outline" size={28} color={palette.destructive} />
      </View>
      <Text variant="heading" className="mt-4 text-center">
        Something went wrong
      </Text>
      <Text variant="body" tone="muted" className="mt-2 text-center">
        {message}
      </Text>
      {!!onRetry && (
        <Button label="Try again" variant="secondary" className="mt-5" onPress={onRetry} />
      )}
    </View>
  );
}
