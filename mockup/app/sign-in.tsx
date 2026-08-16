import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandMark } from '~/components/brand-mark';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { PressableScale } from '~/components/ui/pressable-scale';
import { Sheet } from '~/components/ui/sheet';
import { Text } from '~/components/ui/text';
import { useShake } from '~/components/ui/use-shake';
import {
  otpSchema,
  signInSchema,
  useOtpSignIn,
  useRequestOtp,
  useSignIn,
  type OtpValues,
  type SignInValues,
} from '~/features/auth';
import { palette } from '~/lib/theme';
import { community } from '~/mock/db';
import { DEMO_CREDENTIALS } from '~/mock/seed';

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const signIn = useSignIn();
  const requestOtp = useRequestOtp();
  const otpSignIn = useOtpSignIn();
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpSentTo, setOtpSentTo] = useState<string | null>(null);

  const shake = useShake();

  const { control, handleSubmit, setValue, formState } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const otpForm = useForm<OtpValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { code: '' },
  });


  const onSubmit = handleSubmit((values) => {
    signIn.mutate(values, { onError: shake.trigger });
  });

  function continueAsDemo() {
    setValue('email', DEMO_CREDENTIALS.email, { shouldValidate: true });
    setValue('password', DEMO_CREDENTIALS.password, { shouldValidate: true });
    signIn.mutate({ ...DEMO_CREDENTIALS }, { onError: shake.trigger });
  }

  function openOtp() {
    requestOtp.mutate(undefined, {
      onSuccess(result) {
        setOtpSentTo(result.sentTo);
        setOtpOpen(true);
      },
    });
  }

  const onOtpSubmit = otpForm.handleSubmit((values) => {
    otpSignIn.mutate(values.code, {
      onSuccess() {
        setOtpOpen(false);
      },
    });
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-background">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 24,
          flexGrow: 1,
        }}>
        <Animated.View entering={FadeInDown.duration(420)}>
          <BrandMark size={64} radius={22} />
          <Text variant="display" className="mt-7">
            Welcome back
          </Text>
          <Text variant="callout" tone="muted" className="mt-2">
            Sign in to your {community.name} homeowner account.
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(90).duration(420)}
          style={shake.style}
          className="mt-9 gap-4">
          <Controller
            control={control}
            name="email"
            render={({ field, fieldState }) => (
              <Input
                label="Email"
                icon="mail-outline"
                placeholder="you@example.com"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field, fieldState }) => (
              <Input
                label="Password"
                icon="lock-closed-outline"
                placeholder="Your password"
                secureTextEntry
                autoComplete="password"
                textContentType="password"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                onSubmitEditing={onSubmit}
                returnKeyType="go"
                error={fieldState.error?.message}
              />
            )}
          />

          {!!signIn.error && (
            <Animated.View
              entering={FadeInDown.duration(200)}
              className="flex-row items-start gap-2 rounded-2xl bg-destructive-soft px-4 py-3">
              <Ionicons name="alert-circle" size={18} color={palette.destructive} />
              <Text variant="caption" tone="destructive" className="flex-1">
                {signIn.error.message}
              </Text>
            </Animated.View>
          )}

          <PressableScale
            accessibilityRole="link"
            accessibilityLabel="Forgot your password"
            hitSlop={8}
            scaleTo={0.96}
            className="self-start"
            onPress={openOtp}>
            <Text variant="caption" tone="primary" className="font-semibold">
              Forgot your password?
            </Text>
          </PressableScale>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(180).duration(420)} className="mt-7 gap-3">
          <Button
            label="Sign in"
            size="lg"
            block
            loading={signIn.isPending}
            disabled={!formState.isValid && formState.isSubmitted}
            onPress={onSubmit}
          />
          <View className="flex-row items-center gap-3 py-1">
            <View className="h-px flex-1 bg-border" />
            <Text variant="caption" tone="muted">
              or
            </Text>
            <View className="h-px flex-1 bg-border" />
          </View>
          <Button
            label="Text me a one-time code"
            icon="phone-portrait-outline"
            variant="outline"
            size="lg"
            block
            loading={requestOtp.isPending}
            onPress={openOtp}
          />
        </Animated.View>

        <View className="flex-1" />

        <Animated.View entering={FadeInDown.delay(280).duration(420)} className="mt-10">
          <View className="rounded-3xl border border-border bg-primary-soft p-5">
            <View className="flex-row items-center gap-2">
              <Ionicons name="flask-outline" size={16} color={palette.primary} />
              <Text variant="overline" tone="primary">
                Demo account
              </Text>
            </View>
            <Text variant="caption" tone="muted" className="mt-2">
              This is a mockup. One homeowner exists — Alex Rivera, {community.name} Unit 142.
            </Text>
            <View className="mt-3 gap-1">
              <Text variant="mono">{DEMO_CREDENTIALS.email}</Text>
              <Text variant="mono">{DEMO_CREDENTIALS.password}</Text>
            </View>
            <Button
              label="Continue as Alex Rivera"
              iconRight="arrow-forward"
              variant="onBrand"
              block
              className="mt-4 border-border"
              loading={signIn.isPending}
              onPress={continueAsDemo}
            />
          </View>
        </Animated.View>
      </ScrollView>

      <Sheet
        visible={otpOpen}
        onClose={() => setOtpOpen(false)}
        title="Enter your code"
        subtitle={
          otpSentTo
            ? `We sent a 6-digit code to ${otpSentTo}. In the mockup, any six digits work.`
            : undefined
        }>
        <Controller
          control={otpForm.control}
          name="code"
          render={({ field, fieldState }) => (
            <Input
              label="6-digit code"
              icon="keypad-outline"
              placeholder="000000"
              keyboardType="number-pad"
              maxLength={6}
              autoComplete="sms-otp"
              textContentType="oneTimeCode"
              value={field.value}
              onChangeText={field.onChange}
              error={fieldState.error?.message ?? otpSignIn.error?.message}
            />
          )}
        />
        <Button
          label="Verify and sign in"
          size="lg"
          block
          className="mt-4"
          loading={otpSignIn.isPending}
          onPress={onOtpSubmit}
        />
      </Sheet>
    </KeyboardAvoidingView>
  );
}
