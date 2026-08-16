import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Screen, ScreenHeader, StickyFooter } from '~/components/screen';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { ErrorState } from '~/components/ui/empty-state';
import { Input } from '~/components/ui/input';
import { Separator } from '~/components/ui/separator';
import { Sheet } from '~/components/ui/sheet';
import { Skeleton } from '~/components/ui/skeleton';
import { SuccessOverlay } from '~/components/ui/success-overlay';
import { Text } from '~/components/ui/text';
import { useMember } from '~/features/auth';
import {
  acknowledgeSchema,
  useAcknowledgeDocument,
  useDocument,
  type AcknowledgeValues,
} from '~/features/documents';
import { formatDate } from '~/lib/format';
import { palette } from '~/lib/theme';

export default function DocumentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const documentId = id ?? '';

  const document = useDocument(documentId);
  const member = useMember();
  const acknowledge = useAcknowledgeDocument();
  const [signOpen, setSignOpen] = useState(false);
  const [signed, setSigned] = useState(false);

  const { control, handleSubmit, reset } = useForm<AcknowledgeValues>({
    resolver: zodResolver(acknowledgeSchema),
    defaultValues: { signedName: '' },
  });

  const onSign = handleSubmit((values) => {
    acknowledge.mutate(
      { documentId, signedName: values.signedName },
      {
        onSuccess() {
          reset();
          setSignOpen(false);
          setSigned(true);
        },
      },
    );
  });

  if (document.error) {
    return (
      <Screen>
        <ScreenHeader title="Document" />
        <ErrorState message={document.error.message} onRetry={() => void document.refetch()} />
      </Screen>
    );
  }

  if (document.isPending || !document.data) {
    return (
      <Screen>
        <ScreenHeader title="Document" />
        <View className="gap-3 p-5">
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-52 rounded-3xl" />
        </View>
      </Screen>
    );
  }

  const doc = document.data;
  const needsAck = doc.requiresAck && !doc.acknowledgedAt;

  return (
    <Screen>
      <ScreenHeader title={doc.category} subtitle={`Version ${doc.version}`} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 28 }}>
        <Animated.View entering={FadeInDown.duration(360)}>
          <Text variant="title">{doc.title}</Text>
          <View className="mt-3 flex-row flex-wrap gap-1.5">
            <Badge label={`v${doc.version}`} tone="primary" />
            <Badge label={`${doc.pages} pages`} tone="neutral" />
            <Badge label={`Updated ${formatDate(doc.updatedAt)}`} tone="neutral" />
            {doc.requiresAck && !!doc.acknowledgedAt && (
              <Badge label="Acknowledged" tone="success" icon="checkmark-circle" />
            )}
          </View>
          <Text variant="callout" tone="muted" className="mt-4">
            {doc.summary}
          </Text>
        </Animated.View>

        {needsAck && (
          <Animated.View
            entering={FadeInDown.delay(70).duration(360)}
            className="mt-5 flex-row items-start gap-3 rounded-3xl border border-warning/25 bg-warning-soft p-4">
            <Ionicons name="create-outline" size={20} color={palette.warning} />
            <View className="flex-1">
              <Text variant="subheading">Your acknowledgment is needed</Text>
              <Text variant="caption" tone="muted" className="mt-1">
                Version {doc.version} requires every owner to acknowledge receipt.
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Body */}
        <View className="mt-7 gap-6">
          {doc.sections.map((section, index) => (
            <Animated.View
              key={section.heading}
              entering={FadeInDown.delay(100 + index * 60).duration(340)}>
              <Text variant="heading">{section.heading}</Text>
              <Text variant="callout" className="mt-2 leading-[24px]">
                {section.body}
              </Text>
            </Animated.View>
          ))}
        </View>

        {/* Version history */}
        <View className="mt-8">
          <Separator />
          <Text variant="overline" tone="muted" className="mt-5">
            Version history
          </Text>
          <View className="mt-3 rounded-3xl border border-border bg-card">
            {doc.versions.map((version, index) => (
              <View key={version.version}>
                {index > 0 && <Separator className="ml-4" />}
                <View className="flex-row items-center gap-3 px-4 py-3.5">
                  <View
                    className={`h-9 w-9 items-center justify-center rounded-xl ${
                      index === 0 ? 'bg-primary' : 'bg-muted'
                    }`}>
                    <Text
                      className={`text-[12px] font-bold ${
                        index === 0 ? 'text-primary-foreground' : 'text-muted-foreground'
                      }`}>
                      {version.version}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text variant="subheading">{version.note}</Text>
                    <Text variant="caption" tone="muted" className="mt-0.5">
                      {formatDate(version.date)}
                    </Text>
                  </View>
                  {index === 0 && <Badge label="Current" tone="primary" />}
                </View>
              </View>
            ))}
          </View>
        </View>

        {doc.requiresAck && !!doc.acknowledgedAt && (
          <View className="mt-5 flex-row items-start gap-2.5 rounded-3xl border border-border bg-success-soft p-4">
            <Ionicons name="shield-checkmark" size={18} color={palette.success} />
            <View className="flex-1">
              <Text variant="caption">
                Acknowledged by {doc.acknowledgedAs} on{' '}
                {formatDate(doc.acknowledgedAt.slice(0, 10))}.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {needsAck && (
        <StickyFooter>
          <Button
            label="Acknowledge this version"
            size="lg"
            block
            icon="create-outline"
            onPress={() => setSignOpen(true)}
          />
        </StickyFooter>
      )}

      <Sheet
        visible={signOpen}
        onClose={() => setSignOpen(false)}
        title="Sign to acknowledge"
        subtitle={`Type your full name to confirm you have received and read ${doc.title} v${doc.version}.`}>
        <Controller
          control={control}
          name="signedName"
          render={({ field, fieldState }) => (
            <Input
              label="Full name"
              icon="pencil-outline"
              placeholder={member.data?.name ?? 'Your full name'}
              autoCapitalize="words"
              value={field.value}
              onChangeText={field.onChange}
              error={fieldState.error?.message ?? acknowledge.error?.message}
            />
          )}
        />
        <Text variant="caption" tone="muted" className="mt-3">
          Mockup only — a real e-signature record is timestamped, attributed and tamper-evident.
        </Text>
        <Button
          label="Sign and acknowledge"
          size="lg"
          block
          className="mt-4"
          loading={acknowledge.isPending}
          onPress={onSign}
        />
      </Sheet>

      <SuccessOverlay
        visible={signed}
        title="Acknowledged"
        message={`Your receipt of ${doc.title} v${doc.version} is on record.`}
        primaryLabel="Done"
        onPrimary={() => setSigned(false)}
      />
    </Screen>
  );
}
