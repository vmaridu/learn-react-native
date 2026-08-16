import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { Screen, ScreenHeader, StickyFooter } from '~/components/screen';
import { Avatar } from '~/components/ui/avatar';
import { Badge } from '~/components/ui/badge';
import { ErrorState } from '~/components/ui/empty-state';
import { PressableScale } from '~/components/ui/pressable-scale';
import { Separator } from '~/components/ui/separator';
import { Skeleton } from '~/components/ui/skeleton';
import { Text } from '~/components/ui/text';
import { useMarkRead, useMessage, useReplyToMessage } from '~/features/inbox';
import { formatRelative } from '~/lib/format';
import { palette } from '~/lib/theme';

export default function MessageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const messageId = id ?? '';

  const message = useMessage(messageId);
  const markRead = useMarkRead();
  const reply = useReplyToMessage();
  const [draft, setDraft] = useState('');
  const marked = useRef(false);

  useEffect(() => {
    if (marked.current || !message.data || message.data.read) return;
    marked.current = true;
    markRead.mutate(message.data.id);
  }, [markRead, message.data]);

  function sendReply() {
    const body = draft.trim();
    if (!body) return;
    reply.mutate({ messageId, body }, { onSuccess: () => setDraft('') });
  }

  if (message.error) {
    return (
      <Screen>
        <ScreenHeader title="Message" />
        <ErrorState message={message.error.message} onRetry={() => void message.refetch()} />
      </Screen>
    );
  }

  if (message.isPending || !message.data) {
    return (
      <Screen>
        <ScreenHeader title="Message" />
        <View className="gap-3 p-5">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-40 rounded-3xl" />
        </View>
      </Screen>
    );
  }

  const m = message.data;
  const canReply = m.kind === 'direct';

  return (
    <Screen>
      <ScreenHeader
        title={m.kind === 'announcement' ? 'Announcement' : 'Message'}
        subtitle={m.fromName}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        className="flex-1">
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, paddingBottom: 28 }}>
          <Animated.View entering={FadeInDown.duration(360)}>
            <View className="flex-row items-center gap-3">
              <Avatar
                name={m.fromName}
                size="md"
                tone={m.kind === 'announcement' ? 'primary' : 'accent'}
              />
              <View className="flex-1">
                <Text variant="subheading">{m.fromName}</Text>
                <Text variant="caption" tone="muted">
                  {m.fromRole} · {formatRelative(m.sentAt)}
                </Text>
              </View>
              {m.pinned && <Badge label="Pinned" tone="primary" icon="pin" />}
            </View>

            <Text variant="title" className="mt-5">
              {m.subject}
            </Text>

            <View className="mt-4 gap-3.5">
              {m.body.split('\n\n').map((paragraph, index) => (
                <Text key={index} variant="callout" className="leading-[24px]">
                  {paragraph}
                </Text>
              ))}
            </View>
          </Animated.View>

          {m.replies.length > 0 && (
            <View className="mt-7">
              <Separator />
              <Text variant="overline" tone="muted" className="mt-5">
                Thread
              </Text>
              <View className="mt-3 gap-2.5">
                {m.replies.map((item, index) => (
                  <Animated.View
                    key={item.id}
                    entering={FadeInUp.delay(index * 60).duration(300)}
                    className={
                      item.mine
                        ? 'max-w-[86%] self-end rounded-3xl rounded-br-lg bg-primary px-4 py-3'
                        : 'max-w-[86%] self-start rounded-3xl rounded-bl-lg border border-border bg-card px-4 py-3'
                    }>
                    <Text
                      variant="body"
                      className={item.mine ? 'text-primary-foreground' : 'text-foreground'}>
                      {item.body}
                    </Text>
                    <Text
                      variant="caption"
                      className={
                        item.mine
                          ? 'mt-1 text-primary-foreground/70'
                          : 'mt-1 text-muted-foreground'
                      }>
                      {formatRelative(item.at)}
                    </Text>
                  </Animated.View>
                ))}
              </View>
            </View>
          )}

          {!canReply && (
            <View className="mt-7 flex-row items-start gap-2.5 rounded-3xl border border-border bg-muted p-4">
              <Ionicons name="megaphone-outline" size={18} color={palette.mutedForeground} />
              <Text variant="caption" tone="muted" className="flex-1">
                This is a broadcast announcement and does not take replies. Use a service request
                if you need management to act on something.
              </Text>
            </View>
          )}
        </ScrollView>

        {canReply && (
          <StickyFooter>
            <View className="flex-row items-end gap-2">
              <View className="min-h-[48px] flex-1 justify-center rounded-3xl border border-border bg-muted px-4 py-2">
                <TextInput
                  className="max-h-28 text-[15px] leading-[21px] text-foreground"
                  placeholder={`Reply to ${m.fromName.split(' ')[0]}`}
                  placeholderTextColor={palette.mutedForeground}
                  value={draft}
                  onChangeText={setDraft}
                  multiline
                  accessibilityLabel="Write a reply"
                />
              </View>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel="Send reply"
                accessibilityState={{ disabled: !draft.trim() || reply.isPending }}
                disabled={!draft.trim() || reply.isPending}
                haptic="press"
                scaleTo={0.9}
                onPress={sendReply}
                className={`h-12 w-12 items-center justify-center rounded-full bg-primary ${
                  !draft.trim() || reply.isPending ? 'opacity-40' : ''
                }`}>
                <Ionicons name="arrow-up" size={20} color={palette.white} />
              </PressableScale>
            </View>
          </StickyFooter>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}
