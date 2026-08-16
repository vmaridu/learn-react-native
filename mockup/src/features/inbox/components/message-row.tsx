import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { View } from 'react-native';

import { Avatar } from '~/components/ui/avatar';
import { PressableScale } from '~/components/ui/pressable-scale';
import { Text } from '~/components/ui/text';
import { formatRelative } from '~/lib/format';
import { palette } from '~/lib/theme';
import type { Message } from '../types';
import { preview } from '../utils';

export const MessageRow = memo(function MessageRow({
  message,
  onPress,
}: {
  message: Message;
  onPress: (messageId: string) => void;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${message.read ? '' : 'Unread. '}${message.subject}, from ${
        message.fromName
      }`}
      scaleTo={0.985}
      onPress={() => onPress(message.id)}
      className="mb-2.5 flex-row gap-3.5 rounded-3xl border border-border bg-card p-4">
      <View>
        <Avatar
          name={message.fromName}
          size="md"
          tone={message.kind === 'announcement' ? 'primary' : 'accent'}
        />
        {!message.read && (
          <View className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-background bg-destructive" />
        )}
      </View>

      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text variant="caption" tone="muted" numberOfLines={1} className="flex-1">
            {message.fromName} · {message.fromRole}
          </Text>
          {message.pinned && <Ionicons name="pin" size={12} color={palette.mutedForeground} />}
          <Text variant="caption" tone="muted">
            {formatRelative(message.sentAt)}
          </Text>
        </View>

        <Text
          variant="subheading"
          numberOfLines={2}
          className={message.read ? 'mt-1 font-medium' : 'mt-1'}>
          {message.subject}
        </Text>

        <Text variant="caption" tone="muted" numberOfLines={2} className="mt-1">
          {preview(message)}
        </Text>

        {message.replies.length > 0 && (
          <View className="mt-2 flex-row items-center gap-1">
            <Ionicons name="return-down-forward" size={12} color={palette.primary} />
            <Text variant="caption" tone="primary">
              {message.replies.length}{' '}
              {message.replies.length === 1 ? 'reply' : 'replies'}
            </Text>
          </View>
        )}
      </View>
    </PressableScale>
  );
});
