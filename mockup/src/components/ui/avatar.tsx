import { View } from 'react-native';

import { cn } from '~/lib/cn';
import { initialsOf } from '~/lib/format';
import { Text } from './text';

const sizes = {
  sm: { box: 'h-9 w-9 rounded-xl', text: 'text-[12px]' },
  md: { box: 'h-11 w-11 rounded-2xl', text: 'text-[14px]' },
  lg: { box: 'h-16 w-16 rounded-3xl', text: 'text-[20px]' },
} as const;

/**
 * Initials-only avatars. The mockup ships no photographs of people — a fake
 * community with real-looking faces reads as deceptive rather than polished.
 */
export function Avatar({
  name,
  size = 'md',
  tone = 'accent',
  className,
}: {
  name: string;
  size?: keyof typeof sizes;
  tone?: 'accent' | 'primary' | 'muted';
  className?: string;
}) {
  const s = sizes[size];
  return (
    <View
      accessible
      accessibilityLabel={name}
      className={cn(
        'items-center justify-center',
        s.box,
        tone === 'accent' && 'bg-accent',
        tone === 'primary' && 'bg-primary',
        tone === 'muted' && 'bg-muted',
        className,
      )}>
      <Text
        className={cn(
          'font-bold tracking-wide',
          s.text,
          tone === 'accent' && 'text-accent-foreground',
          tone === 'primary' && 'text-primary-foreground',
          tone === 'muted' && 'text-muted-foreground',
        )}>
        {initialsOf(name)}
      </Text>
    </View>
  );
}
