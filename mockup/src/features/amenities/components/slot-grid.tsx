import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Text } from '~/components/ui/text';
import { cn } from '~/lib/cn';
import { formatTime } from '~/lib/format';
import { PressableScale } from '~/components/ui/pressable-scale';
import type { Slot } from '../types';
import { blockFits } from '../utils';

/**
 * The availability grid. Four states, each visually distinct without relying on
 * colour alone: open (outlined), selected (lime fill), booked (struck muted),
 * past (faded).
 */
export function SlotGrid({
  slots,
  selectedStart,
  durationMinutes,
  onSelect,
  onWaitlist,
}: {
  slots: Slot[];
  selectedStart: string | null;
  durationMinutes: number;
  onSelect: (start: string) => void;
  onWaitlist: (start: string) => void;
}) {
  const selectedIndex = slots.findIndex((s) => s.start === selectedStart);
  const slotMinutes = slots[0]?.minutes ?? 60;
  const covered = selectedIndex >= 0 ? Math.ceil(durationMinutes / slotMinutes) : 0;

  return (
    <View className="flex-row flex-wrap gap-2">
      {slots.map((slot, index) => {
        const inSelection =
          selectedIndex >= 0 && index >= selectedIndex && index < selectedIndex + covered;
        const selectable = slot.state === 'open' && blockFits(slots, index, durationMinutes);
        const booked = slot.state === 'taken';
        const mine = slot.state === 'mine';
        const past = slot.state === 'past';

        const label = booked
          ? 'Booked — tap to join the waitlist'
          : mine
            ? 'Your booking'
            : past
              ? 'Past'
              : selectable
                ? 'Available'
                : 'Not enough time before the next booking';

        return (
          <Animated.View key={slot.start} entering={FadeIn.delay(index * 12).duration(200)}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={`${formatTime(slot.start)}. ${label}`}
              accessibilityState={{ selected: inSelection, disabled: past || mine }}
              disabled={past || mine || (!selectable && !booked)}
              haptic="select"
              scaleTo={0.93}
              onPress={() => (booked ? onWaitlist(slot.start) : onSelect(slot.start))}
              className={cn(
                'h-[52px] w-[86px] items-center justify-center rounded-2xl border',
                inSelection && 'border-primary bg-primary',
                !inSelection && selectable && 'border-border bg-background',
                !inSelection && booked && 'border-border bg-muted',
                !inSelection && mine && 'border-accent bg-accent',
                !inSelection && past && 'border-transparent bg-muted opacity-45',
                !inSelection && !selectable && !booked && !mine && !past && 'border-border bg-muted opacity-60',
              )}>
              <Text
                className={cn(
                  'text-[14px] font-semibold',
                  inSelection && 'text-primary-foreground',
                  !inSelection && booked && 'text-muted-foreground line-through',
                  !inSelection && mine && 'text-accent-foreground',
                  !inSelection && !booked && !mine && 'text-foreground',
                )}>
                {formatTime(slot.start)}
              </Text>
              {!!slot.label && !inSelection && (
                <Text
                  className={cn(
                    'text-[10px] font-semibold',
                    mine ? 'text-accent-foreground' : 'text-muted-foreground',
                  )}>
                  {slot.label}
                </Text>
              )}
            </PressableScale>
          </Animated.View>
        );
      })}
    </View>
  );
}
