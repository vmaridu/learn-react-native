import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { NavRow } from '~/components/nav-row';
import { Screen, ScreenHeader, SectionHeader } from '~/components/screen';
import { Avatar } from '~/components/ui/avatar';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Separator } from '~/components/ui/separator';
import { Sheet } from '~/components/ui/sheet';
import { SwitchRow } from '~/components/ui/switch';
import { Text } from '~/components/ui/text';
import { useMember, useSignOut } from '~/features/auth';
import {
  profileSchema,
  useUpdatePrivacy,
  useUpdateProfile,
  type ProfileValues,
} from '~/features/profile';
import { formatDate } from '~/lib/format';
import { palette } from '~/lib/theme';
import { community } from '~/mock/db';

export default function ProfileScreen() {
  const router = useRouter();
  const member = useMember();
  const updateProfile = useUpdateProfile();
  const updatePrivacy = useUpdatePrivacy();
  const signOut = useSignOut();

  const [editOpen, setEditOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);

  const { control, handleSubmit, reset } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: '', email: '', phone: '' },
  });

  useEffect(() => {
    if (!member.data) return;
    reset({
      name: member.data.name,
      email: member.data.email,
      phone: member.data.phone,
    });
  }, [member.data, reset]);

  const onSave = handleSubmit((values) => {
    updateProfile.mutate(values, { onSuccess: () => setEditOpen(false) });
  });

  const m = member.data;

  return (
    <Screen>
      <ScreenHeader title="Profile" subtitle={community.name} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Identity */}
        <Animated.View entering={FadeInDown.duration(360)} className="items-center px-5 pt-6">
          <Avatar name={m?.name ?? 'Alex Rivera'} size="lg" tone="primary" />
          <Text variant="title" className="mt-3.5">
            {m?.name ?? 'Alex Rivera'}
          </Text>
          <Text variant="caption" tone="muted" className="mt-1">
            {m?.streetAddress ?? '1442 Willow Creek Lane'}
          </Text>
          <View className="mt-3 flex-row flex-wrap justify-center gap-1.5">
            <Badge label={m?.role ?? 'Homeowner'} tone="primary" icon="home-outline" />
            <Badge label={m?.unit ?? 'Unit 142'} tone="neutral" />
            {!!m && (
              <Badge label={`Since ${formatDate(m.memberSince)}`} tone="neutral" />
            )}
          </View>
          <Button
            label="Edit details"
            variant="outline"
            icon="pencil-outline"
            className="mt-4"
            onPress={() => setEditOpen(true)}
          />
        </Animated.View>

        {/* Contact */}
        <View className="pt-7">
          <SectionHeader title="Contact" />
          <Animated.View
            entering={FadeInDown.delay(60).duration(340)}
            className="mx-5 rounded-3xl border border-border bg-card px-4">
            <View className="flex-row items-center gap-3 py-3.5">
              <Ionicons name="mail-outline" size={18} color={palette.mutedForeground} />
              <Text variant="body" className="flex-1">
                {m?.email ?? '—'}
              </Text>
            </View>
            <Separator />
            <View className="flex-row items-center gap-3 py-3.5">
              <Ionicons name="call-outline" size={18} color={palette.mutedForeground} />
              <Text variant="body" className="flex-1">
                {m?.phone ?? '—'}
              </Text>
            </View>
          </Animated.View>
        </View>

        {/* Privacy */}
        <View className="pt-7">
          <SectionHeader title="Directory privacy" />
          <Animated.View
            entering={FadeInDown.delay(120).duration(340)}
            className="mx-5 rounded-3xl border border-border bg-card px-4">
            <SwitchRow
              title="List me in the owner directory"
              description="Neighbours can find your name and unit."
              value={m?.directoryOptIn ?? false}
              disabled={updatePrivacy.isPending}
              onValueChange={(next) => updatePrivacy.mutate({ directoryOptIn: next })}
            />
            <Separator />
            <SwitchRow
              title="Share my email"
              description="Only if you are listed."
              value={m?.showEmail ?? false}
              disabled={!m?.directoryOptIn || updatePrivacy.isPending}
              onValueChange={(next) => updatePrivacy.mutate({ showEmail: next })}
            />
            <Separator />
            <SwitchRow
              title="Share my phone number"
              description="Only if you are listed."
              value={m?.showPhone ?? false}
              disabled={!m?.directoryOptIn || updatePrivacy.isPending}
              onValueChange={(next) => updatePrivacy.mutate({ showPhone: next })}
            />
          </Animated.View>
          <Text variant="caption" tone="muted" className="mt-2.5 px-5">
            Hidden fields are removed before the directory leaves the server, not just hidden in the
            app.
          </Text>
        </View>

        {/* Settings */}
        <View className="pt-7">
          <SectionHeader title="Settings" />
          <Animated.View
            entering={FadeInDown.delay(180).duration(340)}
            className="mx-5 overflow-hidden rounded-3xl border border-border bg-card">
            <NavRow
              icon="notifications-outline"
              title="Notifications"
              subtitle="Channels and categories"
              onPress={() => router.push('/notifications')}
            />
            <Separator className="ml-16" />
            <NavRow
              icon="card-outline"
              title="Payment methods"
              subtitle="Cards and bank accounts"
              onPress={() => router.push('/payment-methods')}
            />
            <Separator className="ml-16" />
            <NavRow
              icon="log-out-outline"
              title="Sign out"
              subtitle="Resets the mockup to its starting state"
              tone="destructive"
              onPress={() => setSignOutOpen(true)}
            />
          </Animated.View>
        </View>
      </ScrollView>

      <Sheet
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit your details"
        subtitle="Your unit and ownership record are managed by the association.">
        <View className="gap-3.5">
          <Controller
            control={control}
            name="name"
            render={({ field, fieldState }) => (
              <Input
                label="Full name"
                icon="person-outline"
                autoCapitalize="words"
                value={field.value}
                onChangeText={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="email"
            render={({ field, fieldState }) => (
              <Input
                label="Email"
                icon="mail-outline"
                autoCapitalize="none"
                keyboardType="email-address"
                value={field.value}
                onChangeText={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="phone"
            render={({ field, fieldState }) => (
              <Input
                label="Phone"
                icon="call-outline"
                keyboardType="phone-pad"
                value={field.value}
                onChangeText={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />
          <Button
            label="Save changes"
            size="lg"
            block
            loading={updateProfile.isPending}
            onPress={onSave}
          />
        </View>
      </Sheet>

      <Sheet
        visible={signOutOpen}
        onClose={() => setSignOutOpen(false)}
        title="Sign out?"
        subtitle="The mockup's data resets, so your bookings, payments and votes go back to the demo state.">
        <View className="gap-2">
          <Button
            label="Sign out"
            variant="destructive"
            size="lg"
            block
            loading={signOut.isPending}
            onPress={() => signOut.mutate()}
          />
          <Button
            label="Stay signed in"
            variant="secondary"
            size="lg"
            block
            onPress={() => setSignOutOpen(false)}
          />
        </View>
      </Sheet>
    </Screen>
  );
}
