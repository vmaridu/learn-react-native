import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Screen, ScreenHeader, StickyFooter } from '~/components/screen';
import { Button } from '~/components/ui/button';
import { Chip } from '~/components/ui/chip';
import { Input } from '~/components/ui/input';
import { PressableScale } from '~/components/ui/pressable-scale';
import { SuccessOverlay } from '~/components/ui/success-overlay';
import { Text } from '~/components/ui/text';
import {
  PRIORITY_LABELS,
  REQUEST_CATEGORIES,
  serviceRequestSchema,
  useSubmitServiceRequest,
  type ServiceRequestValues,
} from '~/features/compliance';
import { palette } from '~/lib/theme';

const PRIORITIES = ['low', 'normal', 'urgent'] as const;

export default function NewServiceRequestScreen() {
  const router = useRouter();
  const submit = useSubmitServiceRequest();
  const [done, setDone] = useState<string | null>(null);

  const { control, handleSubmit } = useForm<ServiceRequestValues>({
    resolver: zodResolver(serviceRequestSchema),
    defaultValues: {
      category: 'Common area maintenance',
      title: '',
      detail: '',
      location: '',
      priority: 'normal',
    },
  });

  const onSubmit = handleSubmit((values) => {
    submit.mutate(values, { onSuccess: (request) => setDone(request.reference) });
  });

  return (
    <Screen>
      <ScreenHeader title="Report an issue" subtitle="Goes straight to the management inbox" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1">
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, paddingBottom: 28 }}>
          <Animated.View entering={FadeInDown.duration(340)} className="gap-4">
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <View className="gap-2">
                  <Text variant="subheading" className="text-[13px]">
                    What kind of issue?
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {REQUEST_CATEGORIES.map((category) => (
                      <Chip
                        key={category}
                        label={category}
                        selected={field.value === category}
                        onPress={() => field.onChange(category)}
                      />
                    ))}
                  </View>
                </View>
              )}
            />

            <Controller
              control={control}
              name="title"
              render={({ field, fieldState }) => (
                <Input
                  label="Summary"
                  icon="text-outline"
                  placeholder="Path light out near the mail kiosk"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="location"
              render={({ field, fieldState }) => (
                <Input
                  label="Where"
                  icon="location-outline"
                  placeholder="Walkway between the mail kiosk and building C"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="detail"
              render={({ field, fieldState }) => (
                <Input
                  label="Details"
                  placeholder="What is happening, since when, and anything that helps someone find it."
                  multiline
                  numberOfLines={5}
                  value={field.value}
                  onChangeText={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="priority"
              render={({ field }) => (
                <View className="gap-2">
                  <Text variant="subheading" className="text-[13px]">
                    Priority
                  </Text>
                  <View className="overflow-hidden rounded-3xl border border-border bg-card">
                    {PRIORITIES.map((priority, index) => {
                      const active = field.value === priority;
                      return (
                        <PressableScale
                          key={priority}
                          accessibilityRole="radio"
                          accessibilityLabel={PRIORITY_LABELS[priority]}
                          accessibilityState={{ selected: active }}
                          haptic="select"
                          scaleTo={0.99}
                          onPress={() => field.onChange(priority)}
                          className={`flex-row items-center gap-3 px-4 py-3.5 ${
                            index > 0 ? 'border-t border-border' : ''
                          }`}>
                          <View
                            className={`h-5 w-5 items-center justify-center rounded-full border-2 ${
                              active ? 'border-primary' : 'border-border'
                            }`}>
                            {active && <View className="h-2.5 w-2.5 rounded-full bg-primary" />}
                          </View>
                          <Text variant="body" className="flex-1">
                            {PRIORITY_LABELS[priority]}
                          </Text>
                        </PressableScale>
                      );
                    })}
                  </View>
                </View>
              )}
            />

            {!!submit.error && (
              <View className="flex-row items-start gap-2 rounded-2xl bg-destructive-soft px-4 py-3">
                <Ionicons name="alert-circle" size={18} color={palette.destructive} />
                <Text variant="caption" tone="destructive" className="flex-1">
                  {submit.error.message}
                </Text>
              </View>
            )}
          </Animated.View>
        </ScrollView>

        <StickyFooter>
          <Button
            label="Send to management"
            size="lg"
            block
            icon="paper-plane-outline"
            loading={submit.isPending}
            onPress={onSubmit}
          />
        </StickyFooter>
      </KeyboardAvoidingView>

      <SuccessOverlay
        visible={!!done}
        title="Sent"
        message="Management has it. You will get an update in your inbox as it moves along."
        detail={done ? `Reference ${done}` : undefined}
        primaryLabel="Track it"
        onPrimary={() => {
          setDone(null);
          router.replace('/requests');
        }}
      />
    </Screen>
  );
}
