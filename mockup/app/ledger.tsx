import { FlashList } from '@shopify/flash-list';
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen, ScreenHeader } from '~/components/screen';
import { ChipRow } from '~/components/ui/chip';
import { EmptyState, ErrorState } from '~/components/ui/empty-state';
import { SkeletonList } from '~/components/ui/skeleton';
import { Text } from '~/components/ui/text';
import { CHARGE_LABELS, useLedger, type LedgerEntry } from '~/features/payments';
import { formatCents, formatDate } from '~/lib/format';

const FILTERS = [
  { value: 'all', label: 'Everything' },
  { value: 'payment', label: 'Payments' },
  { value: 'dues', label: 'Dues' },
  { value: 'assessment', label: 'Assessments' },
  { value: 'fine', label: 'Fines' },
] as const;

type Filter = (typeof FILTERS)[number]['value'];

function LedgerRow({ entry }: { entry: LedgerEntry }) {
  const isPayment = entry.amountCents < 0;
  const label = entry.kind === 'payment' ? 'Payment' : CHARGE_LABELS[entry.kind];

  return (
    <View className="mb-2.5 flex-row items-center gap-3 rounded-3xl border border-border bg-card px-4 py-3.5">
      <View className="flex-1">
        <Text variant="subheading" numberOfLines={1}>
          {entry.label}
        </Text>
        <Text variant="caption" tone="muted" className="mt-0.5" numberOfLines={1}>
          {formatDate(entry.at.slice(0, 10))} · {label}
          {entry.method ? ` · ${entry.method}` : ''}
        </Text>
      </View>
      <Text variant="subheading" tone={isPayment ? 'success' : 'default'}>
        {isPayment
          ? formatCents(Math.abs(entry.amountCents), { sign: true })
          : formatCents(entry.amountCents)}
      </Text>
    </View>
  );
}

export default function LedgerScreen() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Filter>('all');
  const { data, isPending, error, refetch } = useLedger();

  const entries = useMemo(() => {
    if (filter === 'all') return data ?? [];
    if (filter === 'payment') return (data ?? []).filter((e) => e.kind === 'payment');
    return (data ?? []).filter((e) => e.kind === filter);
  }, [data, filter]);

  const renderItem = useCallback(
    ({ item }: { item: LedgerEntry }) => <LedgerRow entry={item} />,
    [],
  );

  const keyExtractor = useCallback((item: LedgerEntry) => item.id, []);

  return (
    <Screen>
      <ScreenHeader title="Transaction history" subtitle="Every charge and payment" />

      <View className="px-5 py-4">
        <ChipRow options={FILTERS} value={filter} onChange={setFilter} />
      </View>

      {isPending ? (
        <SkeletonList rows={5} />
      ) : error ? (
        <ErrorState message={error.message} onRetry={() => void refetch()} />
      ) : entries.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="Nothing here"
          description="No transactions match that filter."
          actionLabel="Show everything"
          onAction={() => setFilter('all')}
        />
      ) : (
        <View className="flex-1">
          <FlashList
            data={entries}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingBottom: insets.bottom + 16,
            }}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
    </Screen>
  );
}
