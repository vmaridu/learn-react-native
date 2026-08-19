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
import { DateStrip } from '~/features/amenities';
import {
  ARC_CATEGORIES,
  arcSchema,
  useSubmitArcRequest,
  type ArcValues,
} from '~/features/compliance';
import { addDays, toISODate } from '~/lib/format';
import { palette } from '~/lib/theme';

/** The attachments a real submission needs — checkboxes stand in for a picker. */
const ATTACHMENT_OPTIONS = [
  'site-plan.pdf',
  'elevation-drawing.pdf',
  'materials-list.pdf',
  'colour-sample.jpg',
  'contractor-licence.pdf',
];

const startDates = Array.from({ length: 60 }, (_, i) => toISODate(addDays(new Date(), i + 14)));

export default function NewArcRequestScreen() {
  const router = useRouter();
  const submit = useSubmitArcRequest();
  const [attachments, setAttachments] = useState<string[]>(['site-plan.pdf']);
  const [done, setDone] = useState<string | null>(null);

  const { control, handleSubmit } = useForm<ArcValues>({
    resolver: zodResolver(arcSchema),
    defaultValues: {
      title: '',
      category: 'Structure',
      description: '',
      contractor: '',
      estimatedStart: startDates[0]!,
    },
  });

  function toggleAttachment(name: string) {
    setAttachments((current) =>
      current.includes(name) ? current.filter((n) => n !== name) : [...current, name],
    );
  }

  const onSubmit = handleSubmit((values) => {
    submit.mutate(
      { ...values, attachmentNames: attachments },
      { onSuccess: (request) => setDone(request.reference) },
    );
  });

  return (
    <Screen>
      <ScreenHeader title="New ARC application" subtitle="Exterior changes need approval first" />

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
              name="title"
              render={({ field, fieldState }) => (
                <Input
                  label="Project"
                  icon="pricetag-outline"
                  placeholder="Rear-yard cedar pergola"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <View className="gap-2">
                  <Text variant="subheading" className="text-[13px]">
                    Category
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {ARC_CATEGORIES.map((category) => (
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
              name="description"
              render={({ field, fieldState }) => (
                <Input
                  label="Description"
                  placeholder="Materials, dimensions, height, placement and setback from the property line."
                  multiline
                  numberOfLines={6}
                  value={field.value}
                  onChangeText={field.onChange}
                  error={fieldState.error?.message}
                  hint="The committee reviews complete applications first — vague ones come back."
                />
              )}
            />

            <Controller
              control={control}
              name="contractor"
              render={({ field, fieldState }) => (
                <Input
                  label="Contractor"
                  icon="construct-outline"
                  placeholder="Company name and licence number, or “Self”"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="estimatedStart"
              render={({ field }) => (
                <View className="gap-2">
                  <Text variant="subheading" className="text-[13px]">
                    Estimated start
                  </Text>
                  <Text variant="caption" tone="muted">
                    A decision is issued within 45 days of a complete submission — pick a start date
                    that leaves room for it.
                  </Text>
                  <DateStrip
                    dates={startDates}
                    value={field.value}
                    onChange={field.onChange}
                  />
                </View>
              )}
            />

            <View className="gap-2">
              <Text variant="subheading" className="text-[13px]">
                Attachments
              </Text>
              <View className="overflow-hidden rounded-3xl border border-border bg-card">
                {ATTACHMENT_OPTIONS.map((name, index) => {
                  const checked = attachments.includes(name);
                  return (
                    <PressableScale
                      key={name}
                      accessibilityRole="checkbox"
                      accessibilityLabel={name}
                      accessibilityState={{ checked }}
                      haptic="select"
                      scaleTo={0.99}
                      onPress={() => toggleAttachment(name)}
                      className={`flex-row items-center gap-3 px-4 py-3.5 ${
                        index > 0 ? 'border-t border-border' : ''
                      }`}>
                      <View
                        className={`h-6 w-6 items-center justify-center rounded-lg border-2 ${
                          checked ? 'border-primary bg-primary' : 'border-border bg-background'
                        }`}>
                        {checked && <Ionicons name="checkmark" size={14} color={palette.primaryForeground} />}
                      </View>
                      <Ionicons
                        name="document-attach-outline"
                        size={18}
                        color={palette.mutedForeground}
                      />
                      <Text variant="body" className="flex-1">
                        {name}
                      </Text>
                    </PressableScale>
                  );
                })}
              </View>
              <Text variant="caption" tone="muted">
                Mockup — no files are uploaded. In the real app this opens the document picker.
              </Text>
            </View>

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
            label="Submit application"
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
        title="Application submitted"
        message="Management runs a completeness check, then it goes to the committee on the second Tuesday."
        detail={done ? `Reference ${done}` : undefined}
        primaryLabel="Track it"
        onPrimary={() => {
          setDone(null);
          router.replace('/arc');
        }}
      />
    </Screen>
  );
}
