import { ScrollView, View } from 'react-native';

import { PressableScale } from '~/components/ui/pressable-scale';
import { Text } from '~/components/ui/text';
import { cn } from '~/lib/cn';
import { fromISODate, toISODate } from '~/lib/format';
import type { ISODate } from '~/mock/types';

/** Horizontal day picker. Fixed, short option set — a ScrollView, not a list. */
export function DateStrip({
  dates,
  value,
  onChange,
}: {
  dates: ISODate[];
  value: ISODate;
  onChange: (next: ISODate) => void;
}) {
  const today = toISODate(new Date());

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2 px-5"
      className="-mx-5 grow-0">
      {dates.map((date) => {
        const d = fromISODate(date);
        const selected = date === value;
        const isToday = date === today;
        return (
          <PressableScale
            key={date}
            accessibilityRole="button"
            accessibilityLabel={d.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
            accessibilityState={{ selected }}
            haptic="select"
            scaleTo={0.93}
            onPress={() => onChange(date)}
            className={cn(
              'h-[68px] w-[58px] items-center justify-center rounded-2xl border',
              selected ? 'border-primary bg-primary' : 'border-border bg-background',
            )}>
            <Text
              className={cn(
                'text-[11px] font-semibold uppercase tracking-wider',
                selected ? 'text-primary-foreground/80' : 'text-muted-foreground',
              )}>
              {d.toLocaleDateString('en-US', { weekday: 'short' })}
            </Text>
            <Text
              className={cn(
                'mt-0.5 text-[19px] font-bold',
                selected ? 'text-primary-foreground' : 'text-foreground',
              )}>
              {d.getDate()}
            </Text>
            {isToday && (
              <View
                className={cn(
                  'mt-1 h-1 w-1 rounded-full',
                  selected ? 'bg-primary-foreground' : 'bg-primary',
                )}
              />
            )}
          </PressableScale>
        );
      })}
      <View className="w-1" />
    </ScrollView>
  );
}
