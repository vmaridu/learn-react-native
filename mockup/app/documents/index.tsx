import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen, ScreenHeader } from '~/components/screen';
import { Badge } from '~/components/ui/badge';
import { ChipRow } from '~/components/ui/chip';
import { EmptyState, ErrorState } from '~/components/ui/empty-state';
import { SearchInput } from '~/components/ui/input';
import { PressableScale } from '~/components/ui/pressable-scale';
import { SkeletonList } from '~/components/ui/skeleton';
import { Text } from '~/components/ui/text';
import {
  matchExcerpt,
  searchDocuments,
  useDocuments,
  type DocumentFilter,
  type DocumentRecord,
} from '~/features/documents';
import { formatDate } from '~/lib/format';
import { palette } from '~/lib/theme';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'Governing', label: 'Governing' },
  { value: 'Rules', label: 'Rules' },
  { value: 'Minutes', label: 'Minutes' },
  { value: 'Financial', label: 'Financial' },
] as const;

export default function DocumentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<DocumentFilter>('all');
  const [query, setQuery] = useState('');

  const { data, isPending, error, refetch } = useDocuments();

  const documents = useMemo(() => {
    const byCategory =
      filter === 'all' ? (data ?? []) : (data ?? []).filter((d) => d.category === filter);
    return searchDocuments(byCategory, query);
  }, [data, filter, query]);

  const openDocument = useCallback(
    (documentId: string) => router.push(`/documents/${documentId}`),
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: DocumentRecord }) => {
      const excerpt = matchExcerpt(item, query);
      const needsAck = item.requiresAck && !item.acknowledgedAt;

      return (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`${item.title}, version ${item.version}`}
          scaleTo={0.985}
          onPress={() => openDocument(item.id)}
          className="mb-2.5 flex-row gap-3.5 rounded-3xl border border-border bg-card p-4">
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft">
            <Ionicons name="document-text" size={20} color={palette.primary} />
          </View>
          <View className="flex-1">
            <Text variant="subheading" numberOfLines={2}>
              {item.title}
            </Text>
            <Text variant="caption" tone="muted" className="mt-1">
              v{item.version} · {formatDate(item.updatedAt)} · {item.pages} pages
            </Text>
            {excerpt ? (
              <Text variant="caption" tone="muted" numberOfLines={2} className="mt-1.5 italic">
                {excerpt}
              </Text>
            ) : (
              <Text variant="caption" tone="muted" numberOfLines={2} className="mt-1.5">
                {item.summary}
              </Text>
            )}
            <View className="mt-2 flex-row flex-wrap gap-1.5">
              <Badge label={item.category} tone="neutral" />
              {needsAck && <Badge label="Signature needed" tone="warning" icon="create-outline" />}
              {item.requiresAck && !!item.acknowledgedAt && (
                <Badge label="Acknowledged" tone="success" icon="checkmark-circle" />
              )}
            </View>
          </View>
        </PressableScale>
      );
    },
    [openDocument, query],
  );

  const keyExtractor = useCallback((item: DocumentRecord) => item.id, []);

  return (
    <Screen>
      <ScreenHeader title="Document centre" subtitle="Searchable and versioned" />

      <View className="gap-3 px-5 py-4">
        <SearchInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search titles and full text"
        />
        <ChipRow options={FILTERS} value={filter} onChange={setFilter} />
      </View>

      {isPending ? (
        <SkeletonList rows={4} />
      ) : error ? (
        <ErrorState message={error.message} onRetry={() => void refetch()} />
      ) : documents.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title="No documents match"
          description="Search covers titles, summaries and the body of every document."
          actionLabel="Clear search"
          onAction={() => {
            setQuery('');
            setFilter('all');
          }}
        />
      ) : (
        <View className="flex-1">
          <FlashList
            data={documents}
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
