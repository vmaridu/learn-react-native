import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { NavRow } from '~/components/nav-row';
import { useTabDockClearance } from '~/components/tab-bar';
import { Screen, SectionHeader, TabHeader } from '~/components/screen';
import { Avatar } from '~/components/ui/avatar';
import { PressableScale } from '~/components/ui/pressable-scale';
import { Separator } from '~/components/ui/separator';
import { Text } from '~/components/ui/text';
import { useMember } from '~/features/auth';
import { useArcRequests, useServiceRequests, useViolations } from '~/features/compliance';
import { pendingAcknowledgments, useDocuments } from '~/features/documents';
import { useElections } from '~/features/elections';
import { community } from '~/mock/db';

export default function MoreScreen() {
  const router = useRouter();
  const dockClearance = useTabDockClearance();

  const member = useMember();
  const documents = useDocuments();
  const violations = useViolations();
  const arc = useArcRequests();
  const requests = useServiceRequests();
  const elections = useElections();

  const pendingAcks = pendingAcknowledgments(documents.data ?? []).length;
  const openViolations =
    violations.data?.filter((v) => v.status === 'open' || v.status === 'escalated').length ?? 0;
  const openBallots =
    elections.data?.filter((e) => e.status === 'open' && !e.hasVoted).length ?? 0;
  const openArc = arc.data?.filter((r) => r.status !== 'approved' && r.status !== 'denied').length ?? 0;
  const openRequests = requests.data?.filter((r) => r.status !== 'closed').length ?? 0;

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: dockClearance }}>
        <TabHeader title="More" subtitle={community.name} />

        {/* Profile card */}
        <Animated.View entering={FadeInDown.duration(340)} className="px-5">
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Your profile and account settings"
            scaleTo={0.985}
            onPress={() => router.push('/profile')}
            className="flex-row items-center gap-4 rounded-3xl border border-border bg-card p-4">
            <Avatar name={member.data?.name ?? 'Alex Rivera'} size="lg" />
            <View className="flex-1">
              <Text variant="heading" numberOfLines={1}>
                {member.data?.name ?? 'Alex Rivera'}
              </Text>
              <Text variant="caption" tone="muted" className="mt-0.5">
                {member.data?.unit ?? 'Unit 142'} · {member.data?.role ?? 'Homeowner'}
              </Text>
              <Text variant="caption" tone="primary" className="mt-1.5 font-semibold">
                View profile and privacy
              </Text>
            </View>
          </PressableScale>
        </Animated.View>

        {/* Community */}
        <View className="pt-10">
          <SectionHeader title="Community" />
          <Animated.View
            entering={FadeInDown.delay(60).duration(340)}
            className="mx-5 overflow-hidden rounded-3xl border border-border bg-card">
            <NavRow
              icon="document-text-outline"
              title="Document centre"
              subtitle="CC&Rs, bylaws, rules, minutes and budgets"
              badge={pendingAcks > 0 ? `${pendingAcks} to sign` : undefined}
              badgeTone="warning"
              onPress={() => router.push('/documents')}
            />
            <Separator className="ml-16" />
            <NavRow
              icon="checkbox-outline"
              title="Elections"
              subtitle="Ballots, results and turnout"
              badge={openBallots > 0 ? `${openBallots} open` : undefined}
              onPress={() => router.push('/elections')}
            />
            <Separator className="ml-16" />
            <NavRow
              icon="people-outline"
              title="Owner directory"
              subtitle="Neighbours who have opted in"
              onPress={() => router.push('/directory')}
            />
            <Separator className="ml-16" />
            <NavRow
              icon="briefcase-outline"
              title="Service directory"
              subtitle="Sitters, notaries, tutors, trades"
              onPress={() => router.push('/services')}
            />
          </Animated.View>
        </View>

        {/* Your property */}
        <View className="pt-10">
          <SectionHeader title="Your property" />
          <Animated.View
            entering={FadeInDown.delay(120).duration(340)}
            className="mx-5 overflow-hidden rounded-3xl border border-border bg-card">
            <NavRow
              icon="warning-outline"
              title="Violations"
              subtitle="Notices, disputes and fines"
              badge={openViolations > 0 ? `${openViolations} open` : undefined}
              badgeTone="warning"
              onPress={() => router.push('/violations')}
            />
            <Separator className="ml-16" />
            <NavRow
              icon="hammer-outline"
              title="Architectural requests"
              subtitle="Submit and track ARC applications"
              badge={openArc > 0 ? `${openArc} in review` : undefined}
              onPress={() => router.push('/arc')}
            />
            <Separator className="ml-16" />
            <NavRow
              icon="megaphone-outline"
              title="Service requests"
              subtitle="Report an issue to management"
              badge={openRequests > 0 ? `${openRequests} open` : undefined}
              onPress={() => router.push('/requests')}
            />
          </Animated.View>
        </View>

        {/* Help */}
        <View className="pt-10">
          <SectionHeader title="Help" />
          <Animated.View
            entering={FadeInDown.delay(180).duration(340)}
            className="mx-5 overflow-hidden rounded-3xl border border-border bg-card">
            <NavRow
              icon="sparkles-outline"
              title="Ask the assistant"
              subtitle="Answers from your community's own documents"
              onPress={() => router.push('/assistant')}
            />
            <Separator className="ml-16" />
            <NavRow
              icon="notifications-outline"
              title="Notifications"
              subtitle="Choose what reaches you, and how"
              onPress={() => router.push('/notifications')}
            />
          </Animated.View>
        </View>

        <View className="mt-8 items-center px-8">
          <Text variant="caption" tone="muted" className="text-center">
            Hamlet HQ mockup · Phase 1 homeowner surface
          </Text>
          <Text variant="caption" tone="muted" className="mt-0.5 text-center">
            {community.address}
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}
