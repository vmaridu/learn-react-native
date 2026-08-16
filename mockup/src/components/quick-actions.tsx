import { Ionicons } from '@expo/vector-icons';
import { ScrollView, View } from 'react-native';
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

/** A fixed set of five shortcuts — not data-driven, so a ScrollView is right. */
export function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2.5 px-5"
      className="grow-0">
      {actions.map((action, index) => (
        <Animated.View
          key={action.key}
          entering={FadeInDown.delay(120 + index * 55).duration(360)}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={action.label}
            scaleTo={0.93}
            onPress={action.onPress}
            className="h-[92px] w-[86px] items-center justify-center gap-2 rounded-3xl border border-border bg-card px-2">
            <View className="h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft">
              <Ionicons name={action.icon} size={20} color={palette.primary} />
            </View>
            <Text
              className="text-center text-[11.5px] font-semibold text-foreground"
              numberOfLines={1}>
              {action.label}
            </Text>
          </PressableScale>
        </Animated.View>
      ))}
      <View className="w-1" />
    </ScrollView>
  );
}
