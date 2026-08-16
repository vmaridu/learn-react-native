import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { Screen, ScreenHeader, StickyFooter } from '~/components/screen';
import { PressableScale } from '~/components/ui/pressable-scale';
import { Text } from '~/components/ui/text';
import {
  SUGGESTED_QUESTIONS,
  TypingIndicator,
  useAskAssistant,
  type AssistantMessage,
} from '~/features/assistant';
import { palette } from '~/lib/theme';
import { community } from '~/mock/db';

let localId = 0;

export default function AssistantScreen() {
  const router = useRouter();
  const ask = useAskAssistant();
  const scrollRef = useRef<ScrollView>(null);
  const [draft, setDraft] = useState('');
  const [thread, setThread] = useState<AssistantMessage[]>([]);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const send = useCallback(
    (question: string) => {
      const text = question.trim();
      if (!text || ask.isPending) return;

      localId += 1;
      setThread((current) => [
        ...current,
        {
          id: `local-${localId}`,
          role: 'user',
          body: text,
          at: new Date().toISOString(),
          citations: [],
        },
      ]);
      setDraft('');
      scrollToEnd();

      ask.mutate(text, {
        onSuccess(answer) {
          setThread((current) => [...current, answer]);
          scrollToEnd();
        },
      });
    },
    [ask, scrollToEnd],
  );

  return (
    <Screen>
      <ScreenHeader
        title="Community assistant"
        subtitle={`Answers only from ${community.name}'s documents`}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        className="flex-1">
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, paddingBottom: 24 }}
          onContentSizeChange={scrollToEnd}>
          {thread.length === 0 && (
            <Animated.View entering={FadeInDown.duration(380)}>
              <View className="h-14 w-14 items-center justify-center rounded-3xl bg-primary-soft">
                <Ionicons name="sparkles" size={24} color={palette.primary} />
              </View>
              <Text variant="title" className="mt-4">
                Ask about your community
              </Text>
              <Text variant="callout" tone="muted" className="mt-2 leading-[23px]">
                I answer from the CC&Rs, bylaws, rules, minutes, budget and service directory — and
                nothing else. Every answer comes with the document it came from.
              </Text>

              <Text variant="overline" tone="muted" className="mb-3 mt-7">
                Try one of these
              </Text>
              <View className="gap-2">
                {SUGGESTED_QUESTIONS.map((question, index) => (
                  <Animated.View
                    key={question}
                    entering={FadeInDown.delay(80 + index * 60).duration(320)}>
                    <PressableScale
                      accessibilityRole="button"
                      accessibilityLabel={question}
                      scaleTo={0.98}
                      onPress={() => send(question)}
                      className="flex-row items-center gap-3 rounded-3xl border border-border bg-card px-4 py-3.5">
                      <Ionicons name="help-circle-outline" size={18} color={palette.primary} />
                      <Text variant="body" className="flex-1">
                        {question}
                      </Text>
                      <Ionicons name="arrow-forward" size={15} color={palette.mutedForeground} />
                    </PressableScale>
                  </Animated.View>
                ))}
              </View>
            </Animated.View>
          )}

          <View className="gap-3">
            {thread.map((message) =>
              message.role === 'user' ? (
                <Animated.View
                  key={message.id}
                  entering={FadeInUp.duration(280)}
                  className="max-w-[85%] self-end rounded-3xl rounded-br-lg bg-primary px-4 py-3">
                  <Text variant="body" className="text-primary-foreground leading-[21px]">
                    {message.body}
                  </Text>
                </Animated.View>
              ) : (
                <Animated.View
                  key={message.id}
                  entering={FadeInUp.duration(320)}
                  className="max-w-[92%] self-start rounded-3xl rounded-bl-lg border border-border bg-card px-4 py-3.5">
                  {message.body.split('\n\n').map((paragraph, index) => (
                    <Text
                      key={index}
                      variant="body"
                      className={index > 0 ? 'mt-2.5 leading-[21px]' : 'leading-[21px]'}>
                      {paragraph}
                    </Text>
                  ))}

                  {message.citations.length > 0 && (
                    <View className="mt-3 border-t border-border pt-3">
                      <Text variant="overline" tone="muted" className="mb-2">
                        Sources
                      </Text>
                      <View className="gap-1.5">
                        {message.citations.map((citation) => (
                          <PressableScale
                            key={`${citation.documentId}-${citation.locator}`}
                            accessibilityRole="link"
                            accessibilityLabel={`Open ${citation.title}, ${citation.locator}`}
                            scaleTo={0.97}
                            onPress={() => router.push(`/documents/${citation.documentId}`)}
                            className="flex-row items-center gap-2 self-start rounded-full bg-primary-soft px-3 py-1.5">
                            <Ionicons
                              name="document-text-outline"
                              size={13}
                              color={palette.primary}
                            />
                            <Text variant="caption" tone="primary" className="font-semibold">
                              {citation.title} · {citation.locator}
                            </Text>
                          </PressableScale>
                        ))}
                      </View>
                    </View>
                  )}
                </Animated.View>
              ),
            )}

            {ask.isPending && <TypingIndicator />}
          </View>
        </ScrollView>

        <StickyFooter>
          <View className="flex-row items-end gap-2">
            <View className="min-h-[48px] flex-1 justify-center rounded-3xl border border-border bg-muted px-4 py-2">
              <TextInput
                className="max-h-28 text-[15px] leading-[21px] text-foreground"
                placeholder="Ask about rules, dues, amenities…"
                placeholderTextColor={palette.mutedForeground}
                value={draft}
                onChangeText={setDraft}
                multiline
                accessibilityLabel="Ask the assistant a question"
              />
            </View>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Send question"
              accessibilityState={{ disabled: !draft.trim() || ask.isPending }}
              disabled={!draft.trim() || ask.isPending}
              haptic="press"
              scaleTo={0.9}
              onPress={() => send(draft)}
              className={`h-12 w-12 items-center justify-center rounded-full bg-primary ${
                !draft.trim() || ask.isPending ? 'opacity-40' : ''
              }`}>
              <Ionicons name="arrow-up" size={20} color={palette.white} />
            </PressableScale>
          </View>
          <Text variant="caption" tone="muted" className="mt-2 text-center">
            Scoped to your community’s documents. Every answer is logged with its source.
          </Text>
        </StickyFooter>
      </KeyboardAvoidingView>
    </Screen>
  );
}
