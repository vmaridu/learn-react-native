import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BalanceHero } from '~/components/balance-hero';
import { NavRow } from '~/components/nav-row';
import { useTabDockClearance } from '~/components/tab-bar';
import { Screen, SectionHeader, TabHeader } from '~/components/screen';
import { ErrorState } from '~/components/ui/empty-state';
import { Separator } from '~/components/ui/separator';
import { Skeleton } from '~/components/ui/skeleton';
import { Switch } from '~/components/ui/switch';
import { Text } from '~/components/ui/text';
import {
  CHARGE_ICONS,
  CHARGE_LABELS,
  useAccount,
  useLedger,
  usePaymentMethods,
  useSetAutopay,
} from '~/features/payments';
import { formatCents, formatDate, formatRelative } from '~/lib/format';
import { palette } from '~/lib/theme';

export default function PaymentsScreen() {
  const router = useRouter();
  const dockClearance = useTabDockClearance();
  const [refreshing, setRefreshing] = useState(false);

  const account = useAccount();
  const methods = usePaymentMethods();
  const ledger = useLedger();
  const setAutopay = useSetAutopay();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([account.refetch(), methods.refetch(), ledger.refetch()]);
    setRefreshing(false);
  }, [account, ledger, methods]);

  const defaultMethod = methods.data?.find((m) => m.isDefault);
  const recent = (ledger.data ?? []).slice(0, 3);

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: dockClearance }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={palette.brandInk}
            colors={[palette.brandInk]}
          />
        }>
        <TabHeader title="Pay" subtitle="Dues, assessments and fines" />

        {account.isPending ? (
          <View className="px-5">
            <Skeleton className="h-[196px] rounded-[28px]" />
          </View>
        ) : account.error ? (
          <ErrorState message={account.error.message} onRetry={() => void account.refetch()} />
        ) : account.data ? (
          <>
            <BalanceHero
              balanceCents={account.data.balanceCents}
              nextDueDate={account.data.nextDueDate}
              pastDueCents={account.data.pastDueCents}
              autopayEnabled={account.data.autopay.enabled}
              onPay={() => router.push('/checkout')}
              onDetails={() => router.push('/ledger')}
            />

            {/* What makes up the balance */}
            {account.data.charges.length > 0 && (
              <View className="pt-10">
                <SectionHeader title="What you owe" />
                <Animated.View
                  entering={FadeInDown.duration(340)}
                  className="mx-5 rounded-3xl border border-border bg-card">
                  {account.data.charges.map((charge, index) => (
                    <View key={charge.id}>
                      {index > 0 && <Separator className="ml-16" />}
                      <View className="flex-row items-center gap-3.5 px-4 py-3.5">
                        <View className="h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft">
                          <Ionicons
                            name={CHARGE_ICONS[charge.kind] as never}
                            size={18}
                            color={palette.brandInk}
                          />
                        </View>
                        <View className="flex-1">
                          <Text variant="subheading" numberOfLines={1}>
                            {charge.label}
                          </Text>
                          <Text variant="caption" tone="muted" numberOfLines={1} className="mt-0.5">
                            {charge.detail} · due {formatDate(charge.dueDate)}
                          </Text>
                        </View>
                        <View className="items-end">
                          <Text variant="subheading">{formatCents(charge.amountCents)}</Text>
                          <Text variant="caption" tone="muted">
                            {CHARGE_LABELS[charge.kind]}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </Animated.View>
              </View>
            )}

            {/* Autopay */}
            <View className="pt-10">
              <SectionHeader title="Autopay" />
              <Animated.View
                entering={FadeInDown.delay(60).duration(340)}
                className="mx-5 rounded-3xl border border-border bg-card px-4">
                <View className="flex-row items-center gap-4 py-4">
                  <View className="flex-1">
                    <Text variant="subheading">Pay automatically</Text>
                    <Text variant="caption" tone="muted" className="mt-0.5">
                      {defaultMethod
                        ? `Charges ${defaultMethod.label} on the 1st of each month.`
                        : 'Add a payment method first.'}
                    </Text>
                  </View>
                  <Switch
                    label="Autopay"
                    value={account.data.autopay.enabled}
                    disabled={!defaultMethod || setAutopay.isPending}
                    onValueChange={(next) =>
                      setAutopay.mutate({ enabled: next, methodId: defaultMethod?.id })
                    }
                  />
                </View>
              </Animated.View>
            </View>
          </>
        ) : null}

        {/* Methods & history */}
        <View className="pt-10">
          <SectionHeader title="Account" />
          <Animated.View
            entering={FadeInDown.delay(120).duration(340)}
            className="mx-5 overflow-hidden rounded-3xl border border-border bg-card">
            <NavRow
              icon="card-outline"
              title="Payment methods"
              subtitle={
                methods.data
                  ? `${methods.data.length} on file${
                      defaultMethod ? ` · ${defaultMethod.label} is default` : ''
                    }`
                  : 'Loading'
              }
              onPress={() => router.push('/payment-methods')}
            />
            <Separator className="ml-16" />
            <NavRow
              icon="receipt-outline"
              title="Transaction history"
              subtitle="Every charge and payment on your account"
              onPress={() => router.push('/ledger')}
            />
          </Animated.View>
        </View>

        {/* Recent activity */}
        {recent.length > 0 && (
          <View className="pt-10">
            <SectionHeader
              title="Recent activity"
              actionLabel="See all"
              onAction={() => router.push('/ledger')}
            />
            <Animated.View
              entering={FadeInDown.delay(180).duration(340)}
              className="mx-5 rounded-3xl border border-border bg-card">
              {recent.map((entry, index) => {
                const isPayment = entry.amountCents < 0;
                return (
                  <View key={entry.id}>
                    {index > 0 && <Separator className="ml-4" />}
                    <View className="flex-row items-center gap-3 px-4 py-3.5">
                      <View className="flex-1">
                        <Text variant="subheading" numberOfLines={1}>
                          {entry.label}
                        </Text>
                        <Text variant="caption" tone="muted" className="mt-0.5">
                          {formatRelative(entry.at)}
                          {entry.method ? ` · ${entry.method}` : ''}
                        </Text>
                      </View>
                      <Text
                        variant="subheading"
                        tone={isPayment ? 'success' : 'default'}>
                        {isPayment
                          ? formatCents(Math.abs(entry.amountCents), { sign: true })
                          : formatCents(entry.amountCents)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </Animated.View>
          </View>
        )}

        <View className="mt-7 px-5">
          <View className="flex-row items-start gap-2.5 rounded-3xl border border-border bg-muted p-4">
            <Ionicons name="shield-checkmark-outline" size={18} color={palette.mutedForeground} />
            <View className="flex-1">
              <Text variant="caption" tone="muted">
                Mockup only — no card is charged and no processor is connected. ACH is free; card
                payments would carry a 2.9% + $0.30 convenience fee.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
