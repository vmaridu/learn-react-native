import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Screen, ScreenHeader } from '~/components/screen';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { PressableScale } from '~/components/ui/pressable-scale';
import { Sheet } from '~/components/ui/sheet';
import { SkeletonList } from '~/components/ui/skeleton';
import { Text } from '~/components/ui/text';
import {
  brandForNumber,
  cardSchema,
  formatCardNumber,
  formatExpiry,
  useAddPaymentMethod,
  usePaymentMethods,
  useRemovePaymentMethod,
  useSetDefaultMethod,
  type CardValues,
} from '~/features/payments';
import { palette } from '~/lib/theme';

/**
 * 🔴 Tier 3 (payments). The card form here exists to make the mockup navigable.
 * A real build never touches raw PAN/CVC in application code — those fields are
 * owned by the processor SDK, and this screen would host its element instead.
 */
export default function PaymentMethodsScreen() {
  const methods = usePaymentMethods();
  const addMethod = useAddPaymentMethod();
  const removeMethod = useRemovePaymentMethod();
  const setDefault = useSetDefaultMethod();

  const [addOpen, setAddOpen] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);

  const { control, handleSubmit, reset } = useForm<CardValues>({
    resolver: zodResolver(cardSchema),
    defaultValues: { name: '', number: '', expiry: '', cvc: '' },
  });

  // useWatch rather than form.watch() — watch() returns a fresh function each
  // render, which defeats memoisation of anything downstream.
  const numberValue = useWatch({ control, name: 'number' });
  const brand = brandForNumber((numberValue ?? '').replace(/\D/g, ''));

  const onSubmit = handleSubmit((values) => {
    const digits = values.number.replace(/\D/g, '');
    addMethod.mutate(
      {
        kind: 'card',
        label: brandForNumber(digits),
        last4: digits.slice(-4),
        expiry: values.expiry,
      },
      {
        onSuccess() {
          reset();
          setAddOpen(false);
        },
      },
    );
  });

  return (
    <Screen>
      <ScreenHeader title="Payment methods" subtitle="Cards and bank accounts on file" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
        {methods.isPending ? (
          <SkeletonList rows={2} />
        ) : (
          <View className="gap-2.5">
            {(methods.data ?? []).map((method, index) => (
              <Animated.View
                key={method.id}
                entering={FadeInDown.delay(index * 60).duration(340)}
                className="rounded-3xl border border-border bg-card p-4">
                <View className="flex-row items-center gap-3.5">
                  <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft">
                    <Ionicons
                      name={method.kind === 'card' ? 'card' : 'business'}
                      size={20}
                      color={palette.primary}
                    />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text variant="subheading">{method.label}</Text>
                      {method.isDefault && <Badge label="Default" tone="primary" />}
                    </View>
                    <Text variant="caption" tone="muted" className="mt-0.5">
                      {method.detail}
                    </Text>
                  </View>
                </View>

                <View className="mt-3 flex-row gap-2">
                  {!method.isDefault && (
                    <Button
                      label="Make default"
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      loading={setDefault.isPending}
                      onPress={() => setDefault.mutate(method.id)}
                    />
                  )}
                  <Button
                    label="Remove"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onPress={() => setPendingRemove(method.id)}
                  />
                </View>
              </Animated.View>
            ))}
          </View>
        )}

        {!!removeMethod.error && (
          <View className="mt-3 rounded-2xl bg-destructive-soft px-4 py-3">
            <Text variant="caption" tone="destructive">
              {removeMethod.error.message}
            </Text>
          </View>
        )}

        <Button
          label="Add a card"
          icon="add"
          variant="outline"
          size="lg"
          block
          className="mt-4"
          onPress={() => setAddOpen(true)}
        />

        <View className="mt-5 flex-row items-start gap-2.5 rounded-3xl border border-border bg-muted p-4">
          <Ionicons name="information-circle-outline" size={18} color={palette.mutedForeground} />
          <Text variant="caption" tone="muted" className="flex-1">
            Bank transfers (ACH) are free. Cards carry a 2.9% + $0.30 convenience fee, passed
            through rather than absorbed by the association.
          </Text>
        </View>
      </ScrollView>

      <Sheet
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add a card"
        subtitle="Mockup only — use any digits. Nothing is stored or sent anywhere.">
        <View className="gap-3.5">
          <Controller
            control={control}
            name="name"
            render={({ field, fieldState }) => (
              <Input
                label="Name on card"
                icon="person-outline"
                placeholder="Alex Rivera"
                autoCapitalize="words"
                value={field.value}
                onChangeText={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="number"
            render={({ field, fieldState }) => (
              <Input
                label={`Card number${brand !== 'Card' ? ` · ${brand}` : ''}`}
                icon="card-outline"
                placeholder="4242 4242 4242 4242"
                keyboardType="number-pad"
                value={field.value}
                onChangeText={(text) => field.onChange(formatCardNumber(text))}
                error={fieldState.error?.message}
              />
            )}
          />
          <View className="flex-row gap-3">
            <Controller
              control={control}
              name="expiry"
              render={({ field, fieldState }) => (
                <Input
                  containerClassName="flex-1"
                  label="Expiry"
                  placeholder="09/29"
                  keyboardType="number-pad"
                  value={field.value}
                  onChangeText={(text) => field.onChange(formatExpiry(text))}
                  error={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="cvc"
              render={({ field, fieldState }) => (
                <Input
                  containerClassName="flex-1"
                  label="CVC"
                  placeholder="123"
                  keyboardType="number-pad"
                  maxLength={4}
                  value={field.value}
                  onChangeText={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />
          </View>
          <Button
            label="Add card"
            size="lg"
            block
            loading={addMethod.isPending}
            onPress={onSubmit}
          />
        </View>
      </Sheet>

      <Sheet
        visible={!!pendingRemove}
        onClose={() => setPendingRemove(null)}
        title="Remove this method?"
        subtitle="Any autopay using it will stop until you pick another.">
        <View className="gap-2">
          <Button
            label="Remove"
            variant="destructive"
            size="lg"
            block
            loading={removeMethod.isPending}
            onPress={() => {
              if (!pendingRemove) return;
              removeMethod.mutate(pendingRemove, { onSuccess: () => setPendingRemove(null) });
            }}
          />
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Keep this payment method"
            className="h-12 items-center justify-center"
            onPress={() => setPendingRemove(null)}>
            <Text variant="subheading" tone="muted">
              Keep it
            </Text>
          </PressableScale>
        </View>
      </Sheet>
    </Screen>
  );
}
