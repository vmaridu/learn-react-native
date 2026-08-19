import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { palette } from '~/lib/theme';
import { PressableScale } from './ui/pressable-scale';
import { Text } from './ui/text';

export type AttentionTone = 'warning' | 'primary' | 'destructive';

export interface AttentionItem {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  detail: string;
  cta: string;
  tone: AttentionTone;
  onPress: () => void;
}

const glyph: Record<AttentionTone, string> = {
  warning: palette.warning,
  primary: palette.primary,
  destructive: palette.destructive,
};

/**
 * One thing the member has to do.
 *
 * Previously a full-width tinted card with an icon chip, a call-to-action label
 * and a chevron — three separate signals for one row. Now it is a plain row with
 * a single coloured glyph doing the signalling, so a stack of three reads as a
 * short list rather than three competing alerts.
 */
export function AttentionCard({ item, index }: { item: AttentionItem; index: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 70).duration(340)}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${item.title}. ${item.detail}. ${item.cta}`}
        scaleTo={0.985}
        onPress={item.onPress}
        className="flex-row items-center gap-4 py-3.5">
        <Ionicons name={item.icon} size={20} color={glyph[item.tone]} />
        <View className="flex-1">
          <Text variant="subheading" numberOfLines={1}>
            {item.title}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1} className="mt-0.5">
            {item.detail}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={palette.mutedForeground} />
      </PressableScale>
    </Animated.View>
  );
}
