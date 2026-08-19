import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { palette } from '~/lib/theme';
import { PressableScale } from './ui/pressable-scale';
import { Text } from './ui/text';

export interface QuickAction {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}

/**
 * Four shortcuts, evenly spread, no boxes.
 *
 * These used to be five bordered cards in a horizontal scroller, which read as a
 * toolbar bolted to the top of the page. A plain row of tinted glyphs carries the
 * same affordance with a fraction of the ink.
 */
export function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <View className="flex-row px-5">
      {actions.map((action, index) => (
        <Animated.View
          key={action.key}
          entering={FadeInDown.delay(120 + index * 55).duration(360)}
          className="flex-1">
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={action.label}
            scaleTo={0.92}
            onPress={action.onPress}
            className="items-center gap-2 py-1">
            <View
              style={{ width: 52, height: 52, borderRadius: 18 }}
              className="items-center justify-center bg-primary-soft">
              <Ionicons name={action.icon} size={22} color={palette.brandInk} />
            </View>
            <Text className="text-[12px] font-medium text-muted-foreground" numberOfLines={1}>
              {action.label}
            </Text>
          </PressableScale>
        </Animated.View>
      ))}
    </View>
  );
}
