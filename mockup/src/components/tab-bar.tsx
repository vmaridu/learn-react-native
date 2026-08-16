import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect, useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptics } from '~/lib/haptics';
import { palette, springConfig } from '~/lib/theme';
import { Text } from './ui/text';
import { PressableScale } from './ui/pressable-scale';

const PILL_WIDTH = 58;
const PILL_HEIGHT = 34;

interface TabMeta {
  icon: keyof typeof Ionicons.glyphMap;
  iconOutline: keyof typeof Ionicons.glyphMap;
  label: string;
}

/** Route name → presentation. Keys must match the files in app/(tabs). */
const TAB_META: Record<string, TabMeta> = {
  index: { icon: 'home', iconOutline: 'home-outline', label: 'Home' },
  amenities: { icon: 'calendar', iconOutline: 'calendar-outline', label: 'Book' },
  payments: { icon: 'card', iconOutline: 'card-outline', label: 'Pay' },
  inbox: { icon: 'chatbubble', iconOutline: 'chatbubble-outline', label: 'Inbox' },
  more: { icon: 'apps', iconOutline: 'apps-outline', label: 'More' },
};

function TabItem({
  meta,
  active,
  badgeCount,
  onPress,
  onLongPress,
}: {
  meta: TabMeta;
  active: boolean;
  badgeCount: number;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(active ? 1 : 0, { duration: 160 });
  }, [active, progress]);

  const activeLayer = useAnimatedStyle(() => ({ opacity: progress.value }));
  const restLayer = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + progress.value * 0.45,
  }));

  return (
    <PressableScale
      accessibilityRole="tab"
      accessibilityLabel={meta.label}
      accessibilityState={{ selected: active }}
      haptic="none"
      scaleTo={0.9}
      onPress={() => {
        if (!active) haptics.select();
        onPress();
      }}
      onLongPress={onLongPress}
      className="flex-1 items-center justify-center pt-1.5">
      <View
        style={{ width: PILL_WIDTH, height: PILL_HEIGHT }}
        className="items-center justify-center">
        <Animated.View style={restLayer} className="absolute">
          <Ionicons name={meta.iconOutline} size={22} color={palette.mutedForeground} />
        </Animated.View>
        <Animated.View style={activeLayer} className="absolute">
          <Ionicons name={meta.icon} size={22} color={palette.white} />
        </Animated.View>
        {badgeCount > 0 && (
          <View
            accessibilityLabel={`${badgeCount} unread`}
            className="absolute -right-0.5 top-0 h-4 min-w-4 items-center justify-center rounded-full border border-background bg-destructive px-1">
            <Text className="text-[9px] font-bold text-destructive-foreground">
              {badgeCount > 9 ? '9+' : badgeCount}
            </Text>
          </View>
        )}
      </View>
      <Animated.View style={labelStyle}>
        <Text
          className={`mt-0.5 text-[10.5px] font-semibold ${
            active ? 'text-primary' : 'text-muted-foreground'
          }`}>
          {meta.label}
        </Text>
      </Animated.View>
    </PressableScale>
  );
}

/**
 * The bottom bar. A single lime pill slides between slots on a spring while the
 * icons cross-fade between their outline and filled variants — the movement
 * runs entirely on the UI thread, so it stays smooth while a tab is mounting.
 */
export function AppTabBar({
  state,
  descriptors,
  navigation,
  unreadCount = 0,
}: BottomTabBarProps & { unreadCount?: number }) {
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const offset = useSharedValue(0);

  const count = state.routes.length;
  const slot = width > 0 ? width / count : 0;

  useEffect(() => {
    if (slot === 0) return;
    offset.value = withSpring(state.index * slot + (slot - PILL_WIDTH) / 2, springConfig);
  }, [offset, slot, state.index]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  return (
    <View
      className="border-t border-border bg-background"
      style={{ paddingBottom: Math.max(insets.bottom, 8) }}>
      <View onLayout={onLayout} className="flex-row px-2 pb-1">
        {slot > 0 && (
          <Animated.View
            style={[
              pillStyle,
              {
                position: 'absolute',
                left: 8,
                top: 6,
                width: PILL_WIDTH,
                height: PILL_HEIGHT,
              },
            ]}
            className="rounded-full bg-primary"
          />
        )}
        {state.routes.map((route, index) => {
          const meta = TAB_META[route.name];
          if (!meta) return null;
          const active = state.index === index;
          const { options } = descriptors[route.key] ?? {};

          return (
            <TabItem
              key={route.key}
              meta={meta}
              active={active}
              badgeCount={route.name === 'inbox' ? unreadCount : 0}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!active && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              }}
              onLongPress={() => {
                navigation.emit({ type: 'tabLongPress', target: route.key });
                void options;
              }}
            />
          );
        })}
      </View>
    </View>
  );
}
