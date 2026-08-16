import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';

import { cn } from '~/lib/cn';
import { Text } from './text';

/**
 * Cards are defined by a hairline border, not a shadow — shadows render
 * differently on iOS and Android and drift out of sync.
 */
export function Card({ className, ...props }: ViewProps) {
  return (
    <View
      className={cn('rounded-3xl border border-border bg-card p-5', className)}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  subtitle,
  right,
  className,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <View className={cn('flex-row items-start justify-between gap-3', className)}>
      <View className="flex-1">
        <Text variant="heading">{title}</Text>
        {!!subtitle && (
          <Text variant="caption" tone="muted" className="mt-1">
            {subtitle}
          </Text>
        )}
      </View>
      {right}
    </View>
  );
}
