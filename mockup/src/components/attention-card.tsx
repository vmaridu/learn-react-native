import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { cn } from '~/lib/cn';
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

const surface: Record<AttentionTone, string> = {
  warning: 'bg-warning-soft border-warning/25',
  primary: 'bg-primary-soft border-primary/20',
  destructive: 'bg-destructive-soft border-destructive/20',
};

const glyph: Record<AttentionTone, string> = {
  warning: palette.warning,
  primary: palette.primary,
  destructive: palette.destructive,
};

/** One thing the member has to do, stated plainly, with the action attached. */
export function AttentionCard({ item, index }: { item: AttentionItem; index: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 70).duration(340)}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${item.title}. ${item.detail}. ${item.cta}`}
        scaleTo={0.98}
        onPress={item.onPress}
        className={cn(
          'mb-2.5 flex-row items-center gap-3.5 rounded-3xl border px-4 py-3.5',
          surface[item.tone],
        )}>
        <View className="h-10 w-10 items-center justify-center rounded-2xl bg-background">
          <Ionicons name={item.icon} size={19} color={glyph[item.tone]} />
        </View>
        <View className="flex-1">
          <Text variant="subheading" numberOfLines={1}>
            {item.title}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={2} className="mt-0.5">
            {item.detail}
          </Text>
        </View>
        <View className="flex-row items-center gap-0.5">
          <Text
            className="text-[12px] font-semibold"
            style={{ color: glyph[item.tone] }}
            numberOfLines={1}>
            {item.cta}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={glyph[item.tone]} />
        </View>
      </PressableScale>
    </Animated.View>
  );
}
