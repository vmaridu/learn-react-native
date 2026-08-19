import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useTabDockClearance } from '~/components/tab-bar';
import { Screen, TabHeader } from '~/components/screen';
import { EmptyState, ErrorState } from '~/components/ui/empty-state';
import { SearchInput } from '~/components/ui/input';
import { Segmented } from '~/components/ui/segmented';
import { SkeletonList } from '~/components/ui/skeleton';
import {
  MessageRow,
  filterMessages,
  useMarkAllRead,
  useMessages,
  type InboxFilter,
  type Message,
} from '~/features/inbox';

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'announcement', label: 'Announcements' },
  { value: 'direct', label: 'Messages' },
] as const;

export default function InboxScreen() {
  const router = useRouter();
  const dockClearance = useTabDockClearance();
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [query, setQuery] = useState('');

  const { data, isPending, error, refetch } = useMessages();
  const markAllRead = useMarkAllRead();

  const unread = data?.filter((m) => !m.read).length ?? 0;
  const messages = useMemo(
    () => filterMessages(data ?? [], filter, query),
    [data, filter, query],
  );

  const openMessage = useCallback(
    (messageId: string) => router.push(`/message/${messageId}`),
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: Message }) => <MessageRow message={item} onPress={openMessage} />,
    [openMessage],
  );

  const keyExtractor = useCallback((item: Message) => item.id, []);

  return (
    <Screen>
      <TabHeader
        title="Inbox"
        subtitle={unread > 0 ? `${unread} unread` : 'You are all caught up'}
        actionIcon="checkmark-done-outline"
        actionLabel="Mark all as read"
        onAction={unread > 0 ? () => markAllRead.mutate() : undefined}
      />

      <Animated.View entering={FadeInDown.delay(60).duration(320)} className="gap-3 px-5 pb-3">
        <SearchInput value={query} onChangeText={setQuery} placeholder="Search your inbox" />
        <Segmented options={TABS} value={filter} onChange={setFilter} />
      </Animated.View>

      {isPending ? (
        <SkeletonList rows={4} />
      ) : error ? (
        <ErrorState message={error.message} onRetry={() => void refetch()} />
      ) : messages.length === 0 ? (
        <EmptyState
          icon="mail-outline"
          title={query ? 'No matches' : 'Nothing here yet'}
          description={
            query
              ? 'Try a different search term.'
              : 'Board announcements and messages from management land here.'
          }
          actionLabel={query ? 'Clear search' : undefined}
          onAction={query ? () => setQuery('') : undefined}
        />
      ) : (
        <View className="flex-1">
          <FlashList
            data={messages}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingBottom: dockClearance,
            }}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
    </Screen>
  );
}
