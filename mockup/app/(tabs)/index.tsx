import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AttentionCard, type AttentionItem } from '~/components/attention-card';
import { BalanceHero } from '~/components/balance-hero';
import { QuickActions, type QuickAction } from '~/components/quick-actions';
import { Screen, SectionHeader } from '~/components/screen';
import { useTabDockClearance } from '~/components/tab-bar';
import { Avatar } from '~/components/ui/avatar';
import { PressableScale } from '~/components/ui/pressable-scale';
import { Separator } from '~/components/ui/separator';
import { Skeleton } from '~/components/ui/skeleton';
import { Text } from '~/components/ui/text';
import { useReservations } from '~/features/amenities';
import { useMember } from '~/features/auth';
import { cureLabel, useViolations } from '~/features/compliance';
import { pendingAcknowledgments, useDocuments } from '~/features/documents';
import { closingLabel, useElections } from '~/features/elections';
import { useMessages } from '~/features/inbox';
import { useAccount } from '~/features/payments';
import { formatCents, formatDate, formatRelative, formatTimeRange } from '~/lib/format';
import { palette } from '~/lib/theme';

function greeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Home is the one screen everybody sees every time, so it is the one that has to
 * stay quiet. It answers three questions in order — what do I owe, what needs me,
 * what changed — and nothing else competes for the space.
 */
export default function HomeScreen() {
  const router = useRouter();
  const dockClearance = useTabDockClearance();
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

  // Four, not five. Pay lives on the balance card and Vote surfaces itself under
  // "Needs you" when a ballot is actually open; both are also in More.
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
        label: 'Ask',
        onPress: () => router.push('/assistant'),
      },
      {
        key: 'report',
        icon: 'megaphone-outline',
        label: 'Report',
        onPress: () => router.push('/requests/new'),
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
        detail: `${cureLabel(openViolation.cureByDate)}${
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
          detail: `Ballot open · ${closingLabel(election)}`,
          cta: 'Vote',
          tone: 'primary',
          onPress: () => router.push(`/elections/${election.id}`),
        });
      });

    pendingAcknowledgments(documents.data ?? []).forEach((doc) => {
      items.push({
        key: `doc-${doc.id}`,
        icon: 'create-outline',
        title: doc.title,
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

  // One, not two. This is a pointer to the inbox, not a second inbox.
  const latestAnnouncement = (messages.data ?? []).find((m) => m.kind === 'announcement');

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
        {/* Greeting */}
        <Animated.View
          entering={FadeInDown.duration(360)}
          className="flex-row items-center gap-3.5 px-5 pb-7 pt-3">
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
            hitSlop={12}
            scaleTo={0.88}
            onPress={() => router.push('/(tabs)/inbox')}
            className="h-10 w-10 items-center justify-center">
            <Ionicons name="notifications-outline" size={22} color={palette.foreground} />
            {unread > 0 && (
              <View className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border border-background bg-destructive" />
            )}
          </PressableScale>
        </Animated.View>

        {/* Balance */}
        {account.isPending ? (
          <View className="px-5">
            <Skeleton className="h-[190px] rounded-[28px]" />
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

        {/* Shortcuts */}
        <View className="pt-7">
          <QuickActions actions={quickActions} />
        </View>

        {/* Needs you */}
        {attention.length > 0 && (
          <View className="pt-10">
            <SectionHeader title="Needs you" />
            <View className="px-5">
              {attention.map((item, index) => (
                <View key={item.key}>
                  {index > 0 && <Separator />}
                  <AttentionCard item={item} index={index} />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Next reservation */}
        {!!nextReservation && (
          <View className="pt-10">
            <SectionHeader
              title="Coming up"
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
                className="flex-row items-center gap-4 py-1">
                <View
                  style={{ width: 52, height: 52, borderRadius: 18 }}
                  className="items-center justify-center bg-primary-soft">
                  <Ionicons
                    name={nextReservation.amenity.icon as never}
                    size={22}
                    color={palette.brandInk}
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
                <Ionicons name="chevron-forward" size={16} color={palette.mutedForeground} />
              </PressableScale>
            </Animated.View>
          </View>
        )}

        {/* From the board */}
        {!!latestAnnouncement && (
          <View className="pt-10">
            <SectionHeader
              title="From the board"
              actionLabel="Inbox"
              onAction={() => router.push('/(tabs)/inbox')}
            />
            <Animated.View entering={FadeInDown.duration(340)} className="px-5">
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={latestAnnouncement.subject}
                scaleTo={0.985}
                onPress={() => router.push(`/message/${latestAnnouncement.id}`)}
                className="py-1">
                <View className="flex-row items-center gap-2">
                  {!latestAnnouncement.read && (
                    <View className="h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                  <Text variant="caption" tone="muted">
                    {formatRelative(latestAnnouncement.sentAt)}
                  </Text>
                </View>
                <Text variant="subheading" numberOfLines={2} className="mt-1.5">
                  {latestAnnouncement.subject}
                </Text>
                <Text variant="caption" tone="muted" numberOfLines={2} className="mt-1.5">
                  {latestAnnouncement.body.replace(/\s+/g, ' ')}
                </Text>
              </PressableScale>
            </Animated.View>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
