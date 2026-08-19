import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
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
import { PressableScale } from './ui/pressable-scale';
import { Text } from './ui/text';

const DOCK_HEIGHT = 62;
const DOCK_MARGIN_X = 18;
const PILL_WIDTH = 46;
const PILL_HEIGHT = 34;
const PILL_TOP = 6;

/** Vertical space a scroll view must leave so content clears the floating dock. */
export function useTabDockClearance() {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, 12) + DOCK_HEIGHT + 14;
}

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
      className="flex-1 items-center justify-start"
      style={{ paddingTop: PILL_TOP }}>
      <View
        style={{ width: PILL_WIDTH, height: PILL_HEIGHT }}
        className="items-center justify-center">
        <Animated.View style={restLayer} className="absolute">
          <Ionicons name={meta.iconOutline} size={21} color={palette.mutedForeground} />
        </Animated.View>
        <Animated.View style={activeLayer} className="absolute">
          {/* Near-black on lime. White on a bright lime is unreadable. */}
          <Ionicons name={meta.icon} size={21} color={palette.primaryForeground} />
        </Animated.View>
        {badgeCount > 0 && (
          <View
            accessibilityLabel={`${badgeCount} unread`}
            style={{ borderRadius: 8 }}
            className="absolute right-1 top-0 h-4 min-w-4 items-center justify-center border border-background bg-destructive px-1">
            <Text className="text-[9px] font-bold text-destructive-foreground">
              {badgeCount > 9 ? '9+' : badgeCount}
            </Text>
          </View>
        )}
      </View>
      <Text
        className={`mt-0.5 text-[10px] font-semibold ${
          active ? 'text-foreground' : 'text-muted-foreground'
        }`}>
        {meta.label}
      </Text>
    </PressableScale>
  );
}

/**
 * A floating dock rather than an edge-to-edge bar: it sits above the content,
 * frosted, so the page scrolls underneath it.
 *
 * The pill slides on a spring while the icons cross-fade between outline and
 * filled. Both run on the UI thread, so the movement stays smooth while the next
 * tab is still mounting.
 *
 * Alignment note: the row that gets measured has **no horizontal padding**.
 * Measuring a padded container and then positioning the pill inside it makes
 * every slot a few pixels too wide, and the pill drifts further off-centre with
 * each tab — which is exactly what it used to do.
 */
export function AppTabBar({
  state,
  navigation,
  unreadCount = 0,
}: BottomTabBarProps & { unreadCount?: number }) {
  const insets = useSafeAreaInsets();
  const [rowWidth, setRowWidth] = useState(0);
  const offset = useSharedValue(0);

  const count = state.routes.length;
  const slot = rowWidth > 0 ? rowWidth / count : 0;

  useEffect(() => {
    if (slot === 0) return;
    offset.value = withSpring(state.index * slot + (slot - PILL_WIDTH) / 2, springConfig);
  }, [offset, slot, state.index]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  const onLayout = (event: LayoutChangeEvent) => setRowWidth(event.nativeEvent.layout.width);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: DOCK_MARGIN_X,
        paddingBottom: Math.max(insets.bottom, 12),
      }}>
      <View
        style={{
          height: DOCK_HEIGHT,
          borderRadius: DOCK_HEIGHT / 2,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: palette.border,
        }}>
        {/* Glass. The overlay keeps it legible if the platform cannot blur. */}
        <BlurView
          intensity={24}
          tint="light"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255,255,255,0.86)',
          }}
        />

        <View onLayout={onLayout} className="flex-1 flex-row">
          {slot > 0 && (
            <Animated.View
              style={[
                pillStyle,
                {
                  position: 'absolute',
                  left: 0,
                  top: PILL_TOP,
                  width: PILL_WIDTH,
                  height: PILL_HEIGHT,
                  borderRadius: PILL_HEIGHT / 2,
                },
              ]}
              className="bg-primary"
            />
          )}
          {state.routes.map((route, index) => {
            const meta = TAB_META[route.name];
            if (!meta) return null;
            const active = state.index === index;

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
                }}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}
