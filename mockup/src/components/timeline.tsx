import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { formatRelative } from '~/lib/format';
import type { TimelineEvent } from '~/mock/types';
import { Text } from './ui/text';

const dotTone: Record<TimelineEvent['tone'], string> = {
  neutral: 'bg-muted-foreground',
  positive: 'bg-success',
  warning: 'bg-warning',
  negative: 'bg-destructive',
};

/** Vertical event trail used by violations, ARC requests and service requests. */
export function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <View>
      {events.map((event, index) => {
        const last = index === events.length - 1;
        return (
          <Animated.View
            key={`${event.at}-${event.label}`}
            entering={FadeInDown.delay(index * 70).duration(300)}
            className="flex-row gap-3.5">
            <View className="items-center pt-1.5">
              <View className={`h-2.5 w-2.5 rounded-full ${dotTone[event.tone]}`} />
              {!last && <View className="w-px flex-1 bg-border" />}
            </View>
            <View className={last ? 'flex-1 pb-0' : 'flex-1 pb-5'}>
              <View className="flex-row items-center justify-between gap-2">
                <Text variant="subheading" className="flex-1">
                  {event.label}
                </Text>
                <Text variant="caption" tone="muted">
                  {formatRelative(event.at)}
                </Text>
              </View>
              <Text variant="caption" tone="muted" className="mt-1">
                {event.detail}
              </Text>
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}
