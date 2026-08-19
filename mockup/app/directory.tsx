import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen, ScreenHeader } from '~/components/screen';
import { Avatar } from '~/components/ui/avatar';
import { EmptyState, ErrorState } from '~/components/ui/empty-state';
import { SearchInput } from '~/components/ui/input';
import { Separator } from '~/components/ui/separator';
import { PressableScale } from '~/components/ui/pressable-scale';
import { SkeletonList } from '~/components/ui/skeleton';
import { Text } from '~/components/ui/text';
import { useMember } from '~/features/auth';
import { searchDirectory, useDirectory, type DirectoryEntry } from '~/features/directory';
import { palette } from '~/lib/theme';

function DirectoryRow({ entry }: { entry: DirectoryEntry }) {
  return (
    <View className="flex-row items-center gap-4 py-4">
      <Avatar name={entry.name} size="md" />
      <View className="flex-1">
        <Text variant="subheading" numberOfLines={1}>
          {entry.name}
        </Text>
        <Text variant="caption" tone="muted" className="mt-0.5" numberOfLines={1}>
          {entry.unit}
          {entry.interests.length > 0 ? ` · ${entry.interests.join(', ')}` : ''}
        </Text>
      </View>
      <View className="items-end gap-1">
        {!!entry.phone && <Ionicons name="call-outline" size={16} color={palette.brandInk} />}
        {!!entry.email && <Ionicons name="mail-outline" size={16} color={palette.brandInk} />}
        {!entry.phone && !entry.email && (
          <Ionicons name="lock-closed-outline" size={16} color={palette.mutedForeground} />
        )}
      </View>
    </View>
  );
}

export default function DirectoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const member = useMember();
  const { data, isPending, error, refetch } = useDirectory();

  const entries = useMemo(() => searchDirectory(data ?? [], query), [data, query]);

  const renderItem = useCallback(
    ({ item }: { item: DirectoryEntry }) => <DirectoryRow entry={item} />,
    [],
  );

  const keyExtractor = useCallback((item: DirectoryEntry) => item.id, []);

  return (
    <Screen>
      <ScreenHeader title="Owner directory" subtitle="Neighbours who have opted in" />

      <View className="px-5 py-4">
        <SearchInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name, unit or interest"
        />
      </View>

      {/* Your own visibility */}
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Change your directory visibility"
        scaleTo={0.985}
        onPress={() => router.push('/profile')}
        className="mx-5 mb-4 flex-row items-center gap-3 rounded-3xl border border-border bg-primary-soft p-4">
        <Ionicons
          name={member.data?.directoryOptIn ? 'eye-outline' : 'eye-off-outline'}
          size={20}
          color={palette.brandInk}
        />
        <View className="flex-1">
          <Text variant="subheading">
            {member.data?.directoryOptIn ? 'You are listed' : 'You are not listed'}
          </Text>
          <Text variant="caption" tone="muted" className="mt-0.5">
            {member.data?.directoryOptIn
              ? `Sharing ${[
                  member.data.showEmail ? 'email' : null,
                  member.data.showPhone ? 'phone' : null,
                ]
                  .filter(Boolean)
                  .join(' and ') || 'name and unit only'}`
              : 'Neighbours cannot see your details'}
          </Text>
        </View>
        <Text variant="caption" tone="primary" className="font-semibold">
          Change
        </Text>
      </PressableScale>

      {isPending ? (
        <SkeletonList rows={4} />
      ) : error ? (
        <ErrorState message={error.message} onRetry={() => void refetch()} />
      ) : entries.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="No matches"
          description="Only neighbours who have opted in appear here."
          actionLabel="Clear search"
          onAction={() => setQuery('')}
        />
      ) : (
        <View className="flex-1">
          <FlashList
            data={entries}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            ItemSeparatorComponent={Separator}
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
