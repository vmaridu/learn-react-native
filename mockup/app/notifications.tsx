import { Ionicons } from '@expo/vector-icons';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Screen, ScreenHeader, SectionHeader } from '~/components/screen';
import { ErrorState } from '~/components/ui/empty-state';
import { Separator } from '~/components/ui/separator';
import { SkeletonList } from '~/components/ui/skeleton';
import { SwitchRow } from '~/components/ui/switch';
import { Text } from '~/components/ui/text';
import { useNotificationPrefs, useUpdateNotificationPrefs } from '~/features/profile';
import { palette } from '~/lib/theme';

export default function NotificationsScreen() {
  const prefs = useNotificationPrefs();
  const update = useUpdateNotificationPrefs();

  if (prefs.error) {
    return (
      <Screen>
        <ScreenHeader title="Notifications" />
        <ErrorState message={prefs.error.message} onRetry={() => void prefs.refetch()} />
      </Screen>
    );
  }

  if (prefs.isPending || !prefs.data) {
    return (
      <Screen>
        <ScreenHeader title="Notifications" />
        <SkeletonList rows={3} />
      </Screen>
    );
  }

  const p = prefs.data;
  const noChannel = !p.push && !p.email && !p.sms;

  return (
    <Screen>
      <ScreenHeader title="Notifications" subtitle="How the association reaches you" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <SectionHeader title="Channels" className="pt-5" />
        <Animated.View
          entering={FadeInDown.duration(340)}
          className="mx-5 rounded-3xl border border-border bg-card px-4">
          <SwitchRow
            title="Push notifications"
            description="On this device"
            value={p.push}
            disabled={update.isPending}
            onValueChange={(next) => update.mutate({ push: next })}
          />
          <Separator />
          <SwitchRow
            title="Email"
            description="To the address on your account"
            value={p.email}
            disabled={update.isPending}
            onValueChange={(next) => update.mutate({ email: next })}
          />
          <Separator />
          <SwitchRow
            title="SMS"
            description="Standard message rates apply"
            value={p.sms}
            disabled={update.isPending}
            onValueChange={(next) => update.mutate({ sms: next })}
          />
        </Animated.View>

        {noChannel && (
          <Animated.View
            entering={FadeInDown.duration(240)}
            className="mx-5 mt-3 flex-row items-start gap-2.5 rounded-3xl border border-warning/25 bg-warning-soft p-4">
            <Ionicons name="alert-circle-outline" size={18} color={palette.warning} />
            <Text variant="caption" className="flex-1">
              With every channel off you will only see notices when you open the app. Statutory
              notices are still delivered by post.
            </Text>
          </Animated.View>
        )}

        <SectionHeader title="What to send" className="pt-7" />
        <Animated.View
          entering={FadeInDown.delay(80).duration(340)}
          className="mx-5 rounded-3xl border border-border bg-card px-4">
          <SwitchRow
            title="Announcements"
            description="Board and management broadcasts"
            value={p.categories.announcements}
            disabled={update.isPending}
            onValueChange={(next) => update.mutate({ categories: { announcements: next } })}
          />
          <Separator />
          <SwitchRow
            title="Reservations"
            description="Confirmations, reminders and waitlist openings"
            value={p.categories.reservations}
            disabled={update.isPending}
            onValueChange={(next) => update.mutate({ categories: { reservations: next } })}
          />
          <Separator />
          <SwitchRow
            title="Billing"
            description="Statements, due dates and receipts"
            value={p.categories.billing}
            disabled={update.isPending}
            onValueChange={(next) => update.mutate({ categories: { billing: next } })}
          />
          <Separator />
          <SwitchRow
            title="Compliance"
            description="Violation notices, disputes and ARC decisions"
            value={p.categories.compliance}
            disabled={update.isPending}
            onValueChange={(next) => update.mutate({ categories: { compliance: next } })}
          />
          <Separator />
          <SwitchRow
            title="Elections"
            description="Ballots opening, closing and results"
            value={p.categories.elections}
            disabled={update.isPending}
            onValueChange={(next) => update.mutate({ categories: { elections: next } })}
          />
        </Animated.View>

        <View className="mt-5 px-5">
          <Text variant="caption" tone="muted">
            Mockup only — nothing is actually sent. Preferences persist for this session and reset
            when you sign out.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}
