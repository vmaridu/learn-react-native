import '../global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as NavigationBar from 'expo-navigation-bar';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BrandMark } from '~/components/brand-mark';
import { Text } from '~/components/ui/text';
import { useAuthStore } from '~/features/auth';
import { createQueryClient } from '~/lib/query-client';
import { palette } from '~/lib/theme';
import { community } from '~/mock/db';

void SplashScreen.preventAutoHideAsync();

const queryClient = createQueryClient();

/** The launch animation: the mark springs in, the wordmark follows. */
function BrandSplash() {
  const mark = useSharedValue(0);
  const word = useSharedValue(0);

  useEffect(() => {
    mark.value = withSpring(1, { damping: 11, stiffness: 140 });
    word.value = withDelay(180, withTiming(1, { duration: 420 }));
  }, [mark, word]);

  const markStyle = useAnimatedStyle(() => ({
    transform: [{ scale: mark.value }, { rotate: `${(1 - mark.value) * -25}deg` }],
    opacity: mark.value,
  }));

  const wordStyle = useAnimatedStyle(() => ({
    opacity: word.value,
    transform: [{ translateY: (1 - word.value) * 10 }],
  }));

  return (
    <Animated.View
      exiting={FadeOut.duration(260)}
      className="flex-1 items-center justify-center bg-background">
      <Animated.View style={markStyle}>
        <BrandMark size={84} radius={28} />
      </Animated.View>
      <Animated.View style={wordStyle} className="mt-5 items-center">
        <Text variant="title">Hamlet HQ</Text>
        <Text variant="caption" tone="muted" className="mt-1">
          {community.name}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

/**
 * Routes the member to the right half of the app. Not a guard in the security
 * sense — this mockup has no server, and hiding a screen is not authorization.
 */
function useAuthRedirect(ready: boolean) {
  const status = useAuthStore((s) => s.status);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!ready || status === 'restoring') return;
    const onAuthScreen = segments[0] === 'sign-in';
    if (status === 'signedOut' && !onAuthScreen) {
      router.replace('/sign-in');
    } else if (status === 'signedIn' && onAuthScreen) {
      router.replace('/');
    }
  }, [ready, router, segments, status]);
}

function RootNavigator() {
  const status = useAuthStore((s) => s.status);
  const restore = useAuthStore((s) => s.restore);
  const [ready, setReady] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function boot() {
      // Dark navigation-bar icons, because the app's ground is white.
      if (Platform.OS === 'android') NavigationBar.setStyle('dark');
      await Promise.all([restore(), SystemUI.setBackgroundColorAsync(palette.background)]);
      await SplashScreen.hideAsync();
      // Let the brand animation land rather than cutting it off mid-spring.
      setTimeout(() => setReady(true), 900);
    }

    void boot();
  }, [restore]);

  useAuthRedirect(ready);

  if (!ready || status === 'restoring') return <BrandSplash />;

  return (
    <Animated.View entering={FadeIn.duration(240)} className="flex-1 bg-background">
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.background },
          animation: 'slide_from_right',
        }}>
        <Stack.Screen name="sign-in" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      </Stack>
    </Animated.View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette.background }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          <RootNavigator />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
