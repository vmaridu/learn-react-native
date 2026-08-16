import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AttentionCard, type AttentionItem } from '~/components/attention-card';
import { BalanceHero } from '~/components/balance-hero';
import { QuickActions, type QuickAction } from '~/components/quick-actions';
import { Screen, SectionHeader } from '~/components/screen';
import { Avatar } from '~/components/ui/avatar';
import { Badge } from '~/components/ui/badge';
import { PressableScale } from '~/components/ui/pressable-scale';
import { Skeleton } from '~/components/ui/skeleton';
import { Text } from '~/components/ui/text';
import { useMember } from '~/features/auth';
import { useReservations } from '~/features/amenities';
import { useViolations, cureLabel } from '~/features/compliance';
import { useDocuments, pendingAcknowledgments } from '~/features/documents';
import { useElections, closingLabel } from '~/features/elections';
import { useMessages } from '~/features/inbox';
import { useAccount } from '~/features/payments';
import { formatCents, formatDate, formatRelative, formatTimeRange } from '~/lib/format';
import { palette } from '~/lib/theme';
import { community } from '~/mock/db';

function greeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const member = useMember();
  const account = useAccount();
  const reservations = useReservations();
  const violations = useViolations();
  const elections = useElections();
  const documents = useDocuments();
  const messages = useMessages();

  const unread = messages.data?.filter((m) => !m.read).length ?? 0;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      account.refetch(),
      reservations.refetch(),
      violations.refetch(),
      elections.refetch(),
      documents.refetch(),
      messages.refetch(),
    ]);
    setRefreshing(false);
  }, [account, documents, elections, messages, reservations, violations]);

  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        key: 'book',
        icon: 'calendar-outline',
        label: 'Book',
        onPress: () => router.push('/(tabs)/amenities'),
      },
      {
        key: 'docs',
        icon: 'document-text-outline',
        label: 'Documents',
        onPress: () => router.push('/documents'),
      },
      {
        key: 'ai',
        icon: 'sparkles-outline',
        label: 'Ask AI',
        onPress: () => router.push('/assistant'),
      },
      {
        key: 'report',
        icon: 'megaphone-outline',
        label: 'Report',
        onPress: () => router.push('/requests/new'),
      },
      {
        key: 'vote',
        icon: 'checkbox-outline',
        label: 'Vote',
        onPress: () => router.push('/elections'),
      },
    ],
    [router],
  );

  const attention: AttentionItem[] = useMemo(() => {
    const items: AttentionItem[] = [];

    const openViolation = violations.data?.find(
      (v) => v.status === 'open' || v.status === 'escalated',
    );
    if (openViolation) {
      items.push({
        key: `violation-${openViolation.id}`,
        icon: 'warning-outline',
        title: openViolation.title,
        detail: `${openViolation.reference} · ${cureLabel(openViolation.cureByDate)}${
          openViolation.fineCents > 0 && !openViolation.finePaid
            ? ` · ${formatCents(openViolation.fineCents)} fine`
            : ''
        }`,
        cta: 'Review',
        tone: 'warning',
        onPress: () => router.push(`/violations/${openViolation.id}`),
      });
    }

    elections.data
      ?.filter((election) => election.status === 'open' && !election.hasVoted)
      .forEach((election) => {
        items.push({
          key: `election-${election.id}`,
          icon: 'checkbox-outline',
          title: election.title,
          detail: `Your ballot is open · ${closingLabel(election)}`,
          cta: 'Vote',
          tone: 'primary',
          onPress: () => router.push(`/elections/${election.id}`),
        });
      });

    pendingAcknowledgments(documents.data ?? []).forEach((doc) => {
      items.push({
        key: `doc-${doc.id}`,
        icon: 'create-outline',
        title: `Acknowledge ${doc.title}`,
        detail: `Version ${doc.version} needs your signature`,
        cta: 'Sign',
        tone: 'primary',
        onPress: () => router.push(`/documents/${doc.id}`),
      });
    });

    return items;
  }, [documents.data, elections.data, router, violations.data]);

  const nextReservation = reservations.data?.find(
    (r) => r.status === 'confirmed' && r.date >= new Date().toISOString().slice(0, 10),
  );

  // Capped at two so this stays a preview, not a list — nesting a virtualised
  // list inside a ScrollView is the worse trade here.
  const latestAnnouncements = (messages.data ?? [])
    .filter((m) => m.kind === 'announcement')
    .slice(0, 2);

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={palette.primary}
            colors={[palette.primary]}
          />
        }>
        {/* Greeting */}
        <Animated.View
          entering={FadeInDown.duration(360)}
          className="flex-row items-center gap-3 px-5 pb-5 pt-2">
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Your profile"
            scaleTo={0.9}
            onPress={() => router.push('/profile')}>
            <Avatar name={member.data?.name ?? 'Alex Rivera'} size="md" />
          </PressableScale>
          <View className="flex-1">
            <Text variant="caption" tone="muted">
              {greeting()}
            </Text>
            {member.isPending ? (
              <Skeleton className="mt-1 h-5 w-32" />
            ) : (
              <Text variant="heading" numberOfLines={1}>
                {member.data?.name.split(' ')[0] ?? 'Neighbour'}
              </Text>
            )}
          </View>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={unread > 0 ? `Inbox, ${unread} unread` : 'Inbox'}
            hitSlop={10}
            scaleTo={0.88}
            onPress={() => router.push('/(tabs)/inbox')}
            className="h-11 w-11 items-center justify-center rounded-full border border-border">
            <Ionicons name="notifications-outline" size={20} color={palette.foreground} />
            {unread > 0 && (
              <View className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border border-background bg-destructive" />
            )}
          </PressableScale>
        </Animated.View>

        {/* Balance */}
        {account.isPending ? (
          <View className="px-5">
            <Skeleton className="h-[196px] rounded-[28px]" />
          </View>
        ) : account.data ? (
          <BalanceHero
            balanceCents={account.data.balanceCents}
            nextDueDate={account.data.nextDueDate}
            pastDueCents={account.data.pastDueCents}
            autopayEnabled={account.data.autopay.enabled}
            onPay={() => router.push('/checkout')}
            onDetails={() => router.push('/(tabs)/payments')}
          />
        ) : null}

        {/* Quick actions */}
        <View className="pt-5">
          <QuickActions actions={quickActions} />
        </View>

        {/* Needs attention */}
        {attention.length > 0 && (
          <View className="pt-7">
            <SectionHeader title={`Needs you · ${attention.length}`} />
            <View className="px-5">
              {attention.map((item, index) => (
                <AttentionCard key={item.key} item={item} index={index} />
              ))}
            </View>
          </View>
        )}

        {/* Next reservation */}
        {!!nextReservation && (
          <View className="pt-5">
            <SectionHeader
              title="Next reservation"
              actionLabel="All bookings"
              onAction={() => router.push('/reservations')}
            />
            <Animated.View entering={FadeInDown.duration(360)} className="px-5">
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={`${nextReservation.amenity.name} on ${formatDate(
                  nextReservation.date,
                )}`}
                scaleTo={0.985}
                onPress={() => router.push(`/amenity/${nextReservation.amenityId}`)}
                className="flex-row items-center gap-4 rounded-3xl border border-border bg-card p-4">
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft">
                  <Ionicons
                    name={nextReservation.amenity.icon as never}
                    size={22}
                    color={palette.primary}
                  />
                </View>
                <View className="flex-1">
                  <Text variant="subheading" numberOfLines={1}>
                    {nextReservation.amenity.name}
                  </Text>
                  <Text variant="caption" tone="muted" className="mt-0.5">
                    {formatDate(nextReservation.date)} ·{' '}
                    {formatTimeRange(nextReservation.start, nextReservation.minutes)}
                  </Text>
                </View>
                <Badge label="Confirmed" tone="success" icon="checkmark-circle" />
              </PressableScale>
            </Animated.View>
          </View>
        )}

        {/* Community */}
        {latestAnnouncements.length > 0 && (
          <View className="pt-7">
            <SectionHeader
              title="From the board"
              actionLabel="Open inbox"
              onAction={() => router.push('/(tabs)/inbox')}
            />
            <View className="gap-2.5 px-5">
              {latestAnnouncements.map((message, index) => (
                <Animated.View
                  key={message.id}
                  entering={FadeInDown.delay(index * 70).duration(340)}>
                  <PressableScale
                    accessibilityRole="button"
                    accessibilityLabel={message.subject}
                    scaleTo={0.985}
                    onPress={() => router.push(`/message/${message.id}`)}
                    className="rounded-3xl border border-border bg-card p-4">
                    <View className="flex-row items-center gap-2">
                      {!message.read && <View className="h-2 w-2 rounded-full bg-primary" />}
                      <Text variant="caption" tone="muted" className="flex-1">
                        {message.fromRole} · {formatRelative(message.sentAt)}
                      </Text>
                      {message.pinned && (
                        <Ionicons name="pin" size={13} color={palette.mutedForeground} />
                      )}
                    </View>
                    <Text variant="subheading" numberOfLines={2} className="mt-1.5">
                      {message.subject}
                    </Text>
                    <Text variant="caption" tone="muted" numberOfLines={2} className="mt-1">
                      {message.body.replace(/\s+/g, ' ')}
                    </Text>
                  </PressableScale>
                </Animated.View>
              ))}
            </View>
          </View>
        )}

        <Animated.View
          entering={FadeInDown.delay(160).duration(360)}
          className="mt-8 items-center px-8">
          <Text variant="caption" tone="muted" className="text-center">
            {community.name} · {community.units} units
          </Text>
          <Text variant="caption" tone="muted" className="mt-0.5 text-center">
            Managed by {community.managerName}
          </Text>
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}
