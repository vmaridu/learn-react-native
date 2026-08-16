import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Screen, ScreenHeader, SectionHeader, StickyFooter } from '~/components/screen';
import { Button } from '~/components/ui/button';
import { PressableScale } from '~/components/ui/pressable-scale';
import { Separator } from '~/components/ui/separator';
import { Skeleton } from '~/components/ui/skeleton';
import { SuccessOverlay } from '~/components/ui/success-overlay';
import { Text } from '~/components/ui/text';
import {
  CARD_FEE_LABEL,
  CHARGE_ICONS,
  convenienceFeeFor,
  useAccount,
  usePayCharges,
  usePaymentMethods,
  type Receipt,
} from '~/features/payments';
import { formatCents, formatDate } from '~/lib/format';
import { palette } from '~/lib/theme';

/**
 * 🔴 Tier 3 (payments). UI only — see src/features/payments/api.ts for the list
 * of failure modes a real implementation has to answer for.
 */
export default function CheckoutScreen() {
  const router = useRouter();
  const { charge: preselected } = useLocalSearchParams<{ charge?: string }>();

  const account = useAccount();
  const methods = usePaymentMethods();
  const pay = usePayCharges();

  // Both selections are "null until the member touches them", so the defaults
  // stay derived from server data rather than copied into state by an effect.
  const [chosenCharges, setChosenCharges] = useState<string[] | null>(null);
  const [chosenMethodId, setChosenMethodId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const charges = useMemo(() => account.data?.charges ?? [], [account.data]);

  /** Default: everything outstanding, unless a specific charge was passed in. */
  const defaultSelection = useMemo(() => {
    const ids = charges.map((c) => c.id);
    return preselected && ids.includes(preselected) ? [preselected] : ids;
  }, [charges, preselected]);

  const selected = chosenCharges ?? defaultSelection;

  const methodId =
    chosenMethodId ??
    methods.data?.find((m) => m.isDefault)?.id ??
    methods.data?.[0]?.id ??
    null;

  const subtotal = useMemo(
    () =>
      charges
        .filter((c) => selected.includes(c.id))
        .reduce((sum, c) => sum + c.amountCents, 0),
    [charges, selected],
  );

  const activeMethod = methods.data?.find((m) => m.id === methodId);
  const fee = activeMethod ? convenienceFeeFor(activeMethod.kind, subtotal) : 0;
  const total = subtotal + fee;
  const canPay = selected.length > 0 && !!methodId && subtotal > 0;

  function toggle(chargeId: string) {
    const current = chosenCharges ?? defaultSelection;
    setChosenCharges(
      current.includes(chargeId)
        ? current.filter((id) => id !== chargeId)
        : [...current, chargeId],
    );
  }

  function submit() {
    if (!methodId) return;
    pay.mutate(
      { chargeIds: selected, methodId },
      { onSuccess: (result) => setReceipt(result) },
    );
  }

  return (
    <Screen>
      <ScreenHeader title="Make a payment" subtitle="Choose what to pay and how" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        <SectionHeader title="Charges" className="pt-5" />
        {account.isPending ? (
          <View className="px-5">
            <Skeleton className="h-40 rounded-3xl" />
          </View>
        ) : charges.length === 0 ? (
          <View className="mx-5 items-center rounded-3xl border border-border bg-card p-8">
            <Ionicons name="checkmark-circle" size={32} color={palette.success} />
            <Text variant="heading" className="mt-3 text-center">
              Nothing outstanding
            </Text>
            <Text variant="caption" tone="muted" className="mt-1.5 text-center">
              Your account is settled. Nothing to pay right now.
            </Text>
          </View>
        ) : (
          <Animated.View
            entering={FadeInDown.duration(340)}
            className="mx-5 overflow-hidden rounded-3xl border border-border bg-card">
            {charges.map((charge, index) => {
              const checked = selected.includes(charge.id);
              return (
                <View key={charge.id}>
                  {index > 0 && <Separator className="ml-16" />}
                  <PressableScale
                    accessibilityRole="checkbox"
                    accessibilityLabel={`${charge.label}, ${formatCents(charge.amountCents)}`}
                    accessibilityState={{ checked }}
                    haptic="select"
                    scaleTo={0.99}
                    onPress={() => toggle(charge.id)}
                    className="flex-row items-center gap-3.5 px-4 py-3.5">
                    <View
                      className={`h-6 w-6 items-center justify-center rounded-lg border-2 ${
                        checked ? 'border-primary bg-primary' : 'border-border bg-background'
                      }`}>
                      {checked && <Ionicons name="checkmark" size={14} color={palette.white} />}
                    </View>
                    <View className="h-9 w-9 items-center justify-center rounded-xl bg-primary-soft">
                      <Ionicons
                        name={CHARGE_ICONS[charge.kind] as never}
                        size={16}
                        color={palette.primary}
                      />
                    </View>
                    <View className="flex-1">
                      <Text variant="subheading" numberOfLines={1}>
                        {charge.label}
                      </Text>
                      <Text variant="caption" tone="muted" numberOfLines={1} className="mt-0.5">
                        Due {formatDate(charge.dueDate)}
                      </Text>
                    </View>
                    <Text variant="subheading">{formatCents(charge.amountCents)}</Text>
                  </PressableScale>
                </View>
              );
            })}
          </Animated.View>
        )}

        <SectionHeader title="Pay with" className="pt-7" />
        {methods.isPending ? (
          <View className="px-5">
            <Skeleton className="h-28 rounded-3xl" />
          </View>
        ) : (
          <Animated.View
            entering={FadeInDown.delay(70).duration(340)}
            className="mx-5 gap-2.5">
            {(methods.data ?? []).map((method) => {
              const active = method.id === methodId;
              return (
                <PressableScale
                  key={method.id}
                  accessibilityRole="radio"
                  accessibilityLabel={`${method.label}, ${method.detail}`}
                  accessibilityState={{ selected: active }}
                  haptic="select"
                  scaleTo={0.985}
                  onPress={() => setChosenMethodId(method.id)}
                  className={`flex-row items-center gap-3.5 rounded-3xl border p-4 ${
                    active ? 'border-primary bg-primary-soft' : 'border-border bg-card'
                  }`}>
                  <View className="h-10 w-10 items-center justify-center rounded-2xl bg-background">
                    <Ionicons
                      name={method.kind === 'card' ? 'card-outline' : 'business-outline'}
                      size={19}
                      color={active ? palette.primary : palette.mutedForeground}
                    />
                  </View>
                  <View className="flex-1">
                    <Text variant="subheading">{method.label}</Text>
                    <Text variant="caption" tone="muted" className="mt-0.5">
                      {method.detail}
                    </Text>
                  </View>
                  <View
                    className={`h-5 w-5 items-center justify-center rounded-full border-2 ${
                      active ? 'border-primary' : 'border-border'
                    }`}>
                    {active && <View className="h-2.5 w-2.5 rounded-full bg-primary" />}
                  </View>
                </PressableScale>
              );
            })}
            <Button
              label="Add a payment method"
              icon="add"
              variant="outline"
              block
              onPress={() => router.push('/payment-methods')}
            />
          </Animated.View>
        )}

        {/* Totals */}
        <Animated.View entering={FadeInDown.delay(140).duration(340)} className="mx-5 mt-7">
          <View className="rounded-3xl border border-border bg-card p-4">
            <View className="flex-row items-center justify-between py-1">
              <Text variant="body" tone="muted">
                Subtotal
              </Text>
              <Text variant="body">{formatCents(subtotal)}</Text>
            </View>
            <View className="flex-row items-center justify-between py-1">
              <Text variant="body" tone="muted">
                Convenience fee
              </Text>
              <Text variant="body">{fee > 0 ? formatCents(fee) : 'None'}</Text>
            </View>
            <Separator className="my-2.5" />
            <View className="flex-row items-center justify-between">
              <Text variant="heading">Total</Text>
              <Text variant="heading">{formatCents(total)}</Text>
            </View>
            {fee > 0 && (
              <Text variant="caption" tone="muted" className="mt-2.5">
                Card payments carry a {CARD_FEE_LABEL} processing fee. Paying by bank transfer is
                free.
              </Text>
            )}
          </View>
        </Animated.View>

        {!!pay.error && (
          <Animated.View entering={FadeIn.duration(200)} className="mx-5 mt-4">
            <View className="flex-row items-start gap-2 rounded-2xl bg-destructive-soft px-4 py-3">
              <Ionicons name="alert-circle" size={18} color={palette.destructive} />
              <Text variant="caption" tone="destructive" className="flex-1">
                {pay.error.message}
              </Text>
            </View>
          </Animated.View>
        )}
      </ScrollView>

      <StickyFooter>
        <Button
          label={total > 0 ? `Pay ${formatCents(total)}` : 'Pay'}
          size="lg"
          block
          icon="lock-closed"
          disabled={!canPay}
          loading={pay.isPending}
          onPress={submit}
        />
        <Text variant="caption" tone="muted" className="mt-2 text-center">
          Mockup — nothing is actually charged.
        </Text>
      </StickyFooter>

      <SuccessOverlay
        visible={!!receipt}
        title="Payment received"
        message={
          receipt
            ? `${formatCents(receipt.totalCents)} paid with ${receipt.methodLabel}.`
            : ''
        }
        detail={receipt ? `Confirmation ${receipt.confirmation}` : undefined}
        primaryLabel="Back to account"
        onPrimary={() => {
          setReceipt(null);
          router.replace('/(tabs)/payments');
        }}
        secondaryLabel="View transaction history"
        onSecondary={() => {
          setReceipt(null);
          router.replace('/ledger');
        }}
      />
    </Screen>
  );
}
