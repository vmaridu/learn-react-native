import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { cn } from '~/lib/cn';
import { palette } from '~/lib/theme';
import { Badge } from './ui/badge';
import { PressableScale } from './ui/pressable-scale';
import { Text } from './ui/text';

/** The standard "tap through to somewhere" row used across More, Profile, etc. */
export function NavRow({
  icon,
  title,
  subtitle,
  badge,
  badgeTone = 'primary',
  onPress,
  className,
  tone = 'default',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeTone?: 'primary' | 'warning' | 'destructive' | 'neutral';
  onPress: () => void;
  className?: string;
  tone?: 'default' | 'destructive';
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      scaleTo={0.985}
      onPress={onPress}
      className={cn('flex-row items-center gap-3.5 px-5 py-3.5', className)}>
      <View
        className={cn(
          'h-10 w-10 items-center justify-center rounded-2xl',
          tone === 'destructive' ? 'bg-destructive-soft' : 'bg-primary-soft',
        )}>
        <Ionicons
          name={icon}
          size={19}
          color={tone === 'destructive' ? palette.destructive : palette.brandInk}
        />
      </View>
      <View className="flex-1">
        <Text
          variant="subheading"
          tone={tone === 'destructive' ? 'destructive' : 'default'}
          numberOfLines={1}>
          {title}
        </Text>
        {!!subtitle && (
          <Text variant="caption" tone="muted" numberOfLines={1} className="mt-0.5">
            {subtitle}
          </Text>
        )}
      </View>
      {!!badge && <Badge label={badge} tone={badgeTone} />}
      <Ionicons name="chevron-forward" size={18} color={palette.mutedForeground} />
    </PressableScale>
  );
}
